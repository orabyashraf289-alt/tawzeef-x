import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const jobId = url.searchParams.get("id");

  if (!jobId) {
    return new Response("Missing id", { status: 400 });
  }

  const sb = createClient(supabaseUrl, supabaseKey);
  const { data: job } = await sb
    .from("jobs")
    .select("title, department, location, type, experience_level, salary_min, salary_max")
    .eq("id", jobId)
    .single();

  const title = job?.title ?? "فرصة وظيفية";
  const dept = job?.department ?? "";
  const loc = job?.location ?? "";
  const type = job?.type ?? "";
  const exp = job?.experience_level ?? "";
  const salaryMin = job?.salary_min;
  const salaryMax = job?.salary_max;

  let salaryText = "";
  if (salaryMin && salaryMax) {
    salaryText = `${salaryMin.toLocaleString()} - ${salaryMax.toLocaleString()} ر.س`;
  } else if (salaryMin) {
    salaryText = `من ${salaryMin.toLocaleString()} ر.س`;
  }

  // Build info pills
  const pills: string[] = [];
  if (dept) pills.push(dept);
  if (loc) pills.push(loc);
  if (type) pills.push(type);
  if (exp) pills.push(exp);

  const pillsSvg = pills
    .map((text, i) => {
      const x = 60 + i * 185;
      return `
        <rect x="${x}" y="310" width="170" height="38" rx="19" fill="rgba(255,255,255,0.15)"/>
        <text x="${x + 85}" y="334" text-anchor="middle" font-size="16" fill="#e0e7ff" font-family="Arial, sans-serif">${escapeXml(text)}</text>
      `;
    })
    .join("");

  const salarySvg = salaryText
    ? `<text x="60" y="400" font-size="22" fill="#a5f3fc" font-family="Arial, sans-serif" font-weight="bold">${escapeXml(salaryText)}</text>`
    : "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="50%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#6366f1"/>
      <stop offset="100%" stop-color="#06b6d4"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Decorative circles -->
  <circle cx="1050" cy="120" r="200" fill="rgba(99,102,241,0.08)"/>
  <circle cx="150" cy="530" r="150" fill="rgba(6,182,212,0.06)"/>

  <!-- Top accent bar -->
  <rect x="0" y="0" width="1200" height="6" fill="url(#accent)"/>

  <!-- Brand -->
  <text x="60" y="80" font-size="20" fill="#94a3b8" font-family="Arial, sans-serif" font-weight="bold" letter-spacing="2">Tawzeef-X</text>
  <text x="1140" y="80" text-anchor="end" font-size="18" fill="#64748b" font-family="Arial, sans-serif">فرصة وظيفية 🚀</text>

  <!-- Divider -->
  <rect x="60" y="110" width="120" height="3" rx="1.5" fill="url(#accent)"/>

  <!-- Job Title -->
  <text x="60" y="200" font-size="48" fill="#f1f5f9" font-family="Arial, sans-serif" font-weight="bold" direction="rtl">${escapeXml(truncate(title, 40))}</text>

  <!-- Subtitle line -->
  <text x="60" y="260" font-size="24" fill="#94a3b8" font-family="Arial, sans-serif">${escapeXml([dept, loc].filter(Boolean).join(" · "))}</text>

  <!-- Pills -->
  ${pillsSvg}

  <!-- Salary -->
  ${salarySvg}

  <!-- Bottom bar -->
  <rect x="0" y="580" width="1200" height="50" fill="rgba(0,0,0,0.3)"/>
  <text x="600" y="612" text-anchor="middle" font-size="18" fill="#64748b" font-family="Arial, sans-serif">قدّم الآن على Tawzeef-X</text>
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
});

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.substring(0, max) + "…" : str;
}
