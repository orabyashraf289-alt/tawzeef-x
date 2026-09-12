import { createClient } from "@supabase/supabase-js";

const ARABIC_MONTHS: Record<string, number> = {
  "يناير": 0, "كانون الثاني": 0,
  "فبراير": 1, "شباط": 1,
  "مارس": 2, "آذار": 2,
  "أبريل": 3, "ابريل": 3, "نيسان": 3,
  "مايو": 4, "أيار": 4, "ايار": 4,
  "يونيو": 5, "حزيران": 5,
  "يوليو": 6, "تموز": 6,
  "أغسطس": 7, "اغسطس": 7, "آب": 7,
  "سبتمبر": 8, "أيلول": 8, "ايلول": 8,
  "أكتوبر": 9, "اكتوبر": 9, "تشرين الأول": 9, "تشرين الاول": 9,
  "نوفمبر": 10, "تشرين الثاني": 10,
  "ديسمبر": 11, "كانون الأول": 11, "كانون الاول": 11,
};

function normalizeArabicNumerals(str: string): string {
  if (!str) return "";
  return str.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

function parseDeadlineDate(raw?: string | null): Date | null {
  if (!raw || typeof raw !== "string") return null;
  const str = normalizeArabicNumerals(raw.trim());
  if (!str) return null;

  const direct = new Date(str);
  if (!isNaN(direct.getTime()) && /\d{4}/.test(str)) {
    return direct;
  }

  for (const [mName, mIdx] of Object.entries(ARABIC_MONTHS)) {
    if (str.includes(mName)) {
      const parts = str.match(/\d+/g);
      if (parts && parts.length >= 2) {
        let day = parseInt(parts[0], 10);
        let year = parseInt(parts[1], 10);
        if (day > 1000) {
          const temp = day;
          day = year;
          year = temp;
        }
        return new Date(Date.UTC(year, mIdx, day, 23, 59, 59));
      }
    }
  }

  const slashMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (slashMatch) {
    const day = parseInt(slashMatch[1], 10);
    const month = parseInt(slashMatch[2], 10) - 1;
    const year = parseInt(slashMatch[3], 10);
    return new Date(Date.UTC(year, month, day, 23, 59, 59));
  }

  return null;
}

const APP_BASE_URL = (
  process.env.APP_BASE_URL ||
  process.env.VITE_APP_BASE_URL ||
  "https://www.tawzeefx.com"
).replace(/\/+$/, "");

interface StaticRoute {
  path: string;
  changefreq: string;
  priority: string;
}

const STATIC_ROUTES: StaticRoute[] = [
  { path: "", changefreq: "daily", priority: "1.0" },
  { path: "/features", changefreq: "weekly", priority: "0.9" },
  { path: "/pricing", changefreq: "weekly", priority: "0.8" },
  { path: "/careers", changefreq: "daily", priority: "0.8" },
  { path: "/blog", changefreq: "weekly", priority: "0.7" },
  { path: "/about", changefreq: "monthly", priority: "0.7" },
  { path: "/contact", changefreq: "monthly", priority: "0.7" },
  { path: "/privacy", changefreq: "monthly", priority: "0.5" },
  { path: "/terms", changefreq: "monthly", priority: "0.5" },
];

function formatDate(isoOrDateStr?: string | null): string {
  if (!isoOrDateStr) return new Date().toISOString().split("T")[0];
  try {
    const d = new Date(isoOrDateStr);
    if (isNaN(d.getTime())) return new Date().toISOString().split("T")[0];
    return d.toISOString().split("T")[0];
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

export default async function handler(req: any, res: any) {
  // Local environment fallback: read .env if process.env.SUPABASE_URL is missing
  if (!process.env.SUPABASE_URL && !process.env.VITE_SUPABASE_URL) {
    try {
      const fs = await import("fs");
      const path = await import("path");
      const envPath = path.resolve(process.cwd(), ".env");
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, "utf-8");
        content.split("\n").forEach((line) => {
          const [k, ...rest] = line.split("=");
          if (k && rest.length && !process.env[k.trim()]) {
            process.env[k.trim()] = rest.join("=").trim().replace(/^["']|["']$/g, "");
          }
        });
      }
    } catch {}
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

  let activeJobs: any[] = [];

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, title, status, description, created_at, updated_at")
        .in("status", ["نشطة", "active"])
        .order("updated_at", { ascending: false });

      if (!error && data) {
        const now = Date.now();
        activeJobs = data.filter((job) => {
          const createdTime = job.created_at ? new Date(job.created_at).getTime() : now;

          // Safe window: jobs older than 180 days are considered closed
          if (now - createdTime > 180 * 24 * 60 * 60 * 1000) {
            return false;
          }

          // Check if explicit deadline passed in description specs
          if (job.description && job.description.includes("application_deadline")) {
            const match = job.description.match(/"application_deadline"\s*:\s*"([^"]+)"/);
            if (match && match[1]) {
              const deadlineDate = parseDeadlineDate(match[1]);
              if (deadlineDate && deadlineDate.getTime() >= createdTime) {
                if (now > deadlineDate.getTime()) {
                  return false; // Expired!
                }
              }
            }
          }

          return true;
        });
      }
    } catch (err) {
      console.warn("[Sitemap] Notice fetching jobs from Supabase:", err);
    }
  }

  const today = new Date().toISOString().split("T")[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  // Static marketing routes
  for (const route of STATIC_ROUTES) {
    xml += `  <url>\n`;
    xml += `    <loc>${APP_BASE_URL}${route.path}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>${route.changefreq}</changefreq>\n`;
    xml += `    <priority>${route.priority}</priority>\n`;
    xml += `  </url>\n`;
  }

  // Active public jobs with genuine lastmod
  for (const job of activeJobs) {
    const lastmod = formatDate(job.updated_at || job.created_at);
    xml += `  <url>\n`;
    xml += `    <loc>${APP_BASE_URL}/apply/${job.id}</loc>\n`;
    xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>0.8</priority>\n`;
    xml += `  </url>\n`;
  }

  xml += `</urlset>\n`;

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  return res.status(200).send(xml);
}
