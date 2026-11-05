import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const { trackingCode, action = "list", slotId = null } = await req.json();
    if (
      typeof trackingCode !== "string" ||
      !/^TX-[0-9A-F]{32}$/.test(trackingCode.trim().toUpperCase()) ||
      !["list", "book", "cancel"].includes(action) ||
      (action !== "list" &&
        (typeof slotId !== "string" || !/^[0-9a-f-]{36}$/i.test(slotId)))
    ) return json({ error: "بيانات الحجز غير صالحة" }, 400);
    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data, error } = await db.rpc("candidate_interview_booking", {
      _tracking_code: trackingCode,
      _action: action,
      _slot_id: slotId,
    });
    if (error) {
      return json({
        error: error.code === "42501"
          ? "رابط الحجز غير متاح"
          : "تعذّر الحجز. حدّث المواعيد، وألغِ حجزك السابق قبل اختيار موعد بديل.",
      }, error.code === "42501" ? 403 : 409);
    }
    return json(data);
  } catch {
    return json({ error: "تعذّر الاتصال بخدمة الحجز. أعد المحاولة." }, 500);
  }
});
