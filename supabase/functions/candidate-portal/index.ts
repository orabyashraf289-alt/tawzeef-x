import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { trackingCode, email } = await req.json();
    
    if (!trackingCode && !email) {
      return new Response(JSON.stringify({ error: "يرجى إدخال رمز التتبع أو البريد الإلكتروني" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (email) {
      const cleanEmail = email.trim().toLowerCase();
      // Find candidate(s) by email
      const { data: candidates, error: dbErr } = await supabase
        .from("candidates")
        .select("id, name, role, tracking_code, job_id, email");

      if (dbErr) {
        console.error("DB error finding candidates by email:", dbErr);
        throw new Error("حدث خطأ أثناء معالجة الطلب");
      }

      const matchedCandidates = (candidates || []).filter(c => c.email && c.email.trim().toLowerCase() === cleanEmail);

      // If found, send email with tracking code(s)
      if (matchedCandidates.length > 0) {
        // Fetch job titles
        const jobIds = [...new Set(matchedCandidates.filter(c => c.job_id).map(c => c.job_id))];
        const jobsMap: Record<string, string> = {};
        if (jobIds.length > 0) {
          const { data: jobs } = await supabase.from("jobs").select("id, title").in("id", jobIds);
          if (jobs) {
            jobs.forEach(j => { jobsMap[j.id] = j.title; });
          }
        }

        const siteUrl = req.headers.get("origin") || "https://tawzeefx.com";
        const trackingList = matchedCandidates.map(c => {
          const jobTitle = c.job_id ? jobsMap[c.job_id] || c.role : c.role;
          return `<li><strong>وظيفة ${jobTitle || "غير محددة"}:</strong> رمز التتبع هو <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-family:monospace;font-size:14px;">${c.tracking_code}</code> (<a href="${siteUrl}/candidate-portal?code=${c.tracking_code}" style="color:#0ea5e9;text-decoration:none;font-weight:bold;">اضغط هنا للمتابعة مباشرة</a>)</li>`;
        }).join("\n");

        const emailHtml = `
          <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px; background:#ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
            <div style="background: linear-gradient(135deg, #0ea5e9, #0284c7); padding: 24px; border-radius: 8px 8px 0 0; text-align: center; margin:-30px -30px 24px -30px;">
              <h2 style="color: #ffffff; margin: 0; font-size: 22px;">رموز تتبع طلبات التوظيف الخاصة بك 🔑</h2>
            </div>
            <p style="font-size:16px; color:#1e293b;">مرحباً <strong>${matchedCandidates[0].name}</strong>،</p>
            <p style="font-size:15px; color:#475569; line-height:1.6;">تلقينا طلباً لاسترجاع رموز تتبع طلبات التوظيف الخاصة بك على منصة <strong>Tawzeef-X</strong>. إليك رموز التتبع الخاصة بك للوصول لبوابة المتابعة:</p>
            <ul style="line-height: 2; font-size:15px; color:#334155; padding-right: 20px; background:#f8fafc; padding:16px; border-radius:8px; list-style-type:none;">
              ${trackingList}
            </ul>
            <p style="font-size:14px; color:#64748b; margin-top:24px;">إذا لم تكن قد طلبت استرجاع هذه الرموز، يمكنك تجاهل هذا البريد الإلكتروني بأمان.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="font-size: 11px; color: #94a3b8; text-align: center; margin:0;">هذا البريد الإلكتروني مرسل تلقائياً من نظام Tawzeef-X للتوظيف الذكي.</p>
          </div>
        `;

        const mailResp = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            to: cleanEmail,
            subject: "رموز تتبع طلبات التوظيف الخاصة بك — Tawzeef-X",
            html: emailHtml,
          }),
        });

        if (!mailResp.ok) {
          console.error("Failed to send tracking code email:", await mailResp.text());
        }
      }

      return new Response(JSON.stringify({
        success: true,
        message: "إذا كان البريد الإلكتروني مسجلاً لدينا، فقد أرسلنا إليك رسالة بريد إلكتروني تحتوي على رموز التتبع وتفاصيل المتابعة.",
        candidates: []
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Otherwise, query by tracking code (must be exact match)
    const { data: candidates, error } = await supabase
      .from("candidates")
      .select("id, name, role, stage, status, skills, created_at, tracking_code, job_id")
      .eq("tracking_code", trackingCode.toUpperCase().trim());

    if (error) {
      console.error("DB error:", error);
      throw new Error("خطأ في البحث");
    }

    if (!candidates || candidates.length === 0) {
      return new Response(JSON.stringify({ error: "لم يتم العثور على طلبات. تأكد من رمز التتبع وحاول مرة أخرى." }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch job titles for matched candidates
    const jobIds = [...new Set(candidates.filter(c => c.job_id).map(c => c.job_id))];
    const jobsMap: Record<string, string> = {};
    
    if (jobIds.length > 0) {
      const { data: jobs } = await supabase
        .from("jobs")
        .select("id, title, department, location")
        .in("id", jobIds);
      
      if (jobs) {
        jobs.forEach(j => { jobsMap[j.id] = j.title; });
      }
    }

    const result = candidates.map(c => ({
      id: c.id,
      name: c.name,
      role: c.role,
      stage: c.stage || "تقديم الطلب",
      status: c.status,
      skills: c.skills,
      trackingCode: c.tracking_code,
      appliedAt: c.created_at,
      jobTitle: c.job_id ? jobsMap[c.job_id] || null : null,
      aiScore: null, // Restrict ai_score from being viewed in candidate portal
    }));

    return new Response(JSON.stringify({ candidates: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("candidate-portal error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
