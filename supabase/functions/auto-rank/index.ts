import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

// Compatibility endpoint: rank stored evidence reviews. Never let a model choose update IDs.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const { jobId } = await req.json();
    if (typeof jobId !== "string" || !/^[0-9a-f-]{36}$/i.test(jobId)) {
      return json({ error: "Invalid job" }, 400);
    }
    const url = Deno.env.get("SUPABASE_URL")!;
    const authorization = req.headers.get("Authorization") || "";
    const db = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError || !user || user.is_anonymous) {
      return json({ error: "Authentication required" }, 401);
    }
    const { data: job, error: jobError } = await db.from("jobs").select(
      "id,company_id",
    ).eq("id", jobId).single();
    if (jobError || !job?.company_id) {
      return json({ error: "Job unavailable" }, 403);
    }
    const { data: allowed, error: permissionError } = await db.rpc(
      "has_hiring_permission",
      { _company: job.company_id, _module: "candidates", _action: "read" },
    );
    if (permissionError || !allowed) {
      return json({ error: "Candidate access required" }, 403);
    }
    const { data: candidates, error } = await db.from("candidates").select(
      "id,ai_evaluation",
    )
      .eq("job_id", job.id).eq("company_id", job.company_id).order("created_at")
      .limit(1000);
    if (error) throw error;
    const rankings = (candidates || []).flatMap((candidate) => {
      let report: any;
      try {
        report = typeof candidate.ai_evaluation === "string"
          ? JSON.parse(candidate.ai_evaluation)
          : candidate.ai_evaluation;
      } catch {
        return [];
      }
      if (
        !report || report.evidenceVersion !== 1 ||
        !Number.isFinite(report.score) || report.score < 0 || report.score > 100
      ) return [];
      return [{
        candidate_id: candidate.id,
        score: report.score,
        summary: report.summary,
        evaluatedAt: report.evaluatedAt,
        source: "saved_evidence_review",
      }];
    }).sort((a, b) => b.score - a.score);
    return json({
      ranked: rankings.length,
      rankings,
      updated: 0,
      requires_individual_evaluation: (candidates?.length || 0) -
        rankings.length,
      message:
        "الترتيب يعتمد على التقييمات المحفوظة بالأدلة. قيّم الملفات غير المكتملة من شاشة المرشح، والقرار النهائي لفريق التوظيف.",
    });
  } catch {
    return json({ error: "تعذّر تحميل التقييمات. لم تُنشأ درجات بديلة." }, 500);
  }
});
