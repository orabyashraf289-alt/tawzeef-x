import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimiter.ts";

const API_CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, accept, x-client-info, apikey",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...API_CORS_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateTrackingCode(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  return `TX-${hex}`;
}

function resolveResourcePath(url: URL): string {
  const pathname = url.pathname.replace(/\/+$/, "");
  const match = pathname.match(/\/public-api-v1(\/.*)?$/);
  const sub = match?.[1] || "/";
  return sub.startsWith("/v1/") ? sub.slice(3) : sub;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: API_CORS_HEADERS });
  }

  const rl = checkRateLimit(req, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitResponse(API_CORS_HEADERS);
  }

  const url = new URL(req.url);
  const resource = resolveResourcePath(url);

  if (req.method === "GET" && (resource === "/" || resource === "/health")) {
    return json({
      status: "ok",
      service: "TawzeefX Public Recruitment API",
      version: "1.0.0",
      openapi: "3.1.0",
      endpoints: ["GET /jobs", "POST /jobs", "GET /candidates", "POST /candidates"],
    });
  }

  const authHeader = req.headers.get("Authorization") || "";
  const rawToken = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!rawToken || !rawToken.startsWith("tx_live_")) {
    return json(
      { error: "unauthorized", message: "Provide a valid Authorization: Bearer tx_live_... API key" },
      401,
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json({ error: "server_misconfigured" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const keyHash = await sha256Hex(rawToken);
    const { data: keyRow, error: keyError } = await supabase
      .from("company_api_keys")
      .select("id, company_id, created_by, name, scopes, status")
      .eq("key_hash", keyHash)
      .eq("status", "active")
      .maybeSingle();

    if (keyError || !keyRow) {
      return json({ error: "invalid_api_key", message: "API key is invalid or revoked" }, 401);
    }

    const { data: company } = await supabase
      .from("companies")
      .select("id, status, owner_user_id")
      .eq("id", keyRow.company_id)
      .maybeSingle();

    if (!company || company.status !== "active") {
      return json({ error: "company_inactive", message: "Tenant company is not active" }, 403);
    }

    const scopes: string[] = Array.isArray(keyRow.scopes) ? keyRow.scopes : [];
    const hasScope = (scope: string) => scopes.includes(scope);

    // Fire-and-forget last_used_at update
    void supabase
      .from("company_api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", keyRow.id);

    // ------------------------------------------------------------------
    // GET /jobs
    // ------------------------------------------------------------------
    if (resource === "/jobs" && req.method === "GET") {
      if (!hasScope("jobs:read")) {
        return json({ error: "insufficient_scope", required: "jobs:read" }, 403);
      }

      const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 50), 1), 100);
      const statusFilter = url.searchParams.get("status");

      let query = supabase
        .from("jobs")
        .select("id, title, department, location, type, status, salary_min, salary_max, experience_level, created_at")
        .eq("company_id", keyRow.company_id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (statusFilter) {
        query = query.eq("status", statusFilter);
      }

      const { data: jobs, error } = await query;
      if (error) {
        return json({ error: "query_failed", message: error.message }, 500);
      }

      return json({
        status: "success",
        total: jobs?.length ?? 0,
        data: jobs ?? [],
      });
    }

    // ------------------------------------------------------------------
    // POST /jobs
    // ------------------------------------------------------------------
    if (resource === "/jobs" && req.method === "POST") {
      if (!hasScope("jobs:write")) {
        return json({ error: "insufficient_scope", required: "jobs:write" }, 403);
      }

      const body = await req.json().catch(() => null);
      if (!body || typeof body !== "object") {
        return json({ error: "invalid_json" }, 400);
      }

      const title = String(body.title ?? "").trim().slice(0, 180);
      const department = String(body.department ?? "عام").trim().slice(0, 120);
      const location = String(body.location ?? "الرياض").trim().slice(0, 120);
      const type = String(body.type ?? "دوام كامل").trim().slice(0, 60);
      const status = String(body.status ?? "open").trim().slice(0, 40);
      const ownerUserId = keyRow.created_by || company.owner_user_id;

      if (!title || !ownerUserId) {
        return json({ error: "validation_error", message: "title is required" }, 400);
      }

      const { data: created, error } = await supabase
        .from("jobs")
        .insert({
          company_id: keyRow.company_id,
          user_id: ownerUserId,
          title,
          department,
          location,
          type,
          status,
          description: body.description ? String(body.description).slice(0, 8000) : null,
          salary_min: typeof body.salary_min === "number" ? body.salary_min : null,
          salary_max: typeof body.salary_max === "number" ? body.salary_max : null,
        })
        .select("id, title, department, location, type, status, created_at")
        .single();

      if (error) {
        return json({ error: "insert_failed", message: error.message }, 400);
      }

      void supabase.from("audit_log").insert({
        company_id: keyRow.company_id,
        user_id: ownerUserId,
        event_type: "public_api_job_created",
        details: { api_key_id: keyRow.id, job_id: created.id, title: created.title },
      });

      return json({ status: "success", data: created }, 201);
    }

    // ------------------------------------------------------------------
    // GET /candidates
    // ------------------------------------------------------------------
    if (resource === "/candidates" && req.method === "GET") {
      if (!hasScope("candidates:read")) {
        return json({ error: "insufficient_scope", required: "candidates:read" }, 403);
      }

      const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 50), 1), 100);
      const jobId = url.searchParams.get("job_id");

      let query = supabase
        .from("candidates")
        .select("id, name, role, stage, status, ai_score, job_id, source, tracking_code, created_at")
        .eq("company_id", keyRow.company_id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (jobId) {
        query = query.eq("job_id", jobId);
      }

      const { data: candidates, error } = await query;
      if (error) {
        return json({ error: "query_failed", message: error.message }, 500);
      }

      return json({
        status: "success",
        total: candidates?.length ?? 0,
        data: candidates ?? [],
      });
    }

    // ------------------------------------------------------------------
    // POST /candidates
    // ------------------------------------------------------------------
    if (resource === "/candidates" && req.method === "POST") {
      if (!hasScope("candidates:write")) {
        return json({ error: "insufficient_scope", required: "candidates:write" }, 403);
      }

      const body = await req.json().catch(() => null);
      if (!body || typeof body !== "object") {
        return json({ error: "invalid_json" }, 400);
      }

      const name = String(body.name ?? "").trim().slice(0, 160);
      const email = String(body.email ?? "").trim().toLowerCase().slice(0, 200);
      const phone = body.phone ? String(body.phone).trim().slice(0, 40) : null;
      const role = body.specialty || body.role ? String(body.specialty || body.role).trim().slice(0, 160) : null;
      const jobId = body.job_id || body.jobId ? String(body.job_id || body.jobId).trim() : null;
      const resumeUrl = body.resume_url || body.resumeUrl ? String(body.resume_url || body.resumeUrl).trim().slice(0, 1000) : null;

      if (!name || !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return json({ error: "validation_error", message: "Valid name and email are required" }, 400);
      }

      if (jobId) {
        const { data: jobCheck } = await supabase
          .from("jobs")
          .select("id")
          .eq("id", jobId)
          .eq("company_id", keyRow.company_id)
          .maybeSingle();
        if (!jobCheck) {
          return json({ error: "invalid_job_id", message: "Specified job_id does not belong to this company" }, 400);
        }
      }

      const trackingCode = generateTrackingCode();
      const { data: candidate, error } = await supabase
        .from("candidates")
        .insert({
          company_id: keyRow.company_id,
          user_id: keyRow.created_by || company.owner_user_id,
          job_id: jobId,
          name,
          email,
          phone,
          role,
          resume_url: resumeUrl,
          source: "api",
          stage: "تقديم الطلب",
          status: "active",
          tracking_code: trackingCode,
        })
        .select("id, name, stage, status, tracking_code, created_at")
        .single();

      if (error) {
        return json({ error: "insert_failed", message: error.message }, 400);
      }

      void supabase.from("audit_log").insert({
        company_id: keyRow.company_id,
        user_id: keyRow.created_by || company.owner_user_id,
        event_type: "public_api_candidate_created",
        details: { api_key_id: keyRow.id, candidate_id: candidate.id, job_id: jobId },
      });

      return json(
        {
          status: "success",
          message: "Candidate registered successfully",
          candidateId: candidate.id,
          trackingCode: candidate.tracking_code,
          stage: candidate.stage,
          data: candidate,
        },
        201,
      );
    }

    return json({ error: "not_found", message: `Unsupported route ${req.method} ${resource}` }, 404);
  } catch (err) {
    console.error("[public-api-v1] unhandled error:", err);
    return json({ error: "internal_error" }, 500);
  }
});
