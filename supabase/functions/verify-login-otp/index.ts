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

function handledFailure(error: string, code: string, extra: Record<string, unknown> = {}) {
  return json({ success: false, error, code, ...extra }, 200);
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
    const { email, code } = await req.json();
    const normalizedEmail = normalizeEmail(String(email || ""));
    const normalizedCode = String(code || "").replace(/\D/g, "").slice(0, 6);

    if (!normalizedEmail || normalizedCode.length !== 6) {
      return handledFailure("رمز التحقق غير صالح", "INVALID_OTP_INPUT");
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: challenge, error: fetchError } = await adminClient
      .from("login_otp_challenges")
      .select("id, code_hash, attempts, expires_at")
      .eq("email", normalizedEmail)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!challenge) {
      return handledFailure("لا يوجد رمز تحقق نشط لهذا البريد", "OTP_NOT_FOUND");
    }

    if (new Date(challenge.expires_at).getTime() < Date.now()) {
      await adminClient
        .from("login_otp_challenges")
        .update({ consumed_at: new Date().toISOString() })
        .eq("id", challenge.id);

      return handledFailure("انتهت صلاحية الرمز. اطلب رمزاً جديداً", "OTP_EXPIRED");
    }

    if ((challenge.attempts ?? 0) >= 5) {
      return handledFailure("تم تجاوز عدد المحاولات المسموح. أعد إرسال الرمز", "OTP_RATE_LIMITED");
    }

    const providedHash = await sha256(normalizedCode);
    const attempts = challenge.attempts ?? 0;
    const attemptsRemaining = Math.max(0, 4 - attempts);

    console.log("OTP verify attempt:", {
      email: normalizedEmail,
      codeLength: normalizedCode.length,
      hashMatch: providedHash === challenge.code_hash,
    });

    if (providedHash !== challenge.code_hash) {
      await adminClient
        .from("login_otp_challenges")
        .update({ attempts: attempts + 1 })
        .eq("id", challenge.id);

      return handledFailure("رمز التحقق غير صحيح", "OTP_INVALID", {
        attemptsRemaining,
      });
    }

    const { error: updateError } = await adminClient
      .from("login_otp_challenges")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", challenge.id);

    if (updateError) throw updateError;

    return json({ success: true });
  } catch (error: any) {
    console.error("verify-login-otp error:", error);
    return json({ success: false, error: error.message || "تعذر التحقق من الرمز" }, 500);
  }
});
