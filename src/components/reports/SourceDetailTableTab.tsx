import { Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SOURCE_COLORS, type SourceQualityDetailItem } from "./reportTypes";

interface SourceDetailTableTabProps {
  sourceQualityDetailed: SourceQualityDetailItem[];
  locale: string;
  dir: string;
  t: (key: string) => string;
}

export function SourceDetailTableTab({
  sourceQualityDetailed,
  locale,
  dir,
  t,
}: SourceDetailTableTabProps) {
  return (
    <div className="glass-card-premium border border-border/30 bg-card/40 backdrop-blur-md rounded-2xl shadow-sm overflow-hidden">
      <div className="p-5 border-b border-border/30">
        <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
          <Zap className="w-4 h-4 text-primary" />
          {locale === "en" ? "Recruitment Source Analysis" : "تحليل مصادر التوظيف"}
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          {locale === "en"
            ? "Compare candidate sources by volume, quality, and hiring speed"
            : "قارن مصادر المرشحين من حيث الحجم والجودة وسرعة التوظيف"}
        </p>
      </div>
      {sourceQualityDetailed.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30 bg-muted/30">
                <th
                  className={`${
                    dir === "rtl" ? "text-right" : "text-left"
                  } py-3 px-5 text-muted-foreground font-medium text-xs`}
                >
                  {locale === "en" ? "Source" : "المصدر"}
                </th>
                <th className="text-center py-3 px-4 text-muted-foreground font-medium text-xs">
                  {locale === "en" ? "Total" : "الإجمالي"}
                </th>
                <th className="text-center py-3 px-4 text-muted-foreground font-medium text-xs">
                  {locale === "en" ? "Hired" : "تم توظيفهم"}
                </th>
                <th className="text-center py-3 px-4 text-muted-foreground font-medium text-xs">
                  {locale === "en" ? "Conversion" : "معدل التحويل"}
                </th>
                <th className="text-center py-3 px-4 text-muted-foreground font-medium text-xs">
                  {locale === "en" ? "Avg AI Score" : "متوسط AI"}
                </th>
                <th className="text-center py-3 px-4 text-muted-foreground font-medium text-xs">
                  {locale === "en" ? "Avg Days to Hire" : "متوسط أيام التوظيف"}
                </th>
              </tr>
            </thead>
            <tbody>
              {sourceQualityDetailed.map((s, i) => (
                <tr
                  key={i}
                  className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors list-hover-highlight"
                >
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: SOURCE_COLORS[s.name] || "hsl(220,14%,65%)" }}
                      />
                      <span className="font-medium text-foreground">{s.name}</span>
                    </div>
                  </td>
                  <td className="text-center py-3.5 px-4 text-foreground font-bold">{s.total}</td>
                  <td className="text-center py-3.5 px-4">
                    <Badge
                      variant="outline"
                      className="bg-success/10 text-success border-success/20 text-xs"
                    >
                      {s.hired}
                    </Badge>
                  </td>
                  <td className="text-center py-3.5 px-4">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${s.conversionRate}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold">{s.conversionRate}%</span>
                    </div>
                  </td>
                  <td className="text-center py-3.5 px-4">
                    {s.avgAiScore > 0 ? (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          s.avgAiScore >= 70
                            ? "bg-success/10 text-success"
                            : s.avgAiScore >= 40
                              ? "bg-warning/10 text-warning"
                              : "bg-destructive/10 text-destructive",
                        )}
                      >
                        {s.avgAiScore}%
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="text-center py-3.5 px-4">
                    {s.avgDaysToHire != null ? (
                      <span className="text-xs font-bold">
                        {s.avgDaysToHire} {t("reports.day")}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
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
