/**
 * Service to notify Google Indexing API server-side endpoint (/api/google-indexing).
 * Safe, asynchronous, non-blocking, and never breaks the recruiter's UI workflow.
 */

export interface GoogleIndexingNotificationParams {
  jobId: string;
  action: "URL_UPDATED" | "URL_DELETED";
  jobTitle?: string;
  status?: string;
}

export interface GoogleIndexingResult {
  success: boolean;
  skipped?: boolean;
  action?: string;
  reason?: string;
  error?: string;
}

import { supabase } from "@/integrations/supabase/client";

export async function notifyGoogleIndexing({
  jobId,
  action,
  jobTitle,
  status,
}: GoogleIndexingNotificationParams): Promise<GoogleIndexingResult> {
  if (!jobId) {
    return { success: false, skipped: true, reason: "Missing jobId" };
  }

  // Pre-filter on client: If adding/updating a job marked draft or inactive, don't ping Google URL_UPDATED
  if (action === "URL_UPDATED" && status) {
    const s = status.trim().toLowerCase();
    const isActive = s === "نشطة" || s === "active";
    if (!isActive) {
      console.info(`[Google Indexing] Skipping URL_UPDATED for inactive/draft job (${jobTitle || jobId}, status: ${status})`);
      // Trigger URL_DELETED instead so Google removes the inactive job
      action = "URL_DELETED";
    }
  }

  try {
    const endpoint = "/api/google-indexing";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    } catch {
      // Continue if session fetch fails
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jobId,
        action,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.warn(`[Google Indexing API] Notice (HTTP ${res.status}):`, data?.error || res.statusText);
      return {
        success: false,
        action,
        error: data?.error || `HTTP ${res.status}`,
      };
    }

    if (data.configured === false) {
      console.info(`[Google Indexing API] Server notice: Credentials not configured yet in Vercel environment variables.`);
      return {
        success: false,
        skipped: true,
        action,
        reason: "credentials_not_configured_in_vercel",
      };
    }

    console.info(`[Google Indexing API] Successfully submitted ${action} for job ${jobId} (${jobTitle || ""})`);
    return {
      success: true,
      action,
    };
  } catch (err: any) {
    // Non-blocking failure handling: Log warning but never throw
    console.warn(`[Google Indexing API] Background notification notice for ${jobId}:`, err?.message || err);
    return {
      success: false,
      action,
      error: err?.message || "Network error",
    };
  }
}
