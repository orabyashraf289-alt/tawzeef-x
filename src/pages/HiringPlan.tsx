import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDashboardStats, useCandidates, useInterviews } from "@/hooks/useJobs";
import { useOffers } from "@/hooks/useOffers";
import { motion, AnimatePresence } from "framer-motion";
import { fadeUp, stagger, cardHover } from "@/lib/motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import {
  Target, TrendingUp, Users, UserCheck, Calendar, FileText,
  ChevronLeft, ChevronRight, Save, BarChart3, Flame, Award,
  CheckCircle2, AlertCircle, Clock, Sparkles, ArrowUp, ArrowDown, Download,
} from "lucide-react";
import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { AnimatedDashboardBackground } from "@/components/AnimatedBackground";

const MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

function useHiringGoals(month: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["hiring-goals", user?.id, month],
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hiring_goals")
        .select("*")
        .eq("user_id", user!.id)
        .eq("month", month)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

function useSaveGoals() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (goals: {
      month: string;
      hire_target: number;
      candidates_target: number;
      interviews_target: number;
      offers_target: number;
    }) => {
      const { data: existing } = await supabase
        .from("hiring_goals")
        .select("id")
        .eq("user_id", user!.id)
        .eq("month", goals.month)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("hiring_goals")
          .update({ ...goals, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("hiring_goals")
          .insert({ ...goals, user_id: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hiring-goals"] });
      toast({ title: "تم حفظ أهداف التوظيف ✅" });
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });
}

function GoalCard({
  icon: Icon, label, current, target, color, index,
}: {
  icon: any; label: string; current: number; target: number; color: string; index: number;
}) {
  const pct = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
  const status = pct >= 100 ? "done" : pct >= 60 ? "on-track" : "behind";

  // Color-coded gradients for the progress indicators
  const progressGradient = useMemo(() => {
    if (color.includes("text-primary")) {
      return "bg-gradient-to-l from-primary to-primary/60 shadow-[0_0_8px_rgba(var(--primary),0.3)]";
    } else if (color.includes("text-info")) {
      return "bg-gradient-to-l from-info to-info/60 shadow-[0_0_8px_rgba(56,189,248,0.3)]";
    } else if (color.includes("text-warning")) {
      return "bg-gradient-to-l from-warning to-warning/60 shadow-[0_0_8px_rgba(245,158,11,0.3)]";
    } else {
      return "bg-gradient-to-l from-success to-success/60 shadow-[0_0_8px_rgba(16,185,129,0.3)]";
    }
  }, [color]);

  return (
    <motion.div variants={fadeUp} custom={index}>
      <Card className="glass-card-premium relative overflow-hidden p-0 border border-border/30 bg-card/45 backdrop-blur-md rounded-2xl shadow-sm transition-all duration-300 group">
        <div className={cn("absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-25 -translate-y-8 translate-x-8", color)} />
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110", color.replace("bg-", "bg-").replace("/20", "/15"))}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold text-foreground">{current}<span className="text-sm text-muted-foreground font-normal">/{target}</span></p>
              </div>
            </div>
            <Badge variant={status === "done" ? "default" : status === "on-track" ? "secondary" : "destructive"} className="text-xs font-semibold">
              {status === "done" && <><CheckCircle2 className="w-3 h-3 ml-1" />مكتمل</>}
              {status === "on-track" && <><TrendingUp className="w-3 h-3 ml-1 text-success" />على المسار</>}
              {status === "behind" && <><AlertCircle className="w-3 h-3 ml-1" />متأخر</>}
            </Badge>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>التقدم</span>
              <span className="font-bold text-foreground">{pct}%</span>
            </div>
            {/* Custom animated progress indicator */}
            <div className="h-2.5 w-full bg-muted/40 rounded-full overflow-hidden relative">
              <motion.div
                className={cn("h-full rounded-full", progressGradient)}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function HiringPlan() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const monthKey = format(currentDate, "yyyy-MM");
  const monthLabel = `${MONTHS_AR[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

  const { data: goals, isLoading } = useHiringGoals(monthKey);
  const saveGoals = useSaveGoals();
  const { data: candidates } = useCandidates();
  const { data: interviews } = useInterviews();
  const { data: offers } = useOffers();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    hire_target: 10,
    candidates_target: 50,
    interviews_target: 20,
    offers_target: 8,
  });

  // Sync form with loaded goals
  useMemo(() => {
    if (goals) {
      setForm({
        hire_target: goals.hire_target,
        candidates_target: goals.candidates_target,
        interviews_target: goals.interviews_target,
        offers_target: goals.offers_target,
      });
    }
  }, [goals]);

  // Calculate actuals for the selected month
  const actuals = useMemo(() => {
    const start = startOfMonth(currentDate).toISOString();
    const end = endOfMonth(currentDate).toISOString();
    const allCandidates = candidates || [];
    const allInterviews = interviews || [];
    const allOffers = offers || [];

    const monthCandidates = allCandidates.filter(c => c.created_at >= start && c.created_at <= end);
    const monthInterviews = allInterviews.filter(i => i.created_at >= start && i.created_at <= end);
    const monthOffers = allOffers.filter(o => o.created_at >= start && o.created_at <= end);
    const monthHired = monthCandidates.filter(c => c.status === "مقبول");

    return {
      candidates: monthCandidates.length,
      interviews: monthInterviews.length,
      offers: monthOffers.length,
      hired: monthHired.length,
    };
  }, [candidates, interviews, offers, currentDate]);

  const handleSave = () => {
    saveGoals.mutate({ month: monthKey, ...form });
    setEditing(false);
  };

  const targets = goals || form;

  const goalCards = [
    { icon: Users, label: "المرشحون المستهدفون", current: actuals.candidates, target: targets.candidates_target, color: "bg-primary/20 text-primary" },
    { icon: Calendar, label: "المقابلات المستهدفة", current: actuals.interviews, target: targets.interviews_target, color: "bg-info/20 text-info" },
    { icon: FileText, label: "العروض المستهدفة", current: actuals.offers, target: targets.offers_target, color: "bg-warning/20 text-warning" },
    { icon: UserCheck, label: "التوظيف المستهدف", current: actuals.hired, target: targets.hire_target, color: "bg-success/20 text-success" },
  ];

  // Overall score
  const overallPct = useMemo(() => {
    const items = goalCards.map(g => g.target > 0 ? Math.min(g.current / g.target, 1) : 0);
    return Math.round((items.reduce((a, b) => a + b, 0) / items.length) * 100);
  }, [goalCards]);

  return (
    <DashboardLayout>
      <AnimatedDashboardBackground />
      <div className="p-4 lg:p-8 space-y-6 relative z-10" dir="rtl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Target className="w-6 h-6 text-primary animate-pulse" />
              خطة التوظيف
            </h1>
            <p className="text-sm text-muted-foreground mt-1 font-medium">تتبع أهدافك الشهرية وحقق أقصى كفاءة في التوظيف</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(d => subMonths(d, 1))} className="rounded-xl border-border/40 hover:bg-primary/5 hover:text-primary transition-all duration-300">
              <ChevronRight className="w-4 h-4" />
            </Button>
            <span className="text-sm font-semibold min-w-[120px] text-center">{monthLabel}</span>
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(d => addMonths(d, 1))} className="rounded-xl border-border/40 hover:bg-primary/5 hover:text-primary transition-all duration-300">
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>

        {/* Overall Score */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="glass-card-premium relative overflow-hidden border border-border/30 bg-card/45 backdrop-blur-md rounded-2xl shadow-sm">
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-primary/[0.03] blur-3xl opacity-60 translate-x-12 -translate-y-12" />
            <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-6 relative z-10">
              <div className="relative w-28 h-28 shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <defs>
                    <linearGradient id="overallGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="hsl(var(--primary))" />
                      <stop offset="100%" stopColor="hsl(var(--accent))" />
                    </linearGradient>
                    <filter id="overallGlowFilter" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <circle cx="50" cy="50" r="42" fill="none" strokeWidth="8" className="stroke-muted/20" />
                  <motion.circle
                    cx="50" cy="50" r="42" fill="none" strokeWidth="8"
                    strokeLinecap="round"
                    stroke="url(#overallGlow)"
                    filter="url(#overallGlowFilter)"
                    strokeDasharray={`${2 * Math.PI * 42}`}
                    initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - overallPct / 100) }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-extrabold text-foreground">{overallPct}%</span>
                </div>
              </div>
              <div className="flex-1 text-center sm:text-right">
                <h3 className="text-lg font-bold text-foreground">الأداء العام لـ {monthLabel}</h3>
                <p className="text-sm text-muted-foreground mt-1 font-medium">
                  {overallPct >= 80 ? "أداء ممتاز! 🔥 أنت تسير فوق المستهدف" :
                   overallPct >= 50 ? "أداء جيد 👍 استمر لتحقيق الأهداف" :
                   "تحتاج لتسريع الوتيرة 💪 لتحقيق أهداف الشهر"}
                </p>
              </div>
              <Button 
                variant={editing ? "default" : "outline"} 
                onClick={() => editing ? handleSave() : setEditing(true)} 
                className="gap-2 rounded-xl transition-all duration-300 shadow-sm border-border/40 hover:bg-primary/5 hover:text-primary"
              >
                {editing ? <><Save className="w-4 h-4" />حفظ الأهداف</> : <><Sparkles className="w-4 h-4 text-primary animate-pulse" />تعديل الأهداف</>}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Edit Goals Panel */}
        <AnimatePresence>
          {editing && (
            <motion.div
              initial={{ opacity: 0, height: 0, scale: 0.98 }}
              animate={{ opacity: 1, height: "auto", scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.98 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <Card className="border border-primary/20 bg-primary/5 dark:bg-primary/10 backdrop-blur-md rounded-2xl shadow-lg p-1">
                <CardContent className="p-6">
                  <h3 className="font-bold text-foreground mb-4 flex items-center gap-2 text-base">
                    <Target className="w-5 h-5 text-primary animate-pulse" />تعديل الأهداف الشهرية لـ {monthLabel}
                  </h3>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { key: "candidates_target", label: "المرشحون", icon: Users },
                      { key: "interviews_target", label: "المقابلات", icon: Calendar },
                      { key: "offers_target", label: "العروض", icon: FileText },
                      { key: "hire_target", label: "التوظيف", icon: UserCheck },
                    ].map(field => (
                      <div key={field.key} className="space-y-2">
                        <Label className="text-xs flex items-center gap-1.5 font-semibold">
                          <field.icon className="w-3.5 h-3.5 text-muted-foreground" />{field.label}
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          value={form[field.key as keyof typeof form]}
                          onChange={e => setForm(f => ({ ...f, [field.key]: parseInt(e.target.value) || 0 }))}
                          className="text-center font-bold border-muted-foreground/20 focus-visible:ring-primary/50 focus-visible:border-primary transition-all duration-300 rounded-xl"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Goal Cards */}
        <motion.div variants={stagger()} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {goalCards.map((g, i) => (
            <GoalCard key={g.label} {...g} index={i} />
          ))}
        </motion.div>

        {/* Monthly Comparison Chart */}
        <motion.div variants={fadeUp} initial="hidden" animate="show">
          <Card className="glass-card-premium border border-border/30 bg-card/40 backdrop-blur-md rounded-2xl shadow-sm p-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 font-bold text-foreground">
                <BarChart3 className="w-4 h-4 text-primary animate-pulse" />مقارنة شهرية - الأهداف مقابل الأداء الفعلي
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const chartData = goalCards.map(g => ({
                  name: g.label.replace("المستهدفون", "").replace("المستهدفة", "").replace("المستهدف", "").trim(),
                  الهدف: g.target,
                  الفعلي: g.current,
                }));
                return (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={chartData} barCategoryGap="20%">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "12px",
                          fontSize: "12px",
                          border: "1px solid hsl(var(--border) / 0.5)",
                          backgroundColor: "hsl(var(--card) / 0.85)",
                          backdropFilter: "blur(12px)",
                          WebkitBackdropFilter: "blur(12px)",
                          boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.08)",
                          color: "hsl(var(--foreground))",
                        }}
                        itemStyle={{ color: "hsl(var(--foreground))" }}
                        labelStyle={{ color: "hsl(var(--muted-foreground))", fontWeight: "bold" }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                      <Bar dataKey="الهدف" fill="hsl(var(--muted-foreground))" radius={[6, 6, 0, 0]} opacity={0.4} />
                      <Bar dataKey="الفعلي" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                );
              })()}
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recruitment Funnel */}
          <motion.div variants={fadeUp} initial="hidden" animate="show">
            <Card className="glass-card-premium border border-border/30 bg-card/40 backdrop-blur-md rounded-2xl shadow-sm p-2 h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 font-bold text-foreground">
                  <BarChart3 className="w-4 h-4 text-primary animate-pulse" />قمع التوظيف - {monthLabel}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                {[
                  { label: "مرشحون", value: actuals.candidates, color: "bg-primary" },
                  { label: "مقابلات", value: actuals.interviews, color: "bg-info" },
                  { label: "عروض", value: actuals.offers, color: "bg-warning" },
                  { label: "تم توظيفهم", value: actuals.hired, color: "bg-success" },
                ].map((item, i) => {
                  const maxVal = Math.max(actuals.candidates, 1);
                  const width = Math.max((item.value / maxVal) * 100, 8);
                  const prevVal = i > 0 ? [actuals.candidates, actuals.interviews, actuals.offers, actuals.hired][i - 1] : item.value;
                  const convRate = prevVal > 0 && i > 0 ? Math.round((item.value / prevVal) * 100) : 100;
                  return (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center gap-3"
                    >
                      <span className="text-xs text-muted-foreground w-20 text-left font-medium">{item.label}</span>
                      <div className="flex-1 h-8 bg-muted/20 rounded-lg overflow-hidden relative">
                        <motion.div
                          className={cn("h-full rounded-lg flex items-center justify-end px-3 shadow-inner bg-gradient-to-l", 
                            item.color === "bg-primary" && "from-primary to-primary/70",
                            item.color === "bg-info" && "from-info to-info/70",
                            item.color === "bg-warning" && "from-warning to-warning/70",
                            item.color === "bg-success" && "from-success to-success/70"
                          )}
                          initial={{ width: 0 }}
                          animate={{ width: `${width}%` }}
                          transition={{ duration: 0.8, delay: i * 0.15, ease: "easeOut" }}
                        >
                          <span className="text-xs font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">{item.value}</span>
                        </motion.div>
                      </div>
                      {i > 0 && (
                        <Badge variant="outline" className={cn("text-[10px] min-w-[45px] text-center justify-center font-bold", convRate >= 50 ? "text-success border-success/20 bg-success/5" : "text-warning border-warning/20 bg-warning/5")}>
                          {convRate}%
                        </Badge>
                      )}
                    </motion.div>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>

          {/* Enhanced Tips & Insights */}
          <motion.div variants={fadeUp} initial="hidden" animate="show">
            <Card className="glass-card-premium border border-border/30 bg-card/40 backdrop-blur-md rounded-2xl shadow-sm p-2 h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 font-bold text-foreground">
                  <Sparkles className="w-4 h-4 text-primary animate-pulse" />نصائح ذكية مخصصة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                {(() => {
                  const tips = [];
                  const convRate = actuals.candidates > 0 ? Math.round((actuals.hired / actuals.candidates) * 100) : 0;
                  const interviewConv = actuals.candidates > 0 ? Math.round((actuals.interviews / actuals.candidates) * 100) : 0;
                  const offerConv = actuals.interviews > 0 ? Math.round((actuals.offers / actuals.interviews) * 100) : 0;

                  if (actuals.candidates < targets.candidates_target * 0.5) {
                    tips.push({ icon: Users, text: `عدد المرشحين (${actuals.candidates}) أقل من 50% من الهدف (${targets.candidates_target}). جرّب نشر الوظائف على منصات إضافية مثل LinkedIn وIndeed.`, type: "warning" });
                  }
                  if (interviewConv < 30 && actuals.candidates > 5) {
                    tips.push({ icon: Calendar, text: `معدل تحويل المرشحين للمقابلات ${interviewConv}% فقط. راجع معايير الفلترة أو استخدم الترتيب الذكي.`, type: "warning" });
                  }
                  if (offerConv > 0 && offerConv < 40 && actuals.interviews > 3) {
                    tips.push({ icon: FileText, text: `نسبة تحويل المقابلات لعروض ${offerConv}%. حسّن أسئلة المقابلة لفلترة أدق.`, type: "info" });
                  }
                  if (convRate > 20) {
                    tips.push({ icon: Award, text: `معدل التوظيف ${convRate}% - ممتاز! جودة المرشحين عالية.`, type: "success" });
                  }
                  if (actuals.offers > 0 && actuals.hired === 0) {
                    tips.push({ icon: FileText, text: "تم إرسال عروض لكن لم يتم القبول بعد. تابع مع المرشحين وتأكد من تنافسية الرواتب.", type: "info" });
                  }
                  if (overallPct >= 80) {
                    tips.push({ icon: Flame, text: `أداء ممتاز ${overallPct}%! أنت تسير فوق المستهدف. حافظ على هذا الزخم! 🔥`, type: "success" });
                  }
                  if (tips.length === 0) {
                    tips.push({ icon: Flame, text: "ابدأ بتحديد أهدافك الشهرية لتحصل على نصائح مخصصة!", type: "info" });
                  }

                  return tips.map((tip, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-xl list-hover-highlight",
                        tip.type === "warning" && "bg-warning/10 border border-warning/10",
                        tip.type === "success" && "bg-success/10 border border-success/10",
                        tip.type === "info" && "bg-primary/5 border border-primary/5",
                      )}
                    >
                      <tip.icon className={cn(
                        "w-5 h-5 mt-0.5 shrink-0",
                        tip.type === "warning" && "text-warning",
                        tip.type === "success" && "text-success",
                        tip.type === "info" && "text-primary",
                      )} />
                      <p className="text-sm text-foreground">{tip.text}</p>
                    </motion.div>
                  ));
                })()}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* PDF Export */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="flex justify-center pt-4">
          <Button variant="outline" className="gap-2 rounded-xl border-border/40 hover:bg-primary/5 hover:text-primary transition-all duration-300 shadow-sm" onClick={() => {
            import("jspdf").then(({ jsPDF }) => {
              const doc = new jsPDF({ orientation: "landscape" });
              doc.setFont("Helvetica");
              doc.setFontSize(20);
              doc.text(`Hiring Plan - ${monthLabel}`, 148, 20, { align: "center" });
              doc.setFontSize(12);
              doc.text(`Overall: ${overallPct}%`, 148, 30, { align: "center" });
              let y = 50;
              goalCards.forEach(g => {
                const pct = g.target > 0 ? Math.round((g.current / g.target) * 100) : 0;
                doc.text(`${g.label}: ${g.current}/${g.target} (${pct}%)`, 20, y);
                y += 12;
              });
              doc.save(`hiring-plan-${monthKey}.pdf`);
              toast({ title: "تم تصدير خطة التوظيف كـ PDF ✅" });
            });
          }}>
            <Download className="w-4 h-4" />تصدير PDF
          </Button>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
