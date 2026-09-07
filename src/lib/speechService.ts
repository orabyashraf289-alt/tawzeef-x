// Centralized speech service: throttles requests, queues playback, logs everything,
// and gracefully falls back to the browser's SpeechSynthesis API.

export type TTSProvider = "elevenlabs" | "browser";
export type TTSStatus = "idle" | "loading" | "speaking" | "error" | "blocked";

export interface TTSLogEntry {
  id: string;
  timestamp: number;
  textPreview: string;
  provider: TTSProvider | "unknown";
  outcome: "success" | "fallback" | "error";
  durationMs?: number;
  error?: string;
  details?: string;
}

export interface VoicePreference {
  voiceURI: string | null; // browser voice URI; null = auto-pick Arabic
  rate: number;
  lang: string;
}

const VOICE_PREF_KEY = "tts_voice_pref_v1";

function loadVoicePref(): VoicePreference {
  try {
    const raw = localStorage.getItem(VOICE_PREF_KEY);
    if (raw) return { voiceURI: null, rate: 0.95, lang: "ar-SA", ...JSON.parse(raw) };
  } catch {}
  return { voiceURI: null, rate: 0.95, lang: "ar-SA" };
}

function saveVoicePref(p: VoicePreference) {
  try { localStorage.setItem(VOICE_PREF_KEY, JSON.stringify(p)); } catch {}
}

export function detectLanguage(text: string): "ar" | "en" {
  const arabicPattern = /[\u0600-\u06FF]/g;
  const arabicCount = (text.match(arabicPattern) || []).length;
  const latinPattern = /[a-zA-Z]/g;
  const latinCount = (text.match(latinPattern) || []).length;
  return arabicCount >= latinCount ? "ar" : "en";
}

export function cleanForTTS(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/#{1,6}\s/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[📊💼📅✅❌🚀🎯💡🤖✨🔄📧⏰🌍📍📞🎓💰📝🏢👤👥🗣️💻📄]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1500);
}

interface QueueItem {
  id: string;          // unique id (usually message id or timestamp)
  text: string;
  voiceId?: string;
}

type Listener = () => void;

class SpeechService {
  private queue: QueueItem[] = [];
  private currentId: string | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private currentAbort: AbortController | null = null;
  private fetchSeq = 0;

  // Public observable state
  status: TTSStatus = "idle";
  activeProvider: TTSProvider = "elevenlabs";
  elevenLabsBlocked = false;
  logs: TTSLogEntry[] = [];
  voicePref: VoicePreference = loadVoicePref();

  private listeners: Set<Listener> = new Set();

