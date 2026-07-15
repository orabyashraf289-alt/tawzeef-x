import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function sha256(input: string) {
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email, token, password } = await req.json();
    const normalizedEmail = normalizeEmail(String(email || ""));

    if (!normalizedEmail || !token || !password) {
      return json({ error: "جميع الحقول مطلوبة" }, 400);
    }

    if (password.length < 6) {
      return json({ error: "يجب أن تكون كلمة المرور 6 أحرف على الأقل" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    const tokenHash = await sha256(token);

    // Verify token
    const { data: tokenRow, error: queryErr } = await adminClient
      .from("password_reset_tokens")
      .select("*")
      .eq("email", normalizedEmail)
      .eq("token_hash", tokenHash)
      .is("consumed_at", null)
      .maybeSingle();

    if (queryErr) throw queryErr;

    if (!tokenRow) {
      return json({ error: "الرمز غير صالح أو منتهي الصلاحية" }, 400);
    }

    // Check expiration
    if (new Date() > new Date(tokenRow.expires_at)) {
      return json({ error: "انتهت صلاحية الرمز، يرجى طلب رابط جديد" }, 400);
    }

    // Update user password
    const { error: updateErr } = await adminClient.auth.admin.updateUserById(
      tokenRow.user_id,
      { password }
    );
    if (updateErr) throw updateErr;

    // Consume the token
    await adminClient
      .from("password_reset_tokens")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", tokenRow.id);

    console.log(`Password successfully reset for user: ${normalizedEmail}`);
    return json({ success: true, message: "تم تغيير كلمة المرور بنجاح." });
  } catch (error: any) {
    console.error("execute-password-reset error:", error);
    return json({ error: error.message || "حدث خطأ أثناء معالجة الطلب" }, 500);
  }
});
