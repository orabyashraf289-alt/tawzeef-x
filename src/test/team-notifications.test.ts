import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  detectPlatformFromUrl,
  buildSlackPayload,
  buildTeamsPayload,
  buildGenericPayload,
  formatPayloadForUrl,
  dispatchTeamNotification,
  type TeamNotificationPayload,
} from "@/lib/teamNotifications";

describe("Team Notifications Engine (Slack, MS Teams, Webhooks)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("detectPlatformFromUrl", () => {
    it("identifies Slack Incoming Webhook URLs accurately", () => {
      expect(detectPlatformFromUrl("https://hooks.slack.com/services/T00/B00/XXXX")).toBe("slack");
      expect(detectPlatformFromUrl("HTTPS://HOOKS.SLACK.COM/SERVICES/ABC")).toBe("slack");
    });

    it("identifies Microsoft Teams Webhook URLs accurately", () => {
      expect(detectPlatformFromUrl("https://outlook.office.com/webhook/xxx")).toBe("teams");
      expect(detectPlatformFromUrl("https://webhook.office.com/webhookb2/xxx")).toBe("teams");
      expect(detectPlatformFromUrl("https://prod-01.westus.logic.azure.com/workflows/xxx")).toBe("teams");
      expect(detectPlatformFromUrl("https://teams.microsoft.com/l/webhook/xxx")).toBe("teams");
    });

    it("identifies Generic URLs (Zapier, n8n, Make, custom)", () => {
      expect(detectPlatformFromUrl("https://hooks.zapier.com/hooks/catch/123/abc")).toBe("generic");
      expect(detectPlatformFromUrl("https://n8n.internal.company.com/webhook/hiring")).toBe("generic");
      expect(detectPlatformFromUrl("https://api.mycompany.com/v1/events")).toBe("generic");
    });
  });

  describe("buildSlackPayload", () => {
    it("formats rich Slack Block Kit structure with header, summary and fields", () => {
      const payload: TeamNotificationPayload = {
        event: "candidate.applied",
        title: "مرشح جديد: أحمد محمود",
        summary: "تم التقديم على وظيفة مهندس برمجيات",
        details: {
          "الوظيفة": "مهندس برمجيات أول",
          "القسم": "التقنية والابتكار",
          "نسبة التطابق": "92%",
        },
        actionUrl: "https://tawzeefx.com/candidates/123",
        actionText: "معاينة ملف المرشح",
      };

      const result = buildSlackPayload(payload) as any;
      expect(result.text).toContain("مرشح جديد");
      expect(result.blocks).toBeDefined();
      expect(result.blocks[0].type).toBe("header");
      expect(result.blocks[0].text.text).toContain("أحمد محمود");

      // Actions button
      const actionBlock = result.blocks.find((b: any) => b.type === "actions");
      expect(actionBlock).toBeDefined();
      expect(actionBlock.elements[0].url).toBe("https://tawzeefx.com/candidates/123");
    });
  });

  describe("buildTeamsPayload", () => {
    it("formats Microsoft Teams MessageCard with facts, theme color, and openUri action", () => {
      const payload: TeamNotificationPayload = {
        event: "offer.accepted",
        title: "تم قبول العرض الوظيفي! 🎉",
        summary: "وقع المرشح على العرض الرسمي",
        details: {
          "المرشح": "سارة القحطاني",
          "المسمى الوظيفي": "مدير تسويق",
          "تاريخ المباشرة": "2026-12-01",
        },
        actionUrl: "https://tawzeefx.com/offers/456",
      };

      const result = buildTeamsPayload(payload) as any;
      expect(result["@type"]).toBe("MessageCard");
      expect(result.themeColor).toBe("22c55e"); // Green theme for accepted offer
      expect(result.title).toContain("تم قبول العرض");
      expect(result.sections[0].facts.length).toBe(3);
      expect(result.potentialAction[0]["@type"]).toBe("OpenURI");
      expect(result.potentialAction[0].targets[0].uri).toBe("https://tawzeefx.com/offers/456");
    });
  });

  describe("buildGenericPayload", () => {
    it("formats clean JSON payload for external automation tools", () => {
      const payload: TeamNotificationPayload = {
        event: "job.created",
        title: "وظيفة جديدة",
        summary: "مطور واجهات",
        details: { department: "Engineering" },
      };

      const result = buildGenericPayload(payload) as any;
      expect(result.event).toBe("job.created");
      expect(result.title).toBe("وظيفة جديدة");
      expect(result.timestamp).toBeDefined();
      expect(result.details.department).toBe("Engineering");
    });
  });

  describe("dispatchTeamNotification", () => {
    it("dispatches successfully to Slack when fetch returns 200 OK", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve("ok"),
      });

      const res = await dispatchTeamNotification("https://hooks.slack.com/services/T/B/X", {
        event: "test.ping",
        title: "اختبار الاتصال",
        summary: "رسالة تجريبية",
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe(200);
      expect(res.platform).toBe("slack");

      globalThis.fetch = originalFetch;
    });

    it("handles failure cleanly when webhook endpoint returns error", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: () => Promise.resolve("channel_not_found"),
      });

      const res = await dispatchTeamNotification("https://hooks.slack.com/services/bad/url", {
        event: "test.ping",
        title: "اختبار",
        summary: "رسالة",
      });

      expect(res.success).toBe(false);
      expect(res.status).toBe(404);
      expect(res.message).toBe("channel_not_found");

      globalThis.fetch = originalFetch;
    });
  });
});
