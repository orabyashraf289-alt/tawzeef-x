import { motion } from "framer-motion";
import { Brain, Target } from "lucide-react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { cn } from "@/lib/utils";
import { type QualityRadarItem, REPORT_TOOLTIP_STYLE } from "./reportTypes";

interface QualityRadarTabProps {
  qualityRadarData: QualityRadarItem[];
  locale: string;
}

const BAR_COLORS = ["bg-primary", "bg-success", "bg-warning", "bg-info", "bg-accent"];
const BADGE_COLORS = [
  "bg-primary/10",
  "bg-success/10",
  "bg-warning/10",
  "bg-info/10",
  "bg-accent/20",
];

export function QualityRadarTab({ qualityRadarData, locale }: QualityRadarTabProps) {
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="glass-card-premium p-5 border border-border/30 bg-card/40 backdrop-blur-md rounded-2xl shadow-sm">
        <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-foreground">
          <Brain className="w-4 h-4 text-primary" />
          {locale === "en" ? "Recruitment Quality Radar" : "رادار جودة التوظيف"}
        </h3>
        <ResponsiveContainer width="100%" height={320}>
          <RadarChart data={qualityRadarData}>
            <PolarGrid stroke="hsl(var(--border) / 0.7)" />
            <PolarAngleAxis
              dataKey="metric"
              tick={{ fontSize: 10, fill: "hsl(222,10%,50%)" }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fontSize: 9, fill: "hsl(222,10%,60%)" }}
            />
            <Radar
              name={locale === "en" ? "Score" : "النتيجة"}
              dataKey="value"
              stroke="hsl(222,65%,46%)"
              fill="hsl(222,65%,46%)"
              fillOpacity={0.2}
              strokeWidth={2}
            />
            <Tooltip
              contentStyle={REPORT_TOOLTIP_STYLE}
              itemStyle={{ color: "hsl(var(--foreground))" }}
              labelStyle={{ color: "hsl(var(--foreground))", fontWeight: "bold" }}
              formatter={(value: number | string) => [`${value}%`, ""]}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
          <Target className="w-4 h-4 text-primary" />
          {locale === "en" ? "Quality Breakdown" : "تفاصيل الجودة"}
        </h3>
        {qualityRadarData.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass-card-premium p-4 border border-border/30 bg-card/40 backdrop-blur-md rounded-2xl shadow-sm hover:translate-y-0 hover:scale-[1.005]"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">{item.metric}</span>
              <span
                className={cn(
                  "text-sm font-bold px-2 py-0.5 rounded-md",
                  BADGE_COLORS[i % BADGE_COLORS.length],
                )}
              >
                {item.value}%
              </span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${item.value}%` }}
                transition={{ duration: 0.8, delay: i * 0.1 }}
                className={cn("h-full rounded-full", BAR_COLORS[i % BAR_COLORS.length])}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
