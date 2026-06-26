import nodemailer from "npm:nodemailer@6.9.16";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email, fullName, accountType } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: "البريد مطلوب" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const smtpUser = Deno.env.get("GMAIL_USER") || "";
    const smtpPass = Deno.env.get("GMAIL_APP_PASSWORD") || "";

    if (!smtpUser || !smtpPass) {
      console.warn("Gmail credentials not configured, skipping welcome email");
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isCompany = accountType !== "job_seeker";
    const greeting = fullName || "مستخدم جديد";
    const roleLabel = isCompany ? "صاحب شركة" : "باحث عن عمل";
    const dashboardUrl = isCompany ? "/dashboard" : "/seeker-dashboard";

    const html = `
      <div style="margin:0;padding:32px 16px;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;direction:rtl;">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:20px;padding:0;overflow:hidden;box-shadow:0 10px 40px rgba(15,23,42,0.08);">
          
          <!-- Header -->
          <div style="background:linear-gradient(135deg,#0f2847 0%,#1a3a5c 50%,#0d3b66 100%);padding:40px 32px 32px;text-align:center;">
            <div style="display:inline-block;width:56px;height:56px;border-radius:16px;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.15);line-height:56px;font-size:24px;font-weight:900;color:#ffffff;letter-spacing:2px;margin-bottom:16px;">TX</div>
            <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;line-height:1.4;">مرحباً بك في Tawzeef-X! 🎉</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.6);font-size:14px;">منصة التوظيف الذكية</p>
          </div>

          <!-- Body -->
          <div style="padding:32px;">
            <p style="margin:0 0 20px;color:#1e293b;font-size:16px;font-weight:700;">مرحباً ${greeting}! 👋</p>
            
            <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.9;">
              تم إنشاء حسابك بنجاح كـ <strong style="color:#0f2847;">${roleLabel}</strong>. يمكنك الآن الاستفادة من جميع مزايا المنصة.
            </p>

            ${isCompany ? `
            <div style="margin:24px 0;padding:20px;border-radius:14px;background:#f0fdfa;border:1px solid #ccfbf1;">
              <p style="margin:0 0 12px;color:#0f766e;font-size:13px;font-weight:700;">✨ ما يمكنك فعله الآن:</p>
              <ul style="margin:0;padding:0 16px;color:#475569;font-size:13px;line-height:2.2;">
                <li>نشر وظائف وإدارة الإعلانات</li>
                <li>تقييم المرشحين بالذكاء الاصطناعي</li>
                <li>جدولة المقابلات وإصدار العروض</li>
                <li>تتبع خط سير التوظيف بالكامل</li>
              </ul>
            </div>
            ` : `
            <div style="margin:24px 0;padding:20px;border-radius:14px;background:#eff6ff;border:1px solid #dbeafe;">
              <p style="margin:0 0 12px;color:#1d4ed8;font-size:13px;font-weight:700;">✨ ابدأ رحلتك المهنية:</p>
              <ul style="margin:0;padding:0 16px;color:#475569;font-size:13px;line-height:2.2;">
                <li>إنشاء سيرتك الذاتية الاحترافية بسهولة</li>
                <li>تصفح الوظائف المتاحة والتقديم عليها مباشرة</li>
                <li>تتبع حالة جميع طلباتك في مكان واحد</li>
              </ul>
            </div>

            <div style="margin:0 0 24px;padding:20px;border-radius:14px;background:#fefce8;border:1px solid #fef08a;">
              <p style="margin:0 0 12px;color:#a16207;font-size:13px;font-weight:700;">💡 نصائح ذهبية لبناء سيرة ذاتية قوية:</p>
              <ol style="margin:0;padding:0 20px;color:#475569;font-size:13px;line-height:2.4;">
                <li><strong>ابدأ بملخص مهني قصير</strong> — جملتان تصفان خبرتك وأهدافك</li>
                <li><strong>ركّز على الإنجازات لا المهام</strong> — مثال: "زيادة المبيعات بنسبة 30%" أفضل من "مسؤول عن المبيعات"</li>
                <li><strong>أضف المهارات التقنية والشخصية</strong> — اللغات، البرمجيات، القيادة، العمل الجماعي</li>
                <li><strong>استخدم تنسيقاً نظيفاً وبسيطاً</strong> — تجنب الألوان الكثيرة والخطوط المزخرفة</li>
                <li><strong>راجع الأخطاء الإملائية</strong> — خطأ واحد قد يُفقدك الفرصة</li>
                <li><strong>خصّص سيرتك لكل وظيفة</strong> — عدّل الملخص والمهارات حسب متطلبات الوظيفة</li>
              </ol>
            </div>

            <div style="margin:0 0 24px;padding:16px;border-radius:12px;background:#f0fdf4;border:1px solid #bbf7d0;text-align:center;">
              <p style="margin:0;color:#15803d;font-size:13px;font-weight:600;">🎯 نصيحة سريعة: أكمل سيرتك الذاتية بنسبة 100% لتظهر أعلى في نتائج البحث لأصحاب العمل</p>
            </div>
            `}

            <div style="text-align:center;margin:28px 0;">
              <a href="https://ai-hire-buddy-22.lovable.app${dashboardUrl}" style="display:inline-block;padding:14px 40px;border-radius:12px;background:linear-gradient(135deg,#0f2847,#1a4a7a);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:0.5px;">
                ابدأ الآن 🚀
              </a>
            </div>

            <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0;" />
            
            <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;line-height:1.8;">
              هذه الرسالة مُرسلة تلقائياً من <strong>Tawzeef-X</strong><br/>
              إذا لم تقم بإنشاء هذا الحساب، يمكنك تجاهل هذه الرسالة
            </p>
          </div>
        </div>
      </div>
    `;

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: smtpUser, pass: smtpPass },
    });

    await transporter.sendMail({
      from: `"Tawzeef-X" <${smtpUser}>`,
      to: email,
      subject: "🎉 مرحباً بك في Tawzeef-X — تم إنشاء حسابك بنجاح",
      html,
    });

    console.log(`Welcome email sent to ${email}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Welcome email error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
