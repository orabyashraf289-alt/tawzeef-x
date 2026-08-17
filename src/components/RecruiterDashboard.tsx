import { useDashboardStats, useInterviews, useCandidates, useJobs, useNotifications } from "@/hooks/useJobs";
import { useOffers } from "@/hooks/useOffers";
import { useI18n } from "@/contexts/I18nContext";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase, Users, UserCheck, Clock, Calendar, FileText, Video, Brain, Target,
  TrendingUp, ArrowUpRight, Kanban, Award, Zap, BarChart3, Globe, Sparkles,
  CheckCircle2, AlertCircle, ChevronRight, Activity, ArrowUp, ArrowDown, Flame,
  Star, Bell, Eye, Settings2, EyeOff, Timer, Percent, ListChecks, CircleDot,
  MessageSquare, PhoneCall, Mail
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import { useState, useMemo, useEffect, useRef, memo } from "react";
import { cn } from "@/lib/utils";
import KPIDetailsDialog from "@/components/KPIDetailsDialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatedDashboardBackground } from "@/components/AnimatedBackground";
import { PageHeader } from "@/components/ui/page-header";
import { FlaticonAnimatedIcon, FlaticonCategoryIconCard } from "@/components/ui/animated-icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { stagger, fadeUp, chartTooltipStyle } from "@/lib/motion";

const STAGES = ["تقديم الطلب", "مراجعة السيرة", "فحص هاتفي", "مقابلة تقنية", "مقابلة نهائية", "العرض الوظيفي"];

const container = stagger(0.04);
const item = fadeUp;

