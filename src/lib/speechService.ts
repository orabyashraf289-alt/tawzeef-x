// Centralized speech service: throttles requests, queues playback, logs everything,
// and gracefully falls back to the browser's SpeechSynthesis API.
import { supabase } from "@/integrations/supabase/client";

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
      const { data, error } = await supabase.functions.invoke("elevenlabs-tts", {
        body: { text: next.text, voiceId: next.voiceId || "EXAVITQu4vr4xnSDxMaL" },
      });
      // Stale request — newer one took over
      if (seq !== this.fetchSeq) return;

      if (error) throw error;

      // Detect fallback JSON
      let fallback = false;
      let errMsg = "";
      let details = "";
      if (data instanceof Blob && data.type.includes("application/json")) {
        const j = JSON.parse(await data.text());
        fallback = !!j?.fallback;
        errMsg = j?.error || "";
        details = j?.details || "";
      } else if (data && typeof data === "object" && !(data instanceof Blob) && (data as any).fallback) {
        fallback = true;
        errMsg = (data as any).error || "";
        details = (data as any).details || "";
      }

      if (fallback) {
        this.elevenLabsBlocked = true;
        this.activeProvider = "browser";
        this.addLog({
          textPreview: next.text.slice(0, 60),
          provider: "browser",
          outcome: "fallback",
          durationMs: Date.now() - started,
          error: errMsg,
          details,
        });
        this.emit();
        await this.playBrowser(next.text);
        this.afterPlayback();
        return;
      }

      const blob = data instanceof Blob ? data : new Blob([data as BlobPart], { type: "audio/mpeg" });
      if (!blob.type.includes("audio")) {
        // Unexpected content — fallback
        this.activeProvider = "browser";
        this.addLog({
          textPreview: next.text.slice(0, 60),
          provider: "browser",
          outcome: "fallback",
          durationMs: Date.now() - started,
          error: "Unexpected content type",
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

  private playBrowser(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        resolve(); return;
      }
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      let chosen: SpeechSynthesisVoice | undefined;
      if (this.voicePref.voiceURI) {
        chosen = voices.find((v) => v.voiceURI === this.voicePref.voiceURI);
      }
      if (!chosen) chosen = voices.find((v) => v.lang.startsWith("ar"));
      if (chosen) utter.voice = chosen;
      utter.lang = chosen?.lang || this.voicePref.lang || "ar-SA";
      utter.rate = this.voicePref.rate || 0.95;
      utter.onend = () => resolve();
      utter.onerror = () => resolve();
      this.status = "speaking";
      this.emit();
      window.speechSynthesis.speak(utter);
    });
  }
}

export const speechService = new SpeechService();
