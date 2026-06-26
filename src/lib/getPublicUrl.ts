/**
 * Returns the public-facing base URL for the app.
 * In preview/development it falls back to window.location.origin,
 * but for QR codes and shared links we always prefer the published URL.
 */
export function getPublicBaseUrl(): string {
  // Use env var if set, otherwise detect from current origin
  const origin = window.location.origin;

  // If we're on a Lovable preview URL, use the published app URL instead
  if (origin.includes("id-preview--") || origin.includes("lovableproject.com")) {
    return "https://ai-hire-buddy-22.lovable.app";
  }

  return origin;
}

export function getApplyUrl(jobId: string): string {
  return `${getPublicBaseUrl()}/apply/${jobId}`;
}

/**
 * Returns the OG-enabled URL for sharing on social platforms.
 * LinkedIn/Twitter crawlers hit the edge function which serves proper OG tags
 * and then redirects the user to the actual apply page.
 */
export function getOgApplyUrl(jobId: string): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return `${supabaseUrl}/functions/v1/og-apply?id=${jobId}`;
}

export function getOfferUrl(token: string): string {
  return `${getPublicBaseUrl()}/offer/${token}`;
}
