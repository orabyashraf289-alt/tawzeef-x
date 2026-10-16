import { describe, expect, it } from "vitest";
import { formatAnalyticsReport, isAnalyticsReportType } from "../../supabase/functions/chat/analyticsReport";
import { assistantServices } from "@/lib/assistantServices";

describe("direct analytics reports", () => {
  it("maps the four catalog entries to validated report types", () => {
    const reports = assistantServices.filter(service => service.reportType);
    expect(reports.map(service => service.reportType)).toEqual(["pipeline", "offers", "sources", "monthly"]);
    expect(reports.every(service => isAnalyticsReportType(service.reportType))).toBe(true);
    expect(isAnalyticsReportType("delete_job")).toBe(false);
  });

  it("formats actual aggregates without inventing missing months or stages", () => {
    expect(formatAnalyticsReport("pipeline", { total_candidates: 3, pipeline: { "تقديم الطلب": 2, "العرض الوظيفي": 1 } }))
      .toContain("| العرض الوظيفي | 1 |");
    expect(formatAnalyticsReport("offers", { total_offers: 2, accepted: 1, rejected: 0, pending: 1, acceptance_rate: 100, avg_salary: 12500 }))
      .toContain("| معدل قبول العروض المحسومة | 100% |");
    expect(formatAnalyticsReport("sources", { total: 3, sources: { "رابط التقديم المباشر": 3 } }))
      .toContain("| رابط التقديم المباشر | 3 |");
    const monthly = formatAnalyticsReport("monthly", { monthly: { "2026-10": { candidates: 1, interviews: 1, offers: 1 }, "2026-08": { candidates: 2, interviews: 0, offers: 0 } } });
    expect(monthly.indexOf("2026-08")).toBeLessThan(monthly.indexOf("2026-10"));
    expect(monthly).not.toContain("2026-09");
  });
});
