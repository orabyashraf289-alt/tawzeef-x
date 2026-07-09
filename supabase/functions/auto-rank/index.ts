import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildCandidateText(c: any): string {
  return [
    c.name,
    c.role,
    c.summary,
    (c.skills || []).join(", "),
    c.experience,
    c.education,
    c.location,
  ]
    .filter(Boolean)
    .join(" | ");
}

function hashEmbed(text: string, dim = 128): number[] {
  const v = new Array(dim).fill(0);
  const tokens = text.toLowerCase().split(/[\s,/|.;:!?()\[\]{}"'`-]+/).filter(Boolean);
  for (const tok of tokens) {
    let h = 5381;
    for (let i = 0; i < tok.length; i++) h = ((h << 5) + h) ^ tok.charCodeAt(i);
    const idx = Math.abs(h) % dim;
    v[idx] += 1;
  }
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map(x => x / norm);
}

function cosine(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

function localRank(job: any, candidates: any[]): any[] {
  const jobText = `${job.title} ${job.department || ""} ${job.description || ""} ${(job.requirements || []).join(" ")}`;
  const jobVec = hashEmbed(jobText);
  
  return candidates.map(c => {
    const candText = buildCandidateText(c);
    const candVec = hashEmbed(candText);
    const sim = cosine(candVec, jobVec);
    
    // Substring boosts
    const lowerCandText = candText.toLowerCase();
    const jobTokens = jobText.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    const matched = jobTokens.filter(t => lowerCandText.includes(t));
    const score = Math.min(95, Math.max(10, Math.round(((sim * 0.7) + (matched.length * 0.05)) * 100)));
    
    // Construct matched skills text
    const matchedSkills = (c.skills || []).filter((s: string) => jobText.toLowerCase().includes(s.toLowerCase()));
    const summary = matchedSkills.length > 0
      ? `تطابق بنسبة ${score}% بناءً على المهارات المشتركة: ${matchedSkills.slice(0, 3).join("، ")}.`
      : `تطابق بنسبة ${score}% بناءً على تحليل السيرة الذاتية دلالياً.`;
      
    return {
      candidate_id: c.id,
      score,
      summary
    };
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { jobId } = await req.json();
    if (!jobId) throw new Error("jobId مطلوب");

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

    // Fetch candidates for this job
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

    let rankings: any[] = [];
    let isFallback = false;

    const LOVABLE_API_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.warn("AI key not configured. Using local rank fallback.");
      rankings = localRank(job, candidates);
      isFallback = true;
    } else {
      const isDirectGemini = (LOVABLE_API_KEY.startsWith("AIza") || LOVABLE_API_KEY.startsWith("AQ."));
      const API_URL = isDirectGemini
        ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
        : "https://api.lovable.dev/v1/chat/completions";

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
الخبرة: ${c.experience || "غير حددة"}
التعليم: ${c.education || "غير محدد"}
الملخص: ${c.summary || "غير متوفر"}
`).join("\n");

      try {
        const response = await fetch(API_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: isDirectGemini ? "gemini-2.0-flash" : "google/gemini-2.0-flash",
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
          throw new Error(`AI service returned error status: ${response.status}`);
        }

        const aiData = await response.json();
        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
        if (!toolCall) throw new Error("No tool call returned by AI service");

        const parsed = JSON.parse(toolCall.function.arguments);
        rankings = parsed.rankings || [];
      } catch (aiErr) {
        console.warn("AI service call failed, falling back to local rank:", aiErr);
        rankings = localRank(job, candidates);
        isFallback = true;
      }
    }

    // Update each candidate's ai_score
    let updated = 0;
    for (const r of rankings) {
      const { error } = await supabase
        .from("candidates")
        .update({ ai_score: r.score, ai_evaluation: JSON.stringify({ score: r.score, summary: r.summary }) })
        .eq("id", r.candidate_id);
      if (!error) updated++;
    }

    return new Response(JSON.stringify({ ranked: updated, rankings, isFallback }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("auto-rank error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});