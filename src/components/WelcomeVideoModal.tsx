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
  GraduationCap,
  Layers,
  ChevronRight,
  ChevronLeft,
  X,
  Maximize2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import tawzeefLogo from "@/assets/tawzeef-x-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { speechService, cleanForTTS } from "@/lib/speechService";

const WELCOME_NARRATION_TEXT = 
  "أهلاً ومرحباً بك في منصة توظيف إكس. شريكك التنفيذي الذكي لاستقطاب وتقييم أفضل الكفاءات. تم تجهيز بيئة عملك بأحدث تقنيات الذكاء الاصطناعي لأتمتة مسارات التوظيف، فحص وتدقيق السير الذاتية، وإدارة المقابلات الرقمية بكل احترافية. لوحة تحكمك جاهزة الآن، نتمنى لك تجربة توظيف استثنائية.";

interface Scene {
  id: number;
  title: string;
  badge: string;
  description: string;
  highlights: string[];
}

const SCENES: Scene[] = [
  {
    id: 0,
    title: "مرحباً بك في توظيف إكس (Tawzeef-X)",
    badge: "الجيل الأذكى في التوظيف 🌟",
    description: "المنصة السحابية المتكاملة لإدارة واستقطاب الكفاءات التعليمية والمهنية بالذكاء الاصطناعي وفق أعلى المعايير.",
    highlights: ["بوابة موحدة للتوظيف والأوامر", "أتمتة ذكية متكاملة 100%", "معتمد وفق المعايير السعودية 🇸🇦"]
  },
  {
    id: 1,
    title: "محرك الفرز والتقييم الذكي بالـ AI",
    badge: "تقييم استثنائي بدقة 98% ⚡",
    description: "فحص وتدقيق تلقائي للسير الذاتية، استخلاص فوري للمهارات والخبرات ومطابقتها مع معايير الوظيفة الشاغرة.",
    highlights: ["مطابقة فورية بنقرة واحدة", "استخراج وتحليل الرخص المهنية", "توفير أكثر من 80% من وقت الفرز"]
  },
  {
    id: 2,
    title: "مسار التوظيف المتكامل وغرف المقابلات",
    badge: "من التقديم إلى التعيين 🎯",
    description: "لوحة Kanban تفاعلية لتتبع المرشحين، غرف فيديو مدمجة بميزة التسجيل والتفريغ النصي التلقائي، وإصدار العروض الوظيفية الرقمية.",
    highlights: ["مقابلات أونلاين مدمجة وعالية الدقة", "تفريغ وتحليل مشاعر المحادثة", "عقود وعروض وظيفية إلكترونية"]
  },
  {
    id: 3,
    title: "مساحة عملك جاهزة للانطلاق!",
    badge: "ابدأ تجربة التوظيف الآن 🚀",
    description: "تم ضبط كافة الإعدادات والبيانات في لوحة التحكم الخاصة بك. يمكنك البدء فوراً في نشر الوظائف ومتابعة أفضل الكوادر.",
    highlights: ["تقارير وتحليلات أداء حية", "تصدير وطباعة القرارات الرسمية", "دعم فني استشاري مدار الساعة"]
  }
];

const SCENE_DURATION = 8.5; // seconds per scene if running on timer

