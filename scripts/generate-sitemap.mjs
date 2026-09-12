import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
// Zero-dependency env loader
try {
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

const APP_BASE_URL = (
  process.env.APP_BASE_URL ||
  process.env.VITE_APP_BASE_URL ||
  "https://www.tawzeefx.com"
).replace(/\/+$/, "");

const STATIC_ROUTES = [
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

async function generate() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  let activeJobs = [];

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data, error } = await supabase
        .from("jobs")
        .select("id, title, status, description, created_at, updated_at")
        .in("status", ["نشطة", "active"])
        .order("updated_at", { ascending: false });

      if (!error && data) {
        activeJobs = data;
      }
    } catch (e) {
      console.warn("Could not fetch jobs for static sitemap fallback:", e.message);
    }
  }

  const today = new Date().toISOString().split("T")[0];
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  for (const route of STATIC_ROUTES) {
    xml += `  <url>\n`;
    xml += `    <loc>${APP_BASE_URL}${route.path}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>${route.changefreq}</changefreq>\n`;
    xml += `    <priority>${route.priority}</priority>\n`;
    xml += `  </url>\n`;
  }

  for (const job of activeJobs) {
    const lastmod = (job.updated_at || job.created_at || today).split("T")[0];
    xml += `  <url>\n`;
    xml += `    <loc>${APP_BASE_URL}/apply/${job.id}</loc>\n`;
    xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>0.8</priority>\n`;
    xml += `  </url>\n`;
  }

  xml += `</urlset>\n`;

  const distDir = path.resolve(process.cwd(), "dist");
  if (fs.existsSync(distDir)) {
    fs.writeFileSync(path.join(distDir, "sitemap.xml"), xml, "utf-8");
    console.log("Generated fallback sitemap in dist/sitemap.xml");
  }
}

generate();
