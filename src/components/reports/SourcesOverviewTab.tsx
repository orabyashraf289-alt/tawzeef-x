import { Award, BarChart3 } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import {
  REPORT_TOOLTIP_STYLE,
  type SourceDistributionItem,
  type SourcePerformanceItem,
} from "./reportTypes";

interface SourcesOverviewTabProps {
  sourceData: SourceDistributionItem[];
  sourcePerformance: SourcePerformanceItem[];
  dir: string;
  t: (key: string) => string;
}

export function SourcesOverviewTab({
  sourceData,
  sourcePerformance,
  dir,
  t,
}: SourcesOverviewTabProps) {
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="glass-card-premium p-5 border border-border/30 bg-card/40 backdrop-blur-md rounded-2xl shadow-sm">
        <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-foreground">
          <BarChart3 className="w-4 h-4 text-primary" />
          {t("reports.sourceDistribution")}
        </h3>
        {sourceData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={sourceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {sourceData.map((entry, i) => (
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
            <div className="grid grid-cols-2 gap-2 mt-3">
              {sourceData.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-sm p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: s.color }}
                  />
                  <span className="text-muted-foreground text-xs">{s.name}</span>
                  <span
                    className={`font-bold text-xs ${dir === "rtl" ? "mr-auto" : "ml-auto"}`}
                  >
                    {s.count} ({s.value}%)
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
            {t("common.noData")}
          </div>
        )}
      </div>

      <div className="glass-card-premium p-5 border border-border/30 bg-card/40 backdrop-blur-md rounded-2xl shadow-sm">
        <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-foreground">
          <Award className="w-4 h-4 text-primary" />
          {t("reports.sourcePerformance")}
        </h3>
        <div className="space-y-3">
          {sourcePerformance.map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs w-20 text-muted-foreground shrink-0">{item.name}</span>
              <div className="flex-1 h-6 bg-muted/50 rounded-md overflow-hidden relative">
                <div
                  className="h-full rounded-md bg-green-500/70"
                  style={{ width: `${item.rate}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-foreground">
                  {item.rate}% ({item.hired}/{item.total})
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
