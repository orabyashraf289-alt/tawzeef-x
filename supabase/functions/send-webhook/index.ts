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

async function computeHmacSignature(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getEventTitle(eventType: string, payload: any): string {
  switch (eventType) {
    case "candidate.applied":
      return `مرشح جديد: ${payload?.name || payload?.candidate_name || "مجهول"}`;
    case "candidate.status_changed":
      return `تحديث مسار المرشح: ${payload?.candidate_name || payload?.name || "مرشح"}`;
    case "candidate.top_match":
      return `⭐ مرشح فائق التوافق: ${payload?.name || "مرشح"}`;
    case "interview.scheduled":
      return `📅 مقابلة مجدولة: ${payload?.candidate_name || ""}`;
    case "offer.accepted":
      return `🎉 تم قبول العرض الوظيفي!`;
    case "job.created":
      return `📢 وظيفة جديدة: ${payload?.title || payload?.job_title || ""}`;
    default:
      return `إشعار من توظيف إكس: ${eventType}`;
  }
}

function getEventSummary(eventType: string, payload: any): string {
  switch (eventType) {
    case "candidate.applied":
      return `قدم المرشح على وظيفة "${payload?.job_title || payload?.role || "شاغر"}" في قسم ${payload?.department || "العام"}.`;
    case "candidate.status_changed":
      return `تم نقل المرشح من (${payload?.old_status || "-"}) إلى (${payload?.new_status || "-"}).`;
    case "candidate.top_match":
      return `حقق المرشح نسبة تطابق ذكاء اصطناعي استثنائية (${payload?.match_score || "85%+"}).`;
    case "interview.scheduled":
      return `تم حجز موعد مقابلة بتاريخ ${payload?.scheduled_at || payload?.date || "قريباً"}.`;
    case "offer.accepted":
      return `أتم المرشح توقيع العرض الوظيفي بنجاح وهو الآن جاهز للمباشرة.`;
    case "job.created":
      return `تم نشر وظيفة شاغرة جديدة وتفعيل استقبال طلبات المتقدمين.`;
    default:
      return `حدث جديد في نظام التوظيف (${eventType}).`;
  }
}

function formatPayloadForEndpoint(url: string, event_type: string, payload: any): string {
  const normUrl = url.toLowerCase();
  const timestamp = new Date().toISOString();

  // 1) Slack Incoming Webhook (Block Kit)
  if (normUrl.includes("hooks.slack.com")) {
    const title = getEventTitle(event_type, payload);
    const summary = getEventSummary(event_type, payload);
    const fields = Object.entries(payload || {})
      .filter(([_, v]) => typeof v === "string" || typeof v === "number")
      .slice(0, 6)
      .map(([k, v]) => ({
        type: "mrkdwn",
        text: `*${k}:*\n${v}`,
      }));

    return JSON.stringify({
      text: `${title}: ${summary}`,
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: `🚀 ${title}`, emoji: true },
        },
        {
          type: "section",
          text: { type: "mrkdwn", text: summary },
        },
        ...(fields.length > 0 ? [{ type: "section", fields }] : []),
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `🤖 *منصة توظيف إكس (TawzeefX)* • ${timestamp}`,
            },
          ],
        },
      ],
    });
  }

  // 2) Microsoft Teams Connector / Power Automate
  if (
    normUrl.includes("webhook.office.com") ||
    normUrl.includes("logic.azure.com") ||
    normUrl.includes("teams.microsoft.com") ||
    normUrl.includes("powerautomate.com") ||
    normUrl.includes("office365.com")
  ) {
    const title = getEventTitle(event_type, payload);
    const summary = getEventSummary(event_type, payload);
    const facts = Object.entries(payload || {})
      .filter(([_, v]) => typeof v === "string" || typeof v === "number")
      .slice(0, 8)
      .map(([name, value]) => ({ name, value: String(value) }));

    return JSON.stringify({
      "@type": "MessageCard",
      "@context": "http://schema.org/extensions",
      summary: title,
      themeColor: event_type === "offer.accepted" ? "22c55e" : "6366f1",
      title: `⚡ ${title}`,
      text: summary,
      sections: [
        {
          activityTitle: "TawzeefX Collaboration Engine",
          activitySubtitle: timestamp,
          facts,
          markdown: true,
        },
      ],
    });
  }

  // 3) Standard generic webhook
  return JSON.stringify({
    event: event_type,
    timestamp,
    data: payload,
  });
}

    // Send to regular webhook endpoints
    const regularResults = await Promise.allSettled(
      (endpoints || []).map(async (endpoint) => {
        const timestamp = new Date().toISOString();
        const payloadStr = formatPayloadForEndpoint(endpoint.url, event_type, payload);

        const requestHeaders: Record<string, string> = {
          "Content-Type": "application/json",
          "X-Tawzeef-Timestamp": timestamp,
          "User-Agent": "TawzeefX-Webhook-Engine/1.0",
        };

        if (endpoint.secret) {
          try {
            const signature = await computeHmacSignature(endpoint.secret, payloadStr);
            requestHeaders["X-Tawzeef-Signature"] = `sha256=${signature}`;
          } catch (e) {
            console.error("Failed to compute webhook signature:", e);
          }
        }

        let status = "failed";
        let statusCode: number | null = null;
        let responseBody: string | null = null;
        let errorMessage: string | null = null;

        try {
          const response = await fetch(endpoint.url, {
            method: "POST",
            headers: requestHeaders,
            body: payloadStr,
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
