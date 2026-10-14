const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

export async function requestRecruitmentDraft(
  endpoint: string,
  key: string,
  payload: Record<string, unknown>,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  const request = (model: string) => fetcher(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, model }),
  });

  const primary = await request("gemini-3.8-flash");
  if (!RETRYABLE_STATUSES.has(primary.status)) return primary;

  // One fallback for temporary provider failures; never repeat validation or auth errors.
  return request("gemini-3.5-flash-lite");
}
