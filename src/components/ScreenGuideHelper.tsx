import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  HelpCircle,
  X,
  Sparkles,
  ChevronDown,
  ChevronLeft,
  CheckCircle2,
  Copy,
  Check,
  Search,
  ExternalLink,
  Lightbulb,
  ArrowRight,
  Minimize2,
  Maximize2,
  BookOpen,
  MousePointerClick,
  Layers,
  HelpCircle as QuestionIcon,
  Zap,
  Volume2,
  VolumeX,
  Columns,
  PanelRightClose,
  Trophy,
  RotateCcw,
  CheckCheck,
  Compass,
  Briefcase,
  Bot,
  BarChart3,
  Shield,
  Filter
} from "lucide-react";
import confetti from "canvas-confetti";
import { useI18n } from "@/contexts/I18nContext";
import { useToast } from "@/hooks/use-toast";
import { SCREEN_GUIDES, getGuideForPath, ScreenGuideItem } from "@/data/screenGuidesData";
import { cn } from "@/lib/utils";

export const GUIDE_CATEGORIES = [
  { id: "all", labelAr: "كافة الشاشات", labelEn: "All Screens", icon: Layers },
  { id: "core", labelAr: "الأساسية والتوظيف", labelEn: "Core Hiring", icon: Briefcase },
  { id: "ai", labelAr: "الذكاء الاصطناعي", labelEn: "AI Engines", icon: Bot },
  { id: "performance", labelAr: "التقييم والتقارير", labelEn: "Performance", icon: BarChart3 },
  { id: "admin", labelAr: "الإدارة والنظام", labelEn: "Admin & Settings", icon: Shield },
] as const;

