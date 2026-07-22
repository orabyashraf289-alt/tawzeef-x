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
    const { event_type, payload, user_id } = await req.json();

    if (!event_type || !user_id) {
      return new Response(JSON.stringify({ error: "Missing event_type or user_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get active webhook endpoints for this user that subscribe to this event
    const { data: endpoints, error: endpointsError } = await supabaseAdmin
      .from("webhook_endpoints")
      .select("*")
      .eq("user_id", user_id)
      .eq("is_active", true)
      .contains("events", [event_type]);

    if (endpointsError) throw endpointsError;

    // Also check linkedin_settings for job.created events
    const linkedinTargets: { url: string }[] = [];
    if (event_type === "job.created") {
      const { data: linkedinData } = await supabaseAdmin
        .from("linkedin_settings")
        .select("zapier_webhook_url")
        .eq("user_id", user_id)
        .eq("is_active", true)
        .maybeSingle();
      if (linkedinData?.zapier_webhook_url) {
        linkedinTargets.push({ url: linkedinData.zapier_webhook_url });
      }
    }

    const allEmpty = (!endpoints || endpoints.length === 0) && linkedinTargets.length === 0;
    if (allEmpty) {
      return new Response(JSON.stringify({ message: "No matching endpoints" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send to regular webhook endpoints
    const regularResults = await Promise.allSettled(
      (endpoints || []).map(async (endpoint) => {
        const webhookPayload = {
          event: event_type,
          timestamp: new Date().toISOString(),
          data: payload,
        };

        let status = "failed";
        let statusCode: number | null = null;
        let responseBody: string | null = null;
        let errorMessage: string | null = null;

        try {
          const response = await fetch(endpoint.url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(webhookPayload),
          });

          statusCode = response.status;
          responseBody = await response.text().catch(() => null);
          status = response.ok ? "success" : "failed";
          if (!response.ok) errorMessage = `HTTP ${statusCode}`;
        } catch (err) {
          errorMessage = err.message;
        }

        await supabaseAdmin.from("webhook_deliveries").insert({
          endpoint_id: endpoint.id,
          user_id,
          event_type,
          payload: webhookPayload,
          status,
          status_code: statusCode,
          response_body: responseBody,
          error_message: errorMessage,
        });

        return { endpoint_id: endpoint.id, status };
      })
    );

    // Send to LinkedIn Zapier webhook
    const linkedinResults = await Promise.allSettled(
      linkedinTargets.map(async (target) => {
        const applyUrl = `https://ai-hire-buddy-22.lovable.app/apply/${payload?.job_id || ""}`;
        const linkedinPayload = {
          event: "job.created",
          timestamp: new Date().toISOString(),
          job_title: payload?.job_title || "",
          department: payload?.department || "",
          location: payload?.location || "",
          type: payload?.type || "",
          description: payload?.description || "",
          experience_level: payload?.experience_level || "",
          salary_min: payload?.salary_min,
          salary_max: payload?.salary_max,
          apply_url: applyUrl,
        };

        let status = "failed";
        let statusCode: number | null = null;
        let errorMessage: string | null = null;

        try {
          const response = await fetch(target.url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(linkedinPayload),
          });
          statusCode = response.status;
          await response.text().catch(() => null);
          status = response.ok ? "success" : "failed";
          if (!response.ok) errorMessage = `HTTP ${statusCode}`;
        } catch (err) {
          errorMessage = err.message;
        }

        // Log delivery
        await supabaseAdmin.from("linkedin_deliveries").insert({
          user_id,
          event_type,
          payload: linkedinPayload,
          status,
          status_code: statusCode,
          error_message: errorMessage,
        });

        // Send in-app notification on failure
        if (status === "failed") {
          await supabaseAdmin.from("notifications").insert({
            user_id,
            title: "⚠️ فشل إرسال Zapier Webhook",
            description: `فشل النشر التلقائي للوظيفة "${linkedinPayload.job_title || ""}". السبب: ${errorMessage || "خطأ غير معروف"}`,
            type: "webhook_error",
          });
        }

        return { type: "linkedin", status };
      })
    );

    const totalDelivered = regularResults.length + linkedinResults.length;

    return new Response(JSON.stringify({ delivered: totalDelivered }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
