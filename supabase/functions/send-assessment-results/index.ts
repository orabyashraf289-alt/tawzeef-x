import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";
import { buildResultsEmail, type ResultEmail } from "./email.ts";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};
const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers });
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return reply(405, { error: "Method not allowed" });
  const authorization = req.headers.get("Authorization");
  if (!authorization) return reply(401, { error: "Sign in required" });
  const url = Deno.env.get("SUPABASE_URL")!;
  const client = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) return reply(401, { error: "Invalid session" });
  try {
    const { response_id } = await req.json();
    if (
      typeof response_id !== "string" || !/^[0-9a-f-]{36}$/i.test(response_id)
    ) return reply(400, { error: "Invalid response" });
    // Resolve recipient and grade from the saved, candidate-linked result only.
    const { data, error } = await client.rpc("get_assessment_result_delivery", {
      _response_id: response_id,
    });
    if (error || !data) {
      return reply(403, {
        error:
          "A completed, linked response and review permission are required",
      });
    }
    const result = data as ResultEmail;
    const response = await fetch(`${url}/functions/v1/send-email`, {
      method: "POST",
      signal: AbortSignal.timeout(60000),
      headers: {
        "Content-Type": "application/json",
        Authorization: authorization,
      },
      body: JSON.stringify({
        to: result.candidate_email,
        subject: `نتائج اختبار: ${result.title}`,
        html: buildResultsEmail(result),
      }),
    });
    if (!response.ok) {
      return reply(502, {
        error: "تعذّر إرسال النتيجة المحفوظة. حاول مرة أخرى.",
      });
    }
    return reply(200, { success: true });
  } catch {
    return reply(500, { error: "تعذّر إرسال النتيجة المحفوظة. حاول مرة أخرى." });
  }
});
