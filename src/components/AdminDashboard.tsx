import { useDashboardStats, useCandidates, useInterviews, useJobs, useNotifications } from "@/hooks/useJobs";
import { useAllUserRoles } from "@/hooks/useUserRole";
import { useOffers } from "@/hooks/useOffers";
import { useActiveStages } from "@/hooks/usePipelineStages";
import { useI18n } from "@/contexts/I18nContext";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Briefcase, UserCheck, Calendar, Brain, Crown, UserCog, BarChart3,
  Kanban, Package, Bell, TrendingUp, Award, Target, FileText, ArrowUpRight,
  Activity, CheckCircle2, Clock, Eye, Maximize2, Minimize2, Shield,
  Zap, ChevronRight, Star, ArrowUp, ArrowDown, Timer, Globe, AlertTriangle,
  Lock, Server, Sparkles, Video, ListChecks, Building2
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMemo, useState, useEffect, useCallback, useRef, memo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, Legend, RadialBarChart, RadialBar } from "recharts";
import { cn } from "@/lib/utils";
import KPIDetailsDialog from "@/components/KPIDetailsDialog";
import { AnimatedDashboardBackground } from "@/components/AnimatedBackground";
import { PageHeader } from "@/components/ui/page-header";
import { FlaticonAnimatedIcon, FlaticonCategoryIconCard } from "@/components/ui/animated-icons";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw } from "lucide-react";

const chartTooltipStyle = {
  borderRadius: "10px",
  fontSize: "12px",
  border: "1px solid hsl(220, 14%, 90%)",
  background: "white",
  color: "hsl(222, 20%, 14%)",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
};

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

