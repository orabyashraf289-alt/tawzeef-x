const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { title, department, type, experience } = await req.json();
    if (!title) throw new Error("عنوان الوظيفة مطلوب");

    const LOVABLE_API_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("GEMINI_API_KEY or LOVABLE_API_KEY is not configured");
    const isDirectGemini = (LOVABLE_API_KEY.startsWith("AIza") || LOVABLE_API_KEY.startsWith("AQ."));
    const API_URL = isDirectGemini
      ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
      : "https://api.lovable.dev/v1/chat/completions";

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
            name: "generate_description",
            description: "توليد وصف وظيفي ومتطلبات",
            parameters: {
              type: "object",
              properties: {
                description: { type: "string", description: "وصف الوظيفة (3-5 فقرات باللغة العربية)" },
                requirements: { type: "string", description: "المتطلبات والمؤهلات (كل متطلب في سطر جديد)" },
              },
              required: ["description", "requirements"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "generate_description" } },
        messages: [
          {
            role: "system",
            content: "أنت خبير موارد بشرية سعودي. اكتب وصفاً وظيفياً احترافياً باللغة العربية مع متطلبات واضحة ومحددة. كن دقيقاً وعملياً.",
          },
          {
            role: "user",
            content: `اكتب وصفاً وظيفياً ومتطلبات لهذه الوظيفة:
العنوان: ${title}
القسم: ${department || "غير محدد"}
النوع: ${type || "دوام كامل"}
الخبرة: ${experience || "غير محدد"}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز حد الطلبات." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "يرجى إضافة رصيد." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(await getResponseError(response));
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("لم يتم توليد الوصف");

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-job-description error:", e);
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