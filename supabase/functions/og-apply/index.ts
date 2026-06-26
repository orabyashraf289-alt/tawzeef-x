import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = "https://ai-hire-buddy-22.lovable.app";
const OG_IMAGE_BASE = `${supabaseUrl}/functions/v1/og-image`;

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const jobId = url.searchParams.get("id");

  if (!jobId) {
    return new Response("Missing id", { status: 400 });
  }

  const sb = createClient(supabaseUrl, supabaseKey);
  const { data: job } = await sb.from("jobs").select("*").eq("id", jobId).single();

  const title = job?.title ?? "فرصة وظيفية";
  const dept = job?.department ?? "";
  const loc = job?.location ?? "";
  const desc = job?.description
    ? job.description.substring(0, 150)
    : `${title} - ${dept} - ${loc}`;
  const applyUrl = `${APP_URL}/apply/${jobId}`;
  const imageUrl = `${OG_IMAGE_BASE}?id=${jobId}`;

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8"/>
  <title>${title} | Tawzeef-X</title>
  <meta name="description" content="${desc}"/>
  <meta property="og:type" content="website"/>
  <meta property="og:url" content="${applyUrl}"/>
  <meta property="og:title" content="${title} - ${dept}"/>
  <meta property="og:description" content="${desc}"/>
  <meta property="og:image" content="${imageUrl}"/>
  <meta property="og:image:width" content="1200"/>
  <meta property="og:image:height" content="630"/>
  <meta property="og:site_name" content="Tawzeef-X"/>
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="${title} - ${dept}"/>
  <meta name="twitter:description" content="${desc}"/>
  <meta name="twitter:image" content="${imageUrl}"/>
  <meta http-equiv="refresh" content="0;url=${applyUrl}"/>
</head>
<body>
  <p>Redirecting to <a href="${applyUrl}">${applyUrl}</a></p>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
});
