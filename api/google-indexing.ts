import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

// In-memory token cache for warm serverless function instances
let cachedToken: { accessToken: string; expiresAt: number } | null = null;

const APP_BASE_URL = (
  process.env.APP_BASE_URL ||
  process.env.VITE_APP_BASE_URL ||
  "https://www.tawzeefx.com"
).replace(/\/+$/, "");

/**
 * Creates an RS256 signed JWT for Google OAuth2 Service Account
 */
function createServiceAccountJwt(email: string, rawPrivateKey: string): string {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: email,
    scope: "https://www.googleapis.com/auth/indexing",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  // Handle various environment variable formats (escaped \n, surrounding quotes)
  let cleanKey = rawPrivateKey.trim();
  if (cleanKey.startsWith('"') && cleanKey.endsWith('"')) {
    cleanKey = cleanKey.slice(1, -1);
  }
  cleanKey = cleanKey.replace(/\\n/g, "\n");

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsignedToken);
  const signature = signer.sign(cleanKey, "base64url");

  return `${unsignedToken}.${signature}`;
}

/**
 * Exchanges JWT assertion for a Google OAuth2 access token
 */
async function getGoogleAccessToken(email: string, privateKey: string): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60000) {
    return cachedToken.accessToken;
  }

  const assertion = createServiceAccountJwt(email, privateKey);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || `Failed to acquire Google OAuth token (HTTP ${res.status})`);
  }

  const expiresInMs = (data.expires_in || 3600) * 1000;
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: now + expiresInMs,
  };

  return data.access_token;
}

/**
 * Publishes a URL notification to Google Indexing API with exponential backoff retries
 */
async function publishToGoogleIndexing(
  url: string,
  type: "URL_UPDATED" | "URL_DELETED",
  accessToken: string,
  maxRetries = 2
): Promise<{ status: number; body: any }> {
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      const res = await fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ url, type }),
      });

      const body = await res.json().catch(() => ({}));

      // If status is rate-limited (429) or transient server error (5xx), retry
      if ((res.status === 429 || res.status >= 500) && attempt < maxRetries) {
        attempt++;
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      return { status: res.status, body };
    } catch (err: any) {
      if (attempt < maxRetries) {
        attempt++;
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }

  throw new Error("Max retries exceeded while calling Google Indexing API");
}

/**
 * Writes an audit record to Supabase table google_indexing_logs (safe fallback if table does not exist)
 */
async function recordIndexingLog(supabase: any, log: {
  job_id: string | null;
  url: string;
  action: "URL_UPDATED" | "URL_DELETED";
  status: string;
  status_code: number | null;
  response: any;
  error: string | null;
}) {
  try {
    if (!supabase) return;
    await supabase.from("google_indexing_logs").insert({
      job_id: log.job_id,
      url: log.url,
      action: log.action,
      status: log.status,
      status_code: log.status_code,
      response: log.response,
      error: log.error,
    });
  } catch (err) {
    console.warn("[Google Indexing Logger] Notice: Could not save log to table (table may not exist yet):", err);
  }
}

