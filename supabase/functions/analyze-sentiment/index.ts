const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, context } = await req.json();

    if (!text) {
      return new Response(JSON.stringify({ error: "Text is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `حلل المشاعر والنبرة في النص التالي${context ? ` (سياق: ${context})` : ""}:

"${text}"

أجب بصيغة JSON فقط بالشكل:
{
  "sentiment": "positive" | "negative" | "neutral" | "mixed",
  "confidence": 0.0-1.0,
  "summary_ar": "ملخص مختصر بالعربية عن النبرة العامة",
  "key_points": ["نقطة 1", "نقطة 2"],
  "recommendation": "توصية مختصرة للمُقابِل"
}`;

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

    if (!resp.ok) throw new Error(await getResponseError(resp));

    const result = await resp.json();
    const content = result.choices?.[0]?.message?.content || "{}";
    const analysis = JSON.parse(content);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Sentiment analysis error:", err);
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