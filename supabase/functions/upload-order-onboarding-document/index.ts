import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";
import { getExtendedCorsHeaders } from "../_shared/cors.ts";

const bucket = "order-onboarding-documents";
const kinds = new Set(["id_copy", "educational_cert", "medical_report", "criminal_record",
  "signed_contract", "bank_iban", "experience_certs"]);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const types: Record<string, string> = {
  "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png",
};

function matchesType(data: Uint8Array, type: string) {
  if (type === "application/pdf") return data.length >= 5 &&
    String.fromCharCode(...data.slice(0, 5)) === "%PDF-";
  if (type === "image/jpeg") return data.length >= 3 &&
    data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  return data.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10]
    .every((byte, index) => data[index] === byte);
}

Deno.serve(async (req) => {
  const headers = getExtendedCorsHeaders(req);
  const respond = (message: string, status: number) => new Response(JSON.stringify({ error: message }), {
    status, headers: { ...headers, "Content-Type": "application/json" },
  });
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return respond("Method not allowed", 405);
  if (Number(req.headers.get("content-length") || 0) > 6_000_000) return respond("File too large", 413);

  try {
    const form = await req.formData();
    const token = form.get("token");
    const kind = form.get("kind");
    const file = form.get("file");
    if (typeof token !== "string" || !uuid.test(token) || typeof kind !== "string" ||
      !kinds.has(kind) || !(file instanceof File)) return respond("Invalid request", 400);
    if (!file.size || file.size > 5_242_880 || !types[file.type])
      return respond("Use a PDF, JPG or PNG file up to 5 MB", 400);
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!matchesType(bytes, file.type)) return respond("File format does not match its type", 400);

    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: order, error: orderError } = await db.from("converted_orders")
      .select("id,company_id,candidate_id,order_type,status,companies!inner(status,parent_company_id)")
      .eq("onboarding_token", token).maybeSingle();
    if (orderError) throw orderError;
    if (!order || !order.candidate_id || order.order_type !== "direct_hire" ||
      ["draft", "cancelled", "completed"].includes(order.status))
      return respond("Order link is unavailable", 404);
    const company = order.companies as unknown as { status: string; parent_company_id: string | null };
    if (company.status !== "active") return respond("Order link is unavailable", 404);
    if (company.parent_company_id) {
      const { data: parent, error } = await db.from("companies").select("status")
        .eq("id", company.parent_company_id).single();
      if (error || parent?.status !== "active") return respond("Order link is unavailable", 404);
    }
    const { data: previous, error: listError } = await db.from("order_onboarding_documents")
      .select("review_status").eq("order_id", order.id).eq("kind", kind)
      .order("created_at", { ascending: false }).limit(5);
    if (listError) throw listError;
    if (previous?.some((item) => item.review_status !== "rejected"))
      return respond("This document is awaiting review or already approved", 409);
    if ((previous?.length || 0) >= 5) return respond("Contact HR to upload another revision", 429);

    const name = file.name.split(/[\\/]/).pop()?.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 180) || `document.${types[file.type]}`;
    const path = `${order.company_id}/${order.id}/${kind}/${crypto.randomUUID()}.${types[file.type]}`;
    const { error: uploadError } = await db.storage.from(bucket).upload(path, bytes, {
      contentType: file.type, upsert: false, cacheControl: "0",
    });
    if (uploadError) throw uploadError;
    const { error: saveError } = await db.from("order_onboarding_documents").insert({
      order_id: order.id, kind, storage_path: path, file_name: name,
      content_type: file.type, file_size: file.size,
    });
    if (saveError) {
      await db.storage.from(bucket).remove([path]);
      if (saveError.code === "23505") return respond("This document is already awaiting review", 409);
      throw saveError;
    }
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("order document upload failed", error);
    return respond("Unable to save document", 500);
  }
});
