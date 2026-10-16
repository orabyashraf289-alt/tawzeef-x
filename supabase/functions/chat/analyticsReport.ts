export const analyticsReportTypes = ["pipeline", "offers", "sources", "monthly"] as const;
export type AnalyticsReportType = typeof analyticsReportTypes[number];

export function isAnalyticsReportType(value: unknown): value is AnalyticsReportType {
  return typeof value === "string" && analyticsReportTypes.some(type => type === value);
}

function tableLabel(value: string): string {
  return value.replace(/\r?\n/g, " ").replace(/\|/g, "\\|");
}

export function formatAnalyticsReport(type: AnalyticsReportType, stats: Record<string, any>): string {
  if (type === "pipeline") {
    const rows = Object.entries(stats.pipeline || {}).map(([stage, count]) => `| ${tableLabel(stage)} | ${count} |`);
    return `### مسار التوظيف\n\nإجمالي المرشحين: ${stats.total_candidates}.\n\n| المرحلة | العدد |\n| --- | ---: |\n${rows.length ? rows.join("\n") : "| لا توجد مراحل مسجلة | 0 |"}`;
  }
  if (type === "offers") {
    return `### العروض الوظيفية\n\n| المؤشر | القيمة |\n| --- | ---: |\n| إجمالي العروض | ${stats.total_offers} |\n| المقبولة | ${stats.accepted} |\n| المرفوضة | ${stats.rejected} |\n| المعلقة أو المسودة | ${stats.pending} |\n| معدل قبول العروض المحسومة | ${stats.acceptance_rate}% |${stats.total_offers ? `\n| متوسط الراتب المسجل | ${stats.avg_salary} |` : ""}\n\nمعدل القبول محسوب من العروض المقبولة والمرفوضة فقط.`;
  }
  if (type === "sources") {
    const rows = Object.entries(stats.sources || {}).map(([source, count]) => `| ${tableLabel(source)} | ${count} |`);
    return `### مصادر المرشحين\n\nإجمالي المرشحين: ${stats.total}.\n\n| المصدر | العدد |\n| --- | ---: |\n${rows.length ? rows.join("\n") : "| لا توجد مصادر مسجلة | 0 |"}`;
  }
  const rows = Object.entries(stats.monthly || {}).sort(([a], [b]) => a.localeCompare(b))
    .map(([month, counts]) => {
      const values = counts as { candidates: number; interviews: number; offers: number };
      return `| ${month} | ${values.candidates} | ${values.interviews} | ${values.offers} |`;
    });
  return `### الاتجاه الشهري\n\n| الشهر | المرشحون الجدد | المقابلات | العروض |\n| --- | ---: | ---: | ---: |\n${rows.length ? rows.join("\n") : "| لا توجد بيانات شهرية | 0 | 0 | 0 |"}\n\nتعكس الأعداد شهر إنشاء السجل في النظام.`;
}
