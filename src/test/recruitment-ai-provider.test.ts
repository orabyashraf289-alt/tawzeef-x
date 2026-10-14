import { describe, expect, it, vi } from "vitest";
import { requestRecruitmentDraft } from "../../supabase/functions/recruitment-ai-tools/provider";

describe("recruitment AI provider fallback", () => {
  it("uses the primary model when it responds successfully", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    const result = await requestRecruitmentDraft("https://example.test", "test-key", { messages: [] }, fetcher);
    expect(result.status).toBe(200);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetcher.mock.calls[0][1].body).model).toBe("gemini-3.8-flash");
  });

  it("tries the supported secondary model once on a temporary 503", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response("unavailable", { status: 503 }))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));
    const result = await requestRecruitmentDraft("https://example.test", "test-key", { tools: [{ type: "function" }] }, fetcher);
    expect(result.status).toBe(200);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({ tools: [{ type: "function" }], model: "gemini-3.5-flash-lite" });
  });

  it("does not retry invalid requests", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("invalid", { status: 400 }));
    const result = await requestRecruitmentDraft("https://example.test", "test-key", {}, fetcher);
    expect(result.status).toBe(400);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
