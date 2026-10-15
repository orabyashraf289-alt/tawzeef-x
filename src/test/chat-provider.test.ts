import { describe, expect, it, vi } from "vitest";
import { requestChatCompletion } from "../../supabase/functions/chat/provider";

describe("chat provider fallback", () => {
  const endpoint = "https://example.test/chat";
  const options = { method: "POST", body: JSON.stringify({ model: "gemini-3.8-flash", messages: [{ role: "user", content: "hello" }], stream: true }) };

  it("keeps a successful reply on the selected model", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));
    expect((await requestChatCompletion(endpoint, options, true, fetcher)).status).toBe(200);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("tries a lighter direct Gemini model once after temporary 503", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response("unavailable", { status: 503 })).mockResolvedValueOnce(new Response("ok", { status: 200 }));
    expect((await requestChatCompletion(endpoint, options, true, fetcher)).status).toBe(200);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({ model: "gemini-3.5-flash-lite", messages: [{ role: "user", content: "hello" }], stream: true });
  });

  it("does not retry authorization failures or repeat the fallback model", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("denied", { status: 403 }));
    expect((await requestChatCompletion(endpoint, options, true, fetcher)).status).toBe(403);
    expect(fetcher).toHaveBeenCalledTimes(1);
    fetcher.mockResolvedValue(new Response("busy", { status: 429 }));
    await requestChatCompletion(endpoint, { ...options, body: JSON.stringify({ model: "gemini-3.5-flash-lite" }) }, true, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
