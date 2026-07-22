import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { candidateId, jobId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("GEMINI_API_KEY or LOVABLE_API_KEY is not configured");
    const isDirectGemini = (LOVABLE_API_KEY.startsWith("AIza") || LOVABLE_API_KEY.startsWith("AQ."));
    const API_URL = isDirectGemini
      ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
      : "https://api.lovable.dev/v1/chat/completions";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";
    const tokenStr = authHeader.replace(/^Bearer\s+/i, "");
    if (!tokenStr) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${tokenStr}` } } });
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const callerId = userData.user.id;

    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch candidate + ownership check
    const { data: candidate, error: candErr } = await supabase
      .from("candidates")
      .select("*")
      .eq("id", candidateId)
      .single();
    if (candErr || !candidate) throw new Error("المرشح غير موجود");

    // Robust Authorization Check (BOLA Remediation)
    const isOwner = candidate.user_id === callerId;
    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", callerId).eq("role", "admin").maybeSingle();
    const isAdmin = !!roleData;
    let hasCompanyAccess = false;
    if (candidate.company_id) {
      const { data: memberData } = await supabase.from("company_members").select("company_id").eq("company_id", candidate.company_id).eq("user_id", callerId).maybeSingle();
      hasCompanyAccess = !!memberData;
    }
    if (!(isOwner || isAdmin || hasCompanyAccess)) {
      return new Response(JSON.stringify({ error: "Forbidden: You do not have permission to access this candidate" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch job if provided
    let job = null;
    if (jobId) {
      const { data } = await supabase.from("jobs").select("*").eq("id", jobId).single();
      job = data;
    } else if (candidate.job_id) {
      const { data } = await supabase.from("jobs").select("*").eq("id", candidate.job_id).single();
      job = data;
    }

    const candidateInfo = `
الاسم: ${candidate.name}
الدور: ${candidate.role || "غير محدد"}
المهارات: ${(candidate.skills || []).join(", ") || "غير محددة"}
الخبرة: ${candidate.experience || "غير محددة"}
التعليم: ${candidate.education || "غير محدد"}
الملخص: ${candidate.summary || "غير متوفر"}
`;

    const jobInfo = job ? `
المسمى الوظيفي: ${job.title}
القسم: ${job.department}
الموقع: ${job.location}
نوع العمل: ${job.type}
مستوى الخبرة: ${job.experience_level || "غير محدد"}
الوصف: ${job.description || "غير متوفر"}
المتطلبات: ${(job.requirements || []).join(", ") || "غير محددة"}
` : "لا توجد وظيفة محددة للمقارنة";

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: isDirectGemini ? "gemini-2.0-flash" : "google/gemini-2.0-flash",
        tools: [
          {
            type: "function",
            function: {
              name: "evaluate_candidate",
              description: "تقييم مدى توافق المرشح مع الوظيفة",
              parameters: {
                type: "object",
                properties: {
                  score: { type: "integer", description: "نسبة التوافق من 0 إلى 100" },
                  summary: { type: "string", description: "ملخص التقييم في 2-3 جمل" },
                  strengths: { type: "array", items: { type: "string" }, description: "نقاط القوة (3-5 نقاط)" },
                  weaknesses: { type: "array", items: { type: "string" }, description: "نقاط الضعف أو الفجوات (2-4 نقاط)" },
                  recommendation: { type: "string", description: "التوصية النهائية: مناسب جداً / مناسب / يحتاج تطوير / غير مناسب" },
                },
                required: ["score", "summary", "strengths", "weaknesses", "recommendation"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "evaluate_candidate" } },
        messages: [
          {
            role: "system",
            content: `أنت خبير موارد بشرية متخصص في تقييم المرشحين. قيّم المرشح التالي بناءً على معلوماته ومدى توافقه مع الوظيفة المطلوبة.
أعط تقييماً عادلاً ودقيقاً مع نسبة توافق من 0 إلى 100.`,
          },
          {
            role: "user",
            content: `قيّم هذا المرشح:\n\n--- معلومات المرشح ---${candidateInfo}\n--- معلومات الوظيفة ---${jobInfo}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز حد الطلبات. يرجى المحاولة لاحقاً." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "يرجى إضافة رصيد لاستخدام التقييم الذكي." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("خطأ في خدمة الذكاء الاصطناعي");
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("لم يتم الحصول على تقييم من AI");

    const evaluation = JSON.parse(toolCall.function.arguments);

    // Save to DB
    await supabase
      .from("candidates")
      .update({
        ai_score: evaluation.score,
        ai_evaluation: JSON.stringify(evaluation),
      })
      .eq("id", candidateId);

    return new Response(JSON.stringify(evaluation), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("evaluate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});


async function getResponseError(response: Response): Promise<string> {
  try {
    const json = await response.clone().json();
    if (json && json.error) {
      if (typeof json.error === "string") return json.error;
      if (json.error.message) return json.error.message;
      return JSON.stringify(json.error);
    }
  } catch {
    try {
      const text = await response.clone().text();
      if (text) return text.slice(0, 200);
    } catch (err) {
      console.warn("Failed to parse response text:", err);
    }
  }
  return "خطأ غير معروف في الذكاء الاصطناعي";
}