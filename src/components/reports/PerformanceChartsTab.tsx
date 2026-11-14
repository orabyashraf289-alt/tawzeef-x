import { CheckCircle2, Timer } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { type OfferStatsSummary, REPORT_TOOLTIP_STYLE, type StageTimeItem } from "./reportTypes";

interface PerformanceChartsTabProps {
  offerStats: OfferStatsSummary;
  stageTimeData: StageTimeItem[];
  t: (key: string) => string;
}

export function PerformanceChartsTab({ offerStats, stageTimeData, t }: PerformanceChartsTabProps) {
  const pieEntries = [
    { name: t("reports.acceptedOffers"), value: offerStats.accepted, color: "hsl(152, 56%, 40%)" },
    { name: t("reports.rejectedOffers"), value: offerStats.rejected, color: "hsl(0, 72%, 51%)" },
    { name: t("reports.pendingOffers"), value: offerStats.pending, color: "hsl(36, 90%, 48%)" },
  ].filter((d) => d.value > 0);

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="glass-card-premium p-5 border border-border/30 bg-card/40 backdrop-blur-md rounded-2xl shadow-sm">
        <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-foreground">
          <CheckCircle2 className="w-4 h-4 text-primary" />
          {t("reports.offerAnalytics")}
        </h3>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label: t("reports.totalOffers"), value: offerStats.total, color: "text-foreground" },
            { label: t("reports.acceptedOffers"), value: offerStats.accepted, color: "text-success" },
            { label: t("reports.rejectedOffers"), value: offerStats.rejected, color: "text-destructive" },
            { label: t("reports.pendingOffers"), value: offerStats.pending, color: "text-warning" },
          ].map((s, i) => (
            <div key={i} className="bg-muted/30 rounded-lg p-3 text-center border border-border/30">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
        {offerStats.total > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieEntries}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={75}
                dataKey="value"
                strokeWidth={0}
              >
                {pieEntries.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={REPORT_TOOLTIP_STYLE}
                itemStyle={{ color: "hsl(var(--foreground))" }}
                labelStyle={{ color: "hsl(var(--foreground))", fontWeight: "bold" }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
            {t("reports.noDataSufficient")}
          </div>
        )}
      </div>

      <div className="glass-card-premium p-5 border border-border/30 bg-card/40 backdrop-blur-md rounded-2xl shadow-sm">
        <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-foreground">
          <Timer className="w-4 h-4 text-primary" />
          {t("reports.avgTimePerStage")}
        </h3>
        {stageTimeData.some((s) => s.count > 0) ? (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stageTimeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,92%)" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "hsl(222,10%,50%)" }}
                  unit={` ${t("reports.day")}`}
                />
                <YAxis
                  dataKey="displayStage"
                  type="category"
                  tick={{ fontSize: 10, fill: "hsl(222,10%,50%)" }}
                  width={90}
                />
                <Tooltip
                  contentStyle={REPORT_TOOLTIP_STYLE}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                  labelStyle={{ color: "hsl(var(--foreground))", fontWeight: "bold" }}
                  formatter={(value: number) => [`${value} ${t("reports.day")}`, ""]}
                />
                <Bar
                  dataKey="avgDays"
                  name={t("reports.avgDays")}
                  fill="hsl(222,65%,46%)"
                  radius={[0, 6, 6, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-3">
              {stageTimeData
                .filter((s) => s.count > 0)
                .map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-xs px-1">
                    <span className="text-muted-foreground">{s.displayStage}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        ({s.count} {t("reports.candidateCount")})
                      </span>
                      <span className="font-bold text-foreground">
                        {s.avgDays} {t("reports.day")}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </>
        ) : (
          <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">
            {t("reports.noDataSufficient")}
          </div>
        )}
      </div>
    </div>
  );
}