const AnimatedValue = memo(function AnimatedValue({ value, delay = 0, className = "" }: { value: number; delay?: number; className?: string }) {
  const count = useCountUp(value, 1200);
  return (
    <motion.span className={cn("tabular-nums", className)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      {count}
    </motion.span>
  );
});

// Memoized — its 1Hz tick must not re-render the dashboard tree.
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

function useHiringGoals() {
  const { user } = useAuth();
  const currentMonth = new Date().toISOString().slice(0, 7);
  return useQuery({
    queryKey: ["hiring-goals", user?.id, currentMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hiring_goals" as any)
        .select("*")
        .eq("user_id", user!.id)
        .eq("month", currentMonth)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!user,
  });
}const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

export default function AdminDashboard() {
  const { t, locale, dir } = useI18n();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: stats } = useDashboardStats();
  const { data: candidates } = useCandidates();
  const { data: interviews } = useInterviews();
  const { data: jobs } = useJobs();
  const { data: offers } = useOffers();
  const { data: notifications } = useNotifications();
  const { data: userRoles } = useAllUserRoles();
  const { data: savedGoals } = useHiringGoals();
  const dynamicStages = useActiveStages();
  const STAGES = dynamicStages.length > 0 ? dynamicStages.map(s => s.name) : ["تقديم الطلب", "مراجعة السيرة", "فحص هاتفي", "مقابلة تقنية", "مقابلة نهائية", "العرض الوظيفي"];

  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Audit log recent
  const { data: recentAudit } = useQuery({
    queryKey: ["recent-audit"],
    queryFn: async () => {
      const { data } = await supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(5);
      return data || [];
    },
    enabled: !!user,
    staleTime: 30000,
  });

  // Subscription stats
  const { data: subscriptions } = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: async () => {
      const { data } = await supabase.from("company_subscriptions").select("*, subscription_plans(name, name_ar, price)");
      return data || [];
    },
    enabled: !!user,
    staleTime: 60000,
  });

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "";

  const allCandidates = candidates || [];
  const allInterviews = interviews || [];
  const allJobs = jobs || [];
  const allOffers = offers || [];
  const allNotifications = notifications || [];
  const roles = userRoles || [];

  const teamStats = useMemo(() => ({
    totalUsers: roles.length,
    admins: roles.filter(r => r.role === "admin").length,
    recruiters: roles.filter(r => r.role === "recruiter").length,
    reviewers: roles.filter(r => r.role === "reviewer").length,
    jobSeekers: roles.filter(r => r.role === "job_seeker").length,
  }), [roles]);

  const aiStats = useMemo(() => {
    const scored = allCandidates.filter(c => c.ai_score != null);
    const avgScore = scored.length > 0 ? Math.round(scored.reduce((sum, c) => sum + (c.ai_score || 0), 0) / scored.length) : 0;
    const highMatch = scored.filter(c => (c.ai_score || 0) >= 80).length;
    return { evaluated: scored.length, avgScore, highMatch };
  }, [allCandidates]);

  const accepted = allCandidates.filter(c => c.status === "مقبول").length;
  const unreadNotifications = allNotifications.filter(n => !n.read).length;

  const offersStats = useMemo(() => {
    const acceptedOffers = allOffers.filter(o => o.status === "accepted").length;
    const rejectedOffers = allOffers.filter(o => o.status === "rejected").length;
    const sent = allOffers.filter(o => ["sent", "viewed"].includes(o.status)).length;
    const acceptanceRate = (acceptedOffers + rejectedOffers) > 0
      ? Math.round((acceptedOffers / (acceptedOffers + rejectedOffers)) * 100) : 0;
    return { accepted: acceptedOffers, rejected: rejectedOffers, sent, total: allOffers.length, acceptanceRate };
  }, [allOffers]);

  const pipelineData = useMemo(() => {
    const counts: Record<string, number> = {};
    STAGES.forEach(s => { counts[s] = 0; });
    allCandidates.forEach(c => {
      const stage = c.stage || "تقديم الطلب";
      if (counts[stage] !== undefined) counts[stage]++;
    });
    const defaultColors = ["hsl(var(--primary))", "hsl(222, 60%, 55%)", "hsl(222, 50%, 60%)", "hsl(var(--warning))", "hsl(35, 90%, 50%)", "hsl(var(--success))"];
    return STAGES.map((s, i) => {
      const dbStage = dynamicStages.find(ds => ds.name === s);
      return { stage: s, label: s, count: counts[s] || 0, fill: dbStage?.color || defaultColors[i % defaultColors.length] };
    });
  }, [allCandidates, STAGES, dynamicStages]);

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

  const sourceData = useMemo(() => {
    const sources: Record<string, number> = {};
    allCandidates.forEach(c => {
      const source = c.source || "الموقع";
      sources[source] = (sources[source] || 0) + 1;
    });
    const colors = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--warning))", "hsl(var(--success))", "hsl(222, 50%, 60%)"];
    return Object.entries(sources).map(([name, value], i) => ({ name, value, fill: colors[i % colors.length] }));
  }, [allCandidates]);

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

  // Subscription breakdown
  const subStats = useMemo(() => {
    const subs = subscriptions || [];
    const active = subs.filter(s => s.status === "active").length;
    const totalRevenue = subs.reduce((sum, s) => sum + ((s as any).subscription_plans?.price || 0), 0);
    return { total: subs.length, active, totalRevenue };
  }, [subscriptions]);

  // Platform-wide companies stats (Super Admin only)
  const { data: allCompaniesData } = useQuery({
    queryKey: ["admin-platform-companies"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("companies")
        .select("id, name, status, created_at, parent_company_id");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 60000,
  });

  const platformStats = useMemo(() => {
    const cos = allCompaniesData || [];
    const mainCos = cos.filter((c: any) => !c.parent_company_id);
    const active = mainCos.filter((c: any) => c.status === "active").length;
    const inactive = mainCos.filter((c: any) => c.status !== "active").length;
    const now = new Date();
    const thisMonth = mainCos.filter((c: any) => {
      const d = new Date(c.created_at);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
    const lastMonth = mainCos.filter((c: any) => {
      const d = new Date(c.created_at);
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return d.getFullYear() === lm.getFullYear() && d.getMonth() === lm.getMonth();
    }).length;
    const growthPct = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : thisMonth > 0 ? 100 : 0;
    return { total: mainCos.length, active, inactive, thisMonth, lastMonth, growthPct };
  }, [allCompaniesData]);

  // KPIs
  const kpis = useMemo(() => {
    const totalApplicants = allCandidates.length;
    const conversionRate = totalApplicants > 0 ? Math.round((accepted / totalApplicants) * 100) : 0;
    const hiredCandidates = allCandidates.filter(c => c.status === "مقبول");
    const avgTimeToHire = hiredCandidates.length > 0
      ? Math.round(hiredCandidates.reduce((sum, c) => sum + Math.max(Math.floor((new Date(c.updated_at).getTime() - new Date(c.created_at).getTime()) / 86400000), 1), 0) / hiredCandidates.length)
      : 0;
    const fillRate = allJobs.length > 0 ? Math.round((accepted / allJobs.length) * 100) : 0;
    return { conversionRate, avgTimeToHire, fillRate, offerAcceptance: offersStats.acceptanceRate };
  }, [allCandidates, allJobs, accepted, offersStats]);

  const goals = [
    { label: locale === "en" ? "Hire Target" : "هدف التوظيف", target: savedGoals?.hire_target ?? 10, current: accepted, icon: UserCheck, color: "success" },
    { label: locale === "en" ? "Candidates" : "المرشحون", target: savedGoals?.candidates_target ?? 50, current: allCandidates.length, icon: Users, color: "primary" },
    { label: locale === "en" ? "Interviews" : "المقابلات", target: savedGoals?.interviews_target ?? 20, current: allInterviews.length, icon: Calendar, color: "warning" },
    { label: locale === "en" ? "Offers" : "العروض", target: savedGoals?.offers_target ?? 8, current: offersStats.accepted, icon: Award, color: "accent" },
  ];

  const todayInterviews = allInterviews.filter(i => i.status === "مجدولة").slice(0, 4);

  const [presentationMode, setPresentationMode] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [selectedKpi, setSelectedKpi] = useState<"conversion" | "timeToHire" | "fillRate" | "offers" | null>(null);

  const togglePresentation = useCallback(() => {
    if (!presentationMode) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setPresentationMode(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setPresentationMode(false);
    }
  }, [presentationMode]);

  useEffect(() => {
    if (!presentationMode) return;
    const interval = setInterval(() => {
      queryClient.invalidateQueries();
      setLastRefresh(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, [presentationMode, queryClient]);

  useEffect(() => {
    const handler = () => { if (!document.fullscreenElement) setPresentationMode(false); };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t("dashboard.greeting.morning") : t("dashboard.greeting.evening");

  // Presentation Mode
  if (presentationMode) {
    return (
      <div className="fixed inset-0 z-[100] bg-background overflow-auto">
        <div className="min-h-screen p-6 lg:p-10 space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
                <BarChart3 className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Tawzeef-X — {locale === "en" ? "Admin Dashboard" : "لوحة المدير"}</h1>
                <p className="text-muted-foreground">{new Date().toLocaleDateString(locale === "en" ? "en-US" : "ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>{locale === "en" ? "Auto-refresh 30s" : "تحديث تلقائي ٣٠ث"}</span>
              </div>
              <Button size="sm" variant="outline" onClick={togglePresentation} className="gap-1.5">
                <Minimize2 className="w-4 h-4" />{locale === "en" ? "Exit" : "خروج"}
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { icon: Briefcase, label: locale === "en" ? "Active Jobs" : "وظائف نشطة", value: stats?.activeJobs ?? 0, color: "from-primary to-primary/70" },
              { icon: Users, label: locale === "en" ? "Candidates" : "المرشحون", value: stats?.totalCandidates ?? 0, color: "from-accent to-accent/70" },
              { icon: UserCheck, label: locale === "en" ? "Hired" : "تم التوظيف", value: accepted, color: "from-success to-success/70" },
              { icon: Calendar, label: locale === "en" ? "Interviews" : "المقابلات", value: allInterviews.length, color: "from-warning to-warning/70" },
              { icon: FileText, label: locale === "en" ? "Offers" : "العروض", value: allOffers.length, color: "from-info to-info/70" },
              { icon: UserCog, label: locale === "en" ? "Users" : "المستخدمون", value: teamStats.totalUsers, color: "from-destructive to-destructive/70" },
            ].map((s, i) => (
              <Card key={i} className="border-0 shadow-lg">
                <CardContent className="p-5 text-center">
                  <div className={cn("w-12 h-12 mx-auto rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg mb-3", s.color)}>
                    <s.icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-3xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xl">{locale === "en" ? "Monthly Trends" : "الاتجاهات الشهرية"}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 13 }} />
                    <YAxis tick={{ fontSize: 13 }} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Area type="monotone" dataKey="applied" name={locale === "en" ? "Applied" : "المتقدمين"} stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} />
                    <Area type="monotone" dataKey="hired" name={locale === "en" ? "Hired" : "تم التوظيف"} stroke="hsl(var(--success))" fill="hsl(var(--success))" fillOpacity={0.15} strokeWidth={2} />
                    <Legend />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xl">{locale === "en" ? "Pipeline" : "مسار التوظيف"}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={pipelineData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 13 }} />
                    <YAxis dataKey="label" type="category" width={110} tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                      {pipelineData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <AnimatedDashboardBackground />
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="p-4 lg:p-8 space-y-6 relative"
      >
        {/* Clean Theme-Adaptive Page Header */}
        <motion.div variants={itemVariants}>
          <PageHeader
            badgeText={locale === "en" ? "Super Admin Command Center" : "مركز التحكم وإدارة النظام الكامل"}
            badgeIcon={Crown}
            title={`${greeting}، ${displayName} 👋`}
            description={locale === "en" ? "System-wide metrics, multi-company overview, active subscriptions, security audit, and role administration." : "متابعة شاملة لجميع الشركات، الاشتراكات الفعالة، أداء مسارات التوظيف، وسجلات الأمان."}
            icon={Crown}
            accentColor="purple"
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
                  <Clock className="w-4 h-4 text-purple-500" />
                  <LiveClock />
                  <span className="text-muted-foreground text-xs">•</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date().toLocaleDateString(locale === "en" ? "en-US" : "ar-SA", { weekday: "long", day: "numeric", month: "short" })}
                  </span>
                </div>
                <Button size="sm" variant="outline" className="rounded-md3-xl h-10 px-4 text-xs font-bold gap-2 bg-card hover:bg-muted shadow-xs border-md-outline-variant" onClick={togglePresentation}>
                  <Maximize2 className="w-4 h-4 text-purple-500" />{locale === "en" ? "Present" : "وضع العرض 🖥️"}
                </Button>
              </div>
            }
          />
        </motion.div>

        {/* System Health Strip */}
        <motion.div variants={itemVariants}>
          <div className="rounded-md3-2xl border border-md-outline-variant p-4 bg-md-surface-container shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-md3-sm bg-purple-500/10 text-purple-600 flex items-center justify-center">
                <Server className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold text-foreground">{locale === "en" ? "System Overview" : "نظرة عامة على النظام"}</span>
              <div className="flex-1" />
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 live-breathing-indicator" />
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">{locale === "en" ? "Live" : "مباشر"}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
              {[
                { label: locale === "en" ? "Active Jobs" : "وظائف نشطة", value: stats?.activeJobs ?? 0, icon: Briefcase, color: "text-primary", bg: "bg-md-primary-container/30 border-primary/20" },
                { label: locale === "en" ? "Candidates" : "المرشحون", value: stats?.totalCandidates ?? 0, icon: Users, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
                { label: locale === "en" ? "Hired" : "تم التوظيف", value: accepted, icon: UserCheck, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
                { label: locale === "en" ? "Interviews" : "المقابلات", value: allInterviews.length, icon: Calendar, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
                { label: locale === "en" ? "Offers" : "العروض", value: allOffers.length, icon: FileText, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
                { label: locale === "en" ? "Team" : "الفريق", value: teamStats.totalUsers, icon: UserCog, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" },
                { label: locale === "en" ? "Subscribers" : "المشتركون", value: subStats.active, icon: Package, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
                { label: locale === "en" ? "Unread" : "غير مقروءة", value: unreadNotifications, icon: Bell, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
              ].map((m, i) => (
                <motion.div key={i} whileHover={{ scale: 1.04, y: -2 }} transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  className={cn("rounded-md3-xl p-2.5 text-center cursor-default border transition-all duration-200 shadow-xs", m.bg)}>
                  <m.icon className={cn("w-4 h-4 mx-auto mb-1", m.color)} />
                  <p className={cn("text-lg font-black", m.color)}><AnimatedValue value={m.value} delay={i * 0.05} /></p>
                  <p className="text-[9px] text-muted-foreground font-semibold leading-tight">{m.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ══════════════════════════════════════════════════════════════
            SUPER ADMIN: Platform-Wide Overview (all tenants)
        ══════════════════════════════════════════════════════════════ */}
        <motion.div variants={itemVariants}>
          <Card className="glass-card-premium border-none shadow-lg relative overflow-hidden">
            {/* gradient accent */}
            <div className="absolute inset-0 bg-gradient-to-br from-destructive/5 via-transparent to-primary/5 pointer-events-none" />
            <CardContent className="p-5 relative">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-destructive to-destructive/60 flex items-center justify-center shadow-md">
                    <Crown className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-bold">{locale === "en" ? "Platform Overview — All Tenants" : "نظرة عامة على المنصة — جميع الشركات العميلة"}</span>
                </div>
                <Link to="/admin/companies" className="text-xs text-primary hover:underline flex items-center gap-1">
                  {locale === "en" ? "Manage Companies" : "إدارة الشركات"} <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {[
                  {
                    label: locale === "en" ? "Total Tenants" : "إجمالي الشركات",
                    value: platformStats.total,
                    icon: Building2,
                    color: "text-primary",
                    bg: "bg-primary/10",
                  },
                  {
                    label: locale === "en" ? "Active" : "نشطة",
                    value: platformStats.active,
                    icon: CheckCircle2,
                    color: "text-success",
                    bg: "bg-success/10",
                  },
                  {
                    label: locale === "en" ? "Inactive" : "معطلة",
                    value: platformStats.inactive,
                    icon: AlertTriangle,
                    color: "text-destructive",
                    bg: "bg-destructive/10",
                  },
                  {
                    label: locale === "en" ? "New This Month" : "جديدة هذا الشهر",
                    value: platformStats.thisMonth,
                    icon: TrendingUp,
                    color: "text-warning",
                    bg: "bg-warning/10",
                  },
                  {
                    label: locale === "en" ? "Monthly Growth" : "نمو شهري",
                    value: Math.abs(platformStats.growthPct),
                    suffix: "%",
                    icon: platformStats.growthPct >= 0 ? ArrowUp : ArrowDown,
                    color: platformStats.growthPct >= 0 ? "text-success" : "text-destructive",
                    bg: platformStats.growthPct >= 0 ? "bg-success/10" : "bg-destructive/10",
                  },
                  {
                    label: locale === "en" ? "MRR (Est.)" : "إيراد شهري (تقديري)",
                    value: subStats.totalRevenue,
                    prefix: "",
                    suffix: " ر.س",
                    icon: Package,
                    color: "text-accent",
                    bg: "bg-accent/10",
                  },
                ].map((m, i) => (
                  <motion.div
                    key={i}
                    whileHover={{ scale: 1.06, y: -3 }}
                    transition={{ type: "spring", stiffness: 350, damping: 15 }}
                    className={`rounded-xl p-3 text-center cursor-default glass-card-premium hover:shadow-lg ${m.bg}`}
                  >
                    <m.icon className={`w-4 h-4 mx-auto mb-1.5 ${m.color}`} />
                    <p className={`text-xl font-bold tabular-nums ${m.color}`}>
                      {(m as any).prefix || ""}<AnimatedValue value={m.value} delay={i * 0.06} />{(m as any).suffix || ""}
                    </p>
                    <p className="text-[9px] text-muted-foreground leading-tight mt-0.5">{m.label}</p>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* KPI Cards Row */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: locale === "en" ? "Conversion Rate" : "معدل التحويل", value: kpis.conversionRate, suffix: "%", icon: TrendingUp, desc: locale === "en" ? "Applicants → Hired" : "متقدمين ← توظيف", color: "primary", trend: weeklyTrend.change, type: "conversion" as const },
            { label: locale === "en" ? "Avg Time to Hire" : "متوسط وقت التوظيف", value: kpis.avgTimeToHire, suffix: locale === "en" ? " days" : " يوم", icon: Timer, desc: locale === "en" ? "From apply to offer" : "من التقديم للعرض", color: "accent", type: "timeToHire" as const },
            { label: locale === "en" ? "Fill Rate" : "معدل ملء الشواغر", value: kpis.fillRate, suffix: "%", icon: Target, desc: locale === "en" ? "Positions filled" : "الشواغر المملوءة", color: "success", type: "fillRate" as const },
            { label: locale === "en" ? "Offer Acceptance" : "قبول العروض", value: kpis.offerAcceptance, suffix: "%", icon: Award, desc: locale === "en" ? "Accepted / Total" : "مقبول / الكل", color: "warning", type: "offers" as const },
          ].map((kpi, i) => (
            <motion.div key={i} whileHover={{ y: -8, scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={{ type: "spring", stiffness: 450, damping: 18 }} onClick={() => setSelectedKpi(kpi.type)}>
              <Card className="glass-card-premium border-none shadow-md group relative overflow-hidden cursor-pointer">
                {/* Glow effect */}
                <div className={cn("absolute -bottom-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-10 group-hover:opacity-35 transition-opacity duration-500 pointer-events-none", `bg-${kpi.color}`)} />
                <CardContent className="p-5 relative">
                  <div className="flex items-start justify-between mb-3">
                    <div className={cn("w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300", `from-${kpi.color} to-${kpi.color}/70`)}>
                      <kpi.icon className="w-5 h-5 text-white group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300" />
                    </div>
                    {kpi.trend !== undefined && (
                      <Badge variant="outline" className={cn("text-[10px] font-bold transition-all duration-300 group-hover:scale-105", kpi.trend >= 0 ? "text-success border-success/30 bg-success/5" : "text-destructive border-destructive/30 bg-destructive/5")}>
                        {kpi.trend >= 0 ? <ArrowUp className="w-3 h-3 ml-0.5" /> : <ArrowDown className="w-3 h-3 ml-0.5" />}
                        {Math.abs(kpi.trend)}%
                      </Badge>
                    )}
                  </div>
                  <p className="text-3xl font-bold text-foreground tracking-tight group-hover:tracking-tighter transition-all duration-300">{kpi.value}{kpi.suffix}</p>
                  <p className="text-sm font-semibold text-foreground/80 mt-1">{kpi.label}</p>
                  <p className="text-[10px] text-muted-foreground group-hover:text-foreground/60 transition-colors mt-0.5">{kpi.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Admin Quick Actions */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Zap className="w-4 h-4 text-warning animate-bounce" />{locale === "en" ? "Admin Actions" : "إجراءات المدير"}
            </h3>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {[
              { label: locale === "en" ? "Team" : "الفريق", icon: UserCog, color: "bg-destructive/10 text-destructive", hoverColor: "hover:bg-destructive/20 hover:shadow-destructive/10", path: "/team" },
              { label: locale === "en" ? "Pipeline" : "المسار", icon: Kanban, color: "bg-primary/10 text-primary", hoverColor: "hover:bg-primary/20 hover:shadow-primary/10", path: "/pipeline" },
              { label: locale === "en" ? "Reports" : "التقارير", icon: BarChart3, color: "bg-accent/10 text-accent", hoverColor: "hover:bg-accent/20 hover:shadow-accent/10", path: "/reports" },
              { label: locale === "en" ? "Audit Log" : "السجل", icon: Shield, color: "bg-warning/10 text-warning", hoverColor: "hover:bg-warning/20 hover:shadow-warning/10", path: "/audit-log" },
              { label: locale === "en" ? "AI" : "الذكاء", icon: Brain, color: "bg-info/10 text-info", hoverColor: "hover:bg-info/20 hover:shadow-info/10", path: "/ai-assistant" },
              { label: locale === "en" ? "Jobs" : "الوظائف", icon: Briefcase, color: "bg-success/10 text-success", hoverColor: "hover:bg-success/20 hover:shadow-success/10", path: "/jobs" },
              { label: locale === "en" ? "Offers" : "العروض", icon: FileText, color: "bg-primary/10 text-primary", hoverColor: "hover:bg-primary/20 hover:shadow-primary/10", path: "/offers" },
              { label: locale === "en" ? "Settings" : "الإعدادات", icon: ListChecks, color: "bg-muted text-foreground", hoverColor: "hover:bg-muted/80", path: "/settings" },
            ].map((action) => (
              <Link key={action.path} to={action.path}>
                <motion.div whileHover={{ scale: 1.1, y: -5 }} whileTap={{ scale: 0.9 }} transition={{ type: "spring", stiffness: 450, damping: 15 }}
                  className={cn("group flex flex-col items-center gap-1.5 rounded-xl p-3 font-medium text-[11px] transition-all duration-300 cursor-pointer text-center glass-card-premium shadow-sm hover:shadow-lg", action.color, action.hoverColor)}>
                  <action.icon className="w-4 h-4 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-200" />
                  <span>{action.label}</span>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Charts Row: Trends + Pipeline */}
        <div className="grid lg:grid-cols-2 gap-6">
          <motion.div variants={itemVariants}>
            <Card className="glass-card-premium border-none shadow-md group">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />{locale === "en" ? "Monthly Trends" : "الاتجاهات الشهرية"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={monthlyData}>
                      <defs>
                        <linearGradient id="aApplied" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="aHired" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={chartTooltipStyle} />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
                      <Area type="monotone" dataKey="applied" name={locale === "en" ? "Applied" : "المتقدمين"} fill="url(#aApplied)" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3 }} />
                      <Area type="monotone" dataKey="interviews" name={locale === "en" ? "Interviews" : "المقابلات"} stroke="hsl(var(--warning))" fill="hsl(var(--warning))" fillOpacity={0.08} strokeWidth={2} />
                      <Area type="monotone" dataKey="hired" name={locale === "en" ? "Hired" : "تم التوظيف"} fill="url(#aHired)" stroke="hsl(var(--success))" strokeWidth={2.5} dot={{ r: 3 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">{t("common.noData")}</div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Pipeline */}
          <motion.div variants={itemVariants}>
            <Card className="glass-card-premium border-none shadow-md h-full group">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Kanban className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />{locale === "en" ? "Pipeline Overview" : "مسار التوظيف"}
                  </CardTitle>
                  <Link to="/pipeline" className="text-xs text-primary hover:underline flex items-center gap-1">{t("common.viewAll")} <ChevronRight className="w-3 h-3" /></Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pipelineData.map((s, i) => {
                    const maxCount = Math.max(...pipelineData.map(sd => sd.count), 1);
                    const width = Math.max((s.count / maxCount) * 100, 4);
                    return (
                      <div key={s.stage} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground font-medium">{s.label}</span>
                          <span className="font-bold">{s.count}</span>
                        </div>
                        <div className="h-6 bg-muted/30 rounded-lg overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${width}%` }} transition={{ type: "spring", stiffness: 100, damping: 18, delay: i * 0.05 }} className="h-full rounded-lg animate-pulse" style={{ background: s.fill }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Hiring Goals */}
        <motion.div variants={itemVariants}>
          <Card className="glass-card-premium border-none shadow-md">
            <CardHeader className="pb-3 bg-gradient-to-l from-success/5 to-transparent">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-4 h-4 text-success animate-pulse" />{locale === "en" ? "Monthly Hiring Goals" : "أهداف التوظيف الشهرية"}
                </CardTitle>
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  {new Date().toLocaleDateString(locale === "en" ? "en-US" : "ar-SA", { month: "long", year: "numeric" })}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {goals.map((g, i) => {
                  const pct = Math.min(Math.round((g.current / g.target) * 100), 100);
                  const isComplete = pct >= 100;
                  return (
                    <motion.div key={i} whileHover={{ scale: 1.03, y: -4 }} transition={{ type: "spring", stiffness: 350, damping: 15 }}
                      className={cn("rounded-xl p-4 border transition-all glass-card-premium", isComplete ? `bg-${g.color}/5 border-${g.color}/20` : "bg-muted/30 border-transparent")}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", `bg-${g.color}/10`)}>
                            <g.icon className={cn("w-4 h-4", `text-${g.color}`)} />
                          </div>
                          <span className="text-sm font-medium">{g.label}</span>
                        </div>
                        {isComplete && <CheckCircle2 className="w-4 h-4 text-success animate-bounce" />}
                      </div>
                      <div className="flex items-end justify-between mb-2">
                        <span className="text-2xl font-bold">{g.current}</span>
                        <span className="text-xs text-muted-foreground">{locale === "en" ? `of ${g.target}` : `من ${g.target}`}</span>
                      </div>
                      <div className="relative h-2.5 bg-muted rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ type: "spring", stiffness: 120, damping: 20, delay: i * 0.08 }}
                          className={cn("absolute h-full rounded-full", `bg-${g.color}`)} />
                      </div>
                      <p className={cn("text-[11px] mt-1.5 font-medium", isComplete ? `text-${g.color}` : "text-muted-foreground")}>{pct}%</p>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Row: Sources + Offers + AI */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Sources */}
          <motion.div variants={itemVariants}>
            <Card className="glass-card-premium border-none shadow-md h-full group">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary group-hover:rotate-12 transition-transform duration-300" />{locale === "en" ? "Candidate Sources" : "مصادر المرشحين"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sourceData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={140}>
                      <PieChart>
                        <Pie data={sourceData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" strokeWidth={0}>
                          {sourceData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                        </Pie>
                        <Tooltip contentStyle={chartTooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 mt-2">
                      {sourceData.slice(0, 4).map((s, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ background: s.fill }} />
                            <span className="text-muted-foreground">{s.name}</span>
                          </div>
                          <span className="font-semibold">{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">{t("common.noData")}</div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Offers */}
          <motion.div variants={itemVariants}>
            <Card className="glass-card-premium border-none shadow-md h-full group">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />{locale === "en" ? "Offers Summary" : "ملخص العروض"}
                  </CardTitle>
                  <Link to="/offers" className="text-xs text-primary hover:underline flex items-center gap-1">{t("common.viewAll")} <ChevronRight className="w-3 h-3" /></Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: locale === "en" ? "Total" : "الكل", value: offersStats.total, color: "text-foreground", bg: "bg-muted/50" },
                    { label: locale === "en" ? "Sent" : "مُرسلة", value: offersStats.sent, color: "text-primary", bg: "bg-primary/5" },
                    { label: locale === "en" ? "Accepted" : "مقبولة", value: offersStats.accepted, icon: CheckCircle2, color: "text-success", bg: "bg-success/5" },
                    { label: locale === "en" ? "Rejected" : "مرفوضة", value: offersStats.rejected, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/5" },
                  ].map((s, i) => (
                    <motion.div key={i} whileHover={{ scale: 1.05 }} className={cn("rounded-xl p-3 text-center cursor-default transition-shadow hover:shadow-md glass-card-premium", s.bg)}>
                      <p className={cn("text-xl font-bold", s.color)}>{s.value}</p>
                      <p className="text-[10px] text-muted-foreground">{s.label}</p>
                    </motion.div>
                  ))}
                </div>
                {offersStats.total > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-muted-foreground">{locale === "en" ? "Acceptance Rate" : "معدل القبول"}</span>
                      <span className="font-bold text-success">{offersStats.acceptanceRate}%</span>
                    </div>
                    <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${offersStats.acceptanceRate}%` }} transition={{ type: "spring", stiffness: 100, damping: 15 }} className="absolute h-full rounded-full bg-success" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* AI Stats */}
          <motion.div variants={itemVariants}>
            <Card className="glass-card-premium border-none shadow-md h-full group">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="w-4 h-4 text-primary group-hover:animate-pulse transition-transform" />{locale === "en" ? "AI Analysis" : "تحليل الذكاء الاصطناعي"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-primary/5 rounded-xl p-3 text-center glass-card-premium">
                    <p className="text-lg font-bold text-primary">{aiStats.evaluated}</p>
                    <p className="text-[9px] text-muted-foreground">{locale === "en" ? "Evaluated" : "تم التقييم"}</p>
                  </div>
                  <div className="bg-success/5 rounded-xl p-3 text-center glass-card-premium">
                    <p className="text-lg font-bold text-success">{aiStats.avgScore}%</p>
                    <p className="text-[9px] text-muted-foreground">{locale === "en" ? "Avg Score" : "المتوسط"}</p>
                  </div>
                  <div className="bg-warning/5 rounded-xl p-3 text-center glass-card-premium">
                    <p className="text-lg font-bold text-warning">{aiStats.highMatch}</p>
                    <p className="text-[9px] text-muted-foreground">{locale === "en" ? "High Match" : "تطابق عالي"}</p>
                  </div>
                </div>
                <div className="bg-primary/5 rounded-xl p-3 flex items-center gap-2 glass-card-premium">
                  <Sparkles className="w-4 h-4 text-primary animate-spin" />
                  <span className="text-xs">
                    {allCandidates.length > 0
                       ? `${Math.round((aiStats.evaluated / allCandidates.length) * 100)}% ${locale === "en" ? "of candidates evaluated by AI" : "من المرشحين تم تقييمهم بالذكاء الاصطناعي"}`
                       : locale === "en" ? "No candidates yet" : "لا يوجد مرشحون بعد"
                    }
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Row: Team + Security + Interviews */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Team Overview */}
          <motion.div variants={itemVariants}>
            <Card className="glass-card-premium border-none shadow-md h-full group">
              <CardHeader className="pb-3 bg-gradient-to-l from-destructive/5 to-transparent">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <UserCog className="w-4 h-4 text-destructive group-hover:rotate-12 transition-transform duration-300" />{locale === "en" ? "Team Overview" : "نظرة على الفريق"}
                  </CardTitle>
                  <Link to="/team" className="text-xs text-primary hover:underline flex items-center gap-1">{t("common.viewAll")} <ChevronRight className="w-3 h-3" /></Link>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="space-y-2.5">
                  {[
                    { label: locale === "en" ? "Admins" : "مدراء", count: teamStats.admins, color: "bg-destructive/10 text-destructive", icon: Crown },
                    { label: locale === "en" ? "Recruiters" : "موظفون", count: teamStats.recruiters, color: "bg-primary/10 text-primary", icon: Briefcase },
                    { label: locale === "en" ? "Reviewers" : "مراجعون", count: teamStats.reviewers, color: "bg-warning/10 text-warning", icon: Eye },
                    { label: locale === "en" ? "Job Seekers" : "باحثون عن عمل", count: teamStats.jobSeekers, color: "bg-success/10 text-success", icon: Users },
                  ].map(r => (
                    <motion.div key={r.label} whileHover={{ scale: 1.02 }} className="flex items-center justify-between p-2.5 rounded-xl list-hover-highlight cursor-default glass-card-premium">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", r.color)}>
                          <r.icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-sm font-medium">{r.label}</span>
                      </div>
                      <span className="text-lg font-bold">{r.count}</span>
                    </motion.div>
                  ))}
                  <div className="border-t border-border pt-2 flex items-center justify-between px-2.5">
                    <span className="text-sm font-semibold text-muted-foreground">{locale === "en" ? "Total" : "الإجمالي"}</span>
                    <span className="text-xl font-bold">{teamStats.totalUsers}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Security / Audit Summary */}
          <motion.div variants={itemVariants}>
            <Card className="glass-card-premium border-none shadow-md h-full group">
              <CardHeader className="pb-3 bg-gradient-to-l from-warning/5 to-transparent">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="w-4 h-4 text-warning group-hover:scale-110 transition-transform" />{locale === "en" ? "Security Log" : "سجل الأمان"}
                  </CardTitle>
                  <Link to="/audit-log" className="text-xs text-primary hover:underline flex items-center gap-1">{t("common.viewAll")} <ChevronRight className="w-3 h-3" /></Link>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                {(!recentAudit || recentAudit.length === 0) ? (
                  <div className="text-center py-8">
                    <Shield className="w-12 h-12 mx-auto text-muted-foreground/20 mb-3" />
                    <p className="text-sm text-muted-foreground">{locale === "en" ? "No recent events" : "لا توجد أحداث حديثة"}</p>
                  </div>
                ) : (
                  <div className={cn("relative py-1 space-y-4", dir === "rtl" ? "border-r border-dashed border-border/80 pr-4 mr-2" : "border-l border-dashed border-border/80 pl-4 ml-2")}>
                    {(recentAudit as any[]).slice(0, 5).map((entry: any, i: number) => {
                      const eventColors: Record<string, string> = {
                        login: "bg-success/20 text-success border-success/30",
                        logout: "bg-muted text-muted-foreground border-border",
                        role_change: "bg-destructive/20 text-destructive border-destructive/30",
                        data_export: "bg-warning/20 text-warning border-warning/30",
                      };
                      
                      const bulletColor = entry.event_type === "login" ? "border-success bg-success" :
                        entry.event_type === "logout" ? "border-muted-foreground bg-muted-foreground" :
                        entry.event_type === "role_change" ? "border-destructive bg-destructive" :
                        entry.event_type === "data_export" ? "border-warning bg-warning" : "border-primary bg-primary";
 
                      return (
                        <motion.div
                          key={entry.id}
                          className="relative flex items-center gap-3 group/item list-hover-highlight p-1.5 rounded-lg"
                        >
                          {/* Timeline bullet node */}
                          <div className={cn(
                            "absolute top-2.5 w-2 h-2 rounded-full border bg-background z-10 transition-transform group-hover/item:scale-125",
                            dir === "rtl" ? "-right-[20.5px]" : "-left-[20.5px]",
                            bulletColor
                          )} />
 
                          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border", eventColors[entry.event_type] || "bg-primary/10 text-primary border-primary/20")}>
                            <Lock className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{entry.event_type}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{entry.user_email?.split("@")[0] || "—"}</p>
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
                            {new Date(entry.created_at).toLocaleDateString(locale === "en" ? "en-US" : "ar-SA", { day: "numeric", month: "short" })}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
 
          {/* Scheduled Interviews */}
          <motion.div variants={itemVariants}>
            <Card className="glass-card-premium border-none shadow-md h-full group">
              <CardHeader className="pb-3 bg-gradient-to-l from-warning/5 to-transparent">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-warning group-hover:scale-110 transition-transform" />{locale === "en" ? "Upcoming Interviews" : "المقابلات القادمة"}
                  </CardTitle>
                  <Link to="/interviews" className="text-xs text-primary hover:underline flex items-center gap-1">{t("common.viewAll")} <ChevronRight className="w-3 h-3" /></Link>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                {todayInterviews.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 mx-auto text-muted-foreground/20 mb-3" />
                    <p className="text-sm text-muted-foreground">{locale === "en" ? "No scheduled interviews" : "لا توجد مقابلات مجدولة"}</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {todayInterviews.map((interview) => (
                      <motion.div key={interview.id} className="flex items-center gap-3 p-2.5 rounded-xl list-hover-highlight cursor-default glass-card-premium">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-warning to-warning/60 flex items-center justify-center flex-shrink-0 shadow-md">
                          <Video className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{interview.candidate_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{interview.position}</p>
                        </div>
                        <span className="text-xs font-bold text-warning bg-warning/10 px-2 py-1 rounded-lg">{interview.time?.slice(0, 5)}</span>
                      </motion.div>
                    ))}
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
    </div>
  );
}
