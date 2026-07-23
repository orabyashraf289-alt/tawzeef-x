import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, FunnelChart, Funnel, LabelList, Cell, LineChart, Line, PieChart, Pie } from "recharts";
import { TrendingUp, Clock, Users, ArrowRight, BarChart3, XOctagon, Pause, Hourglass } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PipelineAnalyticsProps {
  stages: { id: string; label: string; color: string }[];
  candidates: any[];
  dir: string;
}

export default function PipelineAnalytics({ stages, candidates, dir }: PipelineAnalyticsProps) {
  // Group candidates by stage
  const grouped = useMemo(() => {
    const map: Record<string, any[]> = {};
    (stages || []).forEach(s => {
      if (s.id) map[s.id] = [];
      if (s.label) map[s.label] = [];
    });
    const fallbackKey = stages[0]?.id || stages[0]?.label || "تقديم الطلب";
    if (!map[fallbackKey]) map[fallbackKey] = [];

    (candidates || []).forEach(c => {
      const stage = c.stage || fallbackKey;
      if (!map[stage]) map[stage] = [];
      map[stage].push(c);
    });
    return map;
  }, [candidates, stages]);

  // Conversion funnel data
  const funnelData = useMemo(() => {
    return stages.map((s, i) => {
      const count = (grouped[s.id] || []).length;
      const prevCount = i === 0 ? candidates.length : (grouped[stages[i - 1].id] || []).length;
      const conversionRate = prevCount > 0 ? Math.round((count / prevCount) * 100) : 0;
      const overallRate = candidates.length > 0 ? Math.round((count / candidates.length) * 100) : 0;
      return {
        name: s.label,
        value: count,
        fill: s.color,
        conversionRate,
        overallRate,
      };
    });
  }, [stages, grouped, candidates.length]);

  // Average days per stage
  const avgDaysData = useMemo(() => {
    return stages.map(s => {
      const items = grouped[s.id] || [];
      if (items.length === 0) return { name: s.label, days: 0, fill: s.color };
      const totalDays = items.reduce((sum: number, c: any) => {
        const created = new Date(c.created_at).getTime();
        const updated = new Date(c.updated_at).getTime();
        return sum + Math.max(1, Math.round((updated - created) / 86400000));
      }, 0);
      return { name: s.label, days: Math.round(totalDays / items.length), fill: s.color };
    });
  }, [stages, grouped]);

  // Stage distribution for pie
  const pieData = useMemo(() => {
    return stages.map(s => ({
      name: s.label,
      value: (grouped[s.id] || []).length,
      fill: s.color,
    })).filter(d => d.value > 0);
  }, [stages, grouped]);

  // Total stats
  const totalCandidates = candidates.length;

  const rejectionCount = useMemo(() => {
    return candidates.filter(c => c.status === "مرفوض" || c.stage === "مرفوض").length;
  }, [candidates]);

  const rejectionRate = useMemo(() => {
    if (totalCandidates === 0) return 0;
    return Math.round((rejectionCount / totalCandidates) * 100);
  }, [rejectionCount, totalCandidates]);

  const deferredCount = useMemo(() => {
    return candidates.filter(c => c.status === "مؤجل" || c.is_deferred).length;
  }, [candidates]);

  const deferredRate = useMemo(() => {
    if (totalCandidates === 0) return 0;
    return Math.round((deferredCount / totalCandidates) * 100);
  }, [deferredCount, totalCandidates]);

  const avgStageTimeDays = useMemo(() => {
    if (totalCandidates === 0) return 0;
    const now = new Date().getTime();
    const activeCandidates = candidates.filter(c => c.status !== "مرفوض" && c.status !== "مؤجل");
    if (activeCandidates.length === 0) return 0;
    const total = activeCandidates.reduce((sum: number, c: any) => {
      const entered = c.stage_entered_at ? new Date(c.stage_entered_at).getTime() : new Date(c.created_at).getTime();
      return sum + Math.max(1, Math.round((now - entered) / 86400000));
    }, 0);
    return Math.round(total / activeCandidates.length);
  }, [candidates, totalCandidates]);

  const avgOverallDays = useMemo(() => {
    if (candidates.length === 0) return 0;
    const total = candidates.reduce((sum: number, c: any) => {
      const created = new Date(c.created_at).getTime();
      const updated = new Date(c.updated_at).getTime();
      return sum + Math.max(1, Math.round((updated - created) / 86400000));
    }, 0);
    return Math.round(total / candidates.length);
  }, [candidates]);

  const overallConversion = useMemo(() => {
    if (stages.length < 2 || candidates.length === 0) return 0;
    const lastStageCount = (grouped[stages[stages.length - 1].id] || []).length;
    return Math.round((lastStageCount / candidates.length) * 100);
  }, [stages, grouped, candidates.length]);

  const chartConfig = useMemo(() => {
    const config: Record<string, { label: string; color: string }> = {};
    stages.forEach(s => {
      config[s.id] = { label: s.label, color: s.color };
    });
    return config;
  }, [stages]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalCandidates}</p>
              <p className="text-xs text-muted-foreground">إجمالي المرشحين</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{overallConversion}%</p>
              <p className="text-xs text-muted-foreground">معدل التحويل الكلي</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <XOctagon className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{rejectionRate}%</p>
              <p className="text-xs text-muted-foreground">معدل الرفض</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Pause className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{deferredRate}%</p>
              <p className="text-xs text-muted-foreground">معدل التأجيل</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10">
              <Hourglass className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{avgStageTimeDays} يوم</p>
              <p className="text-xs text-muted-foreground">متوسط البقاء بمرحلة</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stages.length}</p>
              <p className="text-xs text-muted-foreground">عدد المراحل</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Funnel */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            قمع التحويل بين المراحل
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {funnelData.map((stage, i) => {
              const widthPct = totalCandidates > 0 ? Math.max(8, (stage.value / totalCandidates) * 100) : 8;
              return (
                <div key={stage.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: stage.fill }} />
                      <span className="font-medium text-foreground">{stage.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs h-5">
                        {stage.value} مرشح
                      </Badge>
                      {i > 0 && (
                        <Badge
                          variant="outline"
                          className={cn("text-xs h-5",
                            stage.conversionRate >= 60 ? "border-green-500/30 text-green-600 bg-green-500/5" :
                            stage.conversionRate >= 30 ? "border-amber-500/30 text-amber-600 bg-amber-500/5" :
                            "border-destructive/30 text-destructive bg-destructive/5"
                          )}
                        >
                          {stage.conversionRate}% تحويل
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="w-full bg-muted/50 rounded-full h-6 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 flex items-center justify-end px-2"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: stage.fill,
                        opacity: 0.8,
                      }}
                    >
                      {widthPct > 15 && (
                        <span className="text-[10px] font-bold text-white">{stage.overallRate}%</span>
                      )}
                    </div>
                  </div>
                  {i < funnelData.length - 1 && (
                    <div className="flex justify-center py-0.5">
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground rotate-90" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart: Candidates per Stage */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              توزيع المرشحين على المراحل
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-lg">
                        <p className="font-semibold">{d.name}</p>
                        <p>{d.value} مرشح</p>
                        <p>التحويل: {d.conversionRate}%</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {funnelData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Bar Chart: Average Days per Stage */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              متوسط الأيام في كل مرحلة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <BarChart data={avgDaysData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-lg">
                        <p className="font-semibold">{d.name}</p>
                        <p>{d.days} يوم</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="days" radius={[0, 4, 4, 0]}>
                  {avgDaysData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Pie Chart */}
      {pieData.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-600" />
              النسبة المئوية لكل مرحلة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row items-center gap-6">
              <ChartContainer config={chartConfig} className="h-[250px] w-full max-w-[300px]">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={100}
                    paddingAngle={2}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      const pct = totalCandidates > 0 ? Math.round((d.value / totalCandidates) * 100) : 0;
                      return (
                        <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-lg">
                          <p className="font-semibold">{d.name}</p>
                          <p>{d.value} مرشح ({pct}%)</p>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ChartContainer>
              <div className="flex flex-wrap gap-3 justify-center">
                {pieData.map(d => {
                  const pct = totalCandidates > 0 ? Math.round((d.value / totalCandidates) * 100) : 0;
                  return (
                    <div key={d.name} className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: d.fill }} />
                      <span className="text-muted-foreground">{d.name}</span>
                      <span className="font-medium text-foreground">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conversion between consecutive stages table */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowRight className="w-4 h-4 text-primary" />
            معدل التحويل بين كل مرحلتين
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-start py-2 px-3 text-muted-foreground font-medium">من</th>
                  <th className="text-start py-2 px-3 text-muted-foreground font-medium">إلى</th>
                  <th className="text-center py-2 px-3 text-muted-foreground font-medium">عدد (من)</th>
                  <th className="text-center py-2 px-3 text-muted-foreground font-medium">عدد (إلى)</th>
                  <th className="text-center py-2 px-3 text-muted-foreground font-medium">معدل التحويل</th>
                </tr>
              </thead>
              <tbody>
                {stages.slice(0, -1).map((s, i) => {
                  const fromCount = (grouped[s.id] || []).length;
                  const toCount = (grouped[stages[i + 1].id] || []).length;
                  const rate = fromCount > 0 ? Math.round((toCount / fromCount) * 100) : 0;
                  return (
                    <tr key={s.id} className="border-b border-border/30 hover:bg-muted/30">
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
                          {s.label}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: stages[i + 1].color }} />
                          {stages[i + 1].label}
                        </div>
                      </td>
                      <td className="text-center py-2 px-3 font-medium">{fromCount}</td>
                      <td className="text-center py-2 px-3 font-medium">{toCount}</td>
                      <td className="text-center py-2 px-3">
                        <Badge
                          variant="outline"
                          className={cn("text-xs",
                            rate >= 60 ? "border-green-500/30 text-green-600 bg-green-500/5" :
                            rate >= 30 ? "border-amber-500/30 text-amber-600 bg-amber-500/5" :
                            "border-destructive/30 text-destructive bg-destructive/5"
                          )}
                        >
                          {rate}%
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
