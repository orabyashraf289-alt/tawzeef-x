import { motion } from "framer-motion";
import { CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { TimeToHireJobItem } from "./reportTypes";

interface TimeToHireTableTabProps {
  timeToHirePerJob: TimeToHireJobItem[];
  dir: string;
  t: (key: string) => string;
}

export function TimeToHireTableTab({ timeToHirePerJob, dir, t }: TimeToHireTableTabProps) {
  const alignClass = dir === "rtl" ? "text-right" : "text-left";

  return (
    <div className="glass-card-premium border border-border/30 bg-card/40 backdrop-blur-md rounded-2xl shadow-sm overflow-hidden">
      <div className="p-5 border-b border-border/30">
        <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
          <CalendarClock className="w-4 h-4 text-primary" />
          {t("reports.timeToHireByJob")}
        </h3>
      </div>
      {timeToHirePerJob.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30 bg-muted/30">
                <th className={`${alignClass} py-3 px-5 text-muted-foreground font-medium text-xs`}>
                  {t("reports.jobTitle")}
                </th>
                <th className={`${alignClass} py-3 px-5 text-muted-foreground font-medium text-xs`}>
                  {t("reports.department")}
                </th>
                <th className={`${alignClass} py-3 px-5 text-muted-foreground font-medium text-xs`}>
                  {t("reports.candidatesCount")}
                </th>
                <th className={`${alignClass} py-3 px-5 text-muted-foreground font-medium text-xs`}>
                  {t("reports.hiredCount")}
                </th>
                <th className={`${alignClass} py-3 px-5 text-muted-foreground font-medium text-xs`}>
                  {t("reports.avgDays")}
                </th>
                <th className={`${alignClass} py-3 px-5 text-muted-foreground font-medium text-xs`}>
                  {t("reports.status")}
                </th>
              </tr>
            </thead>
            <tbody>
              {timeToHirePerJob.map((j, i) => (
                <motion.tr
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors list-hover-highlight"
                >
                  <td className="py-3.5 px-5 font-medium text-foreground">{j.title}</td>
                  <td className="py-3.5 px-5 text-muted-foreground">{j.department}</td>
                  <td className="py-3.5 px-5 text-muted-foreground">{j.candidates}</td>
                  <td className="py-3.5 px-5">
                    <span className="bg-success/10 text-success px-2 py-0.5 rounded-md text-xs font-semibold">
                      {j.hired}
                    </span>
                  </td>
                  <td className="py-3.5 px-5">
                    {j.avgDays != null ? (
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${Math.min((j.avgDays / 60) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="font-bold text-xs">
                          {j.avgDays} {t("reports.day")}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                  <td className="py-3.5 px-5">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        j.status === "نشطة"
                          ? "bg-success/10 text-success border-success/20"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {j.status}
                    </Badge>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground text-sm">
          {t("reports.noDataSufficient")}
        </div>
      )}
    </div>
  );
}
