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
    // If decryption fails, assume it's stored in plain text (legacy)
    return encoded;
  }
}

export { deriveKey, encrypt, decrypt };

Deno.serve(async (req) => {
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
      if (settings.smtp_password && settings.smtp_password !== "••••••••") {
        payload.smtp_password = await encrypt(settings.smtp_password, encKey);
      }

      const { data: existing } = await adminClient
        .from("email_settings")
        .select("id")
        .eq("user_id", userId)
        .eq("config_type", configType)
        .maybeSingle();

      let error;
      if (existing) {
        // Don't overwrite password if not provided or masked
        if (!settings.smtp_password || settings.smtp_password === "••••••••") {
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
      const { data } = await adminClient
        .from("email_settings")
        .select("*")
        .eq("user_id", userId)
        .eq("config_type", configType)
        .maybeSingle();

      if (data) {
        // Return settings with masked password
        return new Response(
          JSON.stringify({
            settings: {
              ...data,
              smtp_password: "••••••••", // Never return actual password
              has_password: true,
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
