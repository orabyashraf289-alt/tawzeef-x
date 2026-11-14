import { motion } from "framer-motion";
import { Activity, BarChart3 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { REPORT_TOOLTIP_STYLE, type WeeklyActivityItem } from "./reportTypes";

interface WeeklyActivityTabProps {
  weeklyActivityData: WeeklyActivityItem[];
  locale: string;
}

export function WeeklyActivityTab({ weeklyActivityData, locale }: WeeklyActivityTabProps) {
  const peakApps = [...weeklyActivityData].sort((a, b) => b.applications - a.applications)[0];
  const peakInterviews = [...weeklyActivityData].sort((a, b) => b.interviews - a.interviews)[0];
  const peakHires = [...weeklyActivityData].sort((a, b) => b.hires - a.hires)[0];
  const maxTotal = Math.max(
    ...weeklyActivityData.map((x) => x.applications + x.interviews + x.hires),
    1,
  );

  const peakItems = [
    {
      label: locale === "en" ? "Most Applications" : "أكثر الطلبات",
      day: peakApps?.day,
      count: peakApps?.applications,
      color: "bg-primary/10 text-primary",
    },
    {
      label: locale === "en" ? "Most Interviews" : "أكثر المقابلات",
      day: peakInterviews?.day,
      count: peakInterviews?.interviews,
      color: "bg-accent/50 text-accent-foreground",
    },
    {
      label: locale === "en" ? "Most Hires" : "أكثر التوظيف",
      day: peakHires?.day,
      count: peakHires?.hires,
      color: "bg-success/10 text-success",
    },
  ];

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="glass-card-premium p-5 border border-border/30 bg-card/40 backdrop-blur-md rounded-2xl shadow-sm">
        <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-foreground">
          <Activity className="w-4 h-4 text-primary" />
          {locale === "en" ? "Activity by Day of Week" : "النشاط حسب يوم الأسبوع"}
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={weeklyActivityData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,92%)" />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(222,10%,50%)" }} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(222,10%,50%)" }} />
            <Tooltip
              contentStyle={REPORT_TOOLTIP_STYLE}
              itemStyle={{ color: "hsl(var(--foreground))" }}
              labelStyle={{ color: "hsl(var(--foreground))", fontWeight: "bold" }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar
              dataKey="applications"
              name={locale === "en" ? "Applications" : "طلبات"}
              fill="hsl(222,65%,46%)"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="interviews"
              name={locale === "en" ? "Interviews" : "مقابلات"}
              fill="hsl(174,62%,40%)"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="hires"
              name={locale === "en" ? "Hires" : "توظيف"}
              fill="hsl(152,56%,40%)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
          <BarChart3 className="w-4 h-4 text-primary" />
          {locale === "en" ? "Peak Days" : "أيام الذروة"}
        </h3>
        {peakItems.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card-premium p-4 border border-border/30 bg-card/40 backdrop-blur-md rounded-2xl shadow-sm flex items-center justify-between hover:translate-y-0 hover:scale-[1.005]"
          >
            <div>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-lg font-bold text-foreground mt-1">{item.day || "—"}</p>
            </div>
            <Badge className={cn("text-lg px-3 py-1", item.color)}>{item.count || 0}</Badge>
          </motion.div>
        ))}

        <div className="bg-muted/30 rounded-xl p-4 border border-border/30">
          <p className="text-xs font-semibold text-muted-foreground mb-2">
            {locale === "en" ? "Weekly Distribution" : "التوزيع الأسبوعي"}
          </p>
          <div className="grid grid-cols-7 gap-1">
            {weeklyActivityData.map((d, i) => {
              const total = d.applications + d.interviews + d.hires;
              const intensity = Math.round((total / maxTotal) * 100);
              return (
                <div key={i} className="text-center">
                  <div
                    className="h-8 rounded-md mb-1 bg-primary transition-all"
                    style={{ opacity: Math.max(intensity / 100, 0.1) }}
                  />
                  <span className="text-[9px] text-muted-foreground">{d.day}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
