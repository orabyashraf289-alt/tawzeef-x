import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import AssistantMessageContent from "@/components/ai-assistant/AssistantMessageContent";

describe("assistant message formatting", () => {
  it("renders a mixed Arabic reply with headings, lists and a scrollable table", () => {
    const content = "## النتيجة\nتمت المراجعة.\n\n1. راجع الطلب\n2. أرسل الرد\n\n| الاسم | المرحلة |\n| --- | --- |\n| سارة | مقابلة |";
    const html = renderToStaticMarkup(<AssistantMessageContent content={content} />);

    expect(html).toContain("<h2>النتيجة</h2>");
    expect(html).toContain("<ol>");
    expect(html).toContain('class="assistant-message-table"');
    expect(html).toContain("<table>");
    expect(html).toContain("<td><span>سارة</span></td>");
    expect(html).not.toContain("| --- |");
  });

  it("keeps pipes inside code and blocks unsafe links", () => {
    const content = "```text\n| الاسم | الحالة |\n| --- | --- |\n```\n\n[رابط](javascript:alert(1))";
    const html = renderToStaticMarkup(<AssistantMessageContent content={content} />);

    expect(html).toContain("<pre>");
    expect(html).not.toContain("<table>");
    expect(html).not.toContain('href="javascript:');
  });
});
