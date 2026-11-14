import { Briefcase, DollarSign } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { type CostStatItem, REPORT_TOOLTIP_STYLE } from "./reportTypes";

interface CostsAnalysisTabProps {
  costData: CostStatItem[];
  locale: string;
  dir: string;
  t: (key: string) => string;
}

export function CostsAnalysisTab({ costData, locale, dir, t }: CostsAnalysisTabProps) {
  const currencyLabel = locale === "en" ? "SAR" : "ر.س";
  const hiredCosts = costData.filter((d) => d.hires > 0);

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="glass-card-premium p-5 border border-border/30 bg-card/40 backdrop-blur-md rounded-2xl shadow-sm">
        <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-foreground">
          <DollarSign className="w-4 h-4 text-primary" />
          {t("reports.costPerDepartment")}
        </h3>
        {costData.some((d) => d.cost > 0) ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={costData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,92%)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(222,10%,50%)" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(222,10%,50%)" }} />
              <Tooltip
                contentStyle={REPORT_TOOLTIP_STYLE}
                itemStyle={{ color: "hsl(var(--foreground))" }}
                labelStyle={{ color: "hsl(var(--foreground))", fontWeight: "bold" }}
                formatter={(value: number | string) => [
                  `${Number(value).toLocaleString()} ${currencyLabel}`,
                  "",
                ]}
              />
              <Bar
                dataKey="cost"
                name={t("reports.totalCost")}
                fill="hsl(36, 90%, 48%)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">
            {t("reports.noCostData")}
          </div>
        )}
      </div>

      <div className="glass-card-premium p-5 border border-border/30 bg-card/40 backdrop-blur-md rounded-2xl shadow-sm">
        <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-foreground">
          <Briefcase className="w-4 h-4 text-primary" />
          {t("reports.totalCost")}
        </h3>
        <div className="space-y-3">
          {hiredCosts.map((d, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30"
            >
              <div>
                <p className="text-sm font-semibold text-foreground">{d.name}</p>
                <p className="text-xs text-muted-foreground">
                  {d.hires} {t("reports.hires")}
                </p>
              </div>
              <div className={dir === "rtl" ? "text-left" : "text-right"}>
                <p className="text-sm font-bold text-foreground">
                  {d.cost.toLocaleString()} {currencyLabel}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {d.costPerHire.toLocaleString()} {currencyLabel}/
                  {locale === "en" ? "hire" : "توظيف"}
                </p>
              </div>
            </div>
          ))}
          {hiredCosts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {t("reports.noCostData")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
