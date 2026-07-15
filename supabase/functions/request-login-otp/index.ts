import nodemailer from "npm:nodemailer@6.9.16";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALGO = "AES-GCM";

async function deriveKey(secret: string): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
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
    // Legacy plain text fallback
    return encoded;
  }
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function generateCode() {
  const random = crypto.getRandomValues(new Uint32Array(1))[0] % 900000;
  return String(100000 + random).padStart(6, "0");
}

async function sha256(input: string) {
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

// ── IP-based Rate Limiting ──
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 3; // max 3 requests per IP per minute

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) {
    return true;
  }
  return false;
}

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(ip);
  }
}, 5 * 60_000);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Extract client IP
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      "unknown";

    if (isRateLimited(clientIp)) {
      console.warn(`Rate limited IP: ${clientIp}`);
      return json({ error: "تم تجاوز الحد المسموح من الطلبات. حاول بعد دقيقة" }, 429);
    }

    const { email } = await req.json();
    const normalizedEmail = normalizeEmail(String(email || ""));

    if (!normalizedEmail) return json({ error: "البريد الإلكتروني مطلوب" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Find user by email directly from auth.users to avoid listUsers pagination limit
    const authDbClient = createClient(supabaseUrl, serviceKey, {
      db: { schema: "auth" },
    });
    const { data: targetUser, error: findError } = await authDbClient
      .from("users")
      .select("id, email")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (findError) throw findError;
    if (!targetUser) return json({ error: "لم يتم العثور على حساب بهذا البريد" }, 400);

    const userId = targetUser.id;
    const code = generateCode();
    const codeHash = await sha256(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Invalidate previous challenges
    await adminClient
      .from("login_otp_challenges")
      .update({ consumed_at: new Date().toISOString() })
      .eq("email", normalizedEmail)
      .eq("user_id", userId)
      .is("consumed_at", null);

    const { error: insertError } = await adminClient.from("login_otp_challenges").insert({
      user_id: userId,
      email: normalizedEmail,
      code_hash: codeHash,
      expires_at: expiresAt,
    });
    if (insertError) throw insertError;

    // Load SMTP settings
    let smtpHost = "smtp.gmail.com";
    let smtpPort = 465;
    let smtpSecure = true;
    let smtpUser = Deno.env.get("GMAIL_USER") || "";
    let smtpPass = Deno.env.get("GMAIL_APP_PASSWORD") || "";
    let senderName = "Tawzeef-X";

    // 1) Find user's direct email settings for OTP, fallback to general
    let { data: settings } = await adminClient
      .from("email_settings")
      .select("*")
      .eq("user_id", userId)
      .eq("config_type", "otp")
      .eq("is_active", true)
      .maybeSingle();

    if (!settings) {
      const { data: generalSettings } = await adminClient
        .from("email_settings")
        .select("*")
        .eq("user_id", userId)
        .eq("config_type", "general")
        .eq("is_active", true)
        .maybeSingle();
      if (generalSettings) {
        settings = generalSettings;
      }
    }

    // 2) If not found, try to find settings of their company owner for OTP or general
    if (!settings) {
      const { data: member } = await adminClient
        .from("company_members")
        .select("company_id")
        .eq("user_id", userId)
        .maybeSingle();
      
      if (member?.company_id) {
        const { data: ownerMember } = await adminClient
          .from("company_members")
          .select("user_id")
          .eq("company_id", member.company_id)
          .eq("member_role", "owner")
          .maybeSingle();
        
        if (ownerMember?.user_id) {
          let { data: ownerSettings } = await adminClient
            .from("email_settings")
            .select("*")
            .eq("user_id", ownerMember.user_id)
            .eq("config_type", "otp")
            .eq("is_active", true)
            .maybeSingle();
          
          if (!ownerSettings) {
            const { data: ownerGeneralSettings } = await adminClient
              .from("email_settings")
              .select("*")
              .eq("user_id", ownerMember.user_id)
              .eq("config_type", "general")
              .eq("is_active", true)
              .maybeSingle();
            if (ownerGeneralSettings) {
              ownerSettings = ownerGeneralSettings;
            }
          }

          if (ownerSettings) {
            settings = ownerSettings;
          }
        }
      }
    }

    // 3) Fallback to any active email settings in the database (global platform default fallback)
    if (!settings) {
      const { data: globalFallback } = await adminClient
        .from("email_settings")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (globalFallback) {
        settings = globalFallback;
      }
    }

    if (settings) {
      smtpHost = settings.smtp_host;
      smtpPort = settings.smtp_port;
      smtpSecure = settings.smtp_secure;
      smtpUser = settings.smtp_user;
      senderName = settings.sender_name || "Tawzeef-X";

      const encKey = await deriveKey(serviceKey);
      smtpPass = await decrypt(settings.smtp_password, encKey);
    }

    // Auto-detect and fix Port / Secure mismatch
    // If port is 587 or 25, we MUST set secure to false (Nodemailer uses STARTTLS automatically).
    const isSecureConnection = (smtpPort === 465) ? true : (smtpPort === 587 || smtpPort === 25 ? false : smtpSecure);

    let emailSubject = "رمز التحقق لتسجيل الدخول - Tawzeef-X";
    let emailHtml = `
      <div style="margin:0;padding:32px 16px;background:#f6f8fb;font-family:Arial,sans-serif;direction:rtl;">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e7ecf3;border-radius:20px;padding:32px;box-shadow:0 10px 30px rgba(15,23,42,0.06);">
          <div style="display:inline-block;padding:8px 14px;border-radius:999px;background:#eff6ff;color:#1d4ed8;font-size:12px;font-weight:700;">التحقق بخطوتين</div>
          <h1 style="margin:18px 0 10px;color:#0f172a;font-size:28px;line-height:1.4;">رمز التحقق لتسجيل الدخول</h1>
          <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.9;">استخدم الرمز التالي لإكمال تسجيل الدخول إلى <strong>Tawzeef-X</strong>. صلاحية الرمز 10 دقائق.</p>
          <div style="margin:28px 0;padding:18px;border-radius:18px;background:linear-gradient(135deg,#dbeafe,#f0fdfa);text-align:center;border:1px solid #cbd5e1;">
            <div style="font-size:40px;line-height:1;letter-spacing:12px;font-weight:800;color:#0f172a;direction:ltr;">${code}</div>
          </div>
          <p style="margin:0;color:#64748b;font-size:13px;line-height:1.8;">إذا لم تحاول تسجيل الدخول، يمكنك تجاهل هذه الرسالة بأمان.</p>
        </div>
      </div>
    `;

    const { data: dbTemplate } = await adminClient
      .from("email_templates")
      .select("subject, body_html")
      .eq("user_id", userId)
      .eq("category", "otp")
      .maybeSingle();

    if (dbTemplate) {
      emailSubject = dbTemplate.subject.replaceAll("{{otp_code}}", code);
      emailHtml = dbTemplate.body_html.replaceAll("{{otp_code}}", code);
    }

    let emailSent = false;
    let customSmtpUsed = false;

    if (settings && smtpUser && smtpPass) {
      customSmtpUsed = true;
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: isSecureConnection,
          auth: { user: smtpUser, pass: smtpPass },
        });

        await transporter.sendMail({
          from: `"${senderName}" <${smtpUser}>`,
          to: normalizedEmail,
          subject: emailSubject,
          html: emailHtml,
        });
        emailSent = true;
        console.log(`OTP sent to ${normalizedEmail} via custom SMTP: ${smtpHost}`);
      } catch (err: any) {
        console.warn(`Custom SMTP failed (${err.message}). Falling back to default system SMTP...`);
      }
    }

    if (!emailSent) {
      const defaultUser = Deno.env.get("GMAIL_USER") || "";
      const defaultPass = Deno.env.get("GMAIL_APP_PASSWORD") || "";

      if (!defaultUser || !defaultPass) {
        throw new Error("System default email credentials are not configured");
      }

      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user: defaultUser, pass: defaultPass },
      });

      await transporter.sendMail({
        from: `"Tawzeef-X" <${defaultUser}>`,
        to: normalizedEmail,
        subject: emailSubject,
        html: emailHtml,
      });
      emailSent = true;
      console.log(`OTP sent to ${normalizedEmail} via system default SMTP (Custom SMTP was ${customSmtpUsed ? "invalid" : "not configured"})`);
    }

    return json({ success: true });
  } catch (error: any) {
    console.error("request-login-otp error:", error);
    return json({ error: error.message || "حدث خطأ أثناء إرسال الرمز" }, 500);
  }
});
