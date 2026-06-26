import nodemailer from "npm:nodemailer@6.9.16";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALGO = "AES-GCM";

async function deriveKey(secret: string): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: new TextEncoder().encode("smtp-settings-salt"), iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: ALGO, length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function decrypt(encoded: string, key: CryptoKey): Promise<string> {
  try {
    const combined = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    const decrypted = await crypto.subtle.decrypt({ name: ALGO, iv }, key, data);
    return new TextDecoder().decode(decrypted);
  } catch {
    return encoded;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { applicant_email, applicant_name, job_id, job_title } = await req.json();

    if (!applicant_email || !applicant_name || !job_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Find the candidate record created by the trigger
    const { data: candidate } = await supabase
      .from("candidates")
      .select("tracking_code, user_id")
      .eq("email", applicant_email)
      .eq("job_id", job_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!candidate?.tracking_code) {
      return new Response(JSON.stringify({ success: true, message: "No tracking code found, skipped" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const trackingCode = candidate.tracking_code;
    const portalUrl = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/apply\/.*/, "") || "";
    const portalLink = `${portalUrl}/portal`;

    // Check if job has linked assessments
    const { data: jobAssessments } = await supabase
      .from("assessments")
      .select("id, title, token, duration_minutes")
      .eq("job_id", job_id)
      .eq("is_active", true);

    // Load SMTP settings from the job owner
    let smtpHost = "smtp.gmail.com";
    let smtpPort = 465;
    let smtpSecure = true;
    let smtpUser = Deno.env.get("GMAIL_USER") || "";
    let smtpPass = Deno.env.get("GMAIL_APP_PASSWORD") || "";
    let senderName = "فريق التوظيف";

    if (candidate.user_id) {
      const { data: settings } = await supabase
        .from("email_settings")
        .select("*")
        .eq("user_id", candidate.user_id)
        .eq("is_active", true)
        .maybeSingle();

      if (settings) {
        smtpHost = settings.smtp_host;
        smtpPort = settings.smtp_port;
        smtpSecure = settings.smtp_secure;
        smtpUser = settings.smtp_user;
        senderName = settings.sender_name;
        const encKey = await deriveKey(serviceKey);
        smtpPass = await decrypt(settings.smtp_password, encKey);
      }
    }

    if (!smtpUser || !smtpPass) {
      console.log("No email credentials configured, skipping confirmation email");
      return new Response(JSON.stringify({ success: true, message: "Email credentials not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: { user: smtpUser, pass: smtpPass },
    });

    // Build assessment section for email if assessments exist
    let assessmentSection = "";
    if (jobAssessments && jobAssessments.length > 0) {
      const assessmentLinks = jobAssessments.map(a => {
        const assessmentUrl = `${portalUrl}/assessment/${a.token}`;
        return `
          <div style="background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 12px; padding: 16px; margin: 8px 0; text-align: center;">
            <p style="font-size: 14px; font-weight: 600; color: #4f46e5; margin: 0 0 4px;">📝 ${a.title}</p>
            <p style="font-size: 12px; color: #6b7280; margin: 0 0 12px;">المدة: ${a.duration_minutes} دقيقة</p>
            <a href="${assessmentUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #ffffff; padding: 10px 28px; border-radius: 10px; text-decoration: none; font-size: 14px; font-weight: 700;">ابدأ الاختبار</a>
          </div>
        `;
      }).join("");

      assessmentSection = `
        <div style="margin: 24px 0; padding: 20px; background: #f5f3ff; border-radius: 16px; border: 1px solid #e0e7ff;">
          <h3 style="font-size: 16px; color: #4338ca; margin: 0 0 8px; text-align: center;">🎯 اختبارات مطلوبة</h3>
          <p style="font-size: 13px; color: #6366f1; margin: 0 0 12px; text-align: center;">كجزء من عملية التقييم، يرجى إكمال الاختبارات التالية:</p>
          ${assessmentLinks}
        </div>
      `;
    }

    const emailHtml = `
      <div dir="rtl" style="font-family: 'Cairo', 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background: #f8fafb;">
        <div style="background: linear-gradient(135deg, #0f172a, #1e293b 50%, #0d9488); padding: 36px 32px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0 0 8px; font-size: 24px; font-weight: 700;">تم استلام طلبك بنجاح ✅</h1>
          <p style="color: rgba(255,255,255,0.7); margin: 0; font-size: 14px;">شكراً لتقدمك للعمل معنا</p>
        </div>
        
        <div style="padding: 32px; background: #ffffff;">
          <p style="font-size: 16px; color: #1e293b; margin: 0 0 16px;">مرحباً <strong>${applicant_name}</strong>،</p>
          <p style="font-size: 15px; color: #475569; line-height: 1.8; margin: 0 0 24px;">
            نود إعلامك بأنه تم استلام طلبك بنجاح لوظيفة <strong style="color: #0d9488;">${job_title || "الوظيفة المطلوبة"}</strong>. 
            فريقنا سيقوم بمراجعة طلبك وسنتواصل معك في أقرب وقت.
          </p>

          <div style="background: linear-gradient(135deg, #f0fdfa, #f8fafb); border: 2px solid #ccfbf1; border-radius: 16px; padding: 24px; text-align: center; margin: 0 0 24px;">
            <p style="font-size: 13px; color: #0d9488; margin: 0 0 8px; font-weight: 600;">الرقم المرجعي لطلبك</p>
            <p style="font-size: 32px; font-weight: 800; color: #0f172a; margin: 0 0 4px; letter-spacing: 4px; font-family: 'Courier New', monospace;">${trackingCode}</p>
            <p style="font-size: 12px; color: #64748b; margin: 0;">احتفظ بهذا الرقم لمتابعة حالة طلبك</p>
          </div>

          ${assessmentSection}

          <div style="text-align: center; margin: 0 0 24px;">
            <a href="${portalLink}" style="display: inline-block; background: linear-gradient(135deg, #0d9488, #0f766e); color: #ffffff; padding: 14px 40px; border-radius: 12px; text-decoration: none; font-size: 15px; font-weight: 700; box-shadow: 0 4px 14px rgba(13, 148, 136, 0.3);">
              📋 تتبع حالة طلبك
            </a>
          </div>

          <div style="background: #f1f5f9; border-radius: 12px; padding: 16px 20px;">
            <p style="font-size: 13px; color: #475569; margin: 0; line-height: 1.8;">
              <strong>كيفية المتابعة:</strong><br/>
              1. اضغط على زر "تتبع حالة طلبك" أعلاه<br/>
              2. أدخل الرقم المرجعي: <strong style="color: #0d9488;">${trackingCode}</strong><br/>
              3. ستتمكن من رؤية حالة طلبك وجميع التحديثات
            </p>
          </div>
        </div>

        <div style="padding: 20px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="font-size: 12px; color: #94a3b8; margin: 0;">بالتوفيق! — ${senderName}</p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"${senderName}" <${smtpUser}>`,
      to: applicant_email,
      subject: `تأكيد استلام طلبك — الرقم المرجعي: ${trackingCode}`,
      html: emailHtml,
    });

    console.log(`Application confirmation email sent to ${applicant_email} with tracking code ${trackingCode}${jobAssessments?.length ? ` + ${jobAssessments.length} assessment links` : ""}`);

    return new Response(JSON.stringify({ success: true, tracking_code: trackingCode }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error sending confirmation email:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
