import { Award, UserCheck } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { type InterviewerPerfItem, REPORT_TOOLTIP_STYLE } from "./reportTypes";

interface InterviewersPerfTabProps {
  interviewerPerformance: InterviewerPerfItem[];
  locale: string;
  t: (key: string) => string;
}

export function InterviewersPerfTab({
  interviewerPerformance,
  locale,
  t,
}: InterviewersPerfTabProps) {
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="glass-card-premium p-5 border border-border/30 bg-card/40 backdrop-blur-md rounded-2xl shadow-sm">
        <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-foreground">
          <UserCheck className="w-4 h-4 text-primary" />
          {locale === "en" ? "Interviewer Stats" : "إحصائيات المحاورين"}
        </h3>
        {interviewerPerformance.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={interviewerPerformance} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,92%)" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(222,10%,50%)" }} />
              <YAxis
                dataKey="name"
                type="category"
                tick={{ fontSize: 10, fill: "hsl(222,10%,50%)" }}
                width={80}
              />
              <Tooltip
                contentStyle={REPORT_TOOLTIP_STYLE}
                itemStyle={{ color: "hsl(var(--foreground))" }}
                labelStyle={{ color: "hsl(var(--foreground))", fontWeight: "bold" }}
              />
              <Bar
                dataKey="completed"
                name={locale === "en" ? "Completed" : "مكتملة"}
                fill="hsl(152,56%,40%)"
                radius={[0, 6, 6, 0]}
              />
              <Bar
                dataKey="total"
                name={locale === "en" ? "Total" : "الإجمالي"}
                fill="hsl(222,65%,46%)"
                radius={[0, 6, 6, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
            {t("reports.noDataSufficient")}
          </div>
        )}
      </div>

      <div className="glass-card-premium border border-border/30 bg-card/40 backdrop-blur-md rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border/30">
          <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
            <Award className="w-4 h-4 text-primary" />
            {locale === "en" ? "Performance Details" : "تفاصيل الأداء"}
          </h3>
        </div>
        <div className="divide-y divide-border/30">
          {interviewerPerformance.map((ip, i) => (
            <div
              key={i}
              className="px-4 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{ip.name}</p>
                <p className="text-xs text-muted-foreground">
                  {ip.completed}/{ip.total} {locale === "en" ? "completed" : "مكتملة"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">
                    {locale === "en" ? "Completion" : "إتمام"}
                  </p>
                  <Badge
                    variant={ip.completionRate >= 80 ? "default" : "secondary"}
                    className={
                      ip.completionRate >= 80
                        ? "bg-success/10 text-success border-success/20 animate-pulse-ring"
                        : ""
                    }
                  >
                    {ip.completionRate}%
                  </Badge>
                </div>
                {ip.avgRating > 0 && (
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">
                      {locale === "en" ? "Avg Rating" : "التقييم"}
                    </p>
                    <Badge
                      variant="outline"
                      className="bg-warning/10 text-warning border-warning/20"
                    >
                      ★ {ip.avgRating}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          ))}
          {interviewerPerformance.length === 0 && (
            <div className="text-center py-10 text-muted-foreground text-sm">
              {t("reports.noDataSufficient")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
