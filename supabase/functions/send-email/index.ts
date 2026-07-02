import nodemailer from "npm:nodemailer@6.9.16";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  user_id?: string;
  notify_recruiter?: boolean;
  attachments?: Array<{ filename: string; path: string }>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as EmailRequest;
    const { subject, html, user_id, notify_recruiter, attachments } = body;
    let { to } = body;

    if (!subject || !html) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: subject, html" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceKey
    );

    // If notify_recruiter, resolve the recruiter's email
    if (notify_recruiter && user_id && !to) {
      const { data: userData } = await supabase.auth.admin.getUserById(user_id);
      if (userData?.user?.email) {
        to = userData.user.email;
      } else {
        return new Response(
          JSON.stringify({ success: true, message: "No recruiter email found, skipped" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (!to) {
      return new Response(
        JSON.stringify({ error: "Missing 'to' email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load SMTP settings
    let smtpHost = "smtp.gmail.com";
    let smtpPort = 465;
    let smtpSecure = true;
    let smtpUser = Deno.env.get("GMAIL_USER") || "";
    let smtpPass = Deno.env.get("GMAIL_APP_PASSWORD") || "";
    let senderName = "فريق التوظيف";

    if (user_id) {
      const { data: settings } = await supabase
        .from("email_settings")
        .select("*")
        .eq("user_id", user_id)
        .eq("is_active", true)
        .maybeSingle();

      if (settings) {
        smtpHost = settings.smtp_host;
        smtpPort = settings.smtp_port;
        smtpSecure = settings.smtp_secure;
        smtpUser = settings.smtp_user;
        senderName = settings.sender_name;

        // Decrypt the stored password
        const encKey = await deriveKey(serviceKey);
        smtpPass = await decrypt(settings.smtp_password, encKey);
      }
    }

    if (!smtpUser || !smtpPass) {
      throw new Error("Email credentials not configured. Please set up SMTP settings in the app.");
    }

    // Map attachments if provided
    const nodemailerAttachments = [];
    if (attachments && Array.isArray(attachments)) {
      for (const att of attachments) {
        if (att.content) {
          nodemailerAttachments.push({
            filename: att.filename,
            content: att.content,
            contentType: att.contentType || "text/plain",
          });
        } else {
          let attPath = att.path;
          if (attPath && !attPath.startsWith("http://") && !attPath.startsWith("https://")) {
            // Relative path: generate a signed URL from resumes bucket
            let cleanPath = attPath;
            if (cleanPath.startsWith("resumes/")) {
              cleanPath = cleanPath.substring("resumes/".length);
            }
            try {
              const { data, error } = await supabase.storage
                .from("resumes")
                .createSignedUrl(cleanPath, 3600);
              
              if (error) {
                console.error(`Error generating signed URL for ${cleanPath}:`, error.message);
              } else if (data?.signedUrl) {
                attPath = data.signedUrl;
              }
            } catch (e) {
              const msg = e instanceof Error ? e.message : String(e);
              console.error(`Exception generating signed URL for ${cleanPath}:`, msg);
            }
          }
          nodemailerAttachments.push({
            filename: att.filename,
            path: attPath,
          });
        }
      }
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: { user: smtpUser, pass: smtpPass },
    });

    await transporter.sendMail({
      from: `"${senderName}" <${smtpUser}>`,
      to,
      subject,
      html,
      attachments: nodemailerAttachments.length > 0 ? nodemailerAttachments : undefined,
    });

    console.log(`Email sent successfully to ${to} via ${smtpHost}`);

    return new Response(
      JSON.stringify({ success: true, message: `Email sent to ${to}` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Email sending error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
