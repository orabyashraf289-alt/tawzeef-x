const TEMPORARY_FAILURES = new Set([404, 429, 500, 502, 503, 504]);

/** Retry once with a lighter model when the provider reports a temporary failure. */
export async function requestChatCompletion(
  url: string,
  options: RequestInit,
  directGemini: boolean,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  let payload: Record<string, unknown> | null = null;
  if (typeof options.body === "string") {
    try {
      payload = JSON.parse(options.body);
    } catch {
      payload = null;
    }
  }
  const fallbackModel = directGemini ? "gemini-3.5-flash-lite" : "google/gemini-3.8-flash";
  let primary: Response;
  try {
    const reqOptions = !options.signal && fetcher === fetch
      ? { ...options, signal: AbortSignal.timeout(8000) }
      : options;
    primary = await fetcher(url, reqOptions);
  } catch {
    if (!payload || payload.model === fallbackModel) {
      return new Response(JSON.stringify({ error: "Upstream timeout" }), { status: 504 });
    }
    return fetcher(url, { ...options, body: JSON.stringify({ ...payload, model: fallbackModel }) });
  }
  if (!TEMPORARY_FAILURES.has(primary.status) || !payload) return primary;
  if (payload.model === fallbackModel) return primary;

  return fetcher(url, { ...options, body: JSON.stringify({ ...payload, model: fallbackModel }) });
}
