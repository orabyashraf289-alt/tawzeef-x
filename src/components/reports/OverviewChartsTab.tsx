import { Brain, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  type AiScoreRangeItem,
  type MonthlyTrendItem,
  REPORT_TOOLTIP_STYLE,
} from "./reportTypes";

interface OverviewChartsTabProps {
  monthlyData: MonthlyTrendItem[];
  aiScoreData: AiScoreRangeItem[];
  t: (key: string) => string;
}

export function OverviewChartsTab({ monthlyData, aiScoreData, t }: OverviewChartsTabProps) {
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="glass-card-premium p-5 border border-border/30 bg-card/40 backdrop-blur-md rounded-2xl shadow-sm">
        <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-foreground">
          <TrendingUp className="w-4 h-4 text-primary" />
          {t("reports.monthlyTrends")}
        </h3>
        {monthlyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="appliedG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(222,65%,46%)" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="hsl(222,65%,46%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,92%)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(222,10%,50%)" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(222,10%,50%)" }} />
              <Tooltip
                contentStyle={REPORT_TOOLTIP_STYLE}
                itemStyle={{ color: "hsl(var(--foreground))" }}
                labelStyle={{ color: "hsl(var(--foreground))", fontWeight: "bold" }}
              />
              <Area
                type="monotone"
                dataKey="applied"
                name={t("reports.applied")}
                fill="url(#appliedG)"
                stroke="hsl(222,65%,46%)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="interviews"
                name={t("reports.interviews")}
                fill="hsl(174,62%,40%)"
                fillOpacity={0.1}
                stroke="hsl(174,62%,40%)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="hired"
                name={t("reports.hired")}
                fill="hsl(152,56%,40%)"
                fillOpacity={0.1}
                stroke="hsl(152,56%,40%)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">
            {t("reports.noDataSufficient")}
          </div>
        )}
      </div>

      <div className="glass-card-premium p-5 border border-border/30 bg-card/40 backdrop-blur-md rounded-2xl shadow-sm">
        <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-foreground">
          <Brain className="w-4 h-4 text-primary" />
          {t("reports.aiScoreDistribution")}
        </h3>
        {aiScoreData.some((d) => d.count > 0) ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={aiScoreData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,92%)" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(222,10%,50%)" }} />
              <YAxis
                dataKey="label"
                type="category"
                tick={{ fontSize: 11, fill: "hsl(222,10%,50%)" }}
                width={60}
              />
              <Tooltip
                contentStyle={REPORT_TOOLTIP_STYLE}
                itemStyle={{ color: "hsl(var(--foreground))" }}
                labelStyle={{ color: "hsl(var(--foreground))", fontWeight: "bold" }}
              />
              <Bar
                dataKey="count"
                name={t("reports.candidateCount")}
                fill="hsl(222,65%,46%)"
                radius={[0, 6, 6, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">
            {t("reports.noAiEvaluation")}
          </div>
        )}
      </div>
    </div>
  );
}
