import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function buildResultsEmail(
  candidateName: string,
  totalScore: number,
  maxScore: number,
  percentage: number,
  answers: { question_text: string; points_earned: number; max_points: number; ai_feedback?: string; ai_strengths?: string; ai_improvements?: string; ai_evaluated?: boolean }[]
): string {
  const passed = percentage >= 70;

  const answerRows = answers.map((a, i) => {
    const scoreColor = a.points_earned >= a.max_points * 0.7 ? "#10b981" : "#ef4444";
    let feedbackHtml = "";
    if (a.ai_evaluated && a.ai_feedback) {
      feedbackHtml = `
        <div style="margin-top: 8px; padding: 8px 12px; background: #f8fafc; border-radius: 6px; font-size: 13px; color: #475569;">
          ${a.ai_feedback}
        </div>`;
      if (a.ai_strengths) {
        feedbackHtml += `
        <div style="margin-top: 4px; padding: 6px 12px; background: #f0fdf4; border-radius: 6px; font-size: 12px; color: #166534;">
          ✅ ${a.ai_strengths}
        </div>`;
      }
      if (a.ai_improvements) {
        feedbackHtml += `
        <div style="margin-top: 4px; padding: 6px 12px; background: #fffbeb; border-radius: 6px; font-size: 12px; color: #92400e;">
          💡 ${a.ai_improvements}
        </div>`;
      }
    }

    return `
    <div style="padding: 14px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 10px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div style="font-size: 14px; font-weight: 500; color: #1e293b;">${i + 1}. ${a.question_text}</div>
      </div>
      <div style="margin-top: 6px;">
        <span style="display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 13px; font-weight: 600; color: #fff; background: ${scoreColor};">
          ${a.points_earned}/${a.max_points}
        </span>
      </div>
      ${feedbackHtml}
    </div>`;
  }).join("");

  return `
  <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
    <div style="background: linear-gradient(135deg, ${passed ? "#10b981, #059669" : "#ef4444, #dc2626"}); padding: 30px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">${passed ? "🎉 مبروك! لقد نجحت" : "📋 نتائج الاختبار"}</h1>
    </div>
    <div style="padding: 30px;">
      <p style="color: #374151; font-size: 16px; margin: 0 0 20px;">مرحباً <strong>${candidateName}</strong>،</p>
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px;">نشكرك على إكمال الاختبار. فيما يلي نتائجك التفصيلية:</p>

      <div style="background: #f8fafc; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
        <div style="font-size: 48px; font-weight: 800; color: ${passed ? "#10b981" : "#ef4444"};">${percentage}%</div>
        <div style="font-size: 16px; color: #6b7280;">${totalScore} / ${maxScore} نقطة</div>
        <div style="margin-top: 8px;">
          <span style="display: inline-block; padding: 4px 16px; border-radius: 12px; font-size: 14px; font-weight: 600; color: #fff; background: ${passed ? "#10b981" : "#ef4444"};">
            ${passed ? "ناجح ✓" : "لم ينجح"}
          </span>
        </div>
      </div>

      <h3 style="color: #1e293b; margin: 0 0 12px; font-size: 16px;">📝 التفاصيل:</h3>
      ${answerRows}

      <p style="color: #9ca3af; font-size: 12px; margin: 24px 0 0; text-align: center;">هذه الرسالة مُرسلة تلقائياً من نظام التوظيف</p>
    </div>
  </div>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { candidate_name, candidate_email, assessment_id, total_score, max_score, percentage, answers } = await req.json();

    if (!candidate_email || !candidate_name) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get assessment title
    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: assessment } = await supabase.from("assessments").select("title").eq("id", assessment_id).single();

    const subject = `نتائج اختبار: ${assessment?.title || "الاختبار"}`;
    const html = buildResultsEmail(candidate_name, total_score, max_score, percentage, answers || []);

    // Send via send-email function
    const resp = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ to: candidate_email, subject, html }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("Email send failed:", errText);
      return new Response(JSON.stringify({ error: "Failed to send email" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
