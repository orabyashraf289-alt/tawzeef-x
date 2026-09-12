import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

// In-memory token cache for warm serverless function instances
let cachedToken: { accessToken: string; expiresAt: number } | null = null;

// Debouncing / Idempotency cache: Map of `${jobId}:${action}` -> timestamp
const debounceMap = new Map<string, number>();
const DEBOUNCE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// Rate Limiter: Map of IP/User -> array of timestamps
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30; // 30 req/min

const ALLOWED_ORIGINS = [
  "https://www.tawzeefx.com",
  "https://tawzeefx.com",
  "https://tx-hire-buddy-22-main.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

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
      if (res.ok) {
        return { status: res.status, body };
      }

      if (res.status === 429 || res.status >= 500) {
        attempt++;
        if (attempt <= maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          continue;
        }
      }

      return { status: res.status, body };
    } catch (networkError: any) {
      attempt++;
      if (attempt > maxRetries) {
        throw networkError;
      }
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }

  throw new Error("Maximum retries exceeded calling Google Indexing API");
}

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
    console.warn("[Google Indexing Logger] Could not save log to table:", err);
  }
}

export default async function handler(req: any, res: any) {
  // 1. Strict CORS domain allowlist
  const reqOrigin = req.headers["origin"] || "";
  const isAllowedOrigin =
    ALLOWED_ORIGINS.includes(reqOrigin) ||
    /^https:\/\/tx-hire-buddy-[a-zA-Z0-9_-]+\.vercel\.app$/.test(reqOrigin);

  res.setHeader(
    "Access-Control-Allow-Origin",
    isAllowedOrigin ? reqOrigin : ALLOWED_ORIGINS[0]
  );
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Internal-Secret");
  res.setHeader("Vary", "Origin");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Only POST requests are accepted." });
  }

  // 2. Rate Limiting Check (30 requests per minute per IP)
  const clientIp = (req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").toString().split(",")[0].trim();
  const now = Date.now();
  const clientTimestamps = (rateLimitMap.get(clientIp) || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (clientTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({ error: "Rate limit exceeded (30 requests/minute). Please slow down." });
  }
  clientTimestamps.push(now);
  rateLimitMap.set(clientIp, clientTimestamps);

  // 3. Initialize server Supabase client
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  const supabase = supabaseUrl && serviceKey ? createClient(supabaseUrl, serviceKey) : null;

  // 4. Mandatory Authentication & Authorization Check
  const internalSecret = req.headers["x-internal-secret"];
  const authHeader = req.headers["authorization"] || "";
  const expectedSecret = process.env.INTERNAL_SERVICE_SECRET;

  let isAuthorized = false;
  let callerUserId: string | null = null;
  let isSuperAdminCaller = false;

  if (expectedSecret && internalSecret && internalSecret === expectedSecret) {
    isAuthorized = true;
  } else if (authHeader.startsWith("Bearer ") && supabase) {
    const token = authHeader.replace("Bearer ", "").trim();
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);

    if (!authErr && user) {
      callerUserId = user.id;

      // Check if user is Platform Super Admin
      const { data: pRole } = await supabase
        .from("platform_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (pRole?.role === "super_admin") {
        isAuthorized = true;
        isSuperAdminCaller = true;
      }
    }
  }

  // Reject unauthenticated requests immediately (PROMPT 06 requirement)
  if (!isAuthorized && !callerUserId) {
    return res.status(401).json({
      error: "Unauthorized: Google Indexing API requires a valid authentication token or internal secret.",
    });
  }

  const { jobId, action, url: providedUrl } = req.body || {};

  if (!jobId && !providedUrl) {
    return res.status(400).json({ error: "Missing required parameter: jobId or url" });
  }

  const rawAction = (action || "URL_UPDATED").trim().toUpperCase();
  if (rawAction !== "URL_UPDATED" && rawAction !== "URL_DELETED") {
    return res.status(400).json({ error: "Invalid action. Must be 'URL_UPDATED' or 'URL_DELETED'." });
  }

  // 5. Server-side Canonical URL building & UUID validation
  const targetJobId = jobId || (providedUrl ? providedUrl.split("/apply/")[1]?.split(/[?#]/)[0] : null);

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!targetJobId || !uuidRegex.test(targetJobId)) {
    return res.status(400).json({
      error: `Invalid jobId format. Must be a valid UUID.`,
      rejectedJobId: targetJobId,
    });
  }

  // Build canonical URL strictly server-side
  const canonicalJobUrl = `${APP_BASE_URL}/apply/${targetJobId}`;

  // 6. Job Ownership & State Verification
  let effectiveAction: "URL_UPDATED" | "URL_DELETED" = rawAction;
  if (supabase) {
    const { data: job, error: jobErr } = await supabase
      .from("jobs")
      .select("id, company_id, status")
      .eq("id", targetJobId)
      .maybeSingle();

    if (jobErr || !job) {
      if (rawAction === "URL_UPDATED") {
        return res.status(404).json({ error: "Job posting not found in database." });
      }
    } else {
      // Check caller authorization for this company if not platform super admin
      if (!isAuthorized && callerUserId && !isSuperAdminCaller) {
        const { count: memberCount } = await supabase
          .from("company_members")
          .select("id", { count: "exact", head: true })
          .eq("user_id", callerUserId)
          .eq("company_id", job.company_id);

        if (!memberCount || memberCount === 0) {
          return res.status(403).json({ error: "Forbidden: You do not have permission to manage indexing for this job." });
        }
      }

      const status = (job.status || "").trim().toLowerCase();
      const isActive = status === "نشطة" || status === "active";
      if (rawAction === "URL_UPDATED" && !isActive) {
        effectiveAction = "URL_DELETED";
      }
    }
  }

  // 7. Debounce / Idempotency check (15-minute window per job action)
  const debounceKey = `${targetJobId}:${effectiveAction}`;
  const lastCallTime = debounceMap.get(debounceKey);
  if (lastCallTime && now - lastCallTime < DEBOUNCE_WINDOW_MS) {
    const remainingSecs = Math.round((DEBOUNCE_WINDOW_MS - (now - lastCallTime)) / 1000);
    return res.status(200).json({
      success: true,
      skipped: true,
      debounced: true,
      reason: `Indexing notification already submitted recently. Debounced for next ${remainingSecs}s.`,
      url: canonicalJobUrl,
      action: effectiveAction,
    });
  }

  // 8. Service Account Credentials Verification
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!serviceAccountEmail || !privateKey) {
    await recordIndexingLog(supabase, {
      job_id: targetJobId,
      url: canonicalJobUrl,
      action: effectiveAction,
      status: "NOT_CONFIGURED",
      status_code: null,
      response: { message: "Google Indexing credentials not configured in environment." },
      error: "Credentials missing in server environment",
    });

    return res.status(200).json({
      success: false,
      configured: false,
      message: "Google Indexing credentials are not configured yet in environment variables.",
      action: effectiveAction,
      url: canonicalJobUrl,
    });
  }

  // 9. Execute Google Indexing API notification
  try {
    const accessToken = await getGoogleAccessToken(serviceAccountEmail, privateKey);
    const googleResult = await publishToGoogleIndexing(canonicalJobUrl, effectiveAction, accessToken);

    debounceMap.set(debounceKey, Date.now());

    await recordIndexingLog(supabase, {
      job_id: targetJobId,
      url: canonicalJobUrl,
      action: effectiveAction,
      status: googleResult.status === 200 ? "SUCCESS" : "FAILED",
      status_code: googleResult.status,
      response: googleResult.body,
      error: googleResult.status === 200 ? null : JSON.stringify(googleResult.body),
    });

    return res.status(200).json({
      success: googleResult.status === 200,
      statusCode: googleResult.status,
      action: effectiveAction,
      url: canonicalJobUrl,
      googleResponse: googleResult.body,
    });
  } catch (apiError: any) {
    console.error("[Google Indexing API] Request failed:", apiError);

    await recordIndexingLog(supabase, {
      job_id: targetJobId,
      url: canonicalJobUrl,
      action: effectiveAction,
      status: "ERROR",
      status_code: 500,
      response: null,
      error: apiError.message || "Failed to publish URL to Google Indexing API",
    });

    return res.status(500).json({
      success: false,
      error: "Google Indexing API call failed. Check server logs for details.",
      action: effectiveAction,
      url: canonicalJobUrl,
    });
  }
}
