import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const nowIso = new Date().toISOString();

    // Query pending scheduled emails due for delivery
    const { data: dueEmails, error } = await supabase
      .from("scheduled_emails")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_at", nowIso)
      .limit(50);

    if (error) throw error;

    let processedCount = 0;

    for (const email of (dueEmails || [])) {
      try {
        const sendResp = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            to: email.to_email,
            subject: email.subject,
            html: email.body_html,
            user_id: email.user_id,
            attachments: email.attachments || [],
          }),
        });

        if (sendResp.ok) {
          await supabase
            .from("scheduled_emails")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", email.id);
          processedCount++;
        } else {
          console.warn(`Failed processing scheduled email ${email.id}:`, await sendResp.text());
        }
      } catch (err) {
        console.error(`Exception processing scheduled email ${email.id}:`, err);
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: processedCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Scheduled emails worker error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
