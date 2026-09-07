import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import {
  Sparkles,
  Volume2,
  VolumeX,
  Play,
  Pause,
  ArrowLeft,
  CheckCircle2,
  Bot,
  Video,
  Users,
  Briefcase,
  Zap,
  ShieldCheck,
  X,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import tawzeefLogo from "@/assets/tawzeef-x-logo.png";
import { speechService, cleanForTTS } from "@/lib/speechService";

const WELCOME_NARRATION_TEXT = 
  "أهلاً ومرحباً بك في منصة توظيف إكس. شريكك التنفيذي الذكي لاستقطاب وتقييم أفضل الكفاءات. تم تجهيز بيئة عملك بأحدث تقنيات الذكاء الاصطناعي لأتمتة مسارات التوظيف، فحص وتدقيق السير الذاتية، وإدارة المقابلات الرقمية بكل احترافية. لوحة تحكمك جاهزة الآن، نتمنى لك تجربة توظيف استثنائية.";

interface Scene {
  id: number;
  title: string;
  badge: string;
  description: string;
  subtitle: string;
  highlights: string[];
}

const SCENES: Scene[] = [
  {
    id: 0,
    title: "مرحباً بك في منصة توظيف إكس",
    badge: "الجيل الأذكى في التوظيف 🇸🇦",
    description: "المنصة السحابية المتقدمة لإدارة واستقطاب الكفاءات التعليمية والمهنية بالذكاء الاصطناعي وفق أرقى المعايير.",
    subtitle: "أهلاً ومرحباً بك في منصة توظيف إكس، شريكك التنفيذي الذكي...",
    highlights: ["بوابة موحدة للتوظيف وأوامر التعيين", "أتمتة شاملة لمسارات العمل", "معتمد ومتوافق مع المعايير السعودية"]
  },
  {
    id: 1,
    title: "محرك الفرز والتقييم الذكي بالـ AI",
    badge: "مطابقة فورية بدقة 98% ⚡",
    description: "فحص وتدقيق فوري للسير الذاتية، استخلاص المهارات والخبرات ومطابقة الرخص المهنية المعتمدة.",
    subtitle: "تم تجهيز بيئة عملك بأحدث تقنيات الذكاء الاصطناعي لأتمتة التوظيف...",
    highlights: ["مطابقة المؤهلات والرخص المهنية", "تحليل الرغبات والتفضيلات الجغرافية", "توفير 80% من الجهد اليدوي"]
  },
  {
    id: 2,
    title: "مسار توظيف متكامل وغرف مقابلات ذكية",
    badge: "من التقديم إلى الاعتماد 🎥",
    description: "لوحة Kanban تفاعلية لتتبع المرشحين مع غرف فيديو مدمجة تدعم التسجيل والتفريغ النصي التلقائي.",
    subtitle: "فحص وتدقيق السير الذاتية، وإدارة المقابلات الرقمية باحترافية...",
    highlights: ["مقابلات أونلاين فائقة الدقة", "تفريغ صوتي وتحليل مشاعر المحادثة", "عروض وظيفية رقمية وتوقيع إلكتروني"]
  },
  {
    id: 3,
    title: "مساحة عملك جاهزة للانطلاق!",
    badge: "جاهزية كاملة 100% 🚀",
    description: "تم ضبط إعداداتك ومؤشراتك الحيوية. يمكنك الآن البدء مباشرة في نشر الوظائف واستقطاب أفضل الكوادر.",
    subtitle: "لوحة تحكمك جاهزة الآن، نتمنى لك تجربة توظيف استثنائية...",
    highlights: ["تقارير وتحليلات أداء لحظية", "تصدير القرارات وطباعتها بنقرة واحدة", "دعم فني استشاري مدار الساعة"]
  }
];

export default function WelcomeVideoModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentScene, setCurrentScene] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioStatus, setAudioStatus] = useState<"idle" | "loading" | "ready" | "playing" | "error">("idle");
  const [userWantsPlay, setUserWantsPlay] = useState(false);
  const [duration, setDuration] = useState(23);
  const [currentTime, setCurrentTime] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioBlobUrlRef = useRef<string | null>(null);
  const timerFallbackRef = useRef<number | null>(null);

  // Check on mount if welcome video should show
  useEffect(() => {
    const shouldShow = sessionStorage.getItem("tx_show_welcome_video") === "true";
    if (shouldShow) {
      setIsOpen(true);
    }

    const handleManualOpen = () => {
      setIsOpen(true);
      setCurrentScene(0);
      setProgress(0);
      setCurrentTime(0);
      setIsPlaying(false);
      setUserWantsPlay(false);
    };

    window.addEventListener("open-welcome-video", handleManualOpen);
    return () => {
      window.removeEventListener("open-welcome-video", handleManualOpen);
    };
  }, []);

  // Fetch ElevenLabs audio via direct fetch to get a clean uncorrupted Blob
  useEffect(() => {
    if (!isOpen) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (audioBlobUrlRef.current) {
        URL.revokeObjectURL(audioBlobUrlRef.current);
        audioBlobUrlRef.current = null;
      }
      if (timerFallbackRef.current) {
        clearInterval(timerFallbackRef.current);
        timerFallbackRef.current = null;
      }
      speechService.cancelAll();
      setAudioStatus("idle");
      setIsPlaying(false);
      return;
    }

    let isCancelled = false;
    setAudioStatus("loading");

    const fetchAudioDirectly = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://rlfewneisuezsamhosct.supabase.co";
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

        // Direct fetch to edge function prevents Supabase-js from calling response.text() on binary MP3
        const response = await fetch(`${supabaseUrl}/functions/v1/elevenlabs-tts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            text: cleanForTTS(WELCOME_NARRATION_TEXT),
            voiceId: "IKne3meq5aSn9XLyUdCD", // Natural Arabic voice (Charlie Multilingual)
            modelId: "eleven_multilingual_v2",
          }),
        });

        if (isCancelled) return;

        if (!response.ok) {
          throw new Error(`TTS edge function HTTP error: ${response.status}`);
        }

        const contentType = response.headers.get("Content-Type") || "";
        if (contentType.includes("application/json")) {
          const json = await response.json();
          if (json?.fallback) {
            throw new Error(json?.error || "ElevenLabs fallback returned");
          }
        }

        // Get pure binary blob
        const blob = await response.blob();
        if (isCancelled) return;

        if (blob && blob.size > 2000) {
          const url = URL.createObjectURL(blob);
          audioBlobUrlRef.current = url;
          const audio = new Audio(url);
          audioRef.current = audio;

          audio.onloadedmetadata = () => {
            if (audio.duration && !isNaN(audio.duration)) {
              setDuration(audio.duration);
            }
            setAudioStatus("ready");
          };

          // Synchronize progress and scene changes directly with audio time
          audio.ontimeupdate = () => {
            if (audio.duration) {
              const cur = audio.currentTime;
              setCurrentTime(cur);
              const pct = (cur / audio.duration) * 100;
              setProgress(pct);
              const sceneIdx = Math.min(3, Math.floor((cur / audio.duration) * SCENES.length));
              setCurrentScene(sceneIdx);
            }
          };

          audio.onended = () => {
            handleComplete();
          };

          audio.onerror = (e) => {
            console.warn("[WelcomeVideo] HTML5 Audio error:", e);
            setAudioStatus("error");
          };

          // Attempt autoplay
          audio.play().then(() => {
            setIsPlaying(true);
            setAudioStatus("playing");
          }).catch(() => {
            // Autoplay blocked by Chrome policy — ready for single user tap
            setAudioStatus("ready");
            setIsPlaying(false);
          });
        } else {
          setAudioStatus("ready");
        }
      } catch (err) {
        console.warn("[WelcomeVideo] Direct fetch failed, fallback ready:", err);
        setAudioStatus("ready");
      }
    };

    fetchAudioDirectly();

    return () => {
      isCancelled = true;
    };
  }, [isOpen]);

  // If user requested play while audio was still loading, play as soon as ready
  useEffect(() => {
    if (userWantsPlay && audioStatus === "ready" && !isPlaying) {
      startPlayback();
    }
  }, [userWantsPlay, audioStatus, isPlaying]);

  // Primary start playback handler
  const startPlayback = () => {
    setUserWantsPlay(true);
    if (audioRef.current) {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        setAudioStatus("playing");
      }).catch((err) => {
        console.warn("[WelcomeVideo] audio play error, falling back to speech synthesis:", err);
        speechService.speak(
          { id: "welcome-tour", text: WELCOME_NARRATION_TEXT },
          { overrideLatest: true }
        );
        startTimerDriver(23);
      });
    } else if (audioStatus === "loading") {
      // Audio is downloading — intent recorded, set a safety timeout in case network hangs
      setTimeout(() => {
        if (!audioRef.current) {
          speechService.speak(
            { id: "welcome-tour", text: WELCOME_NARRATION_TEXT },
            { overrideLatest: true }
          );
          startTimerDriver(23);
        }
      }, 4000);
    } else {
      speechService.speak(
        { id: "welcome-tour", text: WELCOME_NARRATION_TEXT },
        { overrideLatest: true }
      );
      startTimerDriver(23);
    }
  };

  // Timer driver if audio element is missing
  const startTimerDriver = (totalSec: number) => {
    setIsPlaying(true);
    setAudioStatus("playing");
    let sec = 0;
    if (timerFallbackRef.current) clearInterval(timerFallbackRef.current);
    timerFallbackRef.current = window.setInterval(() => {
      sec += 0.25;
      setCurrentTime(sec);
      const pct = (sec / totalSec) * 100;
      setProgress(pct);
      const sceneIdx = Math.min(3, Math.floor((sec / totalSec) * SCENES.length));
      setCurrentScene(sceneIdx);
      if (sec >= totalSec) {
        clearInterval(timerFallbackRef.current!);
        handleComplete();
      }
    }, 250);
  };

  // Toggle Play / Pause
  const togglePlayPause = () => {
    if (isPlaying) {
      if (audioRef.current) audioRef.current.pause();
      if (timerFallbackRef.current) clearInterval(timerFallbackRef.current);
      speechService.cancelAll();
      setIsPlaying(false);
    } else {
      startPlayback();
    }
  };

  // Toggle Mute / Unmute
  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
    }
    setIsMuted(!isMuted);
  };

  // Complete and dismiss
  const handleComplete = useCallback(() => {
    sessionStorage.removeItem("tx_show_welcome_video");
    sessionStorage.setItem("tx_welcome_video_viewed", "true");

    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (timerFallbackRef.current) {
      clearInterval(timerFallbackRef.current);
    }
    speechService.cancelAll();

    try {
      confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.6 },
        colors: ["#059669", "#10b981", "#34d399", "#f59e0b"]
      });
    } catch {}

    setIsOpen(false);
  }, []);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleComplete();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleComplete]);

  if (!isOpen) return null;

  const currentSceneData = SCENES[currentScene] || SCENES[0];
  const curMin = Math.floor(currentTime / 60).toString().padStart(2, "0");
  const curSec = Math.floor(currentTime % 60).toString().padStart(2, "0");
  const totMin = Math.floor(duration / 60).toString().padStart(2, "0");
  const totSec = Math.floor(duration % 60).toString().padStart(2, "0");

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/70 backdrop-blur-xl p-3 sm:p-6 overflow-y-auto"
        dir="rtl"
      >
        {/* Cinema Presentation Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl border border-emerald-500/20 bg-gradient-to-b from-white via-slate-50 to-emerald-50/25 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/30 text-slate-800 dark:text-slate-100 flex flex-col my-auto"
        >
          {/* Top Progress Gradient Bar */}
          <div className="w-full bg-slate-200/80 dark:bg-slate-800 h-1.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]"
              style={{ width: `${progress}%`, transition: "width 200ms linear" }}
            />
          </div>

          {/* Header Bar */}
          <div className="px-5 sm:px-8 py-3.5 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between bg-white/70 dark:bg-slate-900/70 backdrop-blur-md">
            {/* Platform Identity */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-500/20 p-2 flex items-center justify-center shadow-xs">
                <img src={tawzeefLogo} alt="Tawzeef-X" className="w-6 h-6 object-contain" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-base sm:text-lg text-slate-900 dark:text-white">Tawzeef-X</span>
                  <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-bold py-0.5 px-2">
                    الذكاء الاصطناعي نشط
                  </Badge>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-xs hidden sm:block">جولة تقديمية تفاعلية للوحة التحكم</p>
              </div>
            </div>

            {/* Audio Waveform & Actions */}
            <div className="flex items-center gap-2.5">
              {/* Animated Equalizer */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-200/60 dark:border-white/10">
                <div className="flex items-center gap-0.5 h-4">
                  {[0.3, 0.8, 0.5, 1.0, 0.6, 0.4].map((ratio, idx) => (
                    <motion.div
                      key={idx}
                      className="w-1 bg-emerald-600 dark:bg-emerald-400 rounded-full"
                      animate={{
                        height: isPlaying ? [ratio * 16, (1 - ratio) * 16 + 3, ratio * 16] : 3
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 0.45 + idx * 0.08,
                        ease: "easeInOut"
                      }}
                    />
                  ))}
                </div>
                <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300 mr-1.5" dir="ltr">
                  {curMin}:{curSec} / {totMin}:{totSec}
                </span>
              </div>

              {/* Mute/Unmute */}
              <button
                onClick={toggleMute}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-white/10 transition-colors text-slate-700 dark:text-slate-200"
                title={isMuted ? "تشغيل الصوت" : "كتم الصوت"}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
              </button>

              {/* Skip Button */}
              <Button
                variant="ghost"
                onClick={handleComplete}
                className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white h-9 px-3 rounded-xl gap-1"
              >
                <span>تخطي</span>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Central Interactive Cinema Screen */}
          <div className="relative p-6 sm:p-8 flex flex-col items-center justify-center min-h-[360px] sm:min-h-[400px]">
            {/* Audio Start / Unlock Overlay — only before first play */}
            {!isPlaying && currentTime === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
              >
                <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-4 text-emerald-600 dark:text-emerald-400 shadow-lg">
                  {userWantsPlay || audioStatus === "loading" ? (
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                  ) : (
                    <Volume2 className="w-8 h-8 animate-bounce" />
                  )}
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-2">
                  {userWantsPlay ? "جاري التجهيز والبدء فوراً..." : audioStatus === "loading" ? "جاري تحضير التعليق الصوتي..." : "جاهز لبدء العرض الترحيبي مع الصوت"}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mb-6 leading-relaxed">
                  استمع للموجز الترحيبي الذكي بصوت طبيعي وتقنية ElevenLabs وتعرّف على مزايا لوحة التحكم وسير العمل.
                </p>
                <Button
                  size="lg"
                  onClick={startPlayback}
                  disabled={userWantsPlay}
                  className="rounded-2xl px-8 h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-xl shadow-emerald-500/20 gap-2.5 transition-all transform hover:scale-[1.02]"
                >
                  {userWantsPlay ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري البدء...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-white" />
                      <span>بدء العرض التقديمي مع الصوت 🔊</span>
                    </>
                  )}
                </Button>
              </motion.div>
            )}

            {/* Mid-playback Pause Overlay */}
            {!isPlaying && currentTime > 0 && (
              <div
                onClick={startPlayback}
                className="absolute inset-0 z-20 bg-black/25 backdrop-blur-[2px] flex items-center justify-center cursor-pointer transition-all"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-600/90 text-white flex items-center justify-center shadow-2xl hover:scale-110 transition-transform">
                  <Play className="w-7 h-7 fill-white mr-0.5" />
                </div>
              </div>
            )}

            {/* Stage Content — Instant Lag-Free Transition */}
            <motion.div
              key={currentScene}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="w-full flex flex-col items-center text-center max-w-2xl"
            >
              {/* Scene Badge */}
              <div className="mb-3">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  {currentSceneData.badge}
                </span>
              </div>

              {/* Scene Graphic Representation */}
              <div className="my-2 sm:my-4 w-full flex items-center justify-center">
                {currentScene === 0 && (
                  <div className="p-5 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 shadow-lg flex flex-col items-center justify-center relative max-w-md w-full">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-emerald-500/10 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center mb-2.5 shadow-inner">
                      <img src={tawzeefLogo} alt="Tawzeef-X" className="w-10 h-10 sm:w-12 sm:h-12 object-contain" />
                    </div>
                    <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">توظيف إكس • Tawzeef-X</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">نظام التوظيف وإدارة الكفاءات الذكي المعتمد</span>
                  </div>
                )}

                {currentScene === 1 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full max-w-lg">
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-emerald-500/30 shadow-xs text-right flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-500/30 flex items-center justify-center shrink-0">
                        <Bot className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">98% تطابق</div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">مطابقة دقيقة لمتطلبات الشاغر</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-amber-500/30 shadow-xs text-right flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-500/30 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <div className="text-xl font-black text-amber-600 dark:text-amber-400">تدقيق فوري</div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">الرخص المهنية والشهادات ETEC</p>
                      </div>
                    </div>
                  </div>
                )}

                {currentScene === 2 && (
                  <div className="w-full max-w-lg bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 shadow-xs">
                    <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold">
                      <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700/50 border border-slate-200/60 dark:border-white/5">
                        <div className="text-[10px] text-slate-400 mb-1">المرحلة 1</div>
                        <div>تقديم الطلب 📄</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700/50 border border-slate-200/60 dark:border-white/5">
                        <div className="text-[10px] text-slate-400 mb-1">المرحلة 2</div>
                        <div>فرز بالـ AI ⚡</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300">
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mb-1">المرحلة 3</div>
                        <div>مقابلة فيديو 🎥</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700/50 border border-slate-200/60 dark:border-white/5">
                        <div className="text-[10px] text-slate-400 mb-1">المرحلة 4</div>
                        <div>عرض وظيفي 🏅</div>
                      </div>
                    </div>
                  </div>
                )}

                {currentScene === 3 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-lg">
                    {[
                      { num: "1,250+", label: "وظيفة نشطة", icon: Briefcase, color: "text-emerald-600 dark:text-emerald-400" },
                      { num: "85K+", label: "مرشح مؤهل", icon: Users, color: "text-teal-600 dark:text-teal-400" },
                      { num: "99.9%", label: "جاهزية النظام", icon: Zap, color: "text-amber-600 dark:text-amber-400" },
                      { num: "80%", label: "توفير الوقت", icon: Sparkles, color: "text-indigo-600 dark:text-indigo-400" },
                    ].map((stat, i) => (
                      <div key={i} className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 shadow-2xs text-center">
                        <stat.icon className={`w-4 h-4 mx-auto mb-1 ${stat.color}`} />
                        <div className={`text-base font-black ${stat.color}`}>{stat.num}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Scene Title */}
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                {currentSceneData.title}
              </h2>

              {/* Scene Description */}
              <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm max-w-lg mt-1.5 leading-relaxed">
                {currentSceneData.description}
              </p>

              {/* Highlights Tags */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mt-3.5">
                {currentSceneData.highlights.map((h, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-[11px] font-semibold text-slate-700 dark:text-slate-200"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    {h}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Footer Bar */}
          <div className="px-5 sm:px-8 py-3.5 border-t border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
            {/* Scene Stepper Dots */}
            <div className="flex items-center gap-1.5">
              {SCENES.map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setCurrentScene(idx);
                    if (audioRef.current && audioRef.current.duration) {
                      audioRef.current.currentTime = (idx / SCENES.length) * audioRef.current.duration;
                    }
                  }}
                  className={`h-2 rounded-full transition-all ${currentScene === idx ? "w-7 bg-emerald-600 dark:bg-emerald-400 shadow-xs" : "w-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400"}`}
                  title={s.title}
                />
              ))}
            </div>

            {/* Live Subtitle Narration Snippet */}
            <div className="text-center sm:text-right text-xs text-slate-500 dark:text-slate-400 hidden sm:flex items-center gap-1.5 max-w-md">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">🎙️ الراوي:</span>
              <span className="truncate">{currentSceneData.subtitle}</span>
            </div>

            {/* Play/Pause & Enter Dashboard CTA */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <Button
                variant="outline"
                size="icon"
                onClick={togglePlayPause}
                className="h-10 w-10 rounded-xl border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                title={isPlaying ? "إيقاف مؤقت" : "تشغيل"}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 text-emerald-600 fill-emerald-600" />}
              </Button>

              <Button
                onClick={handleComplete}
                className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 gap-2 flex-1 sm:flex-initial"
              >
                <span>{currentScene === SCENES.length - 1 ? "الدخول للوحة التحكم 🚀" : "بدء الاستخدام الآن"}</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}


