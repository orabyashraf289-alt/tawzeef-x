import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell } from "recharts";
import { DollarSign, Clock, TrendingDown, TrendingUp, Target, Briefcase, FileDown } from "lucide-react";
import SARSymbol, { formatSAR } from "@/components/SARSymbol";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { generateHiringKpiPdf } from "@/lib/hiringKpiPdf";

interface Props {
  candidates: any[];
  jobs: any[];
  interviews: any[];
  offers: any[];
  locale: string;
}

const tooltipStyle = {
  borderRadius: "12px",
  fontSize: "12px",
  border: "1px solid hsl(var(--border) / 0.5)",
  backgroundColor: "hsl(var(--card) / 0.85)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.08)",
};

const AVG_COST_PER_HIRE = 2500; // SAR estimated

export default function HiringKPIReport({ candidates, jobs, interviews, offers, locale }: Props) {
  const isAr = locale !== "en";

  // Cost per Hire by department
  const costPerHire = useMemo(() => {
    const deptMap: Record<string, { hired: number; totalCost: number; candidates: number }> = {};
    candidates.forEach(c => {
      const job = jobs.find(j => j.id === c.job_id);
      const dept = job?.department || (isAr ? "غير محدد" : "Unspecified");
      if (!deptMap[dept]) deptMap[dept] = { hired: 0, totalCost: 0, candidates: 0 };
      deptMap[dept].candidates++;
      if (c.status === "مقبول") {
        deptMap[dept].hired++;
        deptMap[dept].totalCost += AVG_COST_PER_HIRE;
      }
    });
    return Object.entries(deptMap)
      .map(([dept, d]) => ({
        department: dept,
        costPerHire: d.hired > 0 ? Math.round(d.totalCost / d.hired) : 0,
        totalCost: d.totalCost,
        hired: d.hired,
        candidates: d.candidates,
        efficiency: d.candidates > 0 ? Math.round((d.hired / d.candidates) * 100) : 0,
      }))
      .sort((a, b) => b.hired - a.hired);
  }, [candidates, jobs, isAr]);

  // Time to Fill per job
  const timeToFill = useMemo(() => {
    return jobs.map(job => {
      const jobCands = candidates.filter(c => c.job_id === job.id);
      const hired = jobCands.filter(c => c.status === "مقبول");
      const avgDays = hired.length > 0
        ? Math.round(hired.reduce((sum, c) => {
            const days = Math.floor((new Date(c.updated_at).getTime() - new Date(c.created_at).getTime()) / 86400000);
            return sum + Math.max(days, 1);
          }, 0) / hired.length)
        : null;
      return {
        title: job.title.length > 20 ? job.title.slice(0, 20) + "…" : job.title,
        fullTitle: job.title,
        department: job.department,
        avgDays,
        hired: hired.length,
        candidates: jobCands.length,
      };
    }).filter(j => j.avgDays !== null).sort((a, b) => (a.avgDays ?? 0) - (b.avgDays ?? 0));
  }, [jobs, candidates]);

  // Monthly Cost Trend
  const monthlyCostTrend = useMemo(() => {
    const monthNames = isAr
      ? ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"]
      : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const months: Record<string, { hired: number; cost: number; candidates: number }> = {};
    candidates.forEach(c => {
      const d = new Date(c.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!months[key]) months[key] = { hired: 0, cost: 0, candidates: 0 };
      months[key].candidates++;
      if (c.status === "مقبول") {
        months[key].hired++;
        months[key].cost += AVG_COST_PER_HIRE;
      }
    });
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, data]) => {
        const [, m] = key.split("-");
        return {
          month: monthNames[parseInt(m)],
          cost: data.cost,
          costPerHire: data.hired > 0 ? Math.round(data.cost / data.hired) : 0,
          hired: data.hired,
        };
      });
  }, [candidates, isAr]);

  // Time to Fill per stage
  const stageTime = useMemo(() => {
    const stageMap: Record<string, { totalDays: number; count: number }> = {};
    candidates.forEach(c => {
      const stage = c.stage || "تقديم الطلب";
      if (!stageMap[stage]) stageMap[stage] = { totalDays: 0, count: 0 };
      const days = Math.floor((new Date(c.updated_at).getTime() - new Date(c.created_at).getTime()) / 86400000);
      stageMap[stage].totalDays += Math.max(days, 1);
      stageMap[stage].count++;
    });
    return Object.entries(stageMap)
      .map(([stage, d]) => ({
        stage,
        avgDays: d.count > 0 ? Math.round(d.totalDays / d.count) : 0,
        count: d.count,
      }))
      .filter(s => s.count > 0)
      .sort((a, b) => b.avgDays - a.avgDays);
  }, [candidates]);

  // Summary KPIs
  const totalHired = candidates.filter(c => c.status === "مقبول").length;
  const totalCost = totalHired * AVG_COST_PER_HIRE;
  const avgCostPerHire = totalHired > 0 ? Math.round(totalCost / totalHired) : 0;
  const overallTimeToFill = useMemo(() => {
    const hired = candidates.filter(c => c.status === "مقبول");
    if (hired.length === 0) return 0;
    return Math.round(hired.reduce((sum, c) => {
      return sum + Math.max(Math.floor((new Date(c.updated_at).getTime() - new Date(c.created_at).getTime()) / 86400000), 1);
    }, 0) / hired.length);
  }, [candidates]);
  const offerAcceptRate = useMemo(() => {
    const responded = offers.filter(o => o.status === "accepted" || o.status === "rejected");
    if (responded.length === 0) return 0;
    return Math.round((responded.filter(o => o.status === "accepted").length / responded.length) * 100);
  }, [offers]);

  const COLORS = ["hsl(222,65%,46%)", "hsl(174,62%,40%)", "hsl(36,90%,48%)", "hsl(340,65%,47%)", "hsl(152,56%,40%)", "hsl(262,60%,50%)"];

  return (
    <div className="space-y-6">
      {/* Export Button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => generateHiringKpiPdf({ candidates, jobs, offers, locale })}
          className="gap-2"
        >
          <FileDown className="w-4 h-4" />
          {isAr ? "تصدير PDF" : "Export PDF"}
        </Button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: DollarSign, label: isAr ? "تكلفة التوظيف الإجمالية" : "Total Hiring Cost", value: formatSAR(totalCost), sub: isAr ? "ريال سعودي" : "SAR", colorClass: "text-primary hover:border-primary/30" },
          { icon: Target, label: isAr ? "متوسط تكلفة التعيين" : "Avg Cost per Hire", value: formatSAR(avgCostPerHire), sub: isAr ? "لكل تعيين" : "per hire", colorClass: "text-warning hover:border-warning/30" },
          { icon: Clock, label: isAr ? "متوسط وقت التوظيف" : "Avg Time to Fill", value: `${overallTimeToFill}`, sub: isAr ? "يوم" : "days", colorClass: "text-info hover:border-info/30" },
          { icon: Briefcase, label: isAr ? "معدل قبول العروض" : "Offer Accept Rate", value: `${offerAcceptRate}%`, sub: "", colorClass: "text-success hover:border-success/30" },
        ].map((kpi, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="glass-card-premium relative overflow-hidden p-5 border border-border/30 bg-card/50 backdrop-blur-md rounded-2xl shadow-sm transition-all duration-300">
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon className={cn("w-5 h-5 shrink-0", kpi.colorClass.split(" ")[0])} />
              <span className="text-xs text-muted-foreground font-medium">{kpi.label}</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <p className="text-2xl font-black text-foreground tracking-tight">{kpi.value}</p>
              {kpi.sub && <span className="text-xs text-muted-foreground font-medium">{kpi.sub}</span>}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Cost per Hire by Department */}
        <div className="glass-card-premium p-5 border border-border/30 bg-card/40 backdrop-blur-md rounded-2xl shadow-sm">
          <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-foreground">
            <DollarSign className="w-4 h-4 text-primary" />
            {isAr ? "تكلفة التعيين حسب القسم" : "Cost per Hire by Department"}
          </h3>
          {costPerHire.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={costPerHire} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,92%)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(222,10%,50%)" }} />
                <YAxis dataKey="department" type="category" tick={{ fontSize: 11, fill: "hsl(222,10%,50%)" }} width={80} />
                <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: "hsl(var(--foreground))" }} labelStyle={{ color: "hsl(var(--foreground))", fontWeight: "bold" }} formatter={(v: number) => [formatSAR(v) + " SAR", isAr ? "التكلفة" : "Cost"]} />
                <Bar dataKey="costPerHire" name={isAr ? "تكلفة التعيين" : "Cost/Hire"} radius={[0, 6, 6, 0]}>
                  {costPerHire.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
              {isAr ? "لا توجد بيانات توظيف كافية" : "No hiring data available"}
            </div>
          )}
        </div>

        {/* Time to Fill per Job */}
        <div className="glass-card-premium p-5 border border-border/30 bg-card/40 backdrop-blur-md rounded-2xl shadow-sm">
          <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-foreground">
            <Clock className="w-4 h-4 text-primary" />
            {isAr ? "وقت التوظيف لكل وظيفة" : "Time to Fill per Job"}
          </h3>
          {timeToFill.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={timeToFill} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,92%)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(222,10%,50%)" }} unit={isAr ? " يوم" : " d"} />
                <YAxis dataKey="title" type="category" tick={{ fontSize: 10, fill: "hsl(222,10%,50%)" }} width={100} />
                <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: "hsl(var(--foreground))" }} labelStyle={{ color: "hsl(var(--foreground))", fontWeight: "bold" }} formatter={(v: number) => [`${v} ${isAr ? "يوم" : "days"}`, isAr ? "المدة" : "Duration"]} />
                <Bar dataKey="avgDays" name={isAr ? "متوسط الأيام" : "Avg Days"} radius={[0, 6, 6, 0]}>
                  {timeToFill.map((entry, i) => (
                    <Cell key={i} fill={(entry.avgDays ?? 0) > 30 ? "hsl(0,65%,50%)" : (entry.avgDays ?? 0) > 14 ? "hsl(36,90%,48%)" : "hsl(152,56%,40%)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
              {isAr ? "لا توجد وظائف مكتملة بعد" : "No completed hires yet"}
            </div>
          )}
        </div>
      </div>

      {/* Monthly Cost Trend */}
      <div className="glass-card-premium p-5 border border-border/30 bg-card/40 backdrop-blur-md rounded-2xl shadow-sm">
        <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-foreground">
          <TrendingUp className="w-4 h-4 text-primary" />
          {isAr ? "اتجاه تكلفة التوظيف الشهرية" : "Monthly Hiring Cost Trend"}
        </h3>
        {monthlyCostTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={monthlyCostTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,92%)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(222,10%,50%)" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(222,10%,50%)" }} />
              <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: "hsl(var(--foreground))" }} labelStyle={{ color: "hsl(var(--foreground))", fontWeight: "bold" }} />
              <Line type="monotone" dataKey="cost" name={isAr ? "التكلفة الإجمالية" : "Total Cost"} stroke="hsl(222,65%,46%)" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="costPerHire" name={isAr ? "تكلفة التعيين" : "Cost/Hire"} stroke="hsl(36,90%,48%)" strokeWidth={2} dot={{ r: 4 }} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
            {isAr ? "لا توجد بيانات كافية" : "Not enough data"}
          </div>
        )}
      </div>

      {/* Stage Bottleneck Analysis */}
      <div className="glass-card-premium p-5 border border-border/30 bg-card/40 backdrop-blur-md rounded-2xl shadow-sm">
        <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-foreground">
          <TrendingDown className="w-4 h-4 text-destructive" />
          {isAr ? "تحليل الاختناقات (وقت المرحلة)" : "Bottleneck Analysis (Stage Time)"}
        </h3>
        <div className="space-y-3">
          {stageTime.map((s, i) => (
            <motion.div key={s.stage} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3">
              <span className="text-sm text-foreground min-w-[120px] font-medium">{s.stage}</span>
              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((s.avgDays / (stageTime[0]?.avgDays || 1)) * 100, 100)}%` }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  className={cn("h-full rounded-full", s.avgDays > 14 ? "bg-destructive" : s.avgDays > 7 ? "bg-warning" : "bg-success")}
                />
              </div>
              <span className="text-sm font-bold text-foreground min-w-[60px] text-left">{s.avgDays} {isAr ? "يوم" : "d"}</span>
              <span className="text-xs text-muted-foreground">({s.count})</span>
            </motion.div>
          ))}
          {stageTime.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">{isAr ? "لا توجد بيانات" : "No data"}</p>
          )}
        </div>
      </div>
    </div>
  );
}
