import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { jobId } = await req.json();
    if (!jobId) throw new Error("jobId مطلوب");

    const LOVABLE_API_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("GEMINI_API_KEY or LOVABLE_API_KEY is not configured");
    const isDirectGemini = (LOVABLE_API_KEY.startsWith("AIza") || LOVABLE_API_KEY.startsWith("AQ."));
    const API_URL = isDirectGemini
      ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
      : "https://api.lovable.dev/v1/chat/completions";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const callerId = userData.user.id;

    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Fetch job + ownership check
    const { data: job, error: jobErr } = await supabase.from("jobs").select("*").eq("id", jobId).single();
    if (jobErr || !job) throw new Error("الوظيفة غير موجودة");
    if (job.user_id !== callerId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch candidates for this job that haven't been scored yet
    const { data: candidates, error: candErr } = await supabase
      .from("candidates")
      .select("*")
      .eq("job_id", jobId);
    if (candErr) throw candErr;
    if (!candidates || candidates.length === 0) {
      return new Response(JSON.stringify({ message: "لا يوجد مرشحون لهذه الوظيفة", ranked: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const jobRequirements = `
المسمى: ${job.title}
القسم: ${job.department}
الموقع: ${job.location}
النوع: ${job.type}
الخبرة المطلوبة: ${job.experience_level || "غير محدد"}
الوصف: ${job.description || "غير متوفر"}
المتطلبات: ${(job.requirements || []).join(", ") || "غير محددة"}
`;

    const candidatesList = candidates.map((c, i) => `
--- مرشح ${i + 1} (${c.id}) ---
الاسم: ${c.name}
المهارات: ${(c.skills || []).join(", ") || "غير محددة"}
الخبرة: ${c.experience || "غير محددة"}
التعليم: ${c.education || "غير محدد"}
الملخص: ${c.summary || "غير متوفر"}
`).join("\n");

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: isDirectGemini ? "gemini-2.5-flash" : "google/gemini-3-flash-preview",
        tools: [{
          type: "function",
          function: {
            name: "rank_candidates",
            description: "ترتيب المرشحين حسب التوافق مع الوظيفة",
            parameters: {
              type: "object",
              properties: {
                rankings: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      candidate_id: { type: "string" },
                      score: { type: "integer", description: "نسبة التوافق 0-100" },
                      summary: { type: "string", description: "سبب التقييم في جملة واحدة" },
                    },
                    required: ["candidate_id", "score", "summary"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["rankings"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "rank_candidates" } },
        messages: [
          {
            role: "system",
            content: "أنت خبير موارد بشرية. رتّب المرشحين حسب مدى توافقهم مع متطلبات الوظيفة. أعطِ كل مرشح نسبة من 0 إلى 100 وسبب مختصر.",
          },
          {
            role: "user",
            content: `رتّب هؤلاء المرشحين حسب توافقهم مع هذه الوظيفة:\n\n${jobRequirements}\n\nالمرشحون:\n${candidatesList}`,
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
        return new Response(JSON.stringify({ error: "يرجى إضافة رصيد لاستخدام الترتيب الذكي." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("خطأ في خدمة الذكاء الاصطناعي");
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("لم يتم الحصول على ترتيب");

    const { rankings } = JSON.parse(toolCall.function.arguments);

    // Update each candidate's ai_score
    let updated = 0;
    for (const r of rankings) {
      const { error } = await supabase
        .from("candidates")
        .update({ ai_score: r.score, ai_evaluation: JSON.stringify({ score: r.score, summary: r.summary }) })
        .eq("id", r.candidate_id);
      if (!error) updated++;
    }

    return new Response(JSON.stringify({ ranked: updated, rankings }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("auto-rank error:", e);
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
    } catch {}
  }
  return "خطأ غير معروف في الذكاء الاصطناعي";
}