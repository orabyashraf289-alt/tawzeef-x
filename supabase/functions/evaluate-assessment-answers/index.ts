import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { answers } = await req.json();
    // answers: Array<{ question_text, question_type, answer, correct_answer?, code_language?, points }>

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return new Response(JSON.stringify({ error: "No answers to evaluate" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("GEMINI_API_KEY or LOVABLE_API_KEY not configured");
    const isDirectGemini = (LOVABLE_API_KEY.startsWith("AIza") || LOVABLE_API_KEY.startsWith("AQ."));
    const API_URL = isDirectGemini
      ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
      : "https://api.lovable.dev/v1/chat/completions";

    // Build evaluation prompt
    const questionsBlock = answers.map((a, i) => {
      let block = `--- سؤال ${i + 1} (${a.points} نقاط) ---\nالنوع: ${a.question_type === "code" ? "كود" : "سؤال مفتوح"}\n`;
      if (a.code_language) block += `اللغة: ${a.code_language}\n`;
      block += `السؤال: ${a.question_text}\n`;
      if (a.correct_answer) block += `الإجابة المرجعية: ${a.correct_answer}\n`;
      block += `إجابة المرشح: ${a.answer || "(لم يتم الإجابة)"}`;
      return block;
    }).join("\n\n");

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: isDirectGemini ? "gemini-2.0-flash" : "google/gemini-2.0-flash",
        messages: [
          {
            role: "system",
            content: `أنت مقيّم خبير للاختبارات الوظيفية. قيّم كل إجابة وأعطِ درجة من 0 إلى الحد الأقصى للنقاط.
للأسئلة المفتوحة: قيّم الدقة، الشمولية، والوضوح.
لأسئلة الكود: قيّم صحة المنطق، جودة الكود، معالجة الأخطاء، والكفاءة.
إذا لم يُجب المرشح، أعطِ 0.
أعد النتائج باستخدام الأداة المحددة.`
          },
          { role: "user", content: questionsBlock }
        ],
        tools: [{
          type: "function",
          function: {
            name: "submit_evaluations",
            description: "Submit evaluation results for all answers",
            parameters: {
              type: "object",
              properties: {
                evaluations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      question_index: { type: "number", description: "0-based index" },
                      score: { type: "number", description: "Score awarded (0 to max points)" },
                      feedback: { type: "string", description: "Brief feedback in Arabic" },
                      strengths: { type: "string", description: "What was good (Arabic)" },
                      improvements: { type: "string", description: "What to improve (Arabic)" },
                    },
                    required: ["question_index", "score", "feedback"],
                    additionalProperties: false,
                  }
                }
              },
              required: ["evaluations"],
              additionalProperties: false,
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "submit_evaluations" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const err = await getResponseError(response);
      console.error("AI error:", response.status, err);
      throw new Error(err);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("evaluate-assessment-answers error:", e);
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