type ReportType = "pipeline" | "offers" | "sources" | "monthly";

type Props = {
  reportType: string;
  stats: Record<string, any>;
};

export function isStructuredAnalyticsReport(reportType: string): reportType is ReportType {
  return ["pipeline", "offers", "sources", "monthly"].includes(reportType);
}

export default function AnalyticsReportContent({ reportType, stats }: Props) {
  if (reportType === "pipeline") {
    const stages = Object.entries(stats.pipeline || {});
    return <>
      <h3>مسار التوظيف</h3>
      <p>إجمالي المرشحين: {stats.total_candidates}.</p>
      <table><thead><tr><th>المرحلة</th><th>العدد</th></tr></thead><tbody>
        {stages.length ? stages.map(([stage, count]) => <tr key={stage}><td>{stage}</td><td>{String(count)}</td></tr>)
          : <tr><td>لا توجد مراحل مسجلة</td><td>0</td></tr>}
      </tbody></table>
    </>;
  }

  if (reportType === "offers") {
    const rows = [
      ["إجمالي العروض", stats.total_offers], ["المقبولة", stats.accepted],
      ["المرفوضة", stats.rejected], ["المعلقة أو المسودة", stats.pending],
      ["معدل قبول العروض المحسومة", `${stats.acceptance_rate}%`],
      ...(stats.total_offers ? [["متوسط الراتب المسجل", stats.avg_salary]] : []),
    ];
    return <>
      <h3>العروض الوظيفية</h3>
      <table><thead><tr><th>المؤشر</th><th>القيمة</th></tr></thead><tbody>
        {rows.map(([label, value]) => <tr key={String(label)}><td>{label}</td><td>{value}</td></tr>)}
      </tbody></table>
      <p>معدل القبول محسوب من العروض المقبولة والمرفوضة فقط.</p>
    </>;
  }

  if (reportType === "sources") {
    const sources = Object.entries(stats.sources || {});
    return <>
      <h3>مصادر المرشحين</h3>
      <p>إجمالي المرشحين: {stats.total}.</p>
      <table><thead><tr><th>المصدر</th><th>العدد</th></tr></thead><tbody>
        {sources.length ? sources.map(([source, count]) => <tr key={source}><td>{source}</td><td>{String(count)}</td></tr>)
          : <tr><td>لا توجد مصادر مسجلة</td><td>0</td></tr>}
      </tbody></table>
    </>;
  }

  const months = Object.entries(stats.monthly || {}).sort(([a], [b]) => a.localeCompare(b));
  return <>
    <h3>الاتجاه الشهري</h3>
    <table><thead><tr><th>الشهر</th><th>المرشحون الجدد</th><th>المقابلات</th><th>العروض</th></tr></thead><tbody>
      {months.length ? months.map(([month, value]) => {
        const counts = value as { candidates: number; interviews: number; offers: number };
        return <tr key={month}><td dir="ltr">{month}</td><td>{counts.candidates}</td><td>{counts.interviews}</td><td>{counts.offers}</td></tr>;
      }) : <tr><td>لا توجد بيانات شهرية</td><td>0</td><td>0</td><td>0</td></tr>}
    </tbody></table>
    <p>تعكس الأعداد شهر إنشاء السجل في النظام.</p>
  </>;
}
