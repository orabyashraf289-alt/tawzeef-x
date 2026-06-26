import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { candidateId, trackingCode, name, email, phone, date, time } = await req.json();

    if (!name || !date || !time) {
      return new Response(JSON.stringify({ error: "يرجى ملء الحقول المطلوبة" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find candidate to get user_id (owner) for the interview record
    let candidate = null;
    if (candidateId) {
      const { data } = await supabase.from("candidates").select("*").eq("id", candidateId).single();
      candidate = data;
    } else if (trackingCode) {
      const { data } = await supabase.from("candidates").select("*").eq("tracking_code", trackingCode.toUpperCase().trim()).single();
      candidate = data;
    }

    if (!candidate) {
      // Create interview without candidate link - use a system approach
      return new Response(JSON.stringify({ error: "المرشح غير موجود. يرجى التحقق من رمز التتبع." }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create interview record
    const { data: interview, error } = await supabase.from("interviews").insert({
      user_id: candidate.user_id,
      candidate_id: candidate.id,
      candidate_name: name,
      position: candidate.role || "غير محدد",
      date,
      time,
      type: "عن بُعد",
      status: "مجدولة",
      notes: `تم الحجز ذاتياً بواسطة المرشح${email ? ` | البريد: ${email}` : ""}${phone ? ` | الجوال: ${phone}` : ""}`,
    }).select().single();

    if (error) {
      console.error("Insert error:", error);
      throw new Error("فشل حجز المقابلة");
    }

    // Update candidate stage if still at early stages
    const earlyStages = ["تقديم الطلب", "مراجعة السيرة"];
    if (earlyStages.includes(candidate.stage || "تقديم الطلب")) {
      await supabase.from("candidates").update({ stage: "فحص هاتفي" }).eq("id", candidate.id);
    }

    // Create notification for the recruiter
    await supabase.from("notifications").insert({
      user_id: candidate.user_id,
      title: `${name} حجز موعد مقابلة`,
      description: `حجز المرشح ${name} موعد مقابلة يوم ${date} الساعة ${time}`,
      type: "interview",
    });

    return new Response(JSON.stringify({ success: true, interviewId: interview.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("book-interview error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