export default function ScreenGuideHelper() {
  const location = useLocation();
  const navigate = useNavigate();
  const { locale, dir } = useI18n();
  const { toast } = useToast();

  const isEn = locale === "en";

  // Active guide (detected from URL by default)
  const currentDetectedGuide = useMemo(
    () => getGuideForPath(location.pathname),
    [location.pathname]
  );

  const [isOpen, setIsOpen] = useState(false);
  const [selectedGuideId, setSelectedGuideId] = useState<string>(currentDetectedGuide.id);
  const [activeTab, setActiveTab] = useState<"steps" | "buttons" | "tips" | "all">("steps");
  
  // View Mode: "modal" (center popup) vs "drawer" (side-docked panel)
  const [viewMode, setViewMode] = useState<"modal" | "drawer">(() => {
    return (localStorage.getItem("tx_guide_view_mode") as "modal" | "drawer") || "modal";
  });

  const [isMinimized, setIsMinimized] = useState<boolean>(() => {
    return localStorage.getItem("tx_guide_minimized") === "true";
  });

  const [completedSteps, setCompletedSteps] = useState<Record<string, number[]>>(() => {
    try {
      const saved = localStorage.getItem("tx_guide_completed_steps");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Sync selected guide when path changes
  useEffect(() => {
    setSelectedGuideId(currentDetectedGuide.id);
  }, [currentDetectedGuide.id]);

  // Stop voice speech when closing, changing screen, or switching language
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isOpen, selectedGuideId, isEn]);

  // Listen to custom event to open guide from Header or elsewhere
  useEffect(() => {
    const handleOpenEvent = () => setIsOpen(true);
    window.addEventListener("open-screen-guide", handleOpenEvent);
    return () => window.removeEventListener("open-screen-guide", handleOpenEvent);
  }, []);

  // Keyboard shortcut: Shift + ? or Alt + H to toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.shiftKey && e.key === "?") || (e.altKey && e.key.toLowerCase() === "h")) {
        if (
          document.activeElement?.tagName !== "INPUT" &&
          document.activeElement?.tagName !== "TEXTAREA"
        ) {
          e.preventDefault();
          setIsOpen(prev => !prev);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Save minimize preference
  const toggleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMinimized(prev => {
      const next = !prev;
      localStorage.setItem("tx_guide_minimized", String(next));
      return next;
    });
  };

  // Toggle View Mode (Modal <-> Side Drawer)
  const toggleViewMode = () => {
    setViewMode(prev => {
      const next = prev === "modal" ? "drawer" : "modal";
      localStorage.setItem("tx_guide_view_mode", next);
      toast({
        title: next === "drawer" 
          ? (isEn ? "Docked to Side Panel 📌" : "تم التثبيت كشريط جانبي للعمل المباشر 📌")
          : (isEn ? "Expanded to Full Modal ⛶" : "تم العرض كنافذة منبثقة كبرى ⛶"),
        description: next === "drawer"
          ? (isEn ? "You can now work on the screen while watching instructions!" : "يمكنك الآن الضغط على عناصر الصفحة ومتابعة التعليمات في نفس الوقت!")
          : (isEn ? "Comfortable full screen view." : "عرض كامل ومريح لكافة التفاصيل.")
      });
      return next;
    });
  };

  // Active guide being viewed
  const activeGuide: ScreenGuideItem = useMemo(() => {
    return SCREEN_GUIDES.find(g => g.id === selectedGuideId) || currentDetectedGuide;
  }, [selectedGuideId, currentDetectedGuide]);

  const activeDoneSteps = completedSteps[activeGuide.id] || [];
  const progressPercent = Math.round(
    activeGuide.steps.length > 0 ? (activeDoneSteps.length / activeGuide.steps.length) * 100 : 0
  );

  // Toggle step completion checkbox with confetti celebration on 100%
  const toggleStepDone = (stepNumber: number) => {
    setCompletedSteps(prev => {
      const currentDone = prev[activeGuide.id] || [];
      const updated = currentDone.includes(stepNumber)
        ? currentDone.filter(s => s !== stepNumber)
        : [...currentDone, stepNumber];
      
      const newMap = { ...prev, [activeGuide.id]: updated };
      localStorage.setItem("tx_guide_completed_steps", JSON.stringify(newMap));

      // If reached 100% just now, fire celebration confetti!
      if (updated.length === activeGuide.steps.length && activeGuide.steps.length > 0) {
        confetti({
          particleCount: 110,
          spread: 85,
          origin: { y: 0.6 },
          colors: ["#10b981", "#06b6d4", "#f59e0b", "#3b82f6"]
        });
        toast({
          title: isEn ? "🎉 Outstanding! All steps completed!" : "🎉 رائع جداً! أتممت كافة خطوات هذه الشاشة بنجاح!",
          description: isEn 
            ? "You have completely mastered this screen's workflow." 
            : "أصبحت جاهزاً ومتقناً للعمل على هذه الشاشة باحترافية تامة وبدون أي دعم."
        });
      }

      return newMap;
    });
  };

  // Reset steps for this screen
  const resetSteps = () => {
    setCompletedSteps(prev => {
      const newMap = { ...prev, [activeGuide.id]: [] };
      localStorage.setItem("tx_guide_completed_steps", JSON.stringify(newMap));
      return newMap;
    });
  };

  // Copy steps to clipboard
  const handleCopySteps = useCallback(() => {
    const textLines = [
      `📘 ${isEn ? activeGuide.titleEn : activeGuide.titleAr}`,
      isEn ? activeGuide.summaryEn : activeGuide.summaryAr,
      "",
      isEn ? "--- Actionable Steps ---" : "--- خطوات العمل الإجرائية ---",
      ...activeGuide.steps.map(s => 
        `${s.stepNumber}. ${isEn ? s.titleEn : s.titleAr}\n   ${isEn ? s.actionEn : s.actionAr}\n   ${isEn ? "Expected: " + s.expectedOutcomeEn : "النتيجة المتوقعة: " + s.expectedOutcomeAr}`
      ),
      "",
      isEn ? "Generated by Tawzeef-X Guide" : "تم الاستخراج من دليل نظام Tawzeef-X"
    ].join("\n");

    navigator.clipboard.writeText(textLines);
    setCopied(true);
    toast({
      title: isEn ? "Steps copied to clipboard! 📋" : "تم نسخ خطوات العمل إلى الحافظة! 📋",
      description: isEn ? "You can paste these instructions anywhere." : "يمكنك مشاركة هذه الخطوات مع أي عضو في الفريق."
    });
    setTimeout(() => setCopied(false), 2500);
  }, [activeGuide, isEn, toast]);

  // Audio Voice Reader (Web Speech API)
  const toggleVoiceNarration = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      toast({
        title: isEn ? "Speech not supported" : "القارئ الصوتي غير مدعوم في هذا المتصفح",
        variant: "destructive"
      });
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const title = isEn ? activeGuide.titleEn : activeGuide.titleAr;
    const summary = isEn ? activeGuide.summaryEn : activeGuide.summaryAr;
    const stepsSpeech = activeGuide.steps
      .map(s => `${isEn ? "Step" : "الخطوة"} ${s.stepNumber}: ${isEn ? s.titleEn : s.titleAr}. ${isEn ? s.actionEn : s.actionAr}`)
      .join(". ");

    const fullScript = `${title}. ${summary}. ${stepsSpeech}`;
    const utterance = new SpeechSynthesisUtterance(fullScript);
    utterance.lang = isEn ? "en-US" : "ar-SA";
    utterance.rate = isEn ? 0.98 : 0.92;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    if (isEn) {
      const enVoice = voices.find(v => v.lang.toLowerCase().startsWith("en") || v.lang.toLowerCase().includes("en-"));
      if (enVoice) utterance.voice = enVoice;
    } else {
      const arVoice = voices.find(v => v.lang.toLowerCase().startsWith("ar") || v.lang.toLowerCase().includes("ar-"));
      if (arVoice) utterance.voice = arVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: SCREEN_GUIDES.length };
    SCREEN_GUIDES.forEach(g => {
      counts[g.category] = (counts[g.category] || 0) + 1;
    });
    return counts;
  }, []);

  // Filtered guides for the "All Screens" tab
  const filteredAllGuides = useMemo(() => {
    return SCREEN_GUIDES.filter(g => {
      const matchesCategory = selectedCategory === "all" || g.category === selectedCategory;
      if (!matchesCategory) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        g.titleAr.toLowerCase().includes(q) ||
        g.titleEn.toLowerCase().includes(q) ||
        g.summaryAr.toLowerCase().includes(q) ||
        g.summaryEn.toLowerCase().includes(q) ||
        g.badgeAr.toLowerCase().includes(q) ||
        g.badgeEn.toLowerCase().includes(q) ||
        g.targetAudienceAr.toLowerCase().includes(q) ||
        g.targetAudienceEn.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, selectedCategory]);

  // Navigate to screen and dock guide to drawer mode
  const handleOpenScreen = (path: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigate(path);
    if (viewMode === "modal") {
      setViewMode("drawer");
      localStorage.setItem("tx_guide_view_mode", "drawer");
    }
    toast({
      title: isEn ? "Navigated to Screen 🚀" : "تم الانتقال إلى الشاشة بنجاح 🚀",
      description: isEn
        ? "Guide docked to the side panel so you can follow along."
        : "تم تثبيت المرشد الذكي في الجانب لمساعدتك أثناء تنفيذ المهام."
    });
  };

  const ActiveIcon = activeGuide.icon;

  return (
    <>
      {/* 1. FLOATING TRIGGER BUTTON ON THE SCREEN SIDE */}
      <div
        className={cn(
          "fixed z-40 transition-all duration-300 pointer-events-auto",
          dir === "rtl" ? "left-6" : "right-6",
          "bottom-20 lg:bottom-6"
        )}
      >
        <AnimatePresence mode="wait">
          {!isMinimized ? (
            <motion.div
              key="expanded-pill"
              initial={{ opacity: 0, scale: 0.85, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 15 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="relative group flex items-center select-none"
            >
              {/* Ambient Breathing Glow Aura */}
              <div className="absolute -inset-1 rounded-2xl sm:rounded-full bg-gradient-to-r from-emerald-500/25 via-teal-500/15 to-emerald-500/25 blur-md opacity-70 group-hover:opacity-100 transition-opacity duration-500 -z-10" />

              {/* Main Pill Button */}
              <button
                onClick={() => setIsOpen(true)}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl sm:rounded-full transition-all duration-300",
                  "bg-white/95 dark:bg-slate-900/90 backdrop-blur-2xl",
                  "border border-slate-200/90 dark:border-emerald-500/30",
                  "hover:border-emerald-500/60 dark:hover:border-emerald-400/60",
                  "shadow-[0_10px_35px_-5px_rgba(5,150,105,0.18)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.6)]",
                  "hover:shadow-[0_14px_42px_-5px_rgba(5,150,105,0.28)]"
                )}
                title={isEn ? "Open Screen Guide (Shift + ?)" : "افتح دليل هذه الشاشة (Shift + ?)"}
              >
                {/* AI Sparkle Gradient Tile */}
                <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-600/30 shrink-0 group-hover:scale-105 transition-transform duration-300">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-pulse" />
                  {/* Active Radar Pulse Dot */}
                  <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                  </span>
                </div>

                {/* Text Content */}
                <div className={cn("flex flex-col", dir === "rtl" ? "text-right" : "text-left")}>
                  <div className="flex items-center gap-1.5 leading-none">
                    <span className="text-xs sm:text-[13px] font-black text-slate-800 dark:text-white tracking-tight">
                      {isEn ? "Screen Copilot" : "مرشد الشاشة الذكي"}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 tracking-wider">
                      AI
                    </span>
                    {progressPercent === 100 && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 inline" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold leading-tight max-w-[130px] sm:max-w-[170px] truncate">
                      {isEn ? currentDetectedGuide.titleEn : currentDetectedGuide.titleAr}
                    </p>
                  </div>
                </div>

                {/* Desktop Shortcut & Chevron */}
                <div className="hidden md:flex items-center gap-1.5 pr-2 mr-1 border-r border-slate-200/80 dark:border-white/10">
                  <kbd className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/90 text-slate-400 dark:text-slate-500 border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                    Shift + ?
                  </kbd>
                  <ChevronLeft className={cn("w-3.5 h-3.5 text-slate-400 dark:text-slate-500 transition-transform duration-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400", dir === "rtl" ? "group-hover:-translate-x-0.5" : "group-hover:translate-x-0.5 rotate-180")} />
                </div>
              </button>

              {/* Minimize action button */}
              <button
                onClick={toggleMinimize}
                className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-800 dark:hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm hover:scale-110"
                title={isEn ? "Minimize button" : "تصغير الزر"}
              >
                <Minimize2 className="w-3 h-3" />
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="minimized-bubble"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              className="relative group select-none"
            >
              {/* Glowing Aura */}
              <div className="absolute -inset-1 rounded-2xl bg-emerald-500/25 blur-md opacity-70 group-hover:opacity-100 transition-opacity -z-10" />

              <button
                onClick={() => setIsOpen(true)}
                className="w-12 h-12 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-emerald-500/35 hover:border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-xl shadow-emerald-500/15 flex items-center justify-center transition-all"
                title={isEn ? "Open Screen Guide" : "افتح دليل الشاشة"}
              >
                <div className="relative">
                  <Sparkles className="w-5 h-5 animate-pulse text-emerald-600 dark:text-emerald-400" />
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                </div>
              </button>
              <button
                onClick={toggleMinimize}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-800 dark:hover:text-white flex items-center justify-center shadow-xs hover:scale-110 transition-all opacity-0 group-hover:opacity-100"
                title={isEn ? "Expand button" : "تكبير الزر"}
              >
                <Maximize2 className="w-2.5 h-2.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 2. THE SCREEN GUIDE (SUPPORTING BOTH FULL-MODAL AND DOCKED SIDE-DRAWER MODES) */}
      <AnimatePresence>
        {isOpen && (
          <div
            className={cn(
              viewMode === "modal"
                ? "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 select-text overflow-hidden"
                : cn(
                    "fixed top-0 bottom-0 z-50 pointer-events-none flex",
                    dir === "rtl" ? "left-0" : "right-0"
                  )
            )}
          >
            {/* Backdrop Blur Overlay - ONLY rendered in Center Modal mode */}
            {viewMode === "modal" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity"
              />
            )}

            {/* Modal / Drawer Container */}
            <motion.div
              initial={
                viewMode === "modal"
                  ? { opacity: 0, scale: 0.93, y: 20 }
                  : { opacity: 0, x: dir === "rtl" ? -420 : 420 }
              }
              animate={
                viewMode === "modal"
                  ? { opacity: 1, scale: 1, y: 0 }
                  : { opacity: 1, x: 0 }
              }
              exit={
                viewMode === "modal"
                  ? { opacity: 0, scale: 0.93, y: 20 }
                  : { opacity: 0, x: dir === "rtl" ? -420 : 420 }
              }
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                "pointer-events-auto relative z-10 flex flex-col",
                "bg-card/95 backdrop-blur-2xl border border-border/80 shadow-2xl overflow-hidden",
                "text-card-foreground",
                viewMode === "modal"
                  ? "w-full max-w-4xl max-h-[90vh] rounded-3xl"
                  : "w-full sm:w-[460px] md:w-[500px] h-full rounded-none border-y-0 shadow-3xl",
                dir === "rtl" ? "text-right" : "text-left"
              )}
              dir={dir}
            >
              {/* Top Header Bar */}
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border/50 bg-gradient-to-b from-muted/40 to-transparent">
                {/* Screen Icon + Title & Category */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border shadow-xs",
                      activeGuide.bg,
                      activeGuide.border
                    )}
                  >
                    <ActiveIcon className={cn("w-5 h-5", activeGuide.color)} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base sm:text-lg font-black text-foreground truncate">
                        {isEn ? activeGuide.titleEn : activeGuide.titleAr}
                      </h2>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                          activeGuide.bg,
                          activeGuide.color,
                          activeGuide.border
                        )}
                      >
                        {isEn ? activeGuide.badgeEn : activeGuide.badgeAr}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {isEn ? activeGuide.targetAudienceEn : activeGuide.targetAudienceAr}
                    </p>
                  </div>
                </div>

                {/* Header Action Tools */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Voice Narration Button */}
                  <button
                    onClick={toggleVoiceNarration}
                    className={cn(
                      "p-2 rounded-xl border transition-all flex items-center gap-1",
                      isSpeaking
                        ? "bg-amber-500 text-white border-amber-600 animate-pulse"
                        : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border-border/50"
                    )}
                    title={
                      isSpeaking
                        ? (isEn ? "Pause Audio Narration" : "إيقاف القارئ الصوتي")
                        : (isEn ? "Listen to Steps (Voice Narration)" : "الاستماع لشرح الخطوات صوتياً")
                    }
                  >
                    {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>

                  {/* Dock / Expand Mode Toggle Button */}
                  <button
                    onClick={toggleViewMode}
                    className="p-2 rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border/50 transition-colors"
                    title={
                      viewMode === "modal"
                        ? (isEn ? "Dock to Side Panel (Keep screen visible)" : "تثبيت كشريط جانبي للعمل المباشر على الصفحة")
                        : (isEn ? "Expand to Full Modal" : "تكبير كنافذة منبثقة")
                    }
                  >
                    {viewMode === "modal" ? (
                      <PanelRightClose className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Maximize2 className="w-4 h-4 text-emerald-500" />
                    )}
                  </button>

                  {/* Screen Directory Switcher Button */}
                  <button
                    onClick={() => setActiveTab("all")}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-2xs",
                      activeTab === "all"
                        ? "bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/20"
                        : "bg-muted/80 hover:bg-muted text-foreground border-border/60 hover:border-emerald-500/40"
                    )}
                    title={isEn ? "Open Screen Directory (25 Screens)" : "فتح فهرس ودليل الشاشات (25 شاشة)"}
                  >
                    <Compass className={cn("w-3.5 h-3.5", activeTab === "all" ? "text-white" : "text-emerald-500")} />
                    <span className="hidden sm:inline">{isEn ? "Screens Directory" : "فهرس الشاشات"}</span>
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full font-black",
                      activeTab === "all" ? "bg-white/20 text-white" : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    )}>
                      {SCREEN_GUIDES.length}
                    </span>
                  </button>

                  {/* Close Button */}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-xl bg-muted hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-colors border border-border/50"
                    title={isEn ? "Close" : "إغلاق"}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Summary Banner */}
              <div className="px-4 sm:px-5 py-3 bg-muted/30 border-b border-border/40 flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Lightbulb className="w-3.5 h-3.5" />
                </div>
                <p className="text-xs sm:text-[13px] text-foreground/90 font-medium leading-relaxed">
                  {isEn ? activeGuide.summaryEn : activeGuide.summaryAr}
                </p>
              </div>

              {/* 3. VISUAL WORKFLOW STEPPER DIAGRAM */}
              {activeGuide.workflowStages && activeGuide.workflowStages.length > 0 && (
                <div className="px-4 sm:px-5 py-3 bg-background/70 border-b border-border/40 overflow-x-auto no-scrollbar">
                  <div className="flex items-center justify-between min-w-[360px] gap-1.5">
                    {activeGuide.workflowStages.map((stg, sIdx) => {
                      const isLast = sIdx === activeGuide.workflowStages!.length - 1;
                      return (
                        <div key={stg.stepNumber} className="flex items-center flex-1 gap-1.5">
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black flex items-center justify-center">
                              {stg.stepNumber}
                            </span>
                            <span className="text-[11px] font-bold text-foreground/90 whitespace-nowrap">
                              {isEn ? stg.labelEn : stg.labelAr}
                            </span>
                          </div>
                          {!isLast && (
                            <div className="flex-1 h-0.5 bg-border/60 min-w-[12px] mx-1" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tab Navigation Segmented Control */}
              <div className="px-4 sm:px-5 pt-3 pb-2 border-b border-border/40 bg-muted/20">
                <div className="p-1 bg-muted/70 dark:bg-slate-800/80 rounded-2xl border border-border/50 grid grid-cols-4 gap-1">
                  <button
                    onClick={() => setActiveTab("steps")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 py-2 px-1.5 rounded-xl text-xs font-bold transition-all",
                      activeTab === "steps"
                        ? "bg-background text-foreground shadow-xs border border-border/50 font-black"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <MousePointerClick className={cn("w-3.5 h-3.5 shrink-0", activeTab === "steps" ? "text-emerald-500" : "")} />
                    <span className="truncate">{isEn ? "Steps" : "خطوات العمل"}</span>
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.2 rounded-full hidden sm:inline-block font-black",
                      activeTab === "steps" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-background/40 text-muted-foreground"
                    )}>
                      {activeGuide.steps.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab("buttons")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 py-2 px-1.5 rounded-xl text-xs font-bold transition-all",
                      activeTab === "buttons"
                        ? "bg-background text-foreground shadow-xs border border-border/50 font-black"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Layers className={cn("w-3.5 h-3.5 shrink-0", activeTab === "buttons" ? "text-emerald-500" : "")} />
                    <span className="truncate">{isEn ? "Buttons" : "خريطة الأزرار"}</span>
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.2 rounded-full hidden sm:inline-block font-black",
                      activeTab === "buttons" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-background/40 text-muted-foreground"
                    )}>
                      {activeGuide.keyButtons.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab("tips")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 py-2 px-1.5 rounded-xl text-xs font-bold transition-all",
                      activeTab === "tips"
                        ? "bg-background text-foreground shadow-xs border border-border/50 font-black"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Lightbulb className={cn("w-3.5 h-3.5 shrink-0", activeTab === "tips" ? "text-amber-500" : "")} />
                    <span className="truncate">{isEn ? "Tips & FAQs" : "نصائح وحلول"}</span>
                  </button>

                  <button
                    onClick={() => setActiveTab("all")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 py-2 px-1.5 rounded-xl text-xs font-bold transition-all",
                      activeTab === "all"
                        ? "bg-background text-foreground shadow-xs border border-border/50 font-black"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Compass className={cn("w-3.5 h-3.5 shrink-0", activeTab === "all" ? "text-emerald-500" : "")} />
                    <span className="truncate">{isEn ? "All Screens" : "كافة الشاشات"}</span>
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.2 rounded-full hidden sm:inline-block font-black",
                      activeTab === "all" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-background/40 text-muted-foreground"
                    )}>
                      {SCREEN_GUIDES.length}
                    </span>
                  </button>
                </div>
              </div>

              {/* Scrollable Body Content */}
              <div
                className={cn(
                  "flex-1 overflow-y-auto p-4 sm:p-5 space-y-4",
                  viewMode === "modal" ? "max-h-[52vh]" : "max-h-[calc(100vh-250px)]"
                )}
              >
                {/* TAB 1: STEPS WITH DIRECT ACTIONS & PROGRESS BAR */}
                {activeTab === "steps" && (
                  <div className="space-y-4">
                    {/* Progress Bar & Accomplishment Summary */}
                    <div className="p-3 rounded-2xl bg-muted/40 border border-border/50 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-foreground flex items-center gap-1.5">
                          <CheckCheck className="w-4 h-4 text-emerald-500" />
                          <span>{isEn ? "Screen Execution Progress:" : "نسبة إنجاز خطوات الشاشة:"}</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-emerald-600 dark:text-emerald-400">
                            {progressPercent}%
                          </span>
                          {activeDoneSteps.length > 0 && (
                            <button
                              onClick={resetSteps}
                              className="text-[10px] text-muted-foreground hover:text-foreground underline flex items-center gap-0.5"
                              title={isEn ? "Reset progress" : "إعادة ضبط التقدم"}
                            >
                              <RotateCcw className="w-2.5 h-2.5" />
                              <span>{isEn ? "Reset" : "إعادة"}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPercent}%` }}
                          transition={{ duration: 0.4 }}
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                        />
                      </div>

                      {progressPercent === 100 && (
                        <div className="pt-1 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold animate-pulse">
                          <Trophy className="w-3.5 h-3.5 text-amber-500" />
                          <span>{isEn ? "Congratulations! Full workflow completed!" : "تهانينا! أكملت كافة متطلبات الشاشة بنجاح تام."}</span>
                        </div>
                      )}
                    </div>

                    {/* Step Cards with Action Triggers */}
                    <div className="space-y-3">
                      {activeGuide.steps.map(step => {
                        const isDone = activeDoneSteps.includes(step.stepNumber);
                        return (
                          <div
                            key={step.stepNumber}
                            className={cn(
                              "p-4 rounded-2xl border transition-all group",
                              isDone
                                ? "bg-emerald-500/5 border-emerald-500/30 opacity-90"
                                : "bg-card border-border/70 hover:border-emerald-500/50 hover:shadow-xs"
                            )}
                          >
                            <div className="flex items-start gap-3">
                              {/* Step Checkbox / Number */}
                              <button
                                onClick={() => toggleStepDone(step.stepNumber)}
                                className={cn(
                                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-all mt-0.5 shadow-2xs",
                                  isDone
                                    ? "bg-emerald-500 text-white"
                                    : "bg-muted text-foreground hover:bg-emerald-500/20 hover:text-emerald-600"
                                )}
                                title={isEn ? "Toggle step complete" : "تبديل حالة الإنجاز"}
                              >
                                {isDone ? <Check className="w-4 h-4" /> : step.stepNumber}
                              </button>

                              <div className="flex-1 min-w-0 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <h3
                                    className={cn(
                                      "text-xs sm:text-sm font-bold text-foreground",
                                      isDone && "line-through text-muted-foreground"
                                    )}
                                  >
                                    {isEn ? step.titleEn : step.titleAr}
                                  </h3>
                                  <button
                                    onClick={() => toggleStepDone(step.stepNumber)}
                                    className="text-[10px] text-muted-foreground hover:text-emerald-500 shrink-0"
                                  >
                                    {isDone ? (isEn ? "Done" : "مكتمل") : (isEn ? "Mark done" : "تعليم كمكتمل")}
                                  </button>
                                </div>

                                <p className="text-xs text-foreground/80 leading-relaxed">
                                  {isEn ? step.actionEn : step.actionAr}
                                </p>

                                {/* Expected Outcome Box */}
                                <div className="p-2 rounded-xl bg-muted/60 border border-border/40 flex items-start gap-1.5 text-[11px]">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                  <div>
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                      {isEn ? "Expected Outcome: " : "النتيجة المؤكدة: "}
                                    </span>
                                    <span className="text-foreground/90">
                                      {isEn ? step.expectedOutcomeEn : step.expectedOutcomeAr}
                                    </span>
                                  </div>
                                </div>

                                {/* 4. ONE-CLICK DIRECT ACTION TRIGGER BUTTON */}
                                {step.actionTrigger && (
                                  <div className="pt-1">
                                    <button
                                      onClick={() => {
                                        navigate(step.actionTrigger!.target);
                                        if (viewMode === "modal") {
                                          setViewMode("drawer");
                                          localStorage.setItem("tx_guide_view_mode", "drawer");
                                        }
                                      }}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                      <Zap className="w-3.5 h-3.5 text-amber-300" />
                                      <span>
                                        {isEn ? step.actionTrigger.labelEn : step.actionTrigger.labelAr}
                                      </span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* TAB 2: BUTTONS & ACTIONABLE CONTROLS */}
                {activeTab === "buttons" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground">
                        {isEn
                          ? "Guide to all major buttons and actionable controls on this screen:"
                          : "شرح شامل لكافة الأزرار والأدوات التفاعلية المتاحة في هذه الشاشة وماذا تفعل:"}
                      </p>
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                        {activeGuide.keyButtons.length} {isEn ? "Controls" : "عنصر تحكم"}
                      </span>
                    </div>

                    <div className={cn(
                      "grid gap-3",
                      viewMode === "modal" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
                    )}>
                      {activeGuide.keyButtons.map((btn, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-2xl bg-card border border-border/70 hover:border-emerald-500/40 hover:shadow-xs transition-all flex flex-col justify-between space-y-2.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div
                              className={cn(
                                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black shadow-2xs",
                                btn.actionType === "primary"
                                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-500/20"
                                  : btn.actionType === "action"
                                  ? "bg-blue-600 text-white shadow-blue-500/20"
                                  : "bg-muted text-foreground border border-border/80"
                              )}
                            >
                              <span
                                className={cn(
                                  "w-1.5 h-1.5 rounded-full",
                                  btn.actionType === "primary" || btn.actionType === "action"
                                    ? "bg-white"
                                    : "bg-amber-500"
                                )}
                              />
                              <span>{isEn ? btn.nameEn : btn.nameAr}</span>
                            </div>

                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-0.5 rounded-md bg-muted/60 border border-border/40">
                              {btn.actionType === "primary"
                                ? (isEn ? "Primary" : "إجراء رئيسي")
                                : btn.actionType === "action"
                                ? (isEn ? "Action" : "إجراء تشغيلي")
                                : (isEn ? "Control" : "أداة تحكم")}
                            </span>
                          </div>

                          <p className="text-xs text-foreground/85 leading-relaxed">
                            {isEn ? btn.descriptionEn : btn.descriptionAr}
                          </p>
                        </div>
                      ))}
                    </div>

                    {activeGuide.quickLinks && activeGuide.quickLinks.length > 0 && (
                      <div className="mt-4 p-4 rounded-2xl bg-muted/40 border border-border/50 space-y-2.5">
                        <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <span className="text-emerald-500 font-black">🔗</span>
                          <span>{isEn ? "Related Quick Screens:" : "شاشات مرتبطة يمكنك الانتقال إليها فوراً:"}</span>
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {activeGuide.quickLinks.map((link, idx) => (
                            <Link
                              key={idx}
                              to={link.path}
                              onClick={() => {
                                if (viewMode === "modal") setIsOpen(false);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card border border-border/70 text-xs font-bold text-foreground hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-500/40 hover:shadow-xs transition-all group"
                            >
                              <span>{isEn ? link.labelEn : link.labelAr}</span>
                              <ExternalLink className="w-3 h-3 text-emerald-500 group-hover:translate-x-0.5 transition-transform" />
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: PRO TIPS & FAQS */}
                {activeTab === "tips" && (
                  <div className="space-y-4">
                    {activeGuide.proTips.length > 0 && (
                      <div className="space-y-2.5">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                          <Lightbulb className="w-3.5 h-3.5" />
                          <span>{isEn ? "Pro Tips & Best Practices" : "نصائح وأسرار الاستخدام الاحترافي"}</span>
                        </h4>
                        {activeGuide.proTips.map((tip, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-xs space-y-1"
                          >
                            <p className="font-bold text-foreground">
                              {isEn ? tip.titleEn : tip.titleAr}
                            </p>
                            <p className="text-muted-foreground leading-relaxed">
                              {isEn ? tip.descriptionEn : tip.descriptionAr}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeGuide.faqs.length > 0 && (
                      <div className="space-y-2.5 pt-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                          <QuestionIcon className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{isEn ? "Troubleshooting & FAQs" : "الأسئلة الشائعة وحلول المشكلات"}</span>
                        </h4>
                        {activeGuide.faqs.map((faq, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-2xl bg-card border border-border/70 space-y-1"
                          >
                            <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                              <span className="text-emerald-500 font-black">س:</span>
                              <span>{isEn ? faq.qEn : faq.qAr}</span>
                            </p>
                            <p className="text-xs text-muted-foreground leading-relaxed pl-3">
                              <span className="text-emerald-600 font-bold">ج: </span>
                              <span>{isEn ? faq.aEn : faq.aAr}</span>
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 4: ALL SYSTEM SCREENS DIRECTORY */}
                {activeTab === "all" && (
                  <div className="space-y-4">
                    {/* Search & Category Filter Toolbar */}
                    <div className="space-y-2.5">
                      {/* Search Bar */}
                      <div className="relative">
                        <Search className={cn("w-4 h-4 absolute top-1/2 -translate-y-1/2 text-muted-foreground", dir === "rtl" ? "right-3.5" : "left-3.5")} />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          placeholder={isEn ? "Search across 25 system screens by name, category, or workflow..." : "ابحث في 25 شاشة نظام حسب الاسم، الموديول، أو المهام..."}
                          className={cn(
                            "w-full h-10 rounded-2xl bg-muted/50 border border-border/70 text-xs font-medium text-foreground",
                            "focus:outline-none focus:border-emerald-500/60 focus:bg-background transition-all placeholder:text-muted-foreground/60",
                            dir === "rtl" ? "pr-10 pl-10" : "pl-10 pr-10"
                          )}
                        />
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery("")}
                            className={cn("absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-lg", dir === "rtl" ? "left-2.5" : "right-2.5")}
                            title={isEn ? "Clear search" : "مسح البحث"}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Category Filter Chips */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                        {GUIDE_CATEGORIES.map(cat => {
                          const CatIcon = cat.icon;
                          const isActive = selectedCategory === cat.id;
                          const count = categoryCounts[cat.id] || 0;
                          return (
                            <button
                              key={cat.id}
                              onClick={() => setSelectedCategory(cat.id)}
                              className={cn(
                                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0",
                                isActive
                                  ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                                  : "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
                              )}
                            >
                              <CatIcon className={cn("w-3.5 h-3.5", isActive ? "text-white" : "text-muted-foreground")} />
                              <span>{isEn ? cat.labelEn : cat.labelAr}</span>
                              <span
                                className={cn(
                                  "text-[10px] px-1.5 py-0.2 rounded-full font-black",
                                  isActive ? "bg-white/20 text-white" : "bg-muted text-foreground/70"
                                )}
                              >
                                {count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Results Count Banner */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                      <span>
                        {isEn
                          ? `Showing ${filteredAllGuides.length} of ${SCREEN_GUIDES.length} screens`
                          : `يتم عرض ${filteredAllGuides.length} من أصل ${SCREEN_GUIDES.length} شاشة`}
                      </span>
                      {(searchQuery || selectedCategory !== "all") && (
                        <button
                          onClick={() => {
                            setSearchQuery("");
                            setSelectedCategory("all");
                          }}
                          className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                        >
                          {isEn ? "Reset filters" : "إلغاء التصفية"}
                        </button>
                      )}
                    </div>

                    {/* 2-Column Responsive Visual Cards Grid */}
                    {filteredAllGuides.length > 0 ? (
                      <div className={cn(
                        "grid gap-3.5 pt-1",
                        viewMode === "modal" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
                      )}>
                        {filteredAllGuides.map(item => {
                          const ItemIcon = item.icon;
                          const isCurrentActive = item.id === currentDetectedGuide.id;
                          const isCurrentlySelected = item.id === activeGuide.id;

                          return (
                            <div
                              key={item.id}
                              className={cn(
                                "p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 group relative",
                                isCurrentlySelected
                                  ? "bg-emerald-500/[0.07] border-emerald-500/60 shadow-xs ring-1 ring-emerald-500/30"
                                  : "bg-card border-border/70 hover:border-emerald-500/40 hover:bg-muted/20 hover:shadow-xs"
                              )}
                            >
                              {/* Top Bar: Icon + Titles + Badges */}
                              <div>
                                <div className="flex items-start justify-between gap-2.5">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div
                                      className={cn(
                                        "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border shadow-2xs group-hover:scale-105 transition-transform",
                                        item.bg,
                                        item.border
                                      )}
                                    >
                                      <ItemIcon className={cn("w-5 h-5", item.color)} />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="text-sm font-black text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                                          {isEn ? item.titleEn : item.titleAr}
                                        </h4>
                                        {isCurrentActive && (
                                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500 text-white shadow-2xs animate-pulse">
                                            {isEn ? "Current Screen" : "شاشتك الحالية"}
                                          </span>
                                        )}
                                      </div>
                                      <span
                                        className={cn(
                                          "inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border mt-1",
                                          item.bg,
                                          item.color,
                                          item.border
                                        )}
                                      >
                                        {isEn ? item.badgeEn : item.badgeAr}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Summary */}
                                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mt-2.5">
                                  {isEn ? item.summaryEn : item.summaryAr}
                                </p>

                                {/* Meta Chips */}
                                <div className="flex items-center gap-1.5 flex-wrap mt-3 pt-2.5 border-t border-border/40 text-[11px]">
                                  <span className="px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground font-semibold flex items-center gap-1">
                                    <MousePointerClick className="w-3 h-3 text-emerald-500" />
                                    <span>{item.steps.length} {isEn ? "steps" : "خطوات"}</span>
                                  </span>
                                  <span className="px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground font-semibold flex items-center gap-1">
                                    <Layers className="w-3 h-3 text-blue-500" />
                                    <span>{item.keyButtons.length} {isEn ? "controls" : "أزرار"}</span>
                                  </span>
                                  <span className="px-2 py-0.5 rounded-md bg-muted/40 text-muted-foreground/80 font-medium truncate max-w-[160px]">
                                    {isEn ? item.targetAudienceEn : item.targetAudienceAr}
                                  </span>
                                </div>
                              </div>

                              {/* Card Action Buttons: View Guide + Open Screen Directly */}
                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  onClick={() => {
                                    setSelectedGuideId(item.id);
                                    setActiveTab("steps");
                                  }}
                                  className="flex-1 py-1.5 px-3 rounded-xl bg-muted/80 hover:bg-emerald-500 hover:text-white text-foreground text-xs font-bold transition-all border border-border/60 hover:border-emerald-600 flex items-center justify-center gap-1.5 shadow-2xs"
                                >
                                  <MousePointerClick className="w-3.5 h-3.5" />
                                  <span>{isEn ? "View Guide" : "عرض الدليل"}</span>
                                </button>

                                {item.matchPaths && item.matchPaths[0] && (
                                  <button
                                    onClick={e => handleOpenScreen(item.matchPaths[0], e)}
                                    className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs hover:scale-[1.02] active:scale-[0.98]"
                                    title={isEn ? "Open screen directly" : "الانتقال للشاشة فوراً"}
                                  >
                                    <span>{isEn ? "Open" : "فتح"}</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* Empty State */
                      <div className="py-12 text-center rounded-2xl bg-muted/20 border border-dashed border-border/70 space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                          <Search className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-bold text-foreground">
                          {isEn ? "No screens match your search" : "لم يتم العثور على أي شاشات مطابقة لبحثك"}
                        </p>
                        <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                          {isEn
                            ? "Try searching with a different term or clear filters to view all 25 screens."
                            : "جرّب كتابة كلمة بحث مختلفة أو اضغط أدناه لاستعراض كافة شاشات النظام."}
                        </p>
                        <button
                          onClick={() => {
                            setSearchQuery("");
                            setSelectedCategory("all");
                          }}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-all"
                        >
                          {isEn ? "View All Screens" : "عرض كافة الشاشات"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Footer Actions */}
              <div className="p-3.5 sm:p-4 border-t border-border/50 bg-muted/30 flex items-center justify-between gap-2 flex-wrap">
                <Link
                  to="/tutorial"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-bold transition-all border border-border/60"
                >
                  <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="hidden sm:inline">
                    {isEn ? "Full Tutorial (16 Modules)" : "دليل النظام بالكامل"}
                  </span>
                  <span className="sm:hidden">{isEn ? "Tutorial" : "الدليل"}</span>
                </Link>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopySteps}
                    className="px-3 py-1.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-bold transition-all flex items-center gap-1 border border-border/50"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copied ? (isEn ? "Copied!" : "تم النسخ!") : (isEn ? "Copy" : "نسخ")}</span>
                  </button>

                  <button
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all"
                  >
                    {isEn ? "Start Working" : "ابدأ العمل الآن"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