  subscribe(l: Listener) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }
  private emit() { this.listeners.forEach((l) => l()); }

  setVoicePref(p: Partial<VoicePreference>) {
    this.voicePref = { ...this.voicePref, ...p };
    saveVoicePref(this.voicePref);
    this.emit();
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
    return window.speechSynthesis.getVoices();
  }

  private addLog(entry: Omit<TTSLogEntry, "id" | "timestamp">) {
    const e: TTSLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      ...entry,
    };
    this.logs = [e, ...this.logs].slice(0, 50);
    this.emit();
  }

  clearLogs() {
    this.logs = [];
    this.emit();
  }

  /** Cancel everything currently playing or pending. */
  cancelAll() {
    this.queue = [];
    this.currentId = null;
    if (this.currentAbort) { this.currentAbort.abort(); this.currentAbort = null; }
    if (this.currentAudio) {
      try { this.currentAudio.pause(); } catch {}
      this.currentAudio = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    this.fetchSeq++;
    this.status = "idle";
    this.emit();
  }

  /** Cancel only if a specific id is currently playing. */
  cancelIfActive(id: string) {
    if (this.currentId === id) this.cancelAll();
  }

  isActive(id: string): boolean {
    return this.currentId === id || this.queue.some((q) => q.id === id);
  }

  /** Enqueue a message for playback. If overrideLatest is true, cancels everything first (latest-wins). */
  async speak(item: QueueItem, opts?: { overrideLatest?: boolean }) {
    const text = cleanForTTS(item.text);
    if (!text || text.length < 3) return;

    if (opts?.overrideLatest) this.cancelAll();

    this.queue.push({ ...item, text });
    this.emit();
    if (!this.currentId) await this.processNext();
  }

  private async processNext() {
    const next = this.queue.shift();
    if (!next) {
      this.status = "idle";
      this.currentId = null;
      this.emit();
      return;
    }
    this.currentId = next.id;
    this.status = "loading";
    this.emit();

    // If ElevenLabs is known to be blocked, skip straight to browser TTS
    if (this.elevenLabsBlocked) {
      this.activeProvider = "browser";
      this.emit();
      await this.playBrowser(next.text);
      this.afterPlayback();
      return;
    }

    const seq = ++this.fetchSeq;
    const abort = new AbortController();
    this.currentAbort = abort;
    const started = Date.now();

    try {
      const isArabic = detectLanguage(next.text) === "ar";
      const autoVoiceId = isArabic
        ? "IKne3meq5aSn9XLyUdCD"   // Charlie - ElevenLabs multilingual voice that handles Arabic
        : "EXAVITQu4vr4xnSDxMaL";  // Sarah - English

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://rlfewneisuezsamhosct.supabase.co";
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

      // Direct binary fetch prevents Supabase-js from decoding binary MP3 into UTF-8 text with \uFFFD replacement chars
      const response = await fetch(`${supabaseUrl}/functions/v1/elevenlabs-tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          text: next.text,
          voiceId: next.voiceId || autoVoiceId,
          modelId: "eleven_multilingual_v2",
        }),
        signal: abort.signal,
      });

      // Stale request — newer one took over
      if (seq !== this.fetchSeq) return;

      if (!response.ok) {
        throw new Error(`TTS edge function HTTP error: ${response.status}`);
      }

      const contentType = response.headers.get("Content-Type") || "";
      if (contentType.includes("application/json")) {
        const json = await response.json();
        if (json?.fallback) {
          this.elevenLabsBlocked = true;
          this.activeProvider = "browser";
          this.addLog({
            textPreview: next.text.slice(0, 60),
            provider: "browser",
            outcome: "fallback",
            durationMs: Date.now() - started,
            error: json?.error || "ElevenLabs fallback returned",
            details: json?.details || "",
          });
          this.emit();
          await this.playBrowser(next.text);
          this.afterPlayback();
          return;
        }
      }

      const blob = await response.blob();
      if (seq !== this.fetchSeq) return;

      if (!blob || blob.size < 100) {
        // Unexpected content — fallback
        this.activeProvider = "browser";
        this.addLog({
          textPreview: next.text.slice(0, 60),
          provider: "browser",
          outcome: "fallback",
          durationMs: Date.now() - started,
          error: "Unexpected audio response size",
        });
        this.emit();
        await this.playBrowser(next.text);
        this.afterPlayback();
        return;
      }

      this.activeProvider = "elevenlabs";
      this.addLog({
        textPreview: next.text.slice(0, 60),
        provider: "elevenlabs",
        outcome: "success",
        durationMs: Date.now() - started,
      });
      await this.playAudio(blob);
      this.afterPlayback();
    } catch (e: any) {
      if (seq !== this.fetchSeq) return;
      this.activeProvider = "browser";
      this.addLog({
        textPreview: next.text.slice(0, 60),
        provider: "unknown",
        outcome: "error",
        durationMs: Date.now() - started,
        error: e?.message || String(e),
      });
      this.emit();
      await this.playBrowser(next.text);
      this.afterPlayback();
    }
  }

  private afterPlayback() {
    this.currentAbort = null;
    this.currentAudio = null;
    this.currentId = null;
    if (this.queue.length > 0) {
      void this.processNext();
    } else {
      this.status = "idle";
      this.emit();
    }
  }

  private playAudio(blob: Blob): Promise<void> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      this.currentAudio = audio;
      this.status = "speaking";
      this.emit();
      audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
      audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
      audio.play().catch(() => { URL.revokeObjectURL(url); resolve(); });
    });
  }

  private getVoicesAsync(): Promise<SpeechSynthesisVoice[]> {
    return new Promise((resolve) => {
      // speechSynthesis does NOT support addEventListener — use onvoiceschanged property
      const immediate = window.speechSynthesis.getVoices();
      if (immediate.length > 0) { resolve(immediate); return; }

      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        window.speechSynthesis.onvoiceschanged = null;
        resolve(window.speechSynthesis.getVoices());
      };

      window.speechSynthesis.onvoiceschanged = finish;
      // Safety timeout — if event never fires
      setTimeout(finish, 2500);
    });
  }

  private playBrowser(text: string): Promise<void> {
    return new Promise(async (resolve) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        resolve(); return;
      }

      window.speechSynthesis.cancel();

      const isEnglish = detectLanguage(text) === "ar" ? false : true;
      const voices = await this.getVoicesAsync();

      const utter = new SpeechSynthesisUtterance(text);

      // Set lang FIRST — this is the most important setting for Arabic
      utter.lang = isEnglish ? "en-US" : "ar-SA";
      utter.rate = isEnglish ? 0.97 : 0.88;
      utter.pitch = 1.0;

      // Try to find a matching voice, but don't fail if none found
      let chosen: SpeechSynthesisVoice | undefined;

      if (this.voicePref.voiceURI) {
        chosen = voices.find((v) => v.voiceURI === this.voicePref.voiceURI);
      }

      if (!chosen) {
        if (isEnglish) {
          chosen =
            voices.find((v) => v.lang === "en-US" && v.localService) ||
            voices.find((v) => v.lang.startsWith("en-US")) ||
            voices.find((v) => v.lang.startsWith("en"));
        } else {
          // Arabic voice search — comprehensive
          chosen =
            voices.find((v) => v.lang === "ar-SA") ||
            voices.find((v) => v.lang === "ar-EG") ||
            voices.find((v) => v.lang === "ar") ||
            voices.find((v) => v.lang.startsWith("ar")) ||
            voices.find((v) => /maged|layla|tarik|salma|naayf|zeina|hoda|arabic/i.test(v.name));
        }
      }

      if (chosen) {
        utter.voice = chosen;
        utter.lang = chosen.lang; // use exact lang from the voice
      }

      this.status = "speaking";
      this.emit();

      utter.onend = () => resolve();
      utter.onerror = (e) => {
        console.warn("[TTS] browser error:", e.error, "lang:", utter.lang, "voice:", utter.voice?.name);
        resolve();
      };

      // Chrome quirk: sometimes speak() silently fails — retry once after short delay
      window.speechSynthesis.speak(utter);

      // Chrome sometimes pauses synthesis on background tab — keep it alive
      const keepAlive = setInterval(() => {
        if (!window.speechSynthesis.speaking) { clearInterval(keepAlive); return; }
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }, 10000);

      utter.onend = () => { clearInterval(keepAlive); resolve(); };
      utter.onerror = () => { clearInterval(keepAlive); resolve(); };
    });
  }
}

export const speechService = new SpeechService();

