import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");

    // Extract client IP from headers
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      "unknown";

    // Extract user agent
    const userAgent = req.headers.get("user-agent") || "unknown";

    const body = await req.json();
    const { eventType, details } = body;

    if (!eventType) {
      return new Response(JSON.stringify({ error: "Missing eventType" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only allow unauthenticated calls for login failure events
    const allowedUnauthEvents = ["login.failed", "login.otp_failed"];
    let user = null;

    if (authHeader) {
      const supabaseAuth = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data } = await supabaseAuth.auth.getUser();
      user = data?.user;
    } else if (!allowedUnauthEvents.includes(eventType)) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to insert (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Parse user agent for readable info
    const browserInfo = parseUserAgent(userAgent);

    const enrichedDetails = {
      ...((details as Record<string, unknown>) || {}),
      user_agent: userAgent,
      browser: browserInfo.browser,
      os: browserInfo.os,
      device: browserInfo.device,
    };

    const { error } = await supabaseAdmin.from("audit_log").insert({
      event_type: eventType,
      user_id: user?.id || null,
      user_email: user?.email || body.userEmail || null,
      ip_address: clientIp,
      details: enrichedDetails,
    });

    if (error) {
      console.error("Insert error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for suspicious repeated failed login attempts from same IP
    if (eventType === "login.failed" || eventType === "login.otp_failed") {
      try {
        const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        const { data: recentFailures } = await supabaseAdmin
          .from("audit_log")
          .select("id", { count: "exact" })
          .in("event_type", ["login.failed", "login.otp_failed"])
          .eq("ip_address", clientIp)
          .gte("created_at", fifteenMinAgo);

        const failCount = recentFailures?.length || 0;
        const THRESHOLD = 5;

        if (failCount >= THRESHOLD) {
          // Get all admin user IDs
          const { data: adminRoles } = await supabaseAdmin
            .from("user_roles")
            .select("user_id")
            .eq("role", "admin");

          if (adminRoles && adminRoles.length > 0) {
            // Check if we already sent an alert for this IP in the last 15 min
            const { data: existingAlerts } = await supabaseAdmin
              .from("notifications")
              .select("id")
              .eq("type", "security_alert")
              .gte("created_at", fifteenMinAgo)
              .ilike("description", `%${clientIp}%`)
              .limit(1);

            if (!existingAlerts || existingAlerts.length === 0) {
              const notifications = adminRoles.map((r: any) => ({
                user_id: r.user_id,
                title: `⚠️ تنبيه أمني: محاولات دخول مشبوهة`,
                description: `تم رصد ${failCount} محاولات دخول فاشلة من العنوان ${clientIp} خلال 15 دقيقة. البريد المستهدف: ${body.userEmail || "غير معروف"}`,
                type: "security_alert",
              }));

              await supabaseAdmin.from("notifications").insert(notifications);

              // Also log the security alert as an audit event
              await supabaseAdmin.from("audit_log").insert({
                event_type: "security.suspicious_ip",
                ip_address: clientIp,
                user_email: body.userEmail || null,
                details: {
                  failed_attempts: failCount,
                  time_window: "15 minutes",
                  threshold: THRESHOLD,
                  target_email: body.userEmail || null,
                },
              });
            }
          }
        }
      } catch (alertErr) {
        console.error("Failed to check/send security alert:", alertErr);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function parseUserAgent(ua: string): {
  browser: string;
  os: string;
  device: string;
} {
  let browser = "Unknown";
  let os = "Unknown";
  let device = "Desktop";

  // Browser detection
  if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("Chrome/")) browser = "Chrome";
  else if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Safari/") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Opera") || ua.includes("OPR/")) browser = "Opera";

  // OS detection
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  // Device detection
  if (ua.includes("Mobile") || ua.includes("Android")) device = "Mobile";
  else if (ua.includes("iPad") || ua.includes("Tablet")) device = "Tablet";

  return { browser, os, device };
}
