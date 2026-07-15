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
  email_type?: string;
  attachments?: Array<{ filename: string; path: string }>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized: Missing token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    let isServiceCall = token === serviceKey;
    let callerId: string | null = null;

    if (!isServiceCall) {
      const supabaseAnon = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
      const { data: { user }, error: userErr } = await supabaseAnon.auth.getUser(token);
      if (userErr || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized: Invalid token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      callerId = user.id;
    }

    const body = (await req.json()) as EmailRequest;
    const { subject, html, user_id, notify_recruiter, email_type, attachments } = body;
    let { to } = body;

    if (!subject || !html) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: subject, html" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // If not service call, verify sender relationship to user_id
    if (!isServiceCall && callerId) {
      const targetUserId = user_id || callerId;
      if (targetUserId !== callerId) {
        // Check if caller is Super Admin
        const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", callerId).eq("role", "admin").maybeSingle();
        if (!roleData) {
          // Check if same company
          const { data: callerMember } = await supabase.from("company_members").select("company_id").eq("user_id", callerId).maybeSingle();
          const { data: targetMember } = await supabase.from("company_members").select("company_id").eq("user_id", targetUserId).maybeSingle();
          if (!callerMember || !targetMember || callerMember.company_id !== targetMember.company_id) {
            return new Response(
              JSON.stringify({ error: "Forbidden: Cannot send email using another user's credentials" }),
              { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      }
    }

    // If notify_recruiter, resolve the recruiter's email
    const smtpUserId = user_id || callerId;
    if (notify_recruiter && smtpUserId && !to) {
      const { data: userData } = await supabase.auth.admin.getUserById(smtpUserId);
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
    let hasCustomSettings = false;

    if (smtpUserId) {
      const configType = email_type || "hiring";
      
      let { data: settings } = await supabase
        .from("email_settings")
        .select("*")
        .eq("user_id", smtpUserId)
        .eq("config_type", configType)
        .eq("is_active", true)
        .maybeSingle();

      if (!settings && configType !== "general") {
        const { data: generalSettings } = await supabase
          .from("email_settings")
          .select("*")
          .eq("user_id", smtpUserId)
          .eq("config_type", "general")
          .eq("is_active", true)
          .maybeSingle();
        if (generalSettings) {
          settings = generalSettings;
        }
      }

      if (settings) {
        smtpHost = settings.smtp_host;
        smtpPort = settings.smtp_port;
        smtpSecure = settings.smtp_secure;
        smtpUser = settings.smtp_user;
        senderName = settings.sender_name;
        hasCustomSettings = true;

        // Decrypt the stored password
        const encKey = await deriveKey(serviceKey);
        smtpPass = await decrypt(settings.smtp_password, encKey);
      }
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

    // Auto-detect and fix Port / Secure mismatch
    // If port is 587 or 25, we MUST set secure to false (Nodemailer uses STARTTLS automatically).
    const isSecureConnection = (smtpPort === 465) ? true : (smtpPort === 587 || smtpPort === 25 ? false : smtpSecure);

    let emailSent = false;
    let customSmtpUsed = false;

    if (hasCustomSettings && smtpUser && smtpPass) {
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
          to,
          subject,
          html,
          attachments: nodemailerAttachments.length > 0 ? nodemailerAttachments : undefined,
        });
        emailSent = true;
        console.log(`Email sent successfully to ${to} via custom SMTP ${smtpHost}`);
      } catch (err: any) {
        console.warn(`Custom SMTP sending failed (${err.message}). Falling back to system default SMTP...`);
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
        to,
        subject,
        html,
        attachments: nodemailerAttachments.length > 0 ? nodemailerAttachments : undefined,
      });
      emailSent = true;
      console.log(`Email sent successfully to ${to} via system default SMTP (Custom SMTP was ${customSmtpUsed ? "invalid" : "not configured"})`);
    }

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
