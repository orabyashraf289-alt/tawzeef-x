import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Volume2,
  VolumeX,
  Calendar,
  Clock,
  Award,
  Users,
  Briefcase,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ArrowLeft,
  Video,
  AlertCircle,
  TrendingUp,
  RefreshCw,
  FileCheck,
  CheckCircle2,
  ExternalLink,
  Bot
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/contexts/I18nContext";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface ExecutiveAIBriefingProps {
  candidates?: any[];
  interviews?: any[];
  jobs?: any[];
  offers?: any[];
  displayName?: string;
  userRole?: string;
  onRefreshData?: () => void;
}

export default function ExecutiveAIBriefing({
  candidates = [],
  interviews = [],
  jobs = [],
  offers = [],
  displayName = "",
  userRole = "admin",
  onRefreshData,
}: ExecutiveAIBriefingProps) {
  const { locale, dir } = useI18n();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedPill, setSelectedPill] = useState<"interviews" | "offers" | "matches" | "jobs" | null>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Load available voices for proper Web Speech selection (Arabic vs English)
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      if (available && available.length > 0) {
        setVoices(available);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Compute key daily metrics
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const todayInterviews = useMemo(() => {
    return interviews.filter((i) => {
      if (!i.date) return false;
      const iDate = new Date(i.date).toISOString().slice(0, 10);
      return iDate === todayStr && i.status !== "ملغية" && i.status !== "cancelled";
    });
  }, [interviews, todayStr]);

  const pendingOffers = useMemo(() => {
    return offers.filter((o) => ["sent", "viewed", "pending"].includes(o.status));
  }, [offers]);

  const highMatchCandidates = useMemo(() => {
    return candidates
      .filter((c) => (c.ai_score ?? 0) >= 85)
      .sort((a, b) => (b.ai_score ?? 0) - (a.ai_score ?? 0))
      .slice(0, 5);
  }, [candidates]);

  const activeJobs = useMemo(() => {
    return jobs.filter((j) => j.status === "نشطة" || j.status === "active");
  }, [jobs]);

  const zeroApplicantJobs = useMemo(() => {
    return activeJobs.filter((j) => {
      const applicantCount = candidates.filter((c) => c.job_id === j.id).length;
      return applicantCount === 0;
    });
  }, [activeJobs, candidates]);

  // Determine greeting based on time of day
  const hour = new Date().getHours();
  const timeGreeting =
    hour < 12
      ? locale === "en"
        ? "Good morning"
        : "صباح الخير"
      : hour < 17
      ? locale === "en"
        ? "Good afternoon"
        : "مساء الخير"
      : locale === "en"
      ? "Good evening"
      : "مساء النور";

  // Check if displayName represents an organization/company rather than an individual person
  const isOrganization = useMemo(() => {
    if (!displayName) return false;
    const name = displayName.trim();
    return /^(شركة|مؤسسة|مجموعة|مدارس|مدرسة|أكاديمية|جامعة|معهد|مركز|منظمة|مستشفى|مصنع|وكالة|مكتب|company|corp|inc|group|school|academy|university|hospital)/i.test(name);
  }, [displayName]);

  // Formatted greeting for display and speech
  const personalizedGreeting = useMemo(() => {
    const trimmed = displayName.trim();
    if (locale === "en") {
      if (isOrganization) {
        return `${timeGreeting}, ${trimmed} team!`;
      }
      return `${timeGreeting}, ${trimmed || "Executive Leader"}!`;
    } else {
      if (isOrganization) {
        return `${timeGreeting} فريق ${trimmed}!`;
      }
      return `${timeGreeting} ${trimmed ? `أ. ${trimmed}` : "عزيزي القائد التنفيذي"}!`;
    }
  }, [locale, timeGreeting, displayName, isOrganization]);

  // Synthesize executive AI narrative text
  const narrativeText = useMemo(() => {
    if (locale === "en") {
      const parts = [personalizedGreeting];
      if (todayInterviews.length > 0) {
        parts.push(`You have ${todayInterviews.length} interview${todayInterviews.length > 1 ? "s" : ""} scheduled today.`);
      } else {
        parts.push("No interviews scheduled for today.");
      }

      if (pendingOffers.length > 0) {
        parts.push(`There ${pendingOffers.length === 1 ? "is" : "are"} ${pendingOffers.length} pending job offer${pendingOffers.length > 1 ? "s" : ""} awaiting candidate response.`);
      }

      if (highMatchCandidates.length > 0) {
        parts.push(`${highMatchCandidates.length} high-match talent${highMatchCandidates.length > 1 ? "s" : ""} (score ≥ 85%) recently evaluated.`);
      }

      if (zeroApplicantJobs.length > 0) {
        parts.push(`Attention: ${zeroApplicantJobs.length} active job opening${zeroApplicantJobs.length > 1 ? "s" : ""} currently have 0 applicants.`);
      }
      return parts.join(" ");
    } else {
      const parts = [personalizedGreeting];
      if (todayInterviews.length === 1) {
        parts.push("لديك اليوم مقابلة مجدولة واحدة تتطلب متابعتك.");
      } else if (todayInterviews.length === 2) {
        parts.push("لديك اليوم مقابلتان مجدولتان تتطلبان متابعتك.");
      } else if (todayInterviews.length > 2) {
        parts.push(`لديك اليوم ${todayInterviews.length} مقابلات مجدولة تتطلب متابعتك.`);
      } else {
        parts.push("لا توجد مقابلات مجدولة لليوم حتى الآن.");
      }

      if (pendingOffers.length === 1) {
        parts.push("يوجد عرض وظيفي واحد معلق بانتظار استجابة المرشح.");
      } else if (pendingOffers.length === 2) {
        parts.push("يوجد عرضان وظيفيان معلقان بانتظار استجابة المرشحين.");
      } else if (pendingOffers.length > 2) {
        parts.push(`يوجد ${pendingOffers.length} عروض وظيفية معلقة بانتظار استجابة المرشحين.`);
      }

      if (highMatchCandidates.length === 1) {
        parts.push("تم رصد مرشح واحد متميز بنسبة ملاءمة ذكاء اصطناعي تفوق 85%.");
      } else if (highMatchCandidates.length === 2) {
        parts.push("تم رصد كفاءتين استثنائيتين بنسبة ملاءمة ذكاء اصطناعي تفوق 85%.");
      } else if (highMatchCandidates.length > 2) {
        parts.push(`تم رصد ${highMatchCandidates.length} كفاءات استثنائية بنسبة ملاءمة ذكاء اصطناعي تفوق 85%.`);
      }

      if (zeroApplicantJobs.length === 1) {
        parts.push("تنبيه: هناك وظيفة نشطة واحدة لا تزال بدون أي متقدمين.");
      } else if (zeroApplicantJobs.length === 2) {
        parts.push("تنبيه: هناك وظيفتان نشطتان لا تزالان بدون أي متقدمين.");
      } else if (zeroApplicantJobs.length > 2) {
        parts.push(`تنبيه: هناك ${zeroApplicantJobs.length} وظائف نشطة لا تزال بدون أي متقدمين.`);
      }

      return parts.join(" ");
    }
  }, [
    locale,
    personalizedGreeting,
    todayInterviews.length,
    pendingOffers.length,
    highMatchCandidates.length,
    zeroApplicantJobs.length,
  ]);

  // Formatted text optimized for natural speech synthesis
  const speechText = useMemo(() => {
    if (locale === "ar") {
      return narrativeText
        .replace(/%/g, " في المئة")
        .replace(/≥/g, " أكبر من أو يساوي ")
        .replace(/!/g, "، ")
        .replace(/✨/g, "")
        .replace(/⏰/g, "");
    } else {
      return narrativeText
        .replace(/%/g, " percent")
        .replace(/≥/g, " greater than or equal to ")
        .replace(/!/g, ", ")
        .replace(/✨/g, "")
        .replace(/⏰/g, "");
    }
  }, [locale, narrativeText]);

  // Audio Speech Reader
  const toggleSpeech = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast({
        title: locale === "en" ? "Speech not supported" : "خاصية القراءة الصوتية غير مدعومة في هذا المتصفح",
        variant: "destructive",
      });
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = locale === "en" ? "en-US" : "ar-SA";
    utterance.rate = locale === "en" ? 0.98 : 0.90;
    utterance.pitch = 1.0;

    // Load available voices and select proper language accent
    const availableVoices = voices.length > 0 ? voices : window.speechSynthesis.getVoices();
    if (locale === "ar") {
      const arVoice = availableVoices.find(
        (v) =>
          v.lang.toLowerCase().startsWith("ar") ||
          v.lang.toLowerCase().includes("ar-") ||
          v.name.toLowerCase().includes("arabic") ||
          v.name.toLowerCase().includes("maged") ||
          v.name.toLowerCase().includes("tarik") ||
          v.name.toLowerCase().includes("laila") ||
          v.name.toLowerCase().includes("salma") ||
          v.name.toLowerCase().includes("naayf") ||
          v.name.toLowerCase().includes("zeina") ||
          v.name.toLowerCase().includes("hoda")
      );
      if (arVoice) {
        utterance.voice = arVoice;
      }
    } else {
      const enVoice = availableVoices.find(
        (v) =>
          v.lang.toLowerCase().startsWith("en") ||
          v.lang.toLowerCase().includes("en-") ||
          v.name.toLowerCase().includes("english") ||
          v.name.toLowerCase().includes("david") ||
          v.name.toLowerCase().includes("mark") ||
          v.name.toLowerCase().includes("zira")
      );
      if (enVoice) {
        utterance.voice = enVoice;
      }
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (e) => {
      console.warn("Speech synthesis state:", e);
      setIsSpeaking(false);
    };

    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  // Automatically cancel speech narration when language changes
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [locale]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-r from-primary/10 via-purple-500/8 to-emerald-500/10 dark:from-primary/15 dark:via-purple-950/25 dark:to-emerald-950/20 p-5 shadow-sm"
      dir={dir}
    >
      {/* Decorative ambient blobs */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar of the Briefing */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border/40 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-md shadow-primary/25 shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-sm tracking-tight text-foreground flex items-center gap-1.5">
                {locale === "en" ? "AI Executive Morning Briefing" : "موجز الصباح التنفيذي الذكي"}
              </span>
              <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px] font-bold py-0.5 px-2">
                {locale === "en" ? "Copilot Briefing ✨" : "موجز المساعد الذكي ✨"}
              </Badge>
              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span>{locale === "en" ? "Live Analysis" : "تحليل لحظي مباشر"}</span>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {new Date().toLocaleDateString(locale === "en" ? "en-US" : "ar-SA", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* Top Controls */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          {onRefreshData && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefreshData}
              className="h-8 px-2.5 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground gap-1.5"
              title={locale === "en" ? "Refresh Analysis" : "تحديث التحليل"}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{locale === "en" ? "Refresh" : "تحديث"}</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={toggleSpeech}
            className={cn(
              "h-8 px-3 rounded-xl text-xs font-bold gap-1.5 transition-all",
              isSpeaking
                ? "bg-primary text-primary-foreground border-primary animate-pulse"
                : "bg-background/80 hover:bg-background border-border/70 text-foreground"
            )}
            title={locale === "en" ? "Listen to Briefing" : "الاستماع للموجز صوتياً"}
          >
            {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-primary" />}
            <span>{isSpeaking ? (locale === "en" ? "Stop" : "إيقاف") : locale === "en" ? "Listen" : "استمع صوتياً"}</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4 pt-3.5"
          >
            {/* Narrative text block */}
            <p className="text-xs sm:text-sm font-medium text-foreground/90 leading-relaxed max-w-4xl">
              {narrativeText}
            </p>

            {/* Quick Interactive Metric Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Interviews Pill */}
              <button
                type="button"
                onClick={() => setSelectedPill(selectedPill === "interviews" ? null : "interviews")}
                className={cn(
                  "p-3 rounded-2xl border text-right transition-all flex flex-col justify-between",
                  selectedPill === "interviews"
                    ? "bg-purple-500/15 border-purple-500/40 shadow-sm"
                    : "bg-card/70 hover:bg-card border-border/60"
                )}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    {locale === "en" ? "Today's Interviews" : "مقابلات اليوم"}
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono font-bold px-1.5 py-0 border-purple-500/30 text-purple-600 dark:text-purple-400">
                    {todayInterviews.length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-[10px] text-purple-700 dark:text-purple-300 font-bold">
                  <span>{todayInterviews.length > 0 ? (locale === "en" ? "View schedule" : "عرض الجدول") : (locale === "en" ? "Clear" : "لا مواعيد")}</span>
                  {dir === "rtl" ? <ArrowLeft className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
                </div>
              </button>

              {/* Pending Offers Pill */}
              <button
                type="button"
                onClick={() => setSelectedPill(selectedPill === "offers" ? null : "offers")}
                className={cn(
                  "p-3 rounded-2xl border text-right transition-all flex flex-col justify-between",
                  selectedPill === "offers"
                    ? "bg-blue-500/15 border-blue-500/40 shadow-sm"
                    : "bg-card/70 hover:bg-card border-border/60"
                )}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    {locale === "en" ? "Pending Offers" : "عروض معلقة"}
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono font-bold px-1.5 py-0 border-blue-500/30 text-blue-600 dark:text-blue-400">
                    {pendingOffers.length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-[10px] text-blue-700 dark:text-blue-300 font-bold">
                  <span>{pendingOffers.length > 0 ? (locale === "en" ? "Require follow-up" : "تتطلب متابعة") : (locale === "en" ? "All signed" : "كلها موقعة")}</span>
                  {dir === "rtl" ? <ArrowLeft className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
                </div>
              </button>

              {/* High AI Matches Pill */}
              <button
                type="button"
                onClick={() => setSelectedPill(selectedPill === "matches" ? null : "matches")}
                className={cn(
                  "p-3 rounded-2xl border text-right transition-all flex flex-col justify-between",
                  selectedPill === "matches"
                    ? "bg-emerald-500/15 border-emerald-500/40 shadow-sm"
                    : "bg-card/70 hover:bg-card border-border/60"
                )}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    {locale === "en" ? "Top AI Talents" : "كفاءات استثنائية"}
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono font-bold px-1.5 py-0 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                    {highMatchCandidates.length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-[10px] text-emerald-700 dark:text-emerald-300 font-bold">
                  <span>{locale === "en" ? "Score ≥ 85%" : "تطابق ≥ 85%"}</span>
                  {dir === "rtl" ? <ArrowLeft className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
                </div>
              </button>

              {/* Bottlenecks / Zero Applicant Jobs Pill */}
              <button
                type="button"
                onClick={() => setSelectedPill(selectedPill === "jobs" ? null : "jobs")}
                className={cn(
                  "p-3 rounded-2xl border text-right transition-all flex flex-col justify-between",
                  selectedPill === "jobs"
                    ? "bg-amber-500/15 border-amber-500/40 shadow-sm"
                    : "bg-card/70 hover:bg-card border-border/60"
                )}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    {locale === "en" ? "Hiring Gaps" : "شواغر حرجة"}
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono font-bold px-1.5 py-0 border-amber-500/30 text-amber-600 dark:text-amber-400">
                    {zeroApplicantJobs.length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-[10px] text-amber-700 dark:text-amber-300 font-bold">
                  <span>{zeroApplicantJobs.length > 0 ? (locale === "en" ? "0 applicants" : "بدون متقدمين") : (locale === "en" ? "Healthy pipeline" : "المسارات نشطة")}</span>
                  {dir === "rtl" ? <ArrowLeft className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
                </div>
              </button>
            </div>

            {/* Expanded details drawer for selected pill */}
            <AnimatePresence>
              {selectedPill && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-2xl bg-card/95 border border-border/80 p-4 shadow-sm space-y-3"
                >
                  {/* Interviews Panel */}
                  {selectedPill === "interviews" && (
                    <div>
                      <div className="flex items-center justify-between border-b pb-2 mb-2">
                        <span className="text-xs font-black text-foreground flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-purple-500" />
                          {locale === "en" ? "Today's Interview Agenda" : "جدول مقابلات اليوم بالتوقيت"}
                        </span>
                        <Link to="/interviews" className="text-[11px] text-primary font-bold hover:underline flex items-center gap-1">
                          {locale === "en" ? "Open Calendar" : "فتح تقويم المقابلات"}
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>

                      {todayInterviews.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">
                          {locale === "en" ? "No interviews scheduled for today." : "لا توجد مقابلات مجدولة لهذا اليوم. يمكنك جدولة مقابلة جديدة بسهولة."}
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {todayInterviews.map((item) => (
                            <div key={item.id} className="p-3 rounded-xl bg-muted/40 border border-border/50 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-foreground truncate">{item.candidate_name || (locale === "en" ? "Candidate" : "مرشح")}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{item.job_title || (locale === "en" ? "Position" : "وظيفة")}</p>
                                <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 font-bold">
                                  ⏰ {item.time || (locale === "en" ? "Time not set" : "غير محدد")}
                                </span>
                              </div>
                              <Link to={`/video-room/${item.video_room_id || item.id}`}>
                                <Button size="sm" className="h-7 text-[10px] font-bold gap-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg">
                                  <Video className="w-3 h-3" />
                                  {locale === "en" ? "Join" : "دخول"}
                                </Button>
                              </Link>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Offers Panel */}
                  {selectedPill === "offers" && (
                    <div>
                      <div className="flex items-center justify-between border-b pb-2 mb-2">
                        <span className="text-xs font-black text-foreground flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-blue-500" />
                          {locale === "en" ? "Pending Job Offers" : "العروض الوظيفية المعلقة للمتابعة"}
                        </span>
                        <Link to="/offers" className="text-[11px] text-primary font-bold hover:underline flex items-center gap-1">
                          {locale === "en" ? "All Offers" : "كافة العروض"}
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>

                      {pendingOffers.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">
                          {locale === "en" ? "All sent offers have been resolved." : "كافة العروض المرسلة تم البت فيها بنجاح."}
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {pendingOffers.slice(0, 4).map((offer) => (
                            <div key={offer.id} className="p-3 rounded-xl bg-muted/40 border border-border/50 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-foreground truncate">{offer.candidate_name || (locale === "en" ? "Candidate" : "مرشح")}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{offer.position || (locale === "en" ? "Role" : "المسمى")}</p>
                                <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold">
                                  {offer.salary ? `${offer.salary.toLocaleString()} ${locale === "en" ? "SAR" : "ر.س"}` : (locale === "en" ? "Approved Package" : "حزمة معتمدة")}
                                </span>
                              </div>
                              <Link to={`/offer/${offer.id}`}>
                                <Button size="sm" variant="outline" className="h-7 text-[10px] font-bold rounded-lg">
                                  {locale === "en" ? "View" : "معاينة"}
                                </Button>
                              </Link>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* High Matches Panel */}
                  {selectedPill === "matches" && (
                    <div>
                      <div className="flex items-center justify-between border-b pb-2 mb-2">
                        <span className="text-xs font-black text-foreground flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                          {locale === "en" ? "Top Matched Candidates (AI ≥ 85%)" : "أبرز المرشحين تطابقاً بالذكاء الاصطناعي"}
                        </span>
                        <Link to="/candidates" className="text-[11px] text-primary font-bold hover:underline flex items-center gap-1">
                          {locale === "en" ? "View All Candidates" : "عرض كل المرشحين"}
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>

                      {highMatchCandidates.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">
                          {locale === "en" ? "No candidates scored ≥ 85% yet." : "لم يتم تسجيل مرشحين بتقييم يفوق 85% حتى الآن."}
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          {highMatchCandidates.map((c) => (
                            <div key={c.id} className="p-3 rounded-xl bg-muted/40 border border-border/50 space-y-1">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-foreground truncate">{c.name || (locale === "en" ? "Candidate" : "مرشح")}</p>
                                <Badge className="bg-emerald-600 text-white text-[10px] font-mono">
                                  {c.ai_score}%
                                </Badge>
                              </div>
                              <p className="text-[10px] text-muted-foreground truncate">{c.role || (locale === "en" ? "Role" : "كادر")}</p>
                              <Link to={`/candidates/${c.id}`} className="text-[10px] text-primary font-bold hover:underline inline-block pt-1">
                                {locale === "en" ? "Open Profile →" : "الملف الشخصي ←"}
                              </Link>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Hiring Gaps Panel */}
                  {selectedPill === "jobs" && (
                    <div>
                      <div className="flex items-center justify-between border-b pb-2 mb-2">
                        <span className="text-xs font-black text-foreground flex items-center gap-1.5">
                          <Briefcase className="w-3.5 h-3.5 text-amber-500" />
                          {locale === "en" ? "Active Jobs Requiring Applicants" : "وظائف نشطة بحاجة لدعم التقديم والترويج"}
                        </span>
                        <Link to="/jobs" className="text-[11px] text-primary font-bold hover:underline flex items-center gap-1">
                          {locale === "en" ? "Manage Jobs" : "إدارة الوظائف"}
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>

                      {zeroApplicantJobs.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">
                          {locale === "en" ? "All active jobs have candidates in the pipeline!" : "ممتاز! جميع الوظائف النشطة تحظى بمرشحين في المسار."}
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {zeroApplicantJobs.slice(0, 4).map((j) => (
                            <div key={j.id} className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-foreground truncate">{j.title}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{j.department || (locale === "en" ? "General Department" : "القسم العام")}</p>
                              </div>
                              <Link to={`/jobs/${j.id}`}>
                                <Button size="sm" variant="outline" className="h-7 text-[10px] font-bold border-amber-500/30 text-amber-700 dark:text-amber-300">
                                  {locale === "en" ? "Promote" : "نشر وترويج"}
                                </Button>
                              </Link>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