function useCountUp(target: number, duration = 1200) {
  const [count, setCount] = useState(0);
  const prevTarget = useRef(0);
  useEffect(() => {
    if (target === prevTarget.current) return;
    prevTarget.current = target;
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return count;
}

const AnimatedStatValue = memo(function AnimatedStatValue({ value, delay }: { value: number; delay: number }) {
  const count = useCountUp(value, 1200);
  return (
    <motion.p className="text-3xl font-bold text-foreground tabular-nums" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      {count}
    </motion.p>
  );
});

// Memoized so its 1Hz tick doesn't re-render the entire dashboard tree.
const LiveClock = memo(function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const { locale } = useI18n();
  return (
    <span className="font-mono text-sm tabular-nums">
      {time.toLocaleTimeString(locale === "en" ? "en-US" : "ar-SA", { hour: "2-digit", minute: "2-digit" })}
    </span>
  );
});

export default function RecruiterDashboard() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"week" | "month">("month");
  const [selectedKpi, setSelectedKpi] = useState<"conversion" | "timeToHire" | "fillRate" | "offers" | null>(null);

  const { data: stats } = useDashboardStats();
  const { data: candidates } = useCandidates();
  const { data: interviews } = useInterviews();
  const { data: jobs } = useJobs();
  const { data: notifications } = useNotifications();
  const { data: offers } = useOffers();

  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });
  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "";

  const allCandidates = candidates || [];
  const allInterviews = interviews || [];
  const allJobs = jobs || [];
  const allOffers = offers || [];
  const allNotifications = notifications || [];

  const accepted = allCandidates.filter(c => c.status === "مقبول").length;
  const reviewing = allCandidates.filter(c => c.status === "قيد المراجعة").length;

  const offersStats = useMemo(() => {
    const sent = allOffers.filter(o => ["sent", "viewed"].includes(o.status)).length;
    const acceptedOffers = allOffers.filter(o => o.status === "accepted").length;
    const rejectedOffers = allOffers.filter(o => o.status === "rejected").length;
    const acceptanceRate = (acceptedOffers + rejectedOffers) > 0 ? Math.round((acceptedOffers / (acceptedOffers + rejectedOffers)) * 100) : 0;
    return { sent, accepted: acceptedOffers, rejected: rejectedOffers, total: allOffers.length, acceptanceRate };
  }, [allOffers]);

  // Weekly trend
  const weeklyTrend = useMemo(() => {
    const now = new Date();
    const thisWeek = allCandidates.filter(c => (now.getTime() - new Date(c.created_at).getTime()) / 86400000 <= 7).length;
    const lastWeek = allCandidates.filter(c => {
      const diff = (now.getTime() - new Date(c.created_at).getTime()) / 86400000;
      return diff > 7 && diff <= 14;
    }).length;
    const change = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : thisWeek > 0 ? 100 : 0;
    return { thisWeek, change };
  }, [allCandidates]);

  // KPIs
  const kpis = useMemo(() => {
    const totalApplicants = allCandidates.length;
    const hiredCount = accepted;
    const conversionRate = totalApplicants > 0 ? Math.round((hiredCount / totalApplicants) * 100) : 0;
    const scheduledInterviews = allInterviews.filter(i => i.status === "مجدولة").length;
    const completedInterviews = allInterviews.filter(i => i.status === "مكتملة").length;
    const interviewRate = totalApplicants > 0 ? Math.round(((scheduledInterviews + completedInterviews) / totalApplicants) * 100) : 0;
    return { conversionRate, interviewRate, offerAcceptance: offersStats.acceptanceRate };
  }, [allCandidates, allInterviews, offersStats, accepted]);

  // Productivity metrics
  const productivity = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayCandidates = allCandidates.filter(c => new Date(c.created_at) >= today).length;
    const todayInterviews = allInterviews.filter(i => i.date === today.toISOString().split("T")[0]).length;
    const weekCandidates = allCandidates.filter(c => (now.getTime() - new Date(c.created_at).getTime()) / 86400000 <= 7).length;
    const weekInterviews = allInterviews.filter(i => (now.getTime() - new Date(i.created_at).getTime()) / 86400000 <= 7).length;

    // Avg response time (days from candidate creation to first stage change)
    const hiredCandidates = allCandidates.filter(c => c.status === "مقبول");
    const avgTimeToHire = hiredCandidates.length > 0
      ? Math.round(hiredCandidates.reduce((sum, c) => sum + Math.max(Math.floor((new Date(c.updated_at).getTime() - new Date(c.created_at).getTime()) / 86400000), 1), 0) / hiredCandidates.length)
      : 0;

    return { todayCandidates, todayInterviews, weekCandidates, weekInterviews, avgTimeToHire };
  }, [allCandidates, allInterviews]);

  // Job performance data
  const jobPerformance = useMemo(() => {
    return allJobs.slice(0, 6).map(j => {
      const jobCandidates = allCandidates.filter(c => c.job_id === j.id);
      const jobInterviews = allInterviews.filter(i => jobCandidates.some(c => c.id === i.candidate_id));
      const hired = jobCandidates.filter(c => c.status === "مقبول").length;
      return {
        title: j.title.length > 15 ? j.title.slice(0, 15) + "…" : j.title,
        candidates: jobCandidates.length,
        interviews: jobInterviews.length,
        hired,
        status: j.status,
      };
    });
  }, [allJobs, allCandidates, allInterviews]);

  // Pipeline stage data
  const stageData = useMemo(() => {
    const stageTranslations: Record<string, string> = {
      "تقديم الطلب": t("stage.application"), "مراجعة السيرة": t("stage.review"),
      "فحص هاتفي": t("stage.phoneScreen"), "مقابلة تقنية": t("stage.technicalInterview"),
      "مقابلة نهائية": t("stage.finalInterview"), "العرض الوظيفي": t("stage.offer"),
    };
    const counts: Record<string, number> = {};
    STAGES.forEach(s => { counts[s] = 0; });
    allCandidates.forEach(c => {
      const stage = c.stage || "تقديم الطلب";
      if (counts[stage] !== undefined) counts[stage]++;
    });
    const stageColors = ["hsl(var(--primary))", "hsl(222, 60%, 55%)", "hsl(222, 50%, 60%)", "hsl(var(--warning))", "hsl(35, 90%, 50%)", "hsl(var(--success))"];
    return STAGES.map((s, i) => ({ stage: s, label: stageTranslations[s] || s, count: counts[s], fill: stageColors[i] }));
  }, [allCandidates, t]);

  // Source analytics
  const sourceData = useMemo(() => {
    const sources: Record<string, number> = {};
    allCandidates.forEach(c => {
      const source = c.source || "الموقع";
      sources[source] = (sources[source] || 0) + 1;
    });
    const colors = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--warning))", "hsl(var(--info))", "hsl(var(--success))"];
    return Object.entries(sources).map(([name, value], i) => ({ name, value, fill: colors[i % colors.length] }));
  }, [allCandidates]);

  // Monthly trends
  const monthlyData = useMemo(() => {
    const monthNamesAr = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
    const monthNamesEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthNames = locale === "en" ? monthNamesEn : monthNamesAr;
    const months: Record<string, { applied: number; hired: number; interviews: number }> = {};
    allCandidates.forEach(c => {
      const d = new Date(c.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
      if (!months[key]) months[key] = { applied: 0, hired: 0, interviews: 0 };
      months[key].applied++;
      if (c.status === "مقبول") months[key].hired++;
    });
    allInterviews.forEach(i => {
      const d = new Date(i.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
      if (months[key]) months[key].interviews++;
    });
    return Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([key, data]) => {
      const [, m] = key.split("-");
      return { month: monthNames[parseInt(m)], ...data };
    });
  }, [allCandidates, allInterviews, locale]);

  // AI stats
  const aiStats = useMemo(() => {
    const scored = allCandidates.filter(c => (c as any).ai_score != null);
    const avgScore = scored.length > 0 ? Math.round(scored.reduce((sum, c) => sum + ((c as any).ai_score || 0), 0) / scored.length) : 0;
    const highMatch = scored.filter(c => (c as any).ai_score >= 80).length;
    return { evaluated: scored.length, avgScore, highMatch, total: allCandidates.length };
  }, [allCandidates]);

  const unreadNotifications = allNotifications.filter(n => !n.read).length;
  const todayInterviews = allInterviews.filter(i => i.status === "مجدولة").slice(0, 4);
  const recentCandidates = allCandidates.slice(0, 5);

  const statusColors: Record<string, string> = {
    "مقبول": "bg-success/10 text-success border-success/20",
    "قيد المراجعة": "bg-warning/10 text-warning border-warning/20",
    "مرفوض": "bg-destructive/10 text-destructive border-destructive/20",
  };

  const greeting = () => {
    const hour = new Date().getHours();
    return hour < 12 ? t("dashboard.greeting.morning") : t("dashboard.greeting.evening");
  };

  return (
    <>
      <AnimatedDashboardBackground />
      <style>{`
        @keyframes gradient-sweep {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .sweeping-border-card {
          position: relative;
          border: 1.5px solid transparent;
          background: linear-gradient(to bottom, hsl(var(--card)) 0%, hsl(var(--card)) 100%) padding-box,
                      linear-gradient(135deg, hsl(var(--primary) / 0.45) 0%, hsl(var(--accent) / 0.25) 45%, hsl(var(--success) / 0.4) 75%, hsl(var(--primary) / 0.45) 100%) border-box;
          background-size: 200% 200%;
          animation: gradient-sweep 6s ease infinite;
        }

        .premium-radial-glow {
          position: absolute;
          width: 160px;
          height: 160px;
          border-radius: 50%;
          filter: blur(45px);
          opacity: 0.08;
          pointer-events: none;
          transition: opacity 0.5s ease, transform 0.5s ease;
        }

        .glass-card-premium:hover .premium-radial-glow {
          opacity: 0.22;
          transform: scale(1.15);
        }
      `}</style>
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="p-4 lg:p-8 space-y-6 relative"
      >
        {/* Clean Theme-Adaptive Page Header & Live Stats */}
        <motion.div variants={item}>
          <PageHeader
            badgeText={locale === "en" ? "Live HR Operations & Intelligence" : "مركز العمليات التوظيفية ومؤشرات الأداء المباشرة"}
            badgeIcon={Sparkles}
            title={`${greeting()}، ${displayName} 👋`}
            description={locale === "en" ? "Real-time overview of candidates, open positions, pipeline stages, and interview metrics." : "متابعة فورية ومباشرة لحالة المرشحين، الوظائف المفتوحة، مراحل التوظيف، وتنبيهات النظام."}
            icon={Briefcase}
            accentColor="emerald"
            actions={
              <div className="flex items-center gap-3 flex-wrap">
                {unreadNotifications > 0 && (
                  <Link to="/notifications">
                    <Button variant="outline" size="sm" className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 rounded-xl h-11 px-4 text-xs font-bold shadow-xs">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
                      </span>
                      {unreadNotifications} {t("dashboard.notifNew")}
                    </Button>
                  </Link>
                )}
                <div className="flex items-center gap-2 bg-md-surface-container border border-md-outline-variant rounded-md3-full px-4 py-2 shadow-xs font-bold text-xs">
                  <Clock className="w-4 h-4 text-emerald-500" />
                  <LiveClock />
                  <span className="text-muted-foreground text-xs">•</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date().toLocaleDateString(locale === "en" ? "en-US" : "ar-SA", { weekday: "long", day: "numeric", month: "short" })}
                  </span>
                </div>
                <Link to="/jobs">
                  <Button className="rounded-md3-xl h-10 px-5 text-xs font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md3-1">
                    <Zap className="w-4 h-4" />إضافة شاغر جديد
                  </Button>
                </Link>
              </div>
            }
          />
        </motion.div>

        {/* Today's Productivity Strip */}
        <motion.div variants={item}>
          <div className="rounded-md3-2xl border border-md-outline-variant p-4 bg-md-surface-container shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-md3-sm bg-md-primary-container text-md-on-primary-container flex items-center justify-center">
                <Timer className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold text-foreground">{locale === "en" ? "Today's Activity" : "نشاط اليوم"}</span>
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <Badge variant="outline" className="text-[10px] font-bold rounded-md3-full border-md-outline-variant">{new Date().toLocaleDateString(locale === "en" ? "en-US" : "ar-SA", { day: "numeric", month: "short" })}</Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: locale === "en" ? "New Candidates" : "مرشحون جدد", value: productivity.todayCandidates, icon: Users, color: "text-primary", bg: "bg-md-primary-container/30 border-primary/20", type: "conversion" as const },
                { label: locale === "en" ? "Interviews Today" : "مقابلات اليوم", value: productivity.todayInterviews, icon: Video, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", type: "timeToHire" as const },
                { label: locale === "en" ? "This Week" : "هذا الأسبوع", value: productivity.weekCandidates, icon: TrendingUp, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10 border-violet-500/20", type: "conversion" as const },
                { label: locale === "en" ? "Week Interviews" : "مقابلات الأسبوع", value: productivity.weekInterviews, icon: Calendar, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", type: "timeToHire" as const },
                { label: locale === "en" ? "Avg Time to Hire" : "متوسط وقت التوظيف", value: productivity.avgTimeToHire, icon: Clock, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", suffix: locale === "en" ? " days" : " يوم", type: "timeToHire" as const },
              ].map((m, i) => (
                <motion.div key={i} whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }} onClick={() => setSelectedKpi(m.type)} className={cn("rounded-md3-xl p-3 text-center cursor-pointer border transition-all duration-200 shadow-xs", m.bg)}>
                  <m.icon className={cn("w-5 h-5 mx-auto mb-1.5", m.color)} />
                  <p className={cn("text-xl font-black", m.color)}>{m.value}{m.suffix || ""}</p>
                  <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">{m.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Stat Cards */}
        <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: Briefcase, title: t("dashboard.activeJobs"), value: stats?.activeJobs ?? 0, subtitle: `${t("common.from")} ${allJobs.length} ${locale === "en" ? "jobs" : "وظيفة"}`, iconColor: "text-primary", bg: "bg-md-surface-container border-md-outline-variant", type: "fillRate" as const },
            { icon: Users, title: t("dashboard.totalCandidates"), value: stats?.totalCandidates ?? 0, subtitle: weeklyTrend.change >= 0 ? `+${weeklyTrend.change}% ${t("dashboard.thisWeek")}` : `${weeklyTrend.change}% ${t("dashboard.thisWeek")}`, trend: weeklyTrend.change, iconColor: "text-violet-600 dark:text-violet-400", bg: "bg-md-surface-container border-md-outline-variant", type: "conversion" as const },
            { icon: UserCheck, title: t("dashboard.hired"), value: stats?.hired ?? 0, subtitle: `${kpis.conversionRate}% ${t("dashboard.conversionRate")}`, iconColor: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", type: "offers" as const },
            { icon: Calendar, title: t("dashboard.scheduledInterviews"), value: allInterviews.filter(i => i.status === "مجدولة").length, subtitle: `${allInterviews.filter(i => i.status === "مكتملة").length} ${t("dashboard.completed")}`, iconColor: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", type: "timeToHire" as const },
          ].map((stat, i) => (
            <motion.div key={stat.title} whileHover={{ y: -4, scale: 1.015 }} transition={{ type: "spring", stiffness: 300, damping: 20 }} onClick={() => setSelectedKpi(stat.type)}>
              <div className={cn("rounded-md3-2xl border p-5 cursor-pointer transition-all duration-200 shadow-xs", stat.bg)}>
                <div className="flex items-start justify-between">
                  <div className="w-11 h-11 rounded-md3-xl bg-card border border-md-outline-variant flex items-center justify-center shadow-xs">
                    <stat.icon className={cn("w-5 h-5", stat.iconColor)} />
                  </div>
                  {stat.trend !== undefined && (
                    <Badge variant="outline" className={cn("text-[10px] font-bold rounded-md3-full", stat.trend >= 0 ? "text-emerald-600 border-emerald-500/30 bg-emerald-500/5" : "text-destructive border-destructive/30 bg-destructive/5")}>
                      {stat.trend >= 0 ? <ArrowUp className="w-3 h-3 ml-0.5" /> : <ArrowDown className="w-3 h-3 ml-0.5" />}
                      {Math.abs(stat.trend)}%
                    </Badge>
                  )}
                </div>
                <div className="mt-4">
                  <AnimatedStatValue value={stat.value} delay={i * 0.1 + 0.2} />
                  <p className="text-sm font-bold text-foreground mt-1">{stat.title}</p>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">{stat.subtitle}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Quick Actions */}
        <motion.div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />{t("dashboard.quickActions")}
            </h3>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[
              { label: t("dashboard.postJob"), icon: Briefcase, color: "text-primary border-primary/25 hover:bg-primary/10", path: "/jobs" },
              { label: t("dashboard.candidates"), icon: Users, color: "text-violet-600 dark:text-violet-400 border-violet-500/25 hover:bg-violet-500/10", path: "/candidates" },
              { label: t("dashboard.pipeline"), icon: Kanban, color: "text-blue-600 dark:text-blue-400 border-blue-500/25 hover:bg-blue-500/10", path: "/pipeline" },
              { label: t("dashboard.scheduleInterview"), icon: Calendar, color: "text-amber-600 dark:text-amber-400 border-amber-500/25 hover:bg-amber-500/10", path: "/interviews" },
              { label: t("dashboard.offers"), icon: FileText, color: "text-emerald-600 dark:text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/10", path: "/offers" },
              { label: t("dashboard.reports"), icon: BarChart3, color: "text-foreground border-md-outline-variant hover:bg-md-surface-container", path: "/reports" },
            ].map((action) => (
              <Link key={action.label} to={action.path}>
                <motion.div whileHover={{ scale: 1.04, y: -3 }} whileTap={{ scale: 0.95 }} className={cn("group flex flex-col items-center gap-2 rounded-md3-2xl p-4 font-bold text-xs transition-all cursor-pointer text-center bg-md-surface-container border shadow-xs", action.color)}>
                  <div className="p-2.5 rounded-md3-xl bg-card border border-md-outline-variant shadow-xs">
                    <action.icon className="w-4.5 h-4.5" />
                  </div>
                  <span className="truncate w-full">{action.label}</span>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Job Performance Table */}
        <motion.div variants={item}>
          <Card className="group relative glass-card-premium border border-border/20 shadow-lg overflow-hidden bg-card/40 backdrop-blur-md">
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
            <CardHeader className="pb-3 relative">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <motion.div whileHover={{ rotate: 15 }} transition={{ type: "spring", stiffness: 300 }}>
                    <ListChecks className="w-4.5 h-4.5 text-primary" />
                  </motion.div>
                  {locale === "en" ? "Job Performance" : "أداء الوظائف"}
                </CardTitle>
                <Link to="/jobs" className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold">
                  {t("common.viewAll")} <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="relative">
              {jobPerformance.length === 0 ? (
                <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">{t("common.noData")}</div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 pb-1 border-b border-border/20">
                    <span className="col-span-4">{locale === "en" ? "Position" : "الوظيفة"}</span>
                    <span className="col-span-2 text-center">{locale === "en" ? "Candidates" : "المرشحون"}</span>
                    <span className="col-span-2 text-center">{locale === "en" ? "Interviews" : "المقابلات"}</span>
                    <span className="col-span-2 text-center">{locale === "en" ? "Hired" : "تم التوظيف"}</span>
                    <span className="col-span-2 text-center">{locale === "en" ? "Status" : "الحالة"}</span>
                  </div>
                  {jobPerformance.map((job, i) => (
                    <motion.div key={i} whileHover={{ y: -2, scale: 1.005 }} className="grid grid-cols-12 gap-2 items-center px-3 py-2.5 rounded-xl transition-all cursor-default list-hover-highlight glass-card-premium bg-card/20 border border-border/10">
                      <span className="col-span-4 text-sm font-semibold truncate text-foreground/90">{job.title}</span>
                      <span className="col-span-2 text-center">
                        <Badge variant="outline" className="text-[10px] bg-primary/5 border-primary/25 text-primary font-bold">{job.candidates}</Badge>
                      </span>
                      <span className="col-span-2 text-center">
                        <Badge variant="outline" className="text-[10px] border-warning/25 text-warning bg-warning/5 font-bold">{job.interviews}</Badge>
                      </span>
                      <span className="col-span-2 text-center">
                        <Badge variant="outline" className="text-[10px] border-success/25 text-success bg-success/5 font-bold">{job.hired}</Badge>
                      </span>
                      <span className="col-span-2 text-center flex justify-center">
                        <Badge variant="outline" className={cn("text-[10px] font-bold flex items-center gap-1", job.status === "نشطة" ? "border-success/20 text-success bg-success/5" : "border-muted-foreground/30 text-muted-foreground bg-muted/10")}>
                          {job.status === "نشطة" && (
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success live-breathing-indicator" />
                            </span>
                          )}
                          {job.status}
                        </Badge>
                      </span>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Charts Row: Trends + KPIs + AI */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Trends */}
          <motion.div variants={item} className="lg:col-span-2">
            <Card className="group relative glass-card-premium border border-border/20 shadow-lg overflow-hidden bg-card/40 backdrop-blur-md">
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
              <CardHeader className="pb-2 relative">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="w-4.5 h-4.5 text-primary" />{t("dashboard.hiringTrends")}
                  </CardTitle>
                  <div className="flex gap-1 bg-muted/60 backdrop-blur-md rounded-lg p-0.5 border border-border/25">
                    {(["week", "month"] as const).map(tab => (
                      <button key={tab} onClick={() => setActiveTab(tab)} className={cn("px-3 py-1 rounded-md text-xs font-semibold transition-all", activeTab === tab ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                        {tab === "week" ? t("dashboard.weekly") : t("dashboard.monthly")}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={monthlyData} margin={{ left: -10, right: 10 }}>
                      <defs>
                        <linearGradient id="rAppliedGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="rHiredGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 500 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fontWeight: 500 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={chartTooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600, paddingTop: 16 }} />
                      <Area type="monotone" dataKey="applied" name={locale === "en" ? "Applied" : "المتقدمين"} fill="url(#rAppliedGrad)" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 4 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                      <Area type="monotone" dataKey="hired" name={locale === "en" ? "Hired" : "تم التوظيف"} fill="url(#rHiredGrad)" stroke="hsl(var(--success))" strokeWidth={3} dot={{ fill: "hsl(var(--success))", strokeWidth: 0, r: 4 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground">
                    <Activity className="w-12 h-12 mb-3 opacity-30 animate-pulse" />
                    <p className="text-sm font-semibold">{t("dashboard.noDataSufficient")}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* KPIs + AI */}
          <motion.div variants={item}>
            <Card className="group relative glass-card-premium border border-border/20 shadow-lg h-full overflow-hidden bg-card/40 backdrop-blur-md">
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
              <CardHeader className="pb-2 relative">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-4.5 h-4.5 text-primary" />{t("dashboard.kpis")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {[
                  { label: t("dashboard.conversionRate"), value: kpis.conversionRate, icon: TrendingUp, desc: t("dashboard.fromApplicantsToHire"), color: "primary" },
                  { label: t("dashboard.interviewRate"), value: kpis.interviewRate, icon: Video, desc: t("dashboard.fromApplicantsToInterview"), color: "accent" },
                  { label: t("dashboard.offerAcceptance"), value: kpis.offerAcceptance, icon: Award, desc: t("dashboard.offerAcceptanceRate"), color: "success" },
                ].map(kpi => (
                  <div key={kpi.label} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", `bg-${kpi.color}/10 border border-${kpi.color}/20`)}>
                          <kpi.icon className={cn("w-4 h-4", `text-${kpi.color}`)} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground/90">{kpi.label}</p>
                          <p className="text-[10px] text-muted-foreground font-semibold">{kpi.desc}</p>
                        </div>
                      </div>
                      <span className="text-lg font-extrabold">{kpi.value}%</span>
                    </div>
                    <div className="relative h-2 bg-muted/60 rounded-full overflow-hidden border border-border/10">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${kpi.value}%` }} transition={{ duration: 1.2, ease: "easeOut" }} className={cn("absolute h-full rounded-full", `bg-${kpi.color}`)} />
                    </div>
                  </div>
                ))}
                <div className="pt-4 border-t border-border/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain className="w-4.5 h-4.5 text-primary animate-pulse" />
                    <span className="text-sm font-bold text-foreground/90">{t("dashboard.aiEvaluation")}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-2.5 text-center">
                      <p className="text-lg font-extrabold text-primary">{aiStats.evaluated}</p>
                      <p className="text-[9px] text-muted-foreground font-semibold">{t("dashboard.evaluated")}</p>
                    </div>
                    <div className="bg-success/5 border border-success/20 rounded-xl p-2.5 text-center">
                      <p className="text-lg font-extrabold text-success">{aiStats.avgScore}%</p>
                      <p className="text-[9px] text-muted-foreground font-semibold">{t("dashboard.avgMatch")}</p>
                    </div>
                    <div className="bg-warning/5 border border-warning/20 rounded-xl p-2.5 text-center">
                      <p className="text-lg font-extrabold text-warning">{aiStats.highMatch}</p>
                      <p className="text-[9px] text-muted-foreground font-semibold">{locale === "en" ? "High Match" : "تطابق عالي"}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Pipeline + Sources + Offers */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Pipeline */}
          <motion.div variants={item} whileHover={{ y: -6, scale: 1.015 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
            <Card className="group relative glass-card-premium border border-border/20 shadow-lg h-full overflow-hidden bg-card/40 backdrop-blur-md">
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
              <CardHeader className="pb-2 relative">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Kanban className="w-4.5 h-4.5 text-primary" />{t("dashboard.pipelineStages")}
                  </CardTitle>
                  <Link to="/pipeline" className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold">{t("common.viewAll")} <ChevronRight className="w-3 h-3" /></Link>
                </div>
              </CardHeader>
              <CardContent>
                {allCandidates.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">{t("common.noData")}</div>
                ) : (
                  <div className="space-y-3">
                    {stageData.map((s, i) => {
                      const maxCount = Math.max(...stageData.map(sd => sd.count), 1);
                      const width = Math.max((s.count / maxCount) * 100, 4);
                      return (
                        <div key={s.stage} className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-muted-foreground">{s.label}</span>
                            <span className="font-bold text-foreground">{s.count}</span>
                          </div>
                          <div className="h-6 bg-muted/40 rounded-lg overflow-hidden border border-border/10 p-0.5">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${width}%` }} transition={{ delay: i * 0.06, duration: 0.6, ease: "easeOut" }} className="h-full rounded-md shadow-sm" style={{ background: s.fill }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Sources */}
          <motion.div variants={item} whileHover={{ y: -6, scale: 1.015 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
            <Card className="group relative glass-card-premium border border-border/20 shadow-lg h-full overflow-hidden bg-card/40 backdrop-blur-md">
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
              <CardHeader className="pb-2 relative">
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="w-4.5 h-4.5 text-primary" />{t("dashboard.candidateSources")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sourceData.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">{t("common.noData")}</div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={140}>
                      <PieChart>
                        <Pie data={sourceData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" strokeWidth={0}>
                          {sourceData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                        </Pie>
                        <Tooltip contentStyle={chartTooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 mt-3">
                      {sourceData.slice(0, 4).map((s, i) => (
                        <div key={i} className="flex items-center justify-between text-xs font-semibold">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.fill }} />
                            <span className="text-muted-foreground">{s.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground">{s.value}</span>
                            <span className="text-muted-foreground text-[10px]">({Math.round((s.value / allCandidates.length) * 100)}%)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Offers Summary */}
          <motion.div variants={item} whileHover={{ y: -6, scale: 1.015 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
            <Card className="group relative glass-card-premium border border-border/20 shadow-lg h-full overflow-hidden bg-card/40 backdrop-blur-md">
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
              <CardHeader className="pb-3 relative">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4.5 h-4.5 text-primary" />{t("dashboard.offersSummary")}
                  </CardTitle>
                  <Link to="/offers" className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold">{t("common.viewAll")} <ChevronRight className="w-3 h-3" /></Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: t("dashboard.totalOffers"), value: offersStats.total, icon: FileText, color: "text-foreground/90", bg: "bg-muted/30 border border-border/10" },
                    { label: t("dashboard.sentOffers"), value: offersStats.sent, icon: ArrowUpRight, color: "text-primary", bg: "bg-primary/5 border border-primary/10" },
                    { label: t("dashboard.acceptedOffers"), value: offersStats.accepted, icon: CheckCircle2, color: "text-success", bg: "bg-success/5 border border-success/10" },
                    { label: t("dashboard.rejectedOffers"), value: offersStats.rejected, icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/5 border border-destructive/10" },
                  ].map((s, i) => (
                    <motion.div key={i} whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.97 }} className={cn("rounded-xl p-3 text-center transition-all cursor-default shadow-sm", s.bg)}>
                      <motion.div whileHover={{ rotate: 10, scale: 1.2 }} transition={{ type: "spring", stiffness: 400 }}>
                        <s.icon className={cn("w-4 h-4 mx-auto mb-1.5", s.color)} />
                      </motion.div>
                      <p className={cn("text-xl font-bold tracking-tight", s.color)}>{s.value}</p>
                      <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">{s.label}</p>
                    </motion.div>
                  ))}
                </div>
                {offersStats.total > 0 && (
                  <div className="mt-4 pt-3 border-t border-border/20">
                    <div className="flex justify-between text-xs mb-2 font-semibold">
                      <span className="text-muted-foreground">{t("dashboard.acceptanceRate")}</span>
                      <span className="font-bold text-success">{offersStats.acceptanceRate}%</span>
                    </div>
                    <div className="relative h-2 bg-muted/60 rounded-full overflow-hidden border border-border/10">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${offersStats.acceptanceRate}%` }} transition={{ duration: 1.2, ease: "easeOut" }} className="absolute h-full rounded-full bg-success" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Bottom Row: Interviews + Candidates + Activity */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Upcoming Interviews */}
          <motion.div variants={item} whileHover={{ y: -6, scale: 1.015 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
            <Card className="group relative glass-card-premium border border-border/20 shadow-lg h-full overflow-hidden bg-card/40 backdrop-blur-md">
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
              <CardHeader className="pb-3 bg-gradient-to-l from-warning/5 to-transparent relative">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="w-4.5 h-4.5 text-warning" />{t("dashboard.upcomingInterviews")}
                  </CardTitle>
                  <Link to="/interviews" className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold">{t("common.viewAll")} <ChevronRight className="w-3 h-3" /></Link>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                {todayInterviews.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 mx-auto text-muted-foreground/20 mb-3" />
                    <p className="text-sm text-muted-foreground font-semibold">{t("dashboard.noScheduledInterviews")}</p>
                  </div>
                ) : (
                  <div className={cn("relative py-1 space-y-4", locale === "ar" ? "border-r border-dashed border-border/60 pr-4 mr-2" : "border-l border-dashed border-border/60 pl-4 ml-2")}>
                    {todayInterviews.map((interview, i) => (
                      <motion.div
                        key={interview.id}
                        initial={{ opacity: 0, x: locale === "ar" ? 15 : -15 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + i * 0.08 }}
                        className="relative flex items-center gap-3 group/item p-2 rounded-xl list-hover-highlight transition-all cursor-default hover:bg-muted/30"
                      >
                        {/* Timeline Bullet Node */}
                        <div className={cn(
                          "absolute top-2.5 w-2.5 h-2.5 rounded-full border bg-background z-10 transition-all group-hover/item:scale-125 border-warning bg-warning shadow-[0_0_8px_hsl(var(--warning)/0.6)]",
                          locale === "ar" ? "-right-[21.5px]" : "-left-[21.5px]"
                        )} />

                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-warning/20 to-warning/5 flex items-center justify-center flex-shrink-0 shadow-sm border border-warning/30">
                          <Video className="w-5 h-5 text-warning" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate text-foreground/90">{interview.candidate_name}</p>
                          <p className="text-xs text-muted-foreground truncate font-medium">{interview.position}</p>
                        </div>
                        <div className="text-left shrink-0">
                          <span className="text-xs font-extrabold text-warning bg-warning/10 px-2.5 py-1 rounded-lg block border border-warning/20">{interview.time?.slice(0, 5)}</span>
                          <span className="text-[10px] text-muted-foreground font-medium mt-1 block">{interview.date}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Candidates */}
          <motion.div variants={item} whileHover={{ y: -6, scale: 1.015 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
            <Card className="group relative glass-card-premium border border-border/20 shadow-lg h-full overflow-hidden bg-card/40 backdrop-blur-md">
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
              <CardHeader className="pb-3 bg-gradient-to-l from-primary/5 to-transparent relative">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4.5 h-4.5 text-primary" />{t("dashboard.recentCandidates")}
                  </CardTitle>
                  <Link to="/candidates" className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold">{t("common.viewAll")} <ChevronRight className="w-3 h-3" /></Link>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                {recentCandidates.length === 0 ? (
                  <div className="text-center py-8"><p className="text-sm text-muted-foreground font-semibold">{t("candidates.noCandidates")}</p></div>
                ) : (
                  <div className="space-y-2">
                    {recentCandidates.map((c, i) => (
                      <motion.div key={c.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.05 }}>
                        <Link to={`/candidates/${c.id}`} className="flex items-center gap-3 p-2.5 rounded-xl list-hover-highlight transition-all group hover:bg-muted/30">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/25 to-primary/5 border border-primary/30 flex items-center justify-center text-xs text-primary font-extrabold shadow-sm">
                            {c.name ? c.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() : "??"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate group-hover:text-primary transition-colors text-foreground/90">{c.name}</p>
                            <p className="text-xs text-muted-foreground truncate font-medium">{c.role}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {(c as any).ai_score != null && (
                              <div className="flex items-center gap-1 bg-primary/10 border border-primary/20 px-2 py-1 rounded-lg">
                                <Star className="w-3 h-3 text-primary fill-primary" />
                                <span className="text-[10px] font-extrabold text-primary">{(c as any).ai_score}%</span>
                              </div>
                            )}
                            <Badge variant="outline" className={cn("text-[10px] font-bold border", statusColors[c.status] || "")}>{c.status}</Badge>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Activity Timeline */}
          <motion.div variants={item} whileHover={{ y: -6, scale: 1.015 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
            <Card className="group relative glass-card-premium border border-border/20 shadow-lg h-full overflow-hidden bg-card/40 backdrop-blur-md">
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
              <CardHeader className="pb-3 bg-gradient-to-l from-info/5 to-transparent relative">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="w-4.5 h-4.5 text-info" />{t("dashboard.latestActivity")}
                  </CardTitle>
                  <Link to="/notifications" className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold">{t("common.viewAll")} <ChevronRight className="w-3 h-3" /></Link>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                {allNotifications.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="w-12 h-12 mx-auto text-muted-foreground/20 mb-3 animate-pulse" />
                    <p className="text-sm text-muted-foreground font-semibold">{t("dashboard.noActivity")}</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {allNotifications.slice(0, 6).map((n, i) => {
                      const typeColors: Record<string, string> = {
                        application: "bg-info/10 text-info border-info/20", stage_change: "bg-primary/10 text-primary border-primary/20",
                        rejection: "bg-destructive/10 text-destructive border-destructive/20", offer: "bg-accent/15 text-accent border-accent/30",
                        interview: "bg-warning/10 text-warning border-warning/20", system: "bg-muted text-muted-foreground border-border/20",
                      };
                      const typeIcons: Record<string, typeof Bell> = {
                        application: FileText, stage_change: Activity, rejection: AlertCircle,
                        offer: FileText, interview: Calendar, system: Bell,
                      };
                      const Icon = typeIcons[n.type] || Bell;
                      const formatTime = (dateStr: string) => {
                        const diff = Date.now() - new Date(dateStr).getTime();
                        const mins = Math.floor(diff / 60000);
                        if (mins < 1) return t("common.now");
                        if (mins < 60) return `${mins} ${locale === "en" ? "m" : "د"}`;
                        const hours = Math.floor(mins / 60);
                        if (hours < 24) return `${hours} ${locale === "en" ? "h" : "س"}`;
                        return `${Math.floor(hours / 24)} ${locale === "en" ? "d" : "ي"}`;
                      };
                      return (
                        <motion.div key={n.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-start gap-3 p-2.5 rounded-xl list-hover-highlight transition-all hover:bg-muted/30">
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border", typeColors[n.type] || "bg-muted")}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn("text-xs leading-relaxed", !n.read ? "font-bold text-foreground" : "text-foreground/80 font-medium")}>{n.title}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold">{formatTime(n.created_at)}</p>
                          </div>
                          {!n.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5 shadow-[0_0_8px_hsl(var(--primary)/0.6)]" />}
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
      <KPIDetailsDialog
        isOpen={selectedKpi !== null}
        onClose={() => setSelectedKpi(null)}
        type={selectedKpi}
        candidates={allCandidates}
        interviews={allInterviews}
        jobs={allJobs}
        offers={allOffers}
        locale={locale}
      />
    </>
  );
}