export default function WelcomeVideoModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentScene, setCurrentScene] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [hasAudioStarted, setHasAudioStarted] = useState(false);
  const [audioDuration, setAudioDuration] = useState(34);
  const [elapsedTime, setElapsedTime] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const audioBlobUrlRef = useRef<string | null>(null);

  // Check on mount whether this is a new login session requiring the welcome video
  useEffect(() => {
    const shouldShow = sessionStorage.getItem("tx_show_welcome_video") === "true";
    if (shouldShow) {
      setIsOpen(true);
    }

    // Allow manual replay from anywhere in the app
    const handleManualOpen = () => {
      setIsOpen(true);
      setCurrentScene(0);
      setProgress(0);
      setElapsedTime(0);
      setIsPlaying(true);
    };

    window.addEventListener("open-welcome-video", handleManualOpen);
    return () => {
      window.removeEventListener("open-welcome-video", handleManualOpen);
    };
  }, []);

  // Fetch ElevenLabs audio as soon as the modal opens
  useEffect(() => {
    if (!isOpen) {
      // Clean up audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (audioBlobUrlRef.current) {
        URL.revokeObjectURL(audioBlobUrlRef.current);
        audioBlobUrlRef.current = null;
      }
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    let isCancelled = false;

    const prepareAudio = async () => {
      try {
        // Try calling ElevenLabs via Supabase edge function
        const { data, error } = await supabase.functions.invoke("elevenlabs-tts", {
          body: {
            text: cleanForTTS(WELCOME_NARRATION_TEXT),
            voiceId: "IKne3meq5aSn9XLyUdCD", // Multilingual authoritative Arabic voice
            modelId: "eleven_multilingual_v2",
          },
        });

        if (isCancelled) return;

        if (error || !data) {
          console.warn("[WelcomeVideo] ElevenLabs error, falling back to speechService:", error);
          fallbackToSpeechService();
          return;
        }

        let audioBlob: Blob;
        if (data instanceof Blob) {
          audioBlob = data;
        } else if (data instanceof ArrayBuffer) {
          audioBlob = new Blob([data], { type: "audio/mpeg" });
        } else if (typeof data === "string") {
          const bytes = new Uint8Array(data.length);
          for (let i = 0; i < data.length; i++) {
            bytes[i] = data.charCodeAt(i) & 0xff;
          }
          audioBlob = new Blob([bytes], { type: "audio/mpeg" });
        } else {
          audioBlob = new Blob([data as any], { type: "audio/mpeg" });
        }

        if (audioBlob.size < 200) {
          fallbackToSpeechService();
          return;
        }

        const url = URL.createObjectURL(audioBlob);
        audioBlobUrlRef.current = url;
        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onloadedmetadata = () => {
          if (audio.duration && !isNaN(audio.duration)) {
            setAudioDuration(Math.ceil(audio.duration));
          }
        };

        audio.onended = () => {
          handleComplete();
        };

        // Try playing
        audio.play().then(() => {
          setHasAudioStarted(true);
        }).catch((playErr) => {
          console.warn("[WelcomeVideo] Autoplay blocked, waiting for user click:", playErr);
          setHasAudioStarted(false);
        });
      } catch (err) {
        console.warn("[WelcomeVideo] Audio load failed, using fallback:", err);
        fallbackToSpeechService();
      }
    };

    const fallbackToSpeechService = () => {
      speechService.speak(
        { id: "welcome-intro", text: WELCOME_NARRATION_TEXT },
        { overrideLatest: true }
      );
    };

    prepareAudio();

    return () => {
      isCancelled = true;
    };
  }, [isOpen]);

  // Main playback timer loop for driving scenes & progress
  useEffect(() => {
    if (!isOpen || !isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const interval = window.setInterval(() => {
      setElapsedTime((prev) => {
        const nextTime = prev + 0.2;
        const totalDuration = audioDuration || (SCENES.length * SCENE_DURATION);
        const currentProgress = Math.min(100, (nextTime / totalDuration) * 100);
        setProgress(currentProgress);

        // Sync scenes based on time elapsed
        const sceneIndex = Math.min(
          SCENES.length - 1,
          Math.floor((nextTime / totalDuration) * SCENES.length)
        );
        setCurrentScene(sceneIndex);

        if (nextTime >= totalDuration) {
          clearInterval(interval);
          handleComplete();
          return totalDuration;
        }

        return nextTime;
      });
    }, 200);

    timerRef.current = interval;

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, isPlaying, audioDuration]);

  // Toggle Play / Pause
  const togglePlayPause = () => {
    if (isPlaying) {
      if (audioRef.current) audioRef.current.pause();
      speechService.cancelAll();
      setIsPlaying(false);
    } else {
      if (audioRef.current) {
        audioRef.current.play().catch(() => {});
      }
      setIsPlaying(true);
    }
  };

  // Toggle Mute / Unmute
  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
    }
    setIsMuted(!isMuted);
  };

  // Manual audio unlock if browser autoplay prevented audio initially
  const handleUserClickToPlay = () => {
    if (audioRef.current) {
      audioRef.current.play().then(() => {
        setHasAudioStarted(true);
      }).catch(console.error);
    }
  };

  // When video completes or is skipped
  const handleComplete = useCallback(() => {
    // Dismiss and mark viewed for this session
    sessionStorage.removeItem("tx_show_welcome_video");
    sessionStorage.setItem("tx_welcome_video_viewed", "true");

    if (audioRef.current) {
      audioRef.current.pause();
    }
    speechService.cancelAll();

    // Trigger celebration confetti
    try {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#10b981", "#06b6d4", "#6366f1", "#f59e0b"]
      });
    } catch {}

    setIsOpen(false);
  }, []);

  // Keyboard shortcut: Esc to dismiss
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
  const formattedMinutes = Math.floor(elapsedTime / 60).toString().padStart(2, "0");
  const formattedSeconds = Math.floor(elapsedTime % 60).toString().padStart(2, "0");
  const totalMinutes = Math.floor(audioDuration / 60).toString().padStart(2, "0");
  const totalSeconds = Math.floor(audioDuration % 60).toString().padStart(2, "0");

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        transition={{ duration: 0.4 }}
        className="fixed inset-0 z-[99999] flex flex-col justify-between bg-slate-950/98 backdrop-blur-2xl text-white select-none overflow-hidden"
        dir="rtl"
      >
        {/* Background Ambient Cosmic Glows */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] right-[-10%] w-[650px] h-[650px] rounded-full bg-emerald-500/15 blur-[160px] animate-pulse" style={{ animationDuration: "8s" }} />
          <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-cyan-500/15 blur-[150px] animate-pulse" style={{ animationDuration: "10s" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[180px]" />
          
          {/* Subtle Cybernetic Grid */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
              backgroundSize: "40px 40px"
            }}
          />
        </div>

        {/* Top Progress Bar */}
        <div className="relative z-20 w-full bg-white/10 h-1.5 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]"
            style={{ width: `${progress}%` }}
            transition={{ ease: "linear" }}
          />
        </div>

        {/* Top Navigation & Status Bar */}
        <header className="relative z-20 flex items-center justify-between px-6 py-5 sm:px-12 border-b border-white/10 bg-slate-950/40 backdrop-blur-md">
          {/* Logo & Voiceover Badge */}
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-white/10 p-2 border border-white/20 shadow-lg flex items-center justify-center">
              <img src={tawzeefLogo} alt="Tawzeef-X" className="w-7 h-7 object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg text-white tracking-wide">Tawzeef-X</span>
                <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold gap-1 px-2.5 py-0.5">
                  <Sparkles className="w-3 h-3 animate-spin" style={{ animationDuration: "4s" }} />
                  ElevenLabs AI Voice 🎙️
                </Badge>
              </div>
              <p className="text-white/60 text-xs mt-0.5">فيديو ترحيبي تفاعلي لبدء الجلسة</p>
            </div>
          </div>

          {/* Real-time Sound Equalizer & Skip Button */}
          <div className="flex items-center gap-3">
            {/* Audio Wave Visualizer */}
            <div className="hidden sm:flex items-center gap-1 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
              {[0.4, 0.9, 0.6, 1.0, 0.5, 0.8, 0.3, 0.7].map((heightRatio, i) => (
                <motion.div
                  key={i}
                  className="w-1 bg-emerald-400 rounded-full"
                  animate={{
                    height: isPlaying ? [heightRatio * 18, (1 - heightRatio) * 18 + 4, heightRatio * 18] : 4
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 0.6 + (i * 0.1),
                    ease: "easeInOut"
                  }}
                />
              ))}
              <span className="text-[10px] text-emerald-300 font-mono font-bold mr-2">
                {formattedMinutes}:{formattedSeconds} / {totalMinutes}:{totalSeconds}
              </span>
            </div>

            {/* Audio Mute/Unmute */}
            <button
              onClick={toggleMute}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 transition-colors text-white"
              title={isMuted ? "تشغيل الصوت" : "كتم الصوت"}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>

            {/* Skip Button */}
            <Button
              variant="outline"
              onClick={handleComplete}
              className="gap-2 rounded-xl bg-white/10 hover:bg-white/20 border-white/20 text-white font-bold text-xs h-10 px-4 shadow-lg transition-all"
            >
              <span>تخطي والبدء فوراً</span>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* Main Center Video Reel Canvas */}
        <main className="relative z-20 flex-1 flex flex-col items-center justify-center p-6 sm:p-12 max-w-5xl mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentScene}
              initial={{ opacity: 0, y: 25, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -25, scale: 0.96 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="w-full text-center flex flex-col items-center"
            >
              {/* Scene Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="mb-4"
              >
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs sm:text-sm font-bold shadow-lg shadow-emerald-500/5">
                  <Sparkles className="w-3.5 h-3.5" />
                  {currentSceneData.badge}
                </span>
              </motion.div>

              {/* Scene Dynamic Main Visual */}
              <div className="relative my-4 sm:my-6 w-full max-w-2xl min-h-[220px] flex items-center justify-center">
                {currentScene === 0 && (
                  <motion.div
                    className="relative flex flex-col items-center justify-center"
                    animate={{ y: [0, -6, 0] }}
                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                  >
                    {/* Glowing holographic orb */}
                    <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl bg-gradient-to-tr from-emerald-500/20 via-cyan-500/30 to-indigo-500/20 border border-emerald-400/40 backdrop-blur-xl p-5 shadow-[0_0_50px_rgba(16,185,129,0.3)] flex items-center justify-center relative">
                      <img src={tawzeefLogo} alt="Tawzeef-X" className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]" />
                      <div className="absolute -top-3 -right-3 bg-emerald-500 text-slate-950 font-black text-[10px] px-2.5 py-1 rounded-full shadow-lg">
                        v2.2 AI
                      </div>
                    </div>
                  </motion.div>
                )}

                {currentScene === 1 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
                    {/* Radar AI Score */}
                    <div className="p-4 rounded-2xl bg-white/5 border border-emerald-500/30 backdrop-blur-md flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0 border border-emerald-500/40">
                        <Bot className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div className="text-right flex-1">
                        <div className="text-2xl font-black text-emerald-400">98%</div>
                        <p className="text-xs text-white/70">مطابقة دقيقة للشواغر</p>
                      </div>
                    </div>

                    {/* Resume Parser */}
                    <div className="p-4 rounded-2xl bg-white/5 border border-cyan-500/30 backdrop-blur-md flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center shrink-0 border border-cyan-500/40">
                        <ShieldCheck className="w-6 h-6 text-cyan-400" />
                      </div>
                      <div className="text-right flex-1">
                        <div className="text-2xl font-black text-cyan-400">فوري ⚡</div>
                        <p className="text-xs text-white/70">تحليل رخص ومعايير ETEC</p>
                      </div>
                    </div>
                  </div>
                )}

                {currentScene === 2 && (
                  <div className="w-full max-w-xl bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
                    <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2 text-xs">
                      {["تقديم الطلب 📄", "الفحص والفرز 🔍", "المقابلة الذكية 🎥", "العرض الوظيفي 🏅"].map((step, idx) => (
                        <div key={idx} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold border shrink-0 ${idx === 2 ? 'bg-emerald-500/25 border-emerald-500/50 text-emerald-300 shadow-md' : 'bg-white/5 border-white/10 text-white/60'}`}>
                          <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">{idx + 1}</span>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {currentScene === 3 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-xl">
                    {[
                      { num: "1,250+", label: "وظيفة نشطة", icon: Briefcase, color: "text-emerald-400" },
                      { num: "85K+", label: "مرشح مسجل", icon: Users, color: "text-cyan-400" },
                      { num: "99.9%", label: "وقت الجاهزية", icon: Zap, color: "text-amber-400" },
                      { num: "3X", label: "سرعة في التعيين", icon: Sparkles, color: "text-indigo-400" },
                    ].map((stat, i) => (
                      <div key={i} className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-center">
                        <stat.icon className={`w-5 h-5 mx-auto mb-1 ${stat.color}`} />
                        <div className={`text-lg font-black ${stat.color}`}>{stat.num}</div>
                        <div className="text-[10px] text-white/60 font-medium">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Scene Title */}
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight max-w-2xl leading-tight">
                {currentSceneData.title}
              </h2>

              {/* Scene Narrative Subtitle */}
              <p className="text-white/70 text-sm sm:text-base max-w-xl mt-3 leading-relaxed">
                {currentSceneData.description}
              </p>

              {/* Highlights Chips */}
              <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
                {currentSceneData.highlights.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/10 border border-white/15 text-xs font-semibold text-white/90"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    {item}
                  </span>
                ))}
              </div>

              {/* Prompt to play audio if browser blocked initial autoplay */}
              {!hasAudioStarted && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4"
                >
                  <Button
                    size="sm"
                    onClick={handleUserClickToPlay}
                    className="gap-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs px-4"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    انقر هنا لتفعيل الصوت الترحيبي 🔊
                  </Button>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Bottom Interactive Control Footer */}
        <footer className="relative z-20 px-6 py-6 sm:px-12 border-t border-white/10 bg-slate-950/60 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Scene Carousel Indicators */}
          <div className="flex items-center gap-2">
            {SCENES.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => {
                  setCurrentScene(idx);
                  const total = audioDuration || (SCENES.length * SCENE_DURATION);
                  setElapsedTime((idx / SCENES.length) * total);
                }}
                className={`h-2 transition-all rounded-full ${currentScene === idx ? 'w-8 bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'w-2.5 bg-white/20 hover:bg-white/40'}`}
                title={s.title}
              />
            ))}
          </div>

          {/* Subtitles Quote Bar */}
          <div className="text-center sm:text-right text-xs text-white/60 max-w-md hidden md:block">
            <span className="text-emerald-400 font-bold ml-1.5">🎙️ التعليق الصوتي:</span>
            <span>{currentScene === 0 ? "أهلاً بك في توظيف إكس، شريكك الذكي في التوظيف..." : currentScene === 1 ? "فحص وتدقيق تلقائي للسير الذاتية ومطابقة المهارات..." : currentScene === 2 ? "إدارة مسار التوظيف والمقابلات الرقمية المتكاملة..." : "لوحة تحكمك جاهزة الآن، نتمنى لك تجربة موفقة..."}</span>
          </div>

          {/* Play/Pause and Primary CTA */}
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlayPause}
              className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white transition-all shadow-md"
              title={isPlaying ? "إيقاف مؤقت" : "متابعة التشغيل"}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 text-emerald-400" />}
            </button>

            <Button
              onClick={handleComplete}
              className="rounded-2xl px-6 h-12 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-slate-950 font-black shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all transform hover:scale-[1.02]"
            >
              <span>{currentScene === SCENES.length - 1 ? "الدخول للوحة التحكم 🚀" : "بدء استخدام المنصة الآن"}</span>
              <ArrowLeft className="w-4 h-4 mr-2" />
            </Button>
          </div>
        </footer>
      </motion.div>
    </AnimatePresence>
  );
}
