import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    // Get today's scheduled interviews
    const { data: interviews, error } = await supabase
      .from("interviews")
      .select("*")
      .eq("date", todayStr)
      .eq("status", "مجدولة");

    if (error) {
      console.error("Query error:", error);
      throw error;
    }

    let remindersCreated = 0;

    for (const interview of interviews || []) {
      const [hours, minutes] = interview.time.split(":").map(Number);
      const interviewTime = new Date(now);
      interviewTime.setHours(hours, minutes, 0, 0);

      const diffMs = interviewTime.getTime() - now.getTime();
      const diffMin = diffMs / 60000;

      if (diffMin > 30 && diffMin <= 90) {
        // Check if reminder already sent
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", interview.user_id)
          .eq("type", "interview_reminder")
          .ilike("title", `%تذكير%${interview.candidate_name}%`)
          .gte("created_at", todayStr)
          .limit(1);

        if (existing && existing.length > 0) continue;

        // Build notification description with meeting link
        const meetingInfo = interview.meeting_url
          ? `\n🔗 رابط المقابلة: ${interview.meeting_url}`
          : "";
        const interviewerInfo = interview.interviewer
          ? ` | المحاور: ${interview.interviewer}`
          : "";

        // Create reminder notification for the recruiter/owner
        await supabase.from("notifications").insert({
          user_id: interview.user_id,
          title: `⏰ تذكير: مقابلة ${interview.candidate_name} بعد ساعة`,
          description: `لديك مقابلة مع ${interview.candidate_name} لوظيفة ${interview.position} الساعة ${interview.time.slice(0, 5)}${interviewerInfo}${meetingInfo}`,
          type: "interview_reminder",
        });

        // Send email reminder to the recruiter/interviewer
        try {
          const emailHtml = `
            <div dir="rtl" style="font-family: 'Cairo', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #f8fafc; border-radius: 16px;">
              <div style="background: linear-gradient(135deg, #f59e0b, #eab308); padding: 24px 32px; border-radius: 12px; margin-bottom: 24px;">
                <h1 style="color: white; margin: 0; font-size: 22px;">⏰ تذكير بموعد مقابلة</h1>
              </div>
              <div style="background: white; padding: 28px; border-radius: 12px; border: 1px solid #e2e8f0;">
                <p style="font-size: 16px; color: #1e293b;">لديك مقابلة قادمة خلال <strong>ساعة</strong>:</p>
                <div style="background: #fffbeb; padding: 16px 20px; border-radius: 10px; margin: 20px 0; border: 1px solid #fde68a;">
                  <p style="margin: 6px 0; font-size: 14px; color: #92400e;">👤 <strong>المرشح:</strong> ${interview.candidate_name}</p>
                  <p style="margin: 6px 0; font-size: 14px; color: #92400e;">💼 <strong>الوظيفة:</strong> ${interview.position}</p>
                  <p style="margin: 6px 0; font-size: 14px; color: #92400e;">⏰ <strong>الوقت:</strong> ${interview.time.slice(0, 5)}</p>
                  ${interview.interviewer ? `<p style="margin: 6px 0; font-size: 14px; color: #92400e;">🎤 <strong>المحاور:</strong> ${interview.interviewer}</p>` : ""}
                </div>
                ${interview.meeting_url ? `
                  <a href="${interview.meeting_url}" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #3b82f6); color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-size: 15px; font-weight: bold;">
                    🎥 انضم للمقابلة الآن
                  </a>
                  <p style="font-size: 12px; color: #94a3b8; margin-top: 12px; word-break: break-all;">${interview.meeting_url}</p>
                ` : ""}
              </div>
            </div>
          `;

          // Send email to the recruiter (owner)
          await fetch(`${supabaseUrl}/functions/v1/send-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              user_id: interview.user_id,
              notify_recruiter: true,
              subject: `⏰ تذكير: مقابلة ${interview.candidate_name} الساعة ${interview.time.slice(0, 5)}`,
              html: emailHtml,
            }),
          });
        } catch (emailErr) {
          console.error("Failed to send reminder email:", emailErr);
          // Don't fail the whole function if email fails
        }

        remindersCreated++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, reminders_created: remindersCreated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("interview-reminders error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
