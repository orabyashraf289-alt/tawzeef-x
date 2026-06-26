import { supabase } from "@/integrations/supabase/client";

const BUCKET = "resumes";

/**
 * Extract the object path inside the resumes bucket from either a stored
 * publicUrl or a raw object path.
 */
export function extractResumePath(urlOrPath: string): string | null {
  if (!urlOrPath) return null;
  // Already looks like a path (no scheme)
  if (!/^https?:\/\//i.test(urlOrPath)) return urlOrPath.replace(/^\/+/, "");
  // Match /storage/v1/object/(public|sign)/resumes/<path>
  const m = urlOrPath.match(/\/storage\/v1\/object\/(?:public|sign)\/resumes\/(.+?)(?:\?|$)/);
  if (m && m[1]) return decodeURIComponent(m[1]);
  return null;
}

/**
 * Convert any stored resume URL/path to a short-lived signed URL.
 * Returns the original URL as a fallback if signing fails.
 */
export async function getSignedResumeUrl(urlOrPath: string, expiresIn = 60 * 10): Promise<string> {
  const path = extractResumePath(urlOrPath);
  if (!path) return urlOrPath;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) return urlOrPath;
  return data.signedUrl;
}
