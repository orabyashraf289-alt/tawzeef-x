import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const { email, phone, password, name, user_type, tracking_code, job_title } = await req.json();

    if (!email || (!phone && !password)) {
      return new Response(
        JSON.stringify({ error: "البريد الإلكتروني وكلمة المرور أو رقم الجوال مطلوبان لإتمام إنشاء الحساب" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    
    // Determine password: if explicit password provided (e.g. for agency), use it directly! Otherwise use clean phone.
    let cleanPassword = password ? String(password) : "";
    if (!cleanPassword) {
      let rawPhone = String(phone).trim().replace(/\D/g, "");
      if (rawPhone.length < 6) {
        rawPhone = (rawPhone + "123456").slice(0, 8);
      }
      cleanPassword = rawPhone;
    }

    const targetUserType = user_type || "candidate";
    const targetRole = user_type === "agency" ? "recruiter" : "candidate";

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === cleanEmail);

    let userId: string;
    let isNewAccount = false;

    if (existingUser) {
      userId = existingUser.id;
      console.log(`User ${cleanEmail} already exists (${userId}). Updating password and metadata...`);
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: cleanPassword,
        email_confirm: true,
        user_metadata: {
          ...existingUser.user_metadata,
          full_name: name || existingUser.user_metadata?.full_name,
          phone: phone || existingUser.user_metadata?.phone,
          user_type: targetUserType,
          role: targetRole,
        },
      });
    } else {
      isNewAccount = true;
      console.log(`Creating new account for ${cleanEmail} (type: ${targetUserType})...`);
      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password: cleanPassword,
        email_confirm: true,
        user_metadata: {
          full_name: name || cleanEmail.split("@")[0],
          phone: phone || "",
          user_type: targetUserType,
          role: targetRole,
          tracking_code: tracking_code || "",
        },
      });

      if (createErr || !newUser.user) {
        throw new Error(createErr?.message || "فشل إنشاء الحساب");
      }

      userId = newUser.user.id;
    }

    // Ensure candidate profile exists in profiles table
    try {
      await supabaseAdmin.from("profiles").upsert({
        id: userId,
        email: cleanEmail,
        full_name: name || cleanEmail.split("@")[0],
        phone: phone,
        role: "candidate",
        updated_at: new Date().toISOString(),
      });
    } catch (profileErr) {
      console.warn("Profiles upsert warning:", profileErr);
    }

    // Update candidate record to associate user_id
    if (cleanEmail) {
      try {
        await supabaseAdmin
          .from("candidates")
          .update({ user_id: userId, tracking_code: tracking_code || undefined })
          .eq("email", cleanEmail);
      } catch (candErr) {
        console.warn("Candidates update user_id warning:", candErr);
      }
    }

    // If new account, trigger candidate welcome email via send-email
    if (isNewAccount) {
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            to: cleanEmail,
            subject: `تم إنشاء حسابك بنجاح لتتبع طلبك - Tawzeef-X`,
            html: `
              <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0;">
                <div style="text-align: center; margin-bottom: 24px;">
                  <h1 style="color: #0d5c5a; margin: 0; font-size: 24px;">مرحباً بك في Tawzeef-X 🎉</h1>
                  <p style="color: #64748b; font-size: 14px; margin-top: 6px;">تم إرسال طلبك للوظيفة <strong>${job_title || ""}</strong> وإنشاء حسابك المباشر بنجاح.</p>
                </div>
                
                <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 20px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #1e293b; font-size: 16px;">بيانات دخول حسابك لتتبع الطلب:</h3>
                  <p style="margin: 8px 0; font-size: 14px;"><strong>البريد الإلكتروني:</strong> <span dir="ltr">${cleanEmail}</span></p>
                  <p style="margin: 8px 0; font-size: 14px;"><strong>كلمة المرور:</strong> <span dir="ltr">${phone}</span> (رقم جوالك)</p>
                  ${tracking_code ? `<p style="margin: 8px 0; font-size: 14px;"><strong>رقم تتبع الطلب المرجعي:</strong> <code>${tracking_code}</code></p>` : ""}
                </div>

                <p style="color: #475569; font-size: 13px; text-align: center; margin-top: 24px;">يمكنك الآن دخول بوابة المتقدمين لمتابعة حالة الطلب وتحديث ملفك الشخصي في أي وقت.</p>
              </div>
            `,
          }),
        });
      } catch (emailErr) {
        console.warn("Failed sending welcome email:", emailErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        is_new_account: isNewAccount,
        user_id: userId,
        email: cleanEmail,
        password: cleanPassword,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("auto-create-candidate-account error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "حدث خطأ أثناء إنشاء حساب المتقدم" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
