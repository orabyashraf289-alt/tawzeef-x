import { motion } from "framer-motion";
import { Activity, BarChart3 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { type MonthlyComparisonData, REPORT_TOOLTIP_STYLE } from "./reportTypes";

interface MonthlyComparisonTabProps {
  monthlyComparison: MonthlyComparisonData;
  locale: string;
}

export function MonthlyComparisonTab({ monthlyComparison, locale }: MonthlyComparisonTabProps) {
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="glass-card-premium p-5 border border-border/30 bg-card/40 backdrop-blur-md rounded-2xl shadow-sm">
        <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-foreground">
          <BarChart3 className="w-4 h-4 text-primary" />
          {monthlyComparison.currentMonthName} vs {monthlyComparison.prevMonthName}
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={monthlyComparison.chartData} barGap={8}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,92%)" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(222,10%,50%)" }} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(222,10%,50%)" }} />
            <Tooltip
              contentStyle={REPORT_TOOLTIP_STYLE}
              itemStyle={{ color: "hsl(var(--foreground))" }}
              labelStyle={{ color: "hsl(var(--foreground))", fontWeight: "bold" }}
            />
            <Bar
              dataKey={monthlyComparison.currentMonthName}
              fill="hsl(222,65%,46%)"
              radius={[6, 6, 0, 0]}
            />
            <Bar
              dataKey={monthlyComparison.prevMonthName}
              fill="hsl(220,14%,80%)"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
          <Activity className="w-4 h-4 text-primary" />
          {locale === "en" ? "Change Rate" : "نسبة التغيير"}
        </h3>
        {monthlyComparison.metrics.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card-premium p-4 border border-border/30 bg-card/40 backdrop-blur-md rounded-2xl shadow-sm flex items-center justify-between hover:translate-y-0 hover:scale-[1.005]"
          >
            <div>
              <p className="text-sm font-bold text-foreground">{m.label}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-muted-foreground">
                  {monthlyComparison.prevMonthName}: <strong>{m.previous}</strong>
                </span>
                <span className="text-xs text-foreground">
                  {monthlyComparison.currentMonthName}: <strong>{m.current}</strong>
                </span>
              </div>
            </div>
            <Badge
              variant={m.change >= 0 ? "default" : "destructive"}
              className={`text-sm font-bold ${
                m.change >= 0 ? "bg-success/10 text-success border-success/20" : ""
              }`}
            >
              {m.change >= 0 ? "↑" : "↓"} {Math.abs(m.change)}%
            </Badge>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
