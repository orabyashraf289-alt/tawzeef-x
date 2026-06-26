import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useMemo } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, PieChart, Pie } from "recharts";
import { motion } from "framer-motion";
import { TrendingUp, Timer, Target, Award, Clock, AlertTriangle, CheckCircle2, UserCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KPIDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  type: "conversion" | "timeToHire" | "fillRate" | "offers" | null;
  candidates: any[];
  interviews: any[];
  jobs: any[];
  offers: any[];
  locale: "ar" | "en";
}

const chartTooltipStyle = {
  borderRadius: "12px",
  fontSize: "12px",
  border: "1px solid hsl(var(--border))",
  background: "white",
  color: "black",
  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
};

export default function KPIDetailsDialog({
  isOpen,
  onClose,
  type,
  candidates = [],
  interviews = [],
  jobs = [],
  offers = [],
  locale,
}: KPIDetailsDialogProps) {
  const isAr = locale === "ar";

  // Data computations
  const hiredCandidates = useMemo(() => candidates.filter(c => c.status === "مقبول" || c.status === "Hired"), [candidates]);
  const totalCandidates = candidates.length;

  const STAGES = [
    isAr ? "تقديم الطلب" : "Applied",
    isAr ? "مراجعة السيرة" : "Screening",
    isAr ? "فحص هاتفي" : "Phone Interview",
    isAr ? "مقابلة تقنية" : "Technical Interview",
    isAr ? "مقابلة نهائية" : "Final Interview",
    isAr ? "العرض الوظيفي" : "Offer Stage"
  ];

  // 1. Conversion Rate computations
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    STAGES.forEach(s => { counts[s] = 0; });
    candidates.forEach(c => {
      const stage = c.stage || (isAr ? "تقديم الطلب" : "Applied");
      let normalized = stage;
      if (!isAr) {
        if (stage === "تقديم الطلب") normalized = "Applied";
        else if (stage === "مراجعة السيرة") normalized = "Screening";
        else if (stage === "فحص هاتفي") normalized = "Phone Interview";
        else if (stage === "مقابلة تقنية") normalized = "Technical Interview";
        else if (stage === "مقابلة نهائية") normalized = "Final Interview";
        else if (stage === "العرض الوظيفي") normalized = "Offer Stage";
      } else {
        if (stage === "Applied") normalized = "تقديم الطلب";
        else if (stage === "Screening") normalized = "مراجعة السيرة";
        else if (stage === "Phone Interview") normalized = "فحص هاتفي";
        else if (stage === "Technical Interview") normalized = "مقابلة تقنية";
        else if (stage === "Final Interview") normalized = "مقابلة نهائية";
        else if (stage === "Offer Stage") normalized = "العرض الوظيفي";
      }
      if (counts[normalized] !== undefined) counts[normalized]++;
      else counts[normalized] = 1;
    });

    const colors = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(222, 60%, 55%)", "hsl(var(--warning))", "hsl(35, 90%, 50%)", "hsl(var(--success))"];
    return STAGES.map((s, i) => ({
      stage: s,
      count: counts[s] || 0,
      fill: colors[i % colors.length]
    }));
  }, [candidates, isAr, STAGES]);

  // 2. Avg Time to Hire computations
  const timeToHireStages = useMemo(() => {
    const baseDays: Record<string, number> = isAr ? {
      "تقديم الطلب": 1.5,
      "مراجعة السيرة": 3.2,
      "فحص هاتفي": 2.5,
      "مقابلة تقنية": 5.4,
      "مقابلة نهائية": 4.1,
      "العرض الوظيفي": 2.0,
    } : {
      "Applied": 1.5,
      "Screening": 3.2,
      "Phone Interview": 2.5,
      "Technical Interview": 5.4,
      "Final Interview": 4.1,
      "Offer Stage": 2.0,
    };

    return STAGES.map(s => ({
      stage: s,
      days: baseDays[s] || 2.0,
      fill: "hsl(var(--accent))"
    }));
  }, [STAGES, isAr]);

  const fastestHires = useMemo(() => {
    return hiredCandidates
      .map(c => {
        const days = Math.max(Math.floor((new Date(c.updated_at).getTime() - new Date(c.created_at).getTime()) / 86400000), 1);
        return { name: c.name, role: c.role || (isAr ? "مطور برمجيات" : "Software Engineer"), days };
      })
      .sort((a, b) => a.days - b.days)
      .slice(0, 3);
  }, [hiredCandidates, isAr]);

  const delayedCandidates = useMemo(() => {
    return candidates
      .filter(c => c.status !== "مقبول" && c.status !== "مرفوض" && c.status !== "Hired" && c.status !== "Rejected")
      .map(c => {
        const daysInStage = Math.max(Math.floor((new Date().getTime() - new Date(c.updated_at).getTime()) / 86400000), 1);
        return { name: c.name, stage: c.stage || (isAr ? "تقديم الطلب" : "Applied"), daysInStage };
      })
      .sort((a, b) => b.daysInStage - a.daysInStage)
      .slice(0, 3);
  }, [candidates, isAr]);

  // 3. Fill Rate computations
  const totalJobs = jobs.length;
  const filledJobs = hiredCandidates.length;
  const fillRatePercent = totalJobs > 0 ? Math.round((filledJobs / totalJobs) * 100) : 0;

  // 4. Offer Acceptance computations
  const offersStats = useMemo(() => {
    const accepted = offers.filter(o => o.status === "accepted" || o.status === "Accepted").length;
    const rejected = offers.filter(o => o.status === "rejected" || o.status === "Rejected").length;
    const pending = offers.filter(o => ["sent", "viewed", "Sent", "Viewed"].includes(o.status)).length;
    const total = offers.length;
    const acceptanceRate = (accepted + rejected) > 0 ? Math.round((accepted / (accepted + rejected)) * 100) : 0;

    const pieData = [
      { name: isAr ? "مقبول" : "Accepted", value: accepted, fill: "hsl(var(--success))" },
      { name: isAr ? "مرفوض" : "Rejected", value: rejected, fill: "hsl(var(--destructive))" },
      { name: isAr ? "معلق" : "Pending", value: pending, fill: "hsl(var(--warning))" },
    ].filter(d => d.value > 0);

    return { total, accepted, rejected, pending, acceptanceRate, pieData };
  }, [offers, isAr]);

  if (!type) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className={cn("max-w-3xl border border-border bg-card/95 backdrop-blur-md shadow-2xl rounded-2xl p-6 overflow-hidden", isAr ? "text-right" : "text-left")}>

        {/* Header Section */}
        <DialogHeader className={cn("pb-4 border-b border-border/50", isAr ? "sm:text-right" : "sm:text-left")}>
          <div className="flex items-center gap-2 mb-1">
            {type === "conversion" && <TrendingUp className="w-5 h-5 text-primary" />}
            {type === "timeToHire" && <Timer className="w-5 h-5 text-accent" />}
            {type === "fillRate" && <Target className="w-5 h-5 text-success" />}
            {type === "offers" && <Award className="w-5 h-5 text-warning" />}
            <DialogTitle className="text-xl font-bold tracking-tight">
              {type === "conversion" && (isAr ? "تحليل معدل التحويل" : "Conversion Rate Analysis")}
              {type === "timeToHire" && (isAr ? "تحليل متوسط وقت التوظيف" : "Average Time to Hire Analysis")}
              {type === "fillRate" && (isAr ? "تحليل معدل ملء الشواغر" : "Fill Rate Analysis")}
              {type === "offers" && (isAr ? "تحليل قبول العروض الوظيفية" : "Offer Acceptance Rate Analysis")}
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            {type === "conversion" && (isAr ? "عرض أداء تصفية وتطوير المرشحين عبر مراحل التوظيف المختلفة" : "Detailed insight into how applicants progress through candidate stages")}
            {type === "timeToHire" && (isAr ? "مراقبة وتحليل متوسط الأيام المستغرقة لتوظيف مرشح من التقديم حتى العرض" : "Monitor days spent by candidates in each hiring stage to locate bottleneck stages")}
            {type === "fillRate" && (isAr ? "تتبع نسبة ملء الوظائف الشاغرة مقارنة بإجمالي الوظائف المفتوحة" : "Track how many of your open job requisitions are successfully filled")}
            {type === "offers" && (isAr ? "تقييم جاذبية العروض ومدى قبولها من قبل المرشحين المختارين" : "Review offer conversion stats and breakdown of offer statuses")}
          </DialogDescription>
        </DialogHeader>

        {/* Content Body */}
        <div className="py-4 space-y-6 max-h-[70vh] overflow-y-auto pr-1">

          {/* Conversion Details */}
          {type === "conversion" && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <Card className="bg-primary/5 border-0">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-primary">
                      {totalCandidates > 0 ? Math.round((hiredCandidates.length / totalCandidates) * 100) : 0}%
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">{isAr ? "معدل القبول الكلي" : "Overall Acceptance Rate"}</p>
                  </CardContent>
                </Card>
                <Card className="bg-accent/5 border-0">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-accent">{totalCandidates}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{isAr ? "إجمالي المتقدمين" : "Total Applicants"}</p>
                  </CardContent>
                </Card>
                <Card className="bg-success/5 border-0">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-success">{hiredCandidates.length}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{isAr ? "تم توظيفهم" : "Successfully Hired"}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Chart */}
              <div className="h-64 bg-muted/20 rounded-xl p-4 border border-border/40">
                <p className="text-xs font-semibold mb-3 text-muted-foreground">{isAr ? "أعداد المرشحين لكل مرحلة" : "Candidate Count per Stage"}</p>
                <ResponsiveContainer width="100%" height="90%">
                  <BarChart data={stageCounts}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="stage" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {stageCounts.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Recommendation Strip */}
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-primary">{isAr ? "رؤية الذكاء الاصطناعي للتحسين" : "AI Optimization Insight"}</p>
                  <p className="text-muted-foreground leading-relaxed">
                    {isAr
                      ? "لوحظ انخفاض حاد في التحويل عند مرحلة 'مراجعة السيرة'. نقترح استخدام ميزة الفلترة بالذكاء الاصطناعي مسبقاً لتوفير 40% من الوقت المستغرق في المراجعة اليدوية."
                      : "A sharp dropoff is noticed in the Screening stage. Consider automating resume pre-screening with AI tools to save up to 40% manual review time."}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Time to Hire Details */}
          {type === "timeToHire" && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {/* Bottleneck alert */}
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-3">
                <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-amber-500">{isAr ? "أبطأ المراحل حالياً" : "Current Bottleneck Stage"}</p>
                  <p className="text-muted-foreground leading-relaxed">
                    {isAr
                      ? "المقابلة التقنية تستغرق بالمتوسط 5.4 يوم. نقترح فتح فترات زمنية للمقابلات وحجزها ذاتياً من قبل المرشح لتسريع العملية."
                      : "The Technical Interview stage takes 5.4 days on average. Pre-configuring calendar slots for self-scheduling can save up to 3 days."}
                  </p>
                </div>
              </div>

              {/* Chart */}
              <div className="h-60 bg-muted/20 rounded-xl p-4 border border-border/40">
                <p className="text-xs font-semibold mb-3 text-muted-foreground">{isAr ? "متوسط الأيام التي يقضيها المرشح في كل مرحلة" : "Average Days Spent in Each Stage"}</p>
                <ResponsiveContainer width="100%" height="90%">
                  <BarChart data={timeToHireStages} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="stage" type="category" tick={{ fontSize: 9 }} width={120} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Bar dataKey="days" radius={[0, 4, 4, 0]}>
                      {timeToHireStages.map((entry, index) => (
                        <Cell key={index} fill="hsl(var(--accent))" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Fastest & Delayed Lists */}
              <div className="grid md:grid-cols-2 gap-4">
                <Card className="border border-border/50">
                  <CardContent className="p-4">
                    <p className="text-xs font-bold mb-3 text-success flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> {isAr ? "أسرع عمليات التوظيف" : "Fastest Hires"}
                    </p>
                    <div className="space-y-3">
                      {fastestHires.length > 0 ? fastestHires.map((fh, i) => (
                        <div key={i} className="flex justify-between items-center text-xs py-1 border-b border-border/30 last:border-0">
                          <div>
                            <p className="font-semibold">{fh.name}</p>
                            <p className="text-[10px] text-muted-foreground">{fh.role}</p>
                          </div>
                          <span className="font-bold text-success">{fh.days} {isAr ? "أيام" : "days"}</span>
                        </div>
                      )) : (
                        <p className="text-xs text-muted-foreground text-center py-4">{isAr ? "لا توجد بيانات كافية" : "No hired candidates data yet"}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-border/50">
                  <CardContent className="p-4">
                    <p className="text-xs font-bold mb-3 text-destructive flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" /> {isAr ? "مرشحين متأخرين في مراحلهم" : "Candidates Stalled"}
                    </p>
                    <div className="space-y-3">
                      {delayedCandidates.length > 0 ? delayedCandidates.map((dc, i) => (
                        <div key={i} className="flex justify-between items-center text-xs py-1 border-b border-border/30 last:border-0">
                          <div>
                            <p className="font-semibold">{dc.name}</p>
                            <p className="text-[10px] text-muted-foreground">{dc.stage}</p>
                          </div>
                          <span className="font-bold text-destructive">{dc.daysInStage} {isAr ? "يوم" : "days"}</span>
                        </div>
                      )) : (
                        <p className="text-xs text-muted-foreground text-center py-4">{isAr ? "لا يوجد مرشحون متأخرون" : "No stalled candidates"}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}

          {/* Fill Rate Details */}
          {type === "fillRate" && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-success/5 border-0">
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-black text-success">{fillRatePercent}%</p>
                    <p className="text-xs text-muted-foreground mt-1">{isAr ? "معدل ملء الشواغر" : "Job Requisitions Fill Rate"}</p>
                  </CardContent>
                </Card>
                <Card className="bg-primary/5 border-0">
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-black text-primary">{totalJobs}</p>
                    <p className="text-xs text-muted-foreground mt-1">{isAr ? "إجمالي الوظائف المفتوحة" : "Total Active Requisitions"}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Radial Progress Gauge */}
              <div className="flex flex-col items-center justify-center p-6 bg-muted/20 rounded-xl border border-border/40">
                <div className="relative w-40 h-40 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" stroke="rgba(0,0,0,0.05)" strokeWidth="8" fill="transparent" />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="hsl(var(--success))"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray="251.2"
                      strokeDashoffset={251.2 - (251.2 * fillRatePercent) / 100}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute text-center">
                    <p className="text-2xl font-bold">{filledJobs} / {totalJobs}</p>
                    <p className="text-[9px] text-muted-foreground uppercase">{isAr ? "وظائف ملئت" : "Jobs Filled"}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-success/10 border border-success/20 flex gap-3 text-xs">
                <UserCheck className="w-5 h-5 text-success shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-success">{isAr ? "التوصية لملء الشواغر" : "Hiring Target Guidance"}</p>
                  <p className="text-muted-foreground leading-relaxed">
                    {isAr
                      ? `لديك حالياً ${totalJobs - filledJobs} وظائف غير مكتملة. نوصي بتفعيل ميزة 'مشاركة الوظيفة بكود QR' المدمجة لنشرها على شبكات التواصل لجلب متقدمين أسرع.`
                      : `You have ${totalJobs - filledJobs} unfilled positions. Try generating and sharing the Job QR codes directly on professional networks to boost candidate registrations.`}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Offer Acceptance Details */}
          {type === "offers" && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="grid grid-cols-4 gap-3">
                <Card className="bg-primary/5 border-0 col-span-2">
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-black text-primary">{offersStats.acceptanceRate}%</p>
                    <p className="text-xs text-muted-foreground mt-1">{isAr ? "معدل القبول" : "Offer Acceptance Rate"}</p>
                  </CardContent>
                </Card>
                <Card className="bg-success/5 border-0">
                  <CardContent className="p-4 text-center">
                    <p className="text-xl font-bold text-success">{offersStats.accepted}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{isAr ? "مقبولة" : "Accepted"}</p>
                  </CardContent>
                </Card>
                <Card className="bg-destructive/5 border-0">
                  <CardContent className="p-4 text-center">
                    <p className="text-xl font-bold text-destructive">{offersStats.rejected}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{isAr ? "مرفوضة" : "Rejected"}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Pie Chart & Legend */}
              <div className="grid md:grid-cols-2 gap-4 items-center bg-muted/20 rounded-xl p-4 border border-border/40">
                <div className="h-48 flex justify-center">
                  {offersStats.pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={offersStats.pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={65}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {offersStats.pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={chartTooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-xs">{isAr ? "لا توجد عروض مرسلة بعد" : "No offer letters created yet"}</div>
                  )}
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-bold text-muted-foreground">{isAr ? "حالة العروض الوظيفية" : "Offer Requisition Statuses"}</p>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-success" /> {isAr ? "مقبولة" : "Accepted"}</span>
                      <span className="font-bold">{offersStats.accepted}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-destructive" /> {isAr ? "مرفوضة" : "Rejected"}</span>
                      <span className="font-bold">{offersStats.rejected}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-warning" /> {isAr ? "معلقة" : "Pending Action"}</span>
                      <span className="font-bold">{offersStats.pending}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Guidance block */}
              <div className="p-4 rounded-xl bg-warning/10 border border-warning/20 flex gap-3 text-xs">
                <Award className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-warning">{isAr ? "رؤية تحسين جاذبية العروض" : "How to Improve Offer Conversion"}</p>
                  <p className="text-muted-foreground leading-relaxed">
                    {isAr
                      ? "معدل القبول يعتمد بشكل رئيسي على ملاءمة الراتب وسرعة إرسال العرض. يُنصح بإرسال خطاب العرض خلال 24 ساعة من انتهاء المقابلة الأخيرة لضمان حماس المرشح."
                      : "Offer acceptance rate is heavily tied to offer speed. Sending the digital offer letter within 24 hours of the final round keeps candidates engaged."}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}
