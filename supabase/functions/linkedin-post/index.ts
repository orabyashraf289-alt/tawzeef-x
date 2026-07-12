import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { job_id } = await req.json();
    if (!job_id) {
      return new Response(JSON.stringify({ error: "Missing job_id parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Authenticate user
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized access" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get user's active LinkedIn settings
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("linkedin_settings")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (settingsError) throw settingsError;

    if (!settings || !settings.access_token || !settings.linkedin_urn) {
      return new Response(
        JSON.stringify({ error: "لم يتم ربط حساب LinkedIn بعد، أو أنه غير نشط. يرجى مراجعة الإعدادات." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiration
    if (settings.expires_at && new Date(settings.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "انتهت صلاحية ربط حسابك بـ LinkedIn. يرجى إلغاء الربط وإعادة الاتصال مجدداً." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch job details
    const { data: job, error: jobError } = await supabaseAdmin
      .from("jobs")
      .select("*")
      .eq("id", job_id)
      .maybeSingle();

    if (jobError || !job) {
      return new Response(
        JSON.stringify({ error: "لم يتم العثور على الوظيفة المطلوبة." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get company details for a professional description
    let companyName = "Tawzeef-X Client";
    if (job.company_id) {
      const { data: company } = await supabaseAdmin
        .from("companies")
        .select("name")
        .eq("id", job.company_id)
        .maybeSingle();
      if (company?.name) companyName = company.name;
    }

    const applyUrl = `https://ai-hire-buddy-22.lovable.app/apply/${job.id}`;

    // Format Arabic professional commentary for LinkedIn
    const commentary = `🚀 فرصة عمل جديدة لدى *${companyName}*!

نحن نبحث عن كفاءة مهنية لشغل وظيفة:
📌 *${job.title}*

💼 القسم: ${job.department}
📍 الموقع: ${job.location}
🕒 نوع العمل: ${job.type}
🎯 مستوى الخبرة: ${job.experience_level || "غير محدد"}
${job.salary_min ? `💰 الراتب: من ${job.salary_min} إلى ${job.salary_max || ""} ر.س` : ""}

للتقديم والاطلاع على التفاصيل والشروط كاملة:
🔗 ${applyUrl}

#توظيف #وظائف #فرص_عمل #TawzeefX`;

    // LinkedIn API Share payload structure (Community Management / Share on LinkedIn)
    const linkedinPayload = {
      author: settings.linkedin_urn,
      commentary: commentary,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      content: {
        article: {
          source: applyUrl,
          title: `فرصة توظيف: ${job.title} لدى ${companyName}`,
          description: job.description ? job.description.slice(0, 150) + "..." : "تقدم للوظيفة الآن عبر منصة التوظيف الذكي.",
        },
      },
      lifecycleState: "PUBLISHED",
    };

    console.log(`Posting job ${job.id} to LinkedIn for URN ${settings.linkedin_urn}...`);

    const response = await fetch("https://api.linkedin.com/v2/posts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${settings.access_token}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(linkedinPayload),
    });

    const statusCode = response.status;
    const responseText = await response.text();
    const status = response.ok ? "success" : "failed";
    let errorMessage = null;

    if (!response.ok) {
      console.error(`LinkedIn API error: Status ${statusCode}`, responseText);
      try {
        const parsed = JSON.parse(responseText);
        errorMessage = parsed.message || parsed.error_description || `LinkedIn HTTP ${statusCode}`;
      } catch {
        errorMessage = `LinkedIn HTTP ${statusCode}`;
      }
    }

    // Insert delivery log
    const { error: logError } = await supabaseAdmin
      .from("linkedin_deliveries")
      .insert({
        user_id: user.id,
        event_type: "job.share",
        payload: linkedinPayload,
        status,
        status_code: statusCode,
        error_message: errorMessage,
      } as any);

    if (logError) console.error("Failed to log delivery to database:", logError);

    if (status === "failed") {
      return new Response(
        JSON.stringify({ error: `فشل النشر على LinkedIn: ${errorMessage}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "تم نشر الوظيفة بنجاح على LinkedIn!" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("LinkedIn direct sharing function exception:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
