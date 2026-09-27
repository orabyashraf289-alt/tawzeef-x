import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";
import { getExtendedCorsHeaders } from "../_shared/cors.ts";
import {
  buildGeminiRequest,
  canEvaluateCandidate,
  GEMINI_ENDPOINT,
  jobMatchesCandidate,
  parseGeminiEvaluation,
  type EvaluationCandidate,
  type EvaluationJob,
} from "./policy.ts";

const json = (body: object, status: number, corsHeaders: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  const corsHeaders = getExtendedCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, corsHeaders);

  let candidateId: unknown;
  let jobId: unknown;
  try {
    ({ candidateId, jobId } = await req.json());
  } catch {
    return json({ error: "Invalid request body" }, 400, corsHeaders);
  }
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (typeof candidateId !== "string" || !uuid.test(candidateId) ||
      (jobId != null && (typeof jobId !== "string" || !uuid.test(jobId)))) {
    return json({ error: "Invalid candidate or job" }, 400, corsHeaders);
  }

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!token || token === anonKey || token === serviceKey || token === Deno.env.get("SUPABASE_PUBLISHABLE_KEY")) {
    return json({ error: "Authentication required" }, 401, corsHeaders);
  }

  try {
    const authClient = createClient(supabaseUrl, anonKey);
    const { data: { user }, error: authError } = await authClient.auth.getUser(token);
    if (authError || !user || user.is_anonymous) {
      return json({ error: "Authentication required" }, 401, corsHeaders);
    }

    const db = createClient(supabaseUrl, serviceKey);
    const { data: candidate, error: candidateError } = await db
      .from("candidates")
      .select("id,user_id,company_id,job_id,role,skills,experience,education,summary")
      .eq("id", candidateId)
      .maybeSingle();
    if (candidateError) throw candidateError;
    if (!candidate) return json({ error: "Candidate not found" }, 404, corsHeaders);

    const [{ data: role, error: roleError }, { data: member, error: memberError }] = await Promise.all([
      db.from("platform_roles").select("id").eq("user_id", user.id).eq("role", "super_admin").maybeSingle(),
      candidate.company_id
        ? db.from("company_members").select("id").eq("company_id", candidate.company_id).eq("user_id", user.id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);
    if (roleError || memberError) throw roleError || memberError;
    if (!canEvaluateCandidate(candidate as EvaluationCandidate, user.id, Boolean(role), Boolean(member))) {
      return json({ error: "Forbidden" }, 403, corsHeaders);
    }
    if (jobId != null && jobId !== candidate.job_id) {
      return json({ error: "Job does not match candidate" }, 400, corsHeaders);
    }

    let job: EvaluationJob | null = null;
    if (candidate.job_id) {
      const { data, error } = await db.from("jobs")
        .select("id,user_id,company_id,status,title,department,location,type,experience_level,description,requirements")
        .eq("id", candidate.job_id).maybeSingle();
      if (error) throw error;
      if (!data || !jobMatchesCandidate(candidate as EvaluationCandidate, data as EvaluationJob, user.id)) {
        return json({ error: "Job does not match candidate" }, 403, corsHeaders);
      }
      job = data as EvaluationJob;
    }

    const geminiKey = Deno.env.get("GEMINI_API_KEY")?.trim();
    if (!geminiKey) return json({ error: "Gemini evaluation is not configured" }, 503, corsHeaders);

    let response: Response;
    try {
      response = await fetch(GEMINI_ENDPOINT, {
        method: "POST",
        headers: { Authorization: `Bearer ${geminiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(buildGeminiRequest(candidate as EvaluationCandidate, job)),
        signal: AbortSignal.timeout(30000),
      });
    } catch {
      return json({ error: "Gemini evaluation is currently unavailable" }, 503, corsHeaders);
    }
    if (response.status === 429) return json({ error: "Gemini request limit reached" }, 429, corsHeaders);
    if (!response.ok) {
      console.warn("Gemini returned status", response.status);
      return json({ error: "Gemini evaluation is currently unavailable" }, 503, corsHeaders);
    }

    const evaluation = parseGeminiEvaluation(await response.json());
    if (!evaluation) return json({ error: "Invalid Gemini evaluation" }, 502, corsHeaders);

    let update = db.from("candidates")
      .update({ ai_score: evaluation.score, ai_evaluation: JSON.stringify(evaluation) })
      .eq("id", candidateId);
    update = candidate.company_id ? update.eq("company_id", candidate.company_id) : update.is("company_id", null);
    update = candidate.job_id ? update.eq("job_id", candidate.job_id) : update.is("job_id", null);
    const { data: updated, error: updateError } = await update.select("id").maybeSingle();
    if (updateError) throw updateError;
    if (!updated) return json({ error: "Candidate changed during evaluation" }, 409, corsHeaders);

    return json(evaluation, 200, corsHeaders);
  } catch (error) {
    console.error("Candidate evaluation failed", error instanceof Error ? error.message : "Unknown error");
    return json({ error: "Candidate evaluation failed" }, 500, corsHeaders);
  }
});
