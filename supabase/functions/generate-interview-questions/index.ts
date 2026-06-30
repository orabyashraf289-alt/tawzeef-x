import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobTitle, jobDescription, jobRequirements, candidateName, candidateSkills, candidateExperience, count = 5 } = await req.json();

    if (!jobTitle) {
      return new Response(JSON.stringify({ error: "Job title is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `أنت خبير موارد بشرية متخصص في إجراء المقابلات الوظيفية. قم بإنشاء ${count} أسئلة مقابلة مخصصة ومهنية باللغة العربية.

معلومات الوظيفة:
- المسمى الوظيفي: ${jobTitle}
${jobDescription ? `- الوصف: ${jobDescription}` : ""}
${jobRequirements ? `- المتطلبات: ${Array.isArray(jobRequirements) ? jobRequirements.join("، ") : jobRequirements}` : ""}

${candidateName ? `معلومات المرشح:
- الاسم: ${candidateName}
${candidateSkills ? `- المهارات: ${Array.isArray(candidateSkills) ? candidateSkills.join("، ") : candidateSkills}` : ""}
${candidateExperience ? `- الخبرة: ${candidateExperience}` : ""}` : ""}

أنشئ أسئلة متنوعة تشمل:
1. أسئلة سلوكية (Behavioral)
2. أسئلة تقنية/مهنية
3. أسئلة حل المشكلات
4. أسئلة عن الدافع والملاءمة الثقافية

أجب بصيغة JSON فقط كمصفوفة من الكائنات بالشكل:
[{"question": "...", "category": "behavioral|technical|problem_solving|cultural_fit", "difficulty": "easy|medium|hard", "tip": "نصيحة مختصرة للمُقابِل"}]`;

    const apiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY or LOVABLE_API_KEY is not configured");
    const isDirectGemini = (apiKey.startsWith("AIza") || apiKey.startsWith("AQ."));
    const API_URL = isDirectGemini
      ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
      : "https://api.lovable.dev/v1/chat/completions";
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: isDirectGemini ? "gemini-2.5-flash" : "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      throw new Error(await getResponseError(resp));
    }

    const result = await resp.json();
    const content = result.choices?.[0]?.message?.content || "[]";

    let questions;
    try {
      const parsed = JSON.parse(content);
      questions = Array.isArray(parsed) ? parsed : parsed.questions || [];
    } catch {
      questions = [];
    }

    return new Response(JSON.stringify({ questions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error generating interview questions:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
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