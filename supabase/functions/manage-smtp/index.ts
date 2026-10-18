import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

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
    { name: "PBKDF2", salt: new TextEncoder().encode(Deno.env.get("SMTP_ENCRYPTION_SALT") || "smtp-settings-tawzeefx-v2"), iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: ALGO, length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encrypt(text: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: ALGO, iv },
    key,
    new TextEncoder().encode(text)
  );
  const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return btoa(String.fromCharCode(...combined));
}

async function decrypt(encoded: string, key: CryptoKey): Promise<string> {
  try {
    const combined = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    const decrypted = await crypto.subtle.decrypt(
      { name: ALGO, iv },
      key,
      data
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    // An AES-GCM value that cannot be decrypted is an unusable credential.
    // Never treat its base64 ciphertext as a legacy plain text password.
    if (encoded.length >= 44 && /^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
      throw new Error("تعذر فك كلمة مرور SMTP المحفوظة. أدخل كلمة مرور التطبيق مجددًا واحفظ الإعدادات.");
    }
    return encoded;
  }
}

export { deriveKey, encrypt, decrypt };

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;

    const adminClient = createClient(supabaseUrl, serviceKey);
    const encKey = await deriveKey(serviceKey);

    const { action, settings, config_type } = await req.json();
    const configType = config_type || settings?.config_type || "general";

    if (action === "save") {
      const { data: existing, error: lookupError } = await adminClient
        .from("email_settings")
        .select("id, smtp_password")
        .eq("user_id", userId)
        .eq("config_type", configType)
        .maybeSingle();
      if (lookupError) throw lookupError;
      const hasNewPassword = Boolean(settings?.smtp_password && settings.smtp_password !== "••••••••");
      if (!hasNewPassword && existing) {
        // Saving unrelated fields must not claim success when the credential is unusable.
        await decrypt(existing.smtp_password, encKey);
      }
      const payload: Record<string, any> = {
        user_id: userId,
        config_type: configType,
        smtp_host: settings.smtp_host,
        smtp_port: settings.smtp_port,
        smtp_secure: settings.smtp_secure,
        smtp_user: settings.smtp_user,
        sender_name: settings.sender_name,
        is_active: settings.is_active,
      };

      // Only encrypt and update password if provided
      if (hasNewPassword) {
        const password = String(settings.smtp_password);
        const normalized = String(settings.smtp_host).trim().toLowerCase() === "smtp.gmail.com"
          ? password.replace(/\s+/g, "")
          : password;
        if (String(settings.smtp_host).trim().toLowerCase() === "smtp.gmail.com" && normalized.length !== 16) {
          throw new Error("كلمة مرور تطبيق Gmail يجب أن تكون 16 حرفًا. أنشئها من حساب البريد نفسه وأدخلها هنا.");
        }
        payload.smtp_password = await encrypt(normalized, encKey);
        // Verify the newly encrypted value before storing it.
        if (await decrypt(payload.smtp_password, encKey) !== normalized) {
          throw new Error("تعذر التحقق من تشفير كلمة مرور SMTP");
        }
      }

      let error;
      if (existing) {
        // Don't overwrite password if not provided or masked
        if (!hasNewPassword) {
          delete payload.smtp_password;
        }
        ({ error } = await adminClient
          .from("email_settings")
          .update(payload)
          .eq("user_id", userId)
          .eq("config_type", configType));
      } else {
        if (!payload.smtp_password) {
          throw new Error("كلمة المرور مطلوبة عند الإعداد لأول مرة");
        }
        ({ error } = await adminClient.from("email_settings").insert(payload));
      }

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "load") {
      const { data, error } = await adminClient
        .from("email_settings")
        .select("*")
        .eq("user_id", userId)
        .eq("config_type", configType)
        .maybeSingle();
      if (error) throw error;

      if (data) {
        let passwordNeedsReset = false;
        try {
          const password = await decrypt(data.smtp_password, encKey);
          if (data.smtp_host.trim().toLowerCase() === "smtp.gmail.com" && password.replace(/\s+/g, "").length !== 16) {
            passwordNeedsReset = true;
          }
        } catch {
          passwordNeedsReset = true;
        }
        // Return settings with masked password
        return new Response(
          JSON.stringify({
            settings: {
              ...data,
              smtp_password: "••••••••", // Never return actual password
              has_password: true,
              password_needs_reset: passwordNeedsReset,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ settings: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("manage-smtp error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
