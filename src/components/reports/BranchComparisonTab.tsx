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
import { type BranchComparisonItem, REPORT_TOOLTIP_STYLE } from "./reportTypes";

interface BranchComparisonTabProps {
  branchesComparisonData: BranchComparisonItem[];
  locale: string;
  dir: string;
}

export function BranchComparisonTab({
  branchesComparisonData,
  locale,
  dir,
}: BranchComparisonTabProps) {
  const alignClass = dir === "rtl" ? "text-right" : "text-left";
  const avgDaysChartData = branchesComparisonData.map((b) => ({
    ...b,
    avgDaysToHire: b.avgDaysToHire || 0,
  }));

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="glass-card-premium p-6 border border-border/30 bg-card/50 backdrop-blur-md rounded-2xl shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-bold text-foreground">
              {locale === "en" ? "Applications & Hires by Branch" : "المرشحون والتعيينات حسب الفرع"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {locale === "en"
                ? "Comparison of applicant flow and actual hires across all branches"
                : "مقارنة كمية لتدفق المتقدمين والتعيينات الفعلية بين الفروع المختلفة"}
            </p>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={branchesComparisonData}
                margin={{ top: 20, right: 10, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.3)" />
                <XAxis
                  dataKey="name"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={REPORT_TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  dataKey="candidatesCount"
                  name={locale === "en" ? "Candidates" : "المرشحون"}
                  fill="hsl(var(--primary))"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="hiredCount"
                  name={locale === "en" ? "Hired" : "التعيينات"}
                  fill="hsl(var(--success))"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card-premium p-6 border border-border/30 bg-card/50 backdrop-blur-md rounded-2xl shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-bold text-foreground">
              {locale === "en" ? "Average Time to Hire (Days)" : "متوسط أيام التوظيف حسب الفرع"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {locale === "en"
                ? "Speed of filling vacancies across branches (lower is better)"
                : "سرعة إغلاق الشواغر التوظيفية في الفروع بالأيام (الأقل هو الأفضل)"}
            </p>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={avgDaysChartData}
                margin={{ top: 20, right: 10, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.3)" />
                <XAxis
                  dataKey="name"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={REPORT_TOOLTIP_STYLE} />
                <Bar
                  dataKey="avgDaysToHire"
                  name={locale === "en" ? "Average Days" : "متوسط الأيام"}
                  fill="hsl(var(--warning))"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="glass-card-premium p-6 border border-border/30 bg-card/50 backdrop-blur-md rounded-2xl shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-bold text-foreground">
            {locale === "en" ? "Detailed Branch Performance Metrics" : "مؤشرات أداء الفروع بالتفصيل"}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {locale === "en"
              ? "Comprehensive metrics comparing job creation, candidates, interviews and success rates"
              : "إحصائيات متكاملة تقارن بين حجم الإعلانات، المرشحين، المقابلات ونسب النجاح لكل فرع"}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className={`w-full ${alignClass} border-collapse text-xs`}>
            <thead>
              <tr className="bg-muted/40 text-muted-foreground border-b border-border/50">
                <th className={`p-3 font-semibold ${alignClass}`}>
                  {locale === "en" ? "Branch Name" : "اسم الفرع / الشركة"}
                </th>
                <th className="p-3 font-semibold text-center">
                  {locale === "en" ? "Job Posts" : "إعلانات الوظائف"}
                </th>
                <th className="p-3 font-semibold text-center">
                  {locale === "en" ? "Total Candidates" : "إجمالي المرشحين"}
                </th>
                <th className="p-3 font-semibold text-center">
                  {locale === "en" ? "Interviews" : "المقابلات"}
                </th>
                <th className="p-3 font-semibold text-center">
                  {locale === "en" ? "Hired" : "التعيينات"}
                </th>
                <th className="p-3 font-semibold text-center">
                  {locale === "en" ? "Conversion Rate" : "نسبة القبول"}
                </th>
                <th className="p-3 font-semibold text-center">
                  {locale === "en" ? "Avg Days to Hire" : "متوسط أيام التوظيف"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {branchesComparisonData.map((branch) => (
                <tr key={branch.id} className="hover:bg-muted/10 transition-colors">
                  <td className="p-3 font-medium text-foreground">
                    <div className="flex items-center gap-1.5">
                      <span>{branch.name}</span>
                      {branch.isBranch ? (
                        <Badge variant="outline" className="text-[9px] px-1 py-0">
                          {locale === "en" ? "Branch" : "فرع"}
                        </Badge>
                      ) : (
                        <Badge variant="default" className="text-[9px] px-1 py-0">
                          {locale === "en" ? "Main" : "الرئيسية"}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-center text-muted-foreground">{branch.jobsCount}</td>
                  <td className="p-3 text-center text-muted-foreground">
                    {branch.candidatesCount}
                  </td>
                  <td className="p-3 text-center text-muted-foreground">
                    {branch.interviewsCount}
                  </td>
                  <td className="p-3 text-center text-muted-foreground font-semibold text-foreground">
                    {branch.hiredCount}
                  </td>
                  <td className="p-3 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                      {branch.conversionRate}%
                    </span>
                  </td>
                  <td className="p-3 text-center text-muted-foreground font-mono">
                    {branch.avgDaysToHire
                      ? locale === "en"
                        ? `${branch.avgDaysToHire} d`
                        : `${branch.avgDaysToHire} يوم`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
