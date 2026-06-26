import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { trackingCode, email } = await req.json();
    
    if (!trackingCode && !email) {
      return new Response(JSON.stringify({ error: "يرجى إدخال رمز التتبع أو البريد الإلكتروني" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let query = supabase
      .from("candidates")
      .select("id, name, role, stage, status, skills, created_at, tracking_code, job_id, ai_score");

    if (trackingCode) {
      query = query.eq("tracking_code", trackingCode.toUpperCase().trim());
    } else {
      query = query.eq("email", email.trim().toLowerCase());
    }

    const { data: candidates, error } = await query;

    if (error) {
      console.error("DB error:", error);
      throw new Error("خطأ في البحث");
    }

    if (!candidates || candidates.length === 0) {
      return new Response(JSON.stringify({ error: "لم يتم العثور على طلبات. تأكد من رمز التتبع أو البريد الإلكتروني." }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch job titles for matched candidates
    const jobIds = [...new Set(candidates.filter(c => c.job_id).map(c => c.job_id))];
    let jobsMap: Record<string, string> = {};
    
    if (jobIds.length > 0) {
      const { data: jobs } = await supabase
        .from("jobs")
        .select("id, title, department, location")
        .in("id", jobIds);
      
      if (jobs) {
        jobs.forEach(j => { jobsMap[j.id] = j.title; });
      }
    }

    const result = candidates.map(c => ({
      id: c.id,
      name: c.name,
      role: c.role,
      stage: c.stage || "تقديم الطلب",
      status: c.status,
      skills: c.skills,
      trackingCode: c.tracking_code,
      appliedAt: c.created_at,
      jobTitle: c.job_id ? jobsMap[c.job_id] || null : null,
      aiScore: c.ai_score,
    }));

    return new Response(JSON.stringify({ candidates: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("candidate-portal error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
