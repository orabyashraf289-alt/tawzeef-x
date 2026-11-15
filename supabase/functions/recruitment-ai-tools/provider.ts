const RETRYABLE_STATUSES = new Set([404, 429, 500, 502, 503, 504]);

export async function requestRecruitmentDraft(
  endpoint: string,
  key: string,
  payload: Record<string, unknown>,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  const request = (model: string, timeoutMs?: number) => fetcher(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, model }),
    ...(timeoutMs && fetcher === fetch ? { signal: AbortSignal.timeout(timeoutMs) } : {}),
  });

  try {
    const primary = await request("gemini-3.8-flash", 5000);
    if (!RETRYABLE_STATUSES.has(primary.status)) return primary;
  } catch {
    // Primary model timed out; fall back to secondary model.
  }

  // One fallback for temporary provider failures; never repeat validation or auth errors.
  return request("gemini-3.5-flash-lite");
}
