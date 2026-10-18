import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import AnalyticsReportContent from "@/components/ai-assistant/AnalyticsReportContent";

describe("assistant analytics report display", () => {
  it("renders report rows as table cells instead of visible Markdown pipes", () => {
    const html = renderToStaticMarkup(<AnalyticsReportContent reportType="monthly" stats={{ monthly: {
      "2026-10": { candidates: 1, interviews: 1, offers: 1 },
      "2026-08": { candidates: 2, interviews: 0, offers: 0 },
    } }} />);
    expect(html).toContain("<table>");
    expect(html).toContain('<td dir="ltr">2026-08</td><td>2</td>');
    expect(html.indexOf("2026-08")).toBeLessThan(html.indexOf("2026-10"));
    expect(html).not.toContain("2026-09");
    expect(html).not.toContain("| --- |");
  });
});
