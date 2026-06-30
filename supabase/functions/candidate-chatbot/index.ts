import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, candidateContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("GEMINI_API_KEY or LOVABLE_API_KEY is not configured");
    const isDirectGemini = (LOVABLE_API_KEY.startsWith("AIza") || LOVABLE_API_KEY.startsWith("AQ."));
    const API_URL = isDirectGemini
      ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
      : "https://api.lovable.dev/v1/chat/completions";

    let contextInfo = "";
    if (candidateContext) {
      contextInfo = `
بيانات المرشح الحالي:
- الاسم: ${candidateContext.name}
- الوظيفة: ${candidateContext.jobTitle || "غير محدد"}
- المرحلة الحالية: ${candidateContext.stage}
- الحالة: ${candidateContext.status}
- تاريخ التقديم: ${candidateContext.appliedAt}
- رمز التتبع: ${candidateContext.trackingCode}
`;
    }

    const systemPrompt = `أنت مساعد ذكي لبوابة المرشحين في نظام توظيف "توظيف-إكس" (Tawzeef-X).
مهمتك مساعدة المرشحين بالإجابة على أسئلتهم حول:
1. حالة طلباتهم ومراحل التوظيف
2. ما يتوقعونه في كل مرحلة
3. نصائح عامة للمقابلات
4. معلومات عن عملية التوظيف

${contextInfo}

قواعد مهمة:
- أجب باللغة العربية دائماً إلا إذا سأل المرشح بالإنجليزية
- كن ودوداً ومشجعاً
- لا تشارك معلومات سرية عن الشركة أو مرشحين آخرين
- إذا لم تكن متأكداً من إجابة، انصح المرشح بالتواصل مع قسم الموارد البشرية
- اجعل إجاباتك مختصرة وواضحة
- استخدم الإيموجي بشكل معتدل

مراحل التوظيف المعتادة:
1. تقديم الطلب - استلام الطلب ومراجعته
2. مراجعة السيرة - فحص السيرة الذاتية والمؤهلات  
3. فحص هاتفي - مكالمة تعارف أولية
4. مقابلة تقنية - اختبار المهارات الفنية
5. مقابلة نهائية - مقابلة مع الإدارة
6. العرض الوظيفي - تقديم عرض العمل`;

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: isDirectGemini ? "gemini-2.5-flash" : "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز حد الطلبات، حاول لاحقاً" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "يرجى إعادة شحن الرصيد" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const err = await getResponseError(response);
      console.error("AI gateway error:", response.status, err);
      return new Response(JSON.stringify({ error: err }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("candidate-chatbot error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
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