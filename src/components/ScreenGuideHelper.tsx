import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  HelpCircle,
  X,
  Sparkles,
  ChevronDown,
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
  CheckCheck
} from "lucide-react";
import confetti from "canvas-confetti";
import { useI18n } from "@/contexts/I18nContext";
import { useToast } from "@/hooks/use-toast";
import { SCREEN_GUIDES, getGuideForPath, ScreenGuideItem } from "@/data/screenGuidesData";
import { cn } from "@/lib/utils";

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

  // Filtered guides for the "All Screens" tab
  const filteredAllGuides = useMemo(() => {
    if (!searchQuery.trim()) return SCREEN_GUIDES;
    const q = searchQuery.toLowerCase();
    return SCREEN_GUIDES.filter(
      g =>
        g.titleAr.toLowerCase().includes(q) ||
        g.titleEn.toLowerCase().includes(q) ||
        g.summaryAr.toLowerCase().includes(q) ||
        g.summaryEn.toLowerCase().includes(q)
    );
  }, [searchQuery]);

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
              initial={{ opacity: 0, scale: 0.8, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 15 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="relative group flex items-center"
            >
              {/* Subtle Pulsing Ping Ring */}
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500" />
              </span>

              {/* Main Pill Button */}
              <button
                onClick={() => setIsOpen(true)}
                className={cn(
                  "flex items-center gap-2.5 px-4 py-2.5 rounded-full shadow-lg transition-all",
                  "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white",
                  "hover:shadow-emerald-500/25 hover:shadow-xl border border-white/20",
                  "backdrop-blur-md"
                )}
                title={isEn ? "Open Screen Guide (Shift + ?)" : "افتح دليل هذه الشاشة (Shift + ?)"}
              >
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
                </div>
                <div className="text-right">
                  <p className="text-xs font-black tracking-wide leading-none flex items-center gap-1.5">
                    <span>{isEn ? "Screen Copilot" : "مرشد الشاشة الذكي"}</span>
                    {progressPercent === 100 && (
                      <CheckCircle2 className="w-3 h-3 text-emerald-200 inline" />
                    )}
                  </p>
                  <p className="text-[10px] text-emerald-100/90 font-medium leading-tight max-w-[130px] truncate">
                    {isEn ? currentDetectedGuide.titleEn : currentDetectedGuide.titleAr}
                  </p>
                </div>
              </button>

              {/* Minimize action button */}
              <button
                onClick={toggleMinimize}
                className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-card border border-border text-muted-foreground hover:text-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                title={isEn ? "Minimize button" : "تصغير الزر"}
              >
                <Minimize2 className="w-3 h-3" />
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="minimized-bubble"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="relative group"
            >
              <button
                onClick={() => setIsOpen(true)}
                className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-lg border border-white/25 flex items-center justify-center hover:shadow-emerald-500/30 hover:shadow-xl transition-all"
                title={isEn ? "Open Screen Guide" : "افتح دليل الشاشة"}
              >
                <Sparkles className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={toggleMinimize}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-card border border-border text-muted-foreground hover:text-foreground flex items-center justify-center shadow-xs"
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

                  {/* Quick Screen Switcher Dropdown */}
                  <div className="relative">
                    <select
                      value={activeGuide.id}
                      onChange={e => setSelectedGuideId(e.target.value)}
                      className="bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold py-1.5 px-2.5 rounded-xl border border-border/60 outline-none cursor-pointer transition-colors max-w-[120px] sm:max-w-[160px] truncate"
                      title={isEn ? "Switch screen guide" : "تبديل الشاشة"}
                    >
                      {SCREEN_GUIDES.map(g => (
                        <option key={g.id} value={g.id}>
                          {isEn ? g.titleEn : g.titleAr}
                        </option>
                      ))}
                    </select>
                  </div>

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

              {/* Tab Navigation */}
              <div className="flex items-center gap-1.5 px-4 sm:px-5 border-b border-border/50 bg-background/50 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setActiveTab("steps")}
                  className={cn(
                    "flex items-center gap-1.5 py-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap",
                    activeTab === "steps"
                      ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <MousePointerClick className="w-3.5 h-3.5" />
                  <span>{isEn ? "Action Steps" : "خطوات العمل"}</span>
                  <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] px-1.5 py-0.2 rounded-full">
                    {activeGuide.steps.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab("buttons")}
                  className={cn(
                    "flex items-center gap-1.5 py-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap",
                    activeTab === "buttons"
                      ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{isEn ? "Key Buttons" : "خريطة الأزرار"}</span>
                  <span className="bg-muted text-muted-foreground text-[10px] px-1.5 py-0.2 rounded-full">
                    {activeGuide.keyButtons.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab("tips")}
                  className={cn(
                    "flex items-center gap-1.5 py-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap",
                    activeTab === "tips"
                      ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <QuestionIcon className="w-3.5 h-3.5" />
                  <span>{isEn ? "Tips & FAQs" : "نصائح وحلول"}</span>
                </button>

                <button
                  onClick={() => setActiveTab("all")}
                  className={cn(
                    "flex items-center gap-1.5 py-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap",
                    activeTab === "all"
                      ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{isEn ? "All Screens" : "كافة الشاشات"}</span>
                </button>
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
                    <p className="text-xs font-semibold text-muted-foreground">
                      {isEn
                        ? "Guide to all major buttons and actionable controls on this screen:"
                        : "شرح شامل لكافة الأزرار والأدوات التفاعلية المتاحة في هذه الشاشة وماذا تفعل:"}
                    </p>

                    <div className="grid grid-cols-1 gap-2.5">
                      {activeGuide.keyButtons.map((btn, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-2xl bg-card border border-border/70 hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-1.5 shadow-2xs"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "w-2.5 h-2.5 rounded-full shrink-0",
                                btn.actionType === "primary"
                                  ? "bg-emerald-500"
                                  : btn.actionType === "action"
                                  ? "bg-blue-500"
                                  : "bg-amber-500"
                              )}
                            />
                            <h4 className="text-xs sm:text-sm font-bold text-foreground">
                              {isEn ? btn.nameEn : btn.nameAr}
                            </h4>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {isEn ? btn.descriptionEn : btn.descriptionAr}
                          </p>
                        </div>
                      ))}
                    </div>

                    {activeGuide.quickLinks && activeGuide.quickLinks.length > 0 && (
                      <div className="mt-4 p-3.5 rounded-2xl bg-muted/40 border border-border/50">
                        <p className="text-xs font-bold text-foreground mb-2">
                          {isEn ? "🔗 Related Quick Screens:" : "🔗 شاشات مرتبطة يمكنك الانتقال إليها فوراً:"}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {activeGuide.quickLinks.map((link, idx) => (
                            <Link
                              key={idx}
                              to={link.path}
                              onClick={() => {
                                if (viewMode === "modal") setIsOpen(false);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card border border-border/70 text-xs font-bold text-foreground hover:text-emerald-500 hover:border-emerald-500/40 transition-all"
                            >
                              <span>{isEn ? link.labelEn : link.labelAr}</span>
                              <ArrowRight className="w-3 h-3 text-emerald-500" />
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
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 right-3 text-muted-foreground" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder={isEn ? "Search screens..." : "ابحث عن أي شاشة في النظام..."}
                        className="w-full h-9 pr-9 pl-3 rounded-xl bg-muted/60 border border-border/70 text-xs focus:outline-none focus:border-emerald-500/60"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-2 pt-1">
                      {filteredAllGuides.map(item => {
                        const ItemIcon = item.icon;
                        const isSelected = item.id === activeGuide.id;
                        return (
                          <div
                            key={item.id}
                            onClick={() => {
                              setSelectedGuideId(item.id);
                              setActiveTab("steps");
                            }}
                            className={cn(
                              "p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2.5",
                              isSelected
                                ? "bg-emerald-500/10 border-emerald-500 shadow-2xs"
                                : "bg-card border-border/70 hover:border-emerald-500/40 hover:bg-muted/30"
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={cn(
                                  "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border",
                                  item.bg,
                                  item.border
                                )}
                              >
                                <ItemIcon className={cn("w-3.5 h-3.5", item.color)} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-foreground truncate">
                                  {isEn ? item.titleEn : item.titleAr}
                                </p>
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {isEn ? item.badgeEn : item.badgeAr}
                                </p>
                              </div>
                            </div>

                            <button className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold shrink-0 hover:underline">
                              {isEn ? "View Guide" : "عرض الدليل"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
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