export default async function handler(req: any, res: any) {
  // Set CORS and Security headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Only POST requests are accepted." });
  }

  const { jobId, action, url: providedUrl } = req.body || {};

  if (!jobId && !providedUrl) {
    return res.status(400).json({ error: "Missing required parameter: jobId or url" });
  }

  const rawAction = (action || "URL_UPDATED").trim().toUpperCase();
  if (rawAction !== "URL_UPDATED" && rawAction !== "URL_DELETED") {
    return res.status(400).json({ error: "Invalid action. Must be 'URL_UPDATED' or 'URL_DELETED'." });
  }

  // Explicit prohibition: reject any non-job marketing URLs
  const RESERVED_ROUTES = ["features", "pricing", "blog", "about", "contact", "careers", "privacy", "terms", "dashboard", "auth", "login"];
  if (jobId && RESERVED_ROUTES.includes(jobId.toLowerCase())) {
    return res.status(400).json({
      error: `Invalid jobId '${jobId}'. Google Indexing API is strictly reserved for JobPosting pages (/apply/{id}).`,
      rejectedJobId: jobId,
    });
  }

  if (providedUrl && (!providedUrl.includes("/apply/") || /https?:\/\/[^\/]+(\/|\/features|\/pricing|\/blog|\/about|\/contact|\/careers)\/?$/i.test(providedUrl))) {
    return res.status(400).json({
      error: "Google Indexing API is strictly reserved for JobPosting pages (/apply/{id}). Non-job marketing pages (/, /features, /pricing, /blog, /about, /contact) must be indexed via sitemap.xml and standard Google crawl.",
      rejectedUrl: providedUrl,
    });
  }

  // Construct and validate canonical job URL
  const targetJobId = jobId || (providedUrl ? providedUrl.split("/apply/")[1]?.split(/[?#]/)[0] : null);
  const targetUrl = targetJobId ? `${APP_BASE_URL}/apply/${targetJobId}` : providedUrl;

  // Strict check: ONLY /apply/:id URLs are eligible for Google Indexing API
  const applyUrlRegex = new RegExp(`^${APP_BASE_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\/apply\\/[a-zA-Z0-9_-]+$`);
  if (!applyUrlRegex.test(targetUrl)) {
    return res.status(400).json({
      error: "Google Indexing API is strictly reserved for JobPosting pages (/apply/{id}). Non-job pages (/, /features, /pricing, /blog, /about, /contact) must be indexed via sitemap.xml and standard Google crawl.",
      rejectedUrl: targetUrl,
    });
  }

  // Initialize server Supabase client
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

  // Verify job state if Supabase is connected
  let effectiveAction: "URL_UPDATED" | "URL_DELETED" = rawAction;
  if (supabase && targetJobId) {
    try {
      const { data: job } = await supabase.from("jobs").select("id, status, description, created_at").eq("id", targetJobId).maybeSingle();
      if (job) {
        const status = (job.status || "").trim().toLowerCase();
        const isActive = status === "نشطة" || status === "active";

        // If action is URL_UPDATED but the job in DB is inactive or archived, automatically switch to URL_DELETED
        if (rawAction === "URL_UPDATED" && !isActive) {
          effectiveAction = "URL_DELETED";
        }
      } else if (rawAction === "URL_UPDATED") {
        // Job does not exist in DB, cannot publish as active
        effectiveAction = "URL_DELETED";
      }
    } catch (err) {
      console.warn("[Google Indexing] Notice reading job status:", err);
    }
  }

  // Check Google Cloud Service Account Credentials
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!serviceAccountEmail || !privateKey) {
    console.warn("[Google Indexing] Service Account credentials not configured yet in environment variables.");
    await recordIndexingLog(supabase, {
      job_id: targetJobId,
      url: targetUrl,
      action: effectiveAction,
      status: "NOT_CONFIGURED",
      status_code: null,
      response: { message: "GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY environment variable is not configured in Vercel." },
      error: "Credentials missing in server environment",
    });

    return res.status(200).json({
      success: false,
      configured: false,
      message: "Google Indexing API credentials are not configured yet in Vercel environment variables.",
      requiredEnvVars: ["GOOGLE_SERVICE_ACCOUNT_EMAIL", "GOOGLE_PRIVATE_KEY"],
      action: effectiveAction,
      url: targetUrl,
    });
  }

  try {
    const accessToken = await getGoogleAccessToken(serviceAccountEmail, privateKey);
    const { status, body } = await publishToGoogleIndexing(targetUrl, effectiveAction, accessToken);

    const isSuccess = status >= 200 && status < 300;
    const statusText = isSuccess ? "SUCCESS" : "FAILED";

    await recordIndexingLog(supabase, {
      job_id: targetJobId,
      url: targetUrl,
      action: effectiveAction,
      status: statusText,
      status_code: status,
      response: body,
      error: isSuccess ? null : (body.error?.message || `Google API returned status ${status}`),
    });

    return res.status(isSuccess ? 200 : status).json({
      success: isSuccess,
      configured: true,
      statusCode: status,
      action: effectiveAction,
      url: targetUrl,
      result: body,
    });
  } catch (err: any) {
    console.error("[Google Indexing Exception]", err);

    await recordIndexingLog(supabase, {
      job_id: targetJobId,
      url: targetUrl,
      action: effectiveAction,
      status: "FAILED",
      status_code: 500,
      response: null,
      error: err.message || "Unknown error occurred",
    });

    return res.status(500).json({
      success: false,
      configured: true,
      error: err.message || "Internal server error during Google Indexing notification",
      action: effectiveAction,
      url: targetUrl,
    });
  }
}
