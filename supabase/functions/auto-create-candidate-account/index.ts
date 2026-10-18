import { createClient } from "npm:@supabase/supabase-js@2.95.3";
import { getExtendedCorsHeaders, isOriginAllowed } from "../_shared/cors.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimiter.ts";
import { provisionApplicantAccount } from "./provision.ts";

// A tracking code proves that an application was submitted. It never grants
// access to its data: the invitation must still be opened from the email inbox.
Deno.serve(async (req) => {
  const headers = { ...getExtendedCorsHeaders(req), "Content-Type": "application/json" };
  const reply = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), { status, headers });

  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);

  const origin = req.headers.get("Origin");
  if (origin && !isOriginAllowed(origin)) return reply({ error: "Origin not allowed" }, 403);
  if (!checkRateLimit(req, 3, 60_000).allowed) return rateLimitResponse(headers);

  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const trackingCode = String(body.trackingCode || "").trim().toUpperCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^TX-[A-F0-9]{32}$/.test(trackingCode)) {
      return reply({ error: "Invalid application details" }, 400);
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const status = await provisionApplicantAccount(admin, email, trackingCode);
    return status === "not_found" ? reply({ error: "Application not found" }, 404) : reply({ status });
  } catch (error) {
    console.error("auto-create-candidate-account:", error);
    return reply({ error: "Could not prepare applicant account" }, 503);
  }
});
