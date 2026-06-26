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
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="p-4 lg:p-8 space-y-6 relative"
      >
        {/* Header */}
        <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }} className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center shadow-lg">
              <Briefcase className="w-6 h-6 text-accent-foreground animate-pulse" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{greeting()}، {displayName} 👋</h1>
              <p className="text-muted-foreground text-sm flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] font-bold border-accent/30 text-accent">{t("role.recruiter")}</Badge>
                {locale === "en" ? "Your recruitment overview" : "ملخص نشاط التوظيف"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {unreadNotifications > 0 && (
              <Link to="/notifications">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="outline" size="sm" className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
                    </span>
                    {unreadNotifications} {t("dashboard.notifNew")}
                  </Button>
                </motion.div>
              </Link>
            )}
            <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-2 shadow-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <LiveClock />
              <span className="text-muted-foreground text-xs">•</span>
              <span className="text-xs text-muted-foreground">
                {new Date().toLocaleDateString(locale === "en" ? "en-US" : "ar-SA", { weekday: "long", day: "numeric", month: "short" })}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Today's Productivity Strip */}
        <motion.div variants={item}>
          <Card className="group relative border-0 glass-card-premium shadow-md overflow-hidden bg-gradient-to-r from-accent/5 via-primary/5 to-success/5">
            {/* Shimmer sweep */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
            <CardContent className="p-4 relative">
              <div className="flex items-center gap-2 mb-3">
                <motion.div whileHover={{ rotate: 15, scale: 1.2 }} transition={{ type: "spring", stiffness: 300 }}>
                  <Timer className="w-4 h-4 text-accent animate-bounce" />
                </motion.div>
                <span className="text-sm font-bold">{locale === "en" ? "Today's Activity" : "نشاط اليوم"}</span>
                <div className="flex items-center gap-1.5 ml-auto">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-success live-breathing-indicator" />
                  </span>
                  <Badge variant="outline" className="text-[9px]">{new Date().toLocaleDateString(locale === "en" ? "en-US" : "ar-SA", { day: "numeric", month: "short" })}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { label: locale === "en" ? "New Candidates" : "مرشحون جدد", value: productivity.todayCandidates, icon: Users, color: "text-primary", bg: "bg-primary/10", type: "conversion" as const },
                  { label: locale === "en" ? "Interviews Today" : "مقابلات اليوم", value: productivity.todayInterviews, icon: Video, color: "text-warning", bg: "bg-warning/10", type: "timeToHire" as const },
                  { label: locale === "en" ? "This Week" : "هذا الأسبوع", value: productivity.weekCandidates, icon: TrendingUp, color: "text-accent", bg: "bg-accent/10", type: "conversion" as const },
                  { label: locale === "en" ? "Week Interviews" : "مقابلات الأسبوع", value: productivity.weekInterviews, icon: Calendar, color: "text-info", bg: "bg-info/10", type: "timeToHire" as const },
                  { label: locale === "en" ? "Avg Time to Hire" : "متوسط وقت التوظيف", value: productivity.avgTimeToHire, icon: Clock, color: "text-success", bg: "bg-success/10", suffix: locale === "en" ? " days" : " يوم", type: "timeToHire" as const },
                ].map((m, i) => (
                  <motion.div key={i} whileHover={{ scale: 1.06, y: -4 }} whileTap={{ scale: 0.97 }} onClick={() => setSelectedKpi(m.type)} className={cn("rounded-xl p-3 text-center cursor-pointer glass-card-premium", m.bg)}>
                    <motion.div whileHover={{ rotate: 10, scale: 1.15 }} transition={{ type: "spring", stiffness: 400 }}>
                      <m.icon className={cn("w-5 h-5 mx-auto mb-1 transition-transform", m.color)} />
                    </motion.div>
                    <p className={cn("text-xl font-bold", m.color)}>{m.value}{m.suffix || ""}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{m.label}</p>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stat Cards */}
        <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Briefcase, title: t("dashboard.activeJobs"), value: stats?.activeJobs ?? 0, subtitle: `${t("common.from")} ${allJobs.length} ${locale === "en" ? "jobs" : "وظيفة"}`, color: "from-primary to-primary/70", bgColor: "bg-primary/5", type: "fillRate" as const },
            { icon: Users, title: t("dashboard.totalCandidates"), value: stats?.totalCandidates ?? 0, subtitle: weeklyTrend.change >= 0 ? `+${weeklyTrend.change}% ${t("dashboard.thisWeek")}` : `${weeklyTrend.change}% ${t("dashboard.thisWeek")}`, trend: weeklyTrend.change, color: "from-accent to-accent/70", bgColor: "bg-accent/5", type: "conversion" as const },
            { icon: UserCheck, title: t("dashboard.hired"), value: stats?.hired ?? 0, subtitle: `${kpis.conversionRate}% ${t("dashboard.conversionRate")}`, color: "from-success to-success/70", bgColor: "bg-success/5", type: "offers" as const },
            { icon: Calendar, title: t("dashboard.scheduledInterviews"), value: allInterviews.filter(i => i.status === "مجدولة").length, subtitle: `${allInterviews.filter(i => i.status === "مكتملة").length} ${t("dashboard.completed")}`, color: "from-warning to-warning/70", bgColor: "bg-warning/5", type: "timeToHire" as const },
          ].map((stat, i) => (
            <motion.div key={stat.title} whileHover={{ y: -8, scale: 1.02 }} transition={{ type: "spring", stiffness: 300, damping: 20 }} onClick={() => setSelectedKpi(stat.type)}>
              <Card className="glass-card-premium border-none shadow-md group relative overflow-hidden cursor-pointer">
                {/* Glow effect */}
                <div className={cn("absolute -bottom-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-10 group-hover:opacity-35 transition-opacity duration-500 pointer-events-none", stat.color.replace('from-', 'bg-'))} />
                <CardContent className="p-5 relative">
                  <div className="flex items-start justify-between">
                    <motion.div className={cn("w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md", stat.color)} whileHover={{ rotate: 12, scale: 1.15 }}>
                      <stat.icon className="w-5 h-5 text-white" />
                    </motion.div>
                    {stat.trend !== undefined && (
                      <Badge variant="outline" className={cn("text-[10px] font-bold transition-all duration-300 group-hover:scale-105", stat.trend >= 0 ? "text-success border-success/30 bg-success/5" : "text-destructive border-destructive/30 bg-destructive/5")}>
                        {stat.trend >= 0 ? <ArrowUp className="w-3 h-3 ml-0.5" /> : <ArrowDown className="w-3 h-3 ml-0.5" />}
                        {Math.abs(stat.trend)}%
                      </Badge>
                    )}
                  </div>
                  <div className="mt-4">
                    <AnimatedStatValue value={stat.value} delay={i * 0.1 + 0.2} />
                    <p className="text-sm font-semibold text-foreground/80 mt-1">{stat.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{stat.subtitle}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Quick Actions */}
        <motion.div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Zap className="w-4 h-4 text-warning animate-bounce" />{t("dashboard.quickActions")}
            </h3>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[
              { label: t("dashboard.postJob"), icon: Briefcase, color: "bg-primary text-primary-foreground hover:bg-primary/90", path: "/jobs" },
              { label: t("dashboard.candidates"), icon: Users, color: "bg-accent text-accent-foreground hover:bg-accent/90", path: "/candidates" },
              { label: t("dashboard.pipeline"), icon: Kanban, color: "bg-info/10 text-info hover:bg-info/20", path: "/pipeline" },
              { label: t("dashboard.scheduleInterview"), icon: Calendar, color: "bg-warning/10 text-warning hover:bg-warning/20", path: "/interviews" },
              { label: t("dashboard.offers"), icon: FileText, color: "bg-success/10 text-success hover:bg-success/20", path: "/offers" },
              { label: t("dashboard.reports"), icon: BarChart3, color: "bg-muted text-foreground hover:bg-muted/80", path: "/reports" },
            ].map((action, i) => (
              <Link key={action.label} to={action.path}>
                <motion.div whileHover={{ scale: 1.08, y: -6 }} whileTap={{ scale: 0.93 }} className={cn("group relative flex flex-col items-center gap-2 rounded-xl p-4 font-medium text-xs transition-all cursor-pointer text-center glass-card-premium shadow-sm overflow-hidden", action.color)}>
                  <action.icon className="w-5 h-5 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-200" />
                  <span>{action.label}</span>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Job Performance Table */}
        <motion.div variants={item}>
          <Card className="group relative glass-card-premium border-none shadow-md overflow-hidden">
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
            <CardHeader className="pb-2 relative">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <motion.div whileHover={{ rotate: 15 }} transition={{ type: "spring", stiffness: 300 }}>
                    <ListChecks className="w-4 h-4 text-primary animate-pulse" />
                  </motion.div>
                  {locale === "en" ? "Job Performance" : "أداء الوظائف"}
                </CardTitle>
                <Link to="/jobs" className="text-xs text-primary hover:underline flex items-center gap-1">
                  {t("common.viewAll")} <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="relative">
              {jobPerformance.length === 0 ? (
                <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">{t("common.noData")}</div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 pb-1">
                    <span className="col-span-4">{locale === "en" ? "Position" : "الوظيفة"}</span>
                    <span className="col-span-2 text-center">{locale === "en" ? "Candidates" : "المرشحون"}</span>
                    <span className="col-span-2 text-center">{locale === "en" ? "Interviews" : "المقابلات"}</span>
                    <span className="col-span-2 text-center">{locale === "en" ? "Hired" : "تم التوظيف"}</span>
                    <span className="col-span-2 text-center">{locale === "en" ? "Status" : "الحالة"}</span>
                  </div>
                  {jobPerformance.map((job, i) => (
                    <motion.div key={i} whileHover={{ x: 4 }} className="grid grid-cols-12 gap-2 items-center px-3 py-2.5 rounded-xl transition-colors cursor-default list-hover-highlight glass-card-premium">
                      <span className="col-span-4 text-sm font-medium truncate">{job.title}</span>
                      <span className="col-span-2 text-center">
                        <Badge variant="outline" className="text-[10px]">{job.candidates}</Badge>
                      </span>
                      <span className="col-span-2 text-center">
                        <Badge variant="outline" className="text-[10px] border-warning/30 text-warning">{job.interviews}</Badge>
                      </span>
                      <span className="col-span-2 text-center">
                        <Badge variant="outline" className="text-[10px] border-success/30 text-success">{job.hired}</Badge>
                      </span>
                      <span className="col-span-2 text-center">
                        <Badge variant="outline" className={cn("text-[10px]", job.status === "نشطة" ? "border-success/30 text-success bg-success/5" : "border-muted-foreground/30 text-muted-foreground")}>
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
          <motion.div variants={item} initial="hidden" animate="show" className="lg:col-span-2">
            <Card className="group relative glass-card-premium border-none shadow-md overflow-hidden">
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
              <CardHeader className="pb-2 relative">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />{t("dashboard.hiringTrends")}
                  </CardTitle>
                  <div className="flex gap-1 bg-muted rounded-lg p-0.5">
                    {(["week", "month"] as const).map(tab => (
                      <button key={tab} onClick={() => setActiveTab(tab)} className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-all", activeTab === tab ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                        {tab === "week" ? t("dashboard.weekly") : t("dashboard.monthly")}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={monthlyData}>
                      <defs>
                        <linearGradient id="rAppliedGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="rHiredGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={chartTooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 16 }} />
                      <Area type="monotone" dataKey="applied" name={locale === "en" ? "Applied" : "المتقدمين"} fill="url(#rAppliedGrad)" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 4 }} />
                      <Area type="monotone" dataKey="hired" name={locale === "en" ? "Hired" : "تم التوظيف"} fill="url(#rHiredGrad)" stroke="hsl(var(--success))" strokeWidth={2.5} dot={{ fill: "hsl(var(--success))", strokeWidth: 0, r: 4 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground">
                    <Activity className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-sm">{t("dashboard.noDataSufficient")}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* KPIs + AI */}
          <motion.div variants={item} initial="hidden" animate="show">
            <Card className="group relative glass-card-premium border-none shadow-md h-full overflow-hidden">
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
              <CardHeader className="pb-2 relative">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />{t("dashboard.kpis")}
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
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", `bg-${kpi.color}/10`)}>
                          <kpi.icon className={cn("w-4 h-4", `text-${kpi.color}`)} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{kpi.label}</p>
                          <p className="text-[10px] text-muted-foreground">{kpi.desc}</p>
                        </div>
                      </div>
                      <span className="text-xl font-bold">{kpi.value}%</span>
                    </div>
                    <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${kpi.value}%` }} transition={{ duration: 1, ease: "easeOut" }} className={cn("absolute h-full rounded-full", `bg-${kpi.color}`)} />
                    </div>
                  </div>
                ))}
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">{t("dashboard.aiEvaluation")}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-primary/5 rounded-xl p-2.5 text-center">
                      <p className="text-lg font-bold text-primary">{aiStats.evaluated}</p>
                      <p className="text-[9px] text-muted-foreground">{t("dashboard.evaluated")}</p>
                    </div>
                    <div className="bg-success/5 rounded-xl p-2.5 text-center">
                      <p className="text-lg font-bold text-success">{aiStats.avgScore}%</p>
                      <p className="text-[9px] text-muted-foreground">{t("dashboard.avgMatch")}</p>
                    </div>
                    <div className="bg-warning/5 rounded-xl p-2.5 text-center">
                      <p className="text-lg font-bold text-warning">{aiStats.highMatch}</p>
                      <p className="text-[9px] text-muted-foreground">{locale === "en" ? "High Match" : "تطابق عالي"}</p>
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
          <motion.div variants={item} initial="hidden" animate="show" whileHover={{ y: -8, scale: 1.02 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
            <Card className="group relative glass-card-premium border-none shadow-md h-full overflow-hidden">
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
              <CardHeader className="pb-2 relative">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Kanban className="w-4 h-4 text-primary" />{t("dashboard.pipelineStages")}
                  </CardTitle>
                  <Link to="/pipeline" className="text-xs text-primary hover:underline flex items-center gap-1">{t("common.viewAll")} <ChevronRight className="w-3 h-3" /></Link>
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
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground font-medium">{s.label}</span>
                            <span className="font-bold">{s.count}</span>
                          </div>
                          <div className="h-6 bg-muted/30 rounded-lg overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${width}%` }} transition={{ delay: i * 0.08, duration: 0.6, ease: "easeOut" }} className="h-full rounded-lg" style={{ background: s.fill }} />
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
          <motion.div variants={item} initial="hidden" animate="show" whileHover={{ y: -8, scale: 1.02 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
            <Card className="group relative glass-card-premium border-none shadow-md h-full overflow-hidden">
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
              <CardHeader className="pb-2 relative">
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" />{t("dashboard.candidateSources")}
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
                        <div key={i} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ background: s.fill }} />
                            <span className="text-muted-foreground">{s.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{s.value}</span>
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
          <motion.div variants={item} initial="hidden" animate="show" whileHover={{ y: -8, scale: 1.02 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
            <Card className="group relative glass-card-premium border-none shadow-md h-full overflow-hidden">
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
              <CardHeader className="pb-2 relative">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />{t("dashboard.offersSummary")}
                  </CardTitle>
                  <Link to="/offers" className="text-xs text-primary hover:underline flex items-center gap-1">{t("common.viewAll")} <ChevronRight className="w-3 h-3" /></Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: t("dashboard.totalOffers"), value: offersStats.total, icon: FileText, color: "text-foreground", bg: "bg-muted/50" },
                    { label: t("dashboard.sentOffers"), value: offersStats.sent, icon: ArrowUpRight, color: "text-primary", bg: "bg-primary/5" },
                    { label: t("dashboard.acceptedOffers"), value: offersStats.accepted, icon: CheckCircle2, color: "text-success", bg: "bg-success/5" },
                    { label: t("dashboard.rejectedOffers"), value: offersStats.rejected, icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/5" },
                  ].map((s, i) => (
                    <motion.div key={i} whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.97 }} className={cn("rounded-xl p-3 text-center transition-all cursor-default hover:shadow-md", s.bg)}>
                      <motion.div whileHover={{ rotate: 10, scale: 1.2 }} transition={{ type: "spring", stiffness: 400 }}>
                        <s.icon className={cn("w-4 h-4 mx-auto mb-1", s.color)} />
                      </motion.div>
                      <p className={cn("text-xl font-bold", s.color)}>{s.value}</p>
                      <p className="text-[10px] text-muted-foreground">{s.label}</p>
                    </motion.div>
                  ))}
                </div>
                {offersStats.total > 0 && (
                  <div className="mt-4 pt-3 border-t border-border">
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-muted-foreground">{t("dashboard.acceptanceRate")}</span>
                      <span className="font-bold text-success">{offersStats.acceptanceRate}%</span>
                    </div>
                    <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${offersStats.acceptanceRate}%` }} transition={{ duration: 1 }} className="absolute h-full rounded-full bg-success" />
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
          <motion.div variants={item} initial="hidden" animate="show" whileHover={{ y: -8, scale: 1.02 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
            <Card className="group relative glass-card-premium border-none shadow-md h-full overflow-hidden">
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
              <CardHeader className="pb-3 bg-gradient-to-l from-warning/5 to-transparent relative">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-warning" />{t("dashboard.upcomingInterviews")}
                  </CardTitle>
                  <Link to="/interviews" className="text-xs text-primary hover:underline flex items-center gap-1">{t("common.viewAll")} <ChevronRight className="w-3 h-3" /></Link>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                {todayInterviews.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">{t("dashboard.noScheduledInterviews")}</p>
                  </div>
                ) : (
                  <div className={cn("relative py-1 space-y-4", locale === "ar" ? "border-r border-dashed border-border/80 pr-4 mr-2" : "border-l border-dashed border-border/80 pl-4 ml-2")}>
                    {todayInterviews.map((interview, i) => (
                      <motion.div
                        key={interview.id}
                        initial={{ opacity: 0, x: locale === "ar" ? 15 : -15 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + i * 0.1 }}
                        className="relative flex items-center gap-3 group/item p-2 rounded-xl list-hover-highlight transition-colors cursor-default"
                      >
                        {/* Timeline Bullet Node */}
                        <div className={cn(
                          "absolute top-2.5 w-2.5 h-2.5 rounded-full border bg-background z-10 transition-transform group-hover/item:scale-125 border-warning bg-warning",
                          locale === "ar" ? "-right-[21.5px]" : "-left-[21.5px]"
                        )} />

                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-warning to-warning/60 flex items-center justify-center flex-shrink-0 shadow-md border border-warning/20">
                          <Video className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{interview.candidate_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{interview.position}</p>
                        </div>
                        <div className="text-left shrink-0">
                          <span className="text-xs font-bold text-warning bg-warning/10 px-2.5 py-1 rounded-lg block">{interview.time?.slice(0, 5)}</span>
                          <span className="text-[10px] text-muted-foreground mt-1 block">{interview.date}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Candidates */}
          <motion.div variants={item} initial="hidden" animate="show" whileHover={{ y: -8, scale: 1.02 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
            <Card className="group relative glass-card-premium border-none shadow-md h-full overflow-hidden">
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
              <CardHeader className="pb-3 bg-gradient-to-l from-primary/5 to-transparent relative">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />{t("dashboard.recentCandidates")}
                  </CardTitle>
                  <Link to="/candidates" className="text-xs text-primary hover:underline flex items-center gap-1">{t("common.viewAll")} <ChevronRight className="w-3 h-3" /></Link>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                {recentCandidates.length === 0 ? (
                  <div className="text-center py-8"><p className="text-sm text-muted-foreground">{t("candidates.noCandidates")}</p></div>
                ) : (
                  <div className="space-y-2">
                    {recentCandidates.map((c, i) => (
                      <motion.div key={c.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.05 }}>
                        <Link to={`/candidates/${c.id}`} className="flex items-center gap-3 p-2.5 rounded-xl list-hover-highlight transition-all group">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-xs text-white font-bold shadow-md">
                            {c.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{c.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{c.role}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {(c as any).ai_score != null && (
                              <div className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-lg">
                                <Star className="w-3 h-3 text-primary" />
                                <span className="text-[10px] font-bold text-primary">{(c as any).ai_score}%</span>
                              </div>
                            )}
                            <Badge variant="outline" className={cn("text-[10px] border", statusColors[c.status] || "")}>{c.status}</Badge>
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
          <motion.div variants={item} initial="hidden" animate="show" whileHover={{ y: -8, scale: 1.02 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
            <Card className="group relative glass-card-premium border-none shadow-md h-full overflow-hidden">
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
              <CardHeader className="pb-3 bg-gradient-to-l from-info/5 to-transparent relative">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="w-4 h-4 text-info" />{t("dashboard.latestActivity")}
                  </CardTitle>
                  <Link to="/notifications" className="text-xs text-primary hover:underline flex items-center gap-1">{t("common.viewAll")} <ChevronRight className="w-3 h-3" /></Link>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                {allNotifications.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="w-12 h-12 mx-auto text-muted-foreground/20 mb-3" />
                    <p className="text-sm text-muted-foreground">{t("dashboard.noActivity")}</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {allNotifications.slice(0, 6).map((n, i) => {
                      const typeColors: Record<string, string> = {
                        application: "bg-info/10 text-info", stage_change: "bg-primary/10 text-primary",
                        rejection: "bg-destructive/10 text-destructive", offer: "bg-accent text-accent-foreground",
                        interview: "bg-warning/10 text-warning", system: "bg-muted text-muted-foreground",
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
                        <motion.div key={n.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-start gap-3 p-2.5 rounded-xl list-hover-highlight transition-colors">
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", typeColors[n.type] || "bg-muted")}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn("text-xs leading-relaxed", !n.read ? "font-semibold text-foreground" : "text-foreground/80")}>{n.title}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{formatTime(n.created_at)}</p>
                          </div>
                          {!n.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />}
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
