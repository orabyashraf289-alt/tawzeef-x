import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseUser = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }
    const userId = claims.claims.sub as string;

    // Verify admin role
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    const { data: roleData } = await supabaseAdmin.rpc('has_role', { _user_id: userId, _role: 'admin' });
    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403, headers: corsHeaders });
    }

    const { email, role, inviterName } = await req.json();

    if (!email || !role) {
      return new Response(JSON.stringify({ error: 'Email and role are required' }), { status: 400, headers: corsHeaders });
    }

    // Create invitation record
    const { data: invitation, error: invError } = await supabaseAdmin
      .from('invitations')
      .insert({ email, role, invited_by: userId })
      .select()
      .single();

    if (invError) throw invError;

    // Log activity
    await supabaseAdmin
      .from('activity_log')
      .insert({
        user_id: userId,
        user_name: inviterName || 'مدير',
        action: 'أرسل دعوة',
        entity_type: 'invitation',
        entity_id: invitation.id,
        details: `دعوة ${email} بدور ${role === 'admin' ? 'مدير' : role === 'recruiter' ? 'مُوظّف' : 'مراجع'}`,
      });

    // Generate signup link with invitation context
    const siteUrl = req.headers.get('origin') || 'https://ai-hire-buddy-22.lovable.app';
    const signupUrl = `${siteUrl}/auth?mode=signup&invite=${invitation.token}&email=${encodeURIComponent(email)}`;

    // Call send-email function to automatically send email
    try {
      const emailResp = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          to: email,
          subject: "دعوة للانضمام إلى فريق عمل Tawzeef-X",
          html: `
            <div style="direction: rtl; font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; text-align: right;">
              <h2 style="color: #0d9488; text-align: center;">دعوة للانضمام إلى فريق عمل Tawzeef-X</h2>
              <p>مرحباً،</p>
              <p>لقد قام <strong>${inviterName || "أحد مدراء النظام"}</strong> بدعوتك للانضمام إلى منصة التوظيف Tawzeef-X بدور <strong>${role === "admin" ? "مدير" : role === "recruiter" ? "مُوظّف توظيف" : "مراجع"}</strong>.</p>
              <p>يرجى النقر على الزر أدناه لإكمال عملية التسجيل وتفعيل حسابك:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${signupUrl}" style="background-color: #0d9488; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">قبول الدعوة وتفعيل الحساب</a>
              </div>
              <p style="font-size: 12px; color: #777;">إذا لم يعمل الزر معك، يمكنك نسخ الرابط التالي ولصقه في المتصفح:</p>
              <p style="font-size: 12px; color: #0d9488; word-break: break-all;">${signupUrl}</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="font-size: 11px; color: #999; text-align: center;">هذا البريد الإلكتروني مرسل تلقائياً من نظام Tawzeef-X.</p>
            </div>
          `,
          user_id: userId,
        }),
      });
      if (!emailResp.ok) {
        console.error("Failed to send invitation email:", await emailResp.text());
      } else {
        console.log("Invitation email sent successfully to", email);
      }
    } catch (emailErr) {
      console.error("Error invoking send-email:", emailErr);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      invitation,
      signupUrl,
      message: `تم إنشاء الدعوة بنجاح. شارك رابط التسجيل مع ${email}` 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
