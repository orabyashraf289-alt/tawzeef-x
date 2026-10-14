const TEMPORARY_FAILURES = new Set([429, 500, 502, 503, 504]);

/** Retry once with a lighter model when the provider reports a temporary failure. */
export async function requestChatCompletion(
  url: string,
  options: RequestInit,
  directGemini: boolean,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  const primary = await fetcher(url, options);
  if (!TEMPORARY_FAILURES.has(primary.status) || typeof options.body !== "string") return primary;

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(options.body);
  } catch {
    return primary;
  }
  const fallbackModel = directGemini ? "gemini-3.5-flash-lite" : "google/gemini-3.8-flash";
  if (payload.model === fallbackModel) return primary;

  return fetcher(url, { ...options, body: JSON.stringify({ ...payload, model: fallbackModel }) });
}
