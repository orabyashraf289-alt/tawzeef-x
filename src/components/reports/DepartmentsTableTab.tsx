import { motion } from "framer-motion";
import { Users } from "lucide-react";
import type { DepartmentStatItem } from "./reportTypes";

interface DepartmentsTableTabProps {
  departmentData: DepartmentStatItem[];
  dir: string;
  t: (key: string) => string;
}

export function DepartmentsTableTab({ departmentData, dir, t }: DepartmentsTableTabProps) {
  const alignClass = dir === "rtl" ? "text-right" : "text-left";

  return (
    <div className="glass-card-premium border border-border/30 bg-card/40 backdrop-blur-md rounded-2xl shadow-sm overflow-hidden">
      <div className="p-5 border-b border-border/30">
        <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
          <Users className="w-4 h-4 text-primary" />
          {t("reports.departmentStats")}
        </h3>
      </div>
      {departmentData.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30 bg-muted/30">
                <th className={`${alignClass} py-3 px-5 text-muted-foreground font-medium text-xs`}>
                  {t("reports.departmentName")}
                </th>
                <th className={`${alignClass} py-3 px-5 text-muted-foreground font-medium text-xs`}>
                  {t("reports.jobs")}
                </th>
                <th className={`${alignClass} py-3 px-5 text-muted-foreground font-medium text-xs`}>
                  {t("reports.candidates")}
                </th>
                <th className={`${alignClass} py-3 px-5 text-muted-foreground font-medium text-xs`}>
                  {t("reports.hiredCount")}
                </th>
                <th className={`${alignClass} py-3 px-5 text-muted-foreground font-medium text-xs`}>
                  {t("reports.conversionRate")}
                </th>
              </tr>
            </thead>
            <tbody>
              {departmentData.map((dept, i) => {
                const ratePct =
                  dept.candidates > 0 ? ((dept.hired / dept.candidates) * 100).toFixed(1) : 0;
                return (
                  <motion.tr
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.06 }}
                    className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors list-hover-highlight"
                  >
                    <td className="py-3.5 px-5 font-medium text-foreground">{dept.name}</td>
                    <td className="py-3.5 px-5 text-muted-foreground">{dept.jobs}</td>
                    <td className="py-3.5 px-5 text-muted-foreground">{dept.candidates}</td>
                    <td className="py-3.5 px-5">
                      <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-md text-xs font-semibold">
                        {dept.hired}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[80px]">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{
                              width: `${
                                dept.candidates > 0 ? (dept.hired / dept.candidates) * 100 : 0
                              }%`,
                            }}
                          />
                        </div>
                        <span className="font-semibold text-xs text-foreground">{ratePct}%</span>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground text-sm">{t("common.noData")}</div>
      )}
    </div>
  );
}
