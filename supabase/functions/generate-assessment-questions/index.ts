import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { job_title, job_description, requirements, count, types, language } = await req.json();

    if (!job_title) {
      return new Response(
        JSON.stringify({ error: "job_title is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY or LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const isDirectGemini = (LOVABLE_API_KEY.startsWith("AIza") || LOVABLE_API_KEY.startsWith("AQ."));
    const API_URL = isDirectGemini
      ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
      : "https://api.lovable.dev/v1/chat/completions";

    const questionCount = count || 5;
    const questionTypes = types || ["multiple_choice", "true_false", "open_ended"];
    const lang = language || "ar";

    const systemPrompt = lang === "ar"
      ? `أنت خبير في إعداد اختبارات التوظيف. قم بتوليد أسئلة احترافية ومتنوعة لتقييم المرشحين.
يجب أن تكون الأسئلة ذات صلة مباشرة بالوظيفة المطلوبة.`
      : `You are an expert in creating recruitment assessments. Generate professional, diverse questions to evaluate candidates.
Questions must be directly relevant to the job role.`;

    const typeInstructions: Record<string, string> = {
      multiple_choice: lang === "ar"
        ? "اختيار متعدد: 4 خيارات مع تحديد الإجابة الصحيحة"
        : "Multiple choice: 4 options with the correct answer marked",
      true_false: lang === "ar"
        ? "صح/خطأ: سؤال بإجابة صح أو خطأ"
        : "True/False: statement with true or false answer",
      open_ended: lang === "ar"
        ? "سؤال مفتوح: سؤال يتطلب إجابة نصية مع نموذج إجابة"
        : "Open ended: requires text answer with sample answer",
      code: lang === "ar"
        ? "سؤال برمجي: مسألة كود مع لغة البرمجة ونموذج حل"
        : "Code: programming problem with language and sample solution",
    };

    const userPrompt = lang === "ar"
      ? `أنشئ ${questionCount} سؤال اختبار للوظيفة التالية:

الوظيفة: ${job_title}
${job_description ? `الوصف: ${job_description}` : ""}
${requirements && requirements.length > 0 ? `المتطلبات: ${requirements.join("، ")}` : ""}

أنواع الأسئلة المطلوبة:
${questionTypes.map((t: string) => `- ${typeInstructions[t] || t}`).join("\n")}

وزّع الأسئلة بين مستويات الصعوبة: سهل، متوسط، صعب.`
      : `Create ${questionCount} assessment questions for the following job:

Job Title: ${job_title}
${job_description ? `Description: ${job_description}` : ""}
${requirements && requirements.length > 0 ? `Requirements: ${requirements.join(", ")}` : ""}

Required question types:
${questionTypes.map((t: string) => `- ${typeInstructions[t] || t}`).join("\n")}

Distribute questions across difficulty levels: easy, medium, hard.`;

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: isDirectGemini ? "gemini-2.0-flash" : "google/gemini-2.0-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_questions",
              description: "Generate assessment questions for a job position",
              parameters: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question_text: { type: "string", description: "The question text" },
                        question_type: { type: "string", enum: ["multiple_choice", "open_ended", "code", "true_false"] },
                        difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                        correct_answer: { type: "string", description: "Correct answer (for true_false: 'true' or 'false', for open_ended/code: sample answer)" },
                        explanation: { type: "string", description: "Explanation of the correct answer" },
                        code_language: { type: "string", description: "Programming language for code questions" },
                        points: { type: "number", description: "Points for the question (1-5)" },
                        options: {
                          type: "array",
                          description: "Options for multiple choice questions only",
                          items: {
                            type: "object",
                            properties: {
                              option_text: { type: "string" },
                              is_correct: { type: "boolean" },
                            },
                            required: ["option_text", "is_correct"],
                          },
                        },
                      },
                      required: ["question_text", "question_type", "difficulty", "points"],
                    },
                  },
                },
                required: ["questions"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_questions" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI generation failed");
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("No structured response from AI");
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-questions error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
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