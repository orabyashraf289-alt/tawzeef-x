import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_BASE_URL = "https://www.tawzeefx.com";

/** Populate process.env from a local .env file when variables are missing. */
export function loadEnvFallback(cwd = process.cwd()) {
  try {
    const envPath = path.resolve(cwd, ".env");
    if (!fs.existsSync(envPath)) return;
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const idx = line.indexOf("=");
      if (idx <= 0) continue;
      const key = line.slice(0, idx).trim();
      const rawValue = line.slice(idx + 1).trim();
      if (key && rawValue && !process.env[key]) {
        process.env[key] = rawValue.replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // Best-effort env load for local builds.
  }
}

/** Load the single-source SEO route configuration JSON. */
export function loadSeoRoutesConfig(cwd = process.cwd()) {
  const jsonPath = path.resolve(cwd, "src", "data", "seoRoutes.json");
  return JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
}

/** Return indexable static sitemap routes derived from seoRoutes.json. */
export function getStaticSitemapRoutes(config = loadSeoRoutesConfig()) {
  return Object.entries(config.routes)
    .filter(([, entry]) => entry.prerender && !String(entry.robots || "").startsWith("noindex"))
    .map(([routePath, entry]) => ({
      path: routePath,
      changefreq: entry.changefreq || "weekly",
      priority: entry.priority || "0.7",
    }));
}

/** Resolve canonical base URL without trailing slash. */
export function resolveAppBaseUrl(config = loadSeoRoutesConfig()) {
  return (
    process.env.APP_BASE_URL ||
    process.env.VITE_APP_BASE_URL ||
    config.baseUrl ||
    DEFAULT_BASE_URL
  ).replace(/\/+$/, "");
}

/** Parse deadline dates in YYYY-MM-DD or DD/MM/YYYY format safely. */
export function parseDeadlineDate(str) {
  if (!str) return null;
  const isoMatch = String(str).match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    return new Date(`${isoMatch[1]}-${isoMatch[2].padStart(2, "0")}-${isoMatch[3].padStart(2, "0")}T23:59:59Z`);
  }
  const dmyMatch = String(str).match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    return new Date(`${dmyMatch[3]}-${dmyMatch[2].padStart(2, "0")}-${dmyMatch[1].padStart(2, "0")}T23:59:59Z`);
  }
  const parsed = new Date(str);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Filter jobs matching active status, <= 180-day age window, and unexpired deadline. */
export function filterActiveJobs(jobs, now = Date.now()) {
  return (jobs || []).filter((job) => {
    const createdTime = job.created_at ? new Date(job.created_at).getTime() : now;
    if (now - createdTime > 180 * 24 * 60 * 60 * 1000) {
      return false;
    }

    if (job.description && job.description.includes("application_deadline")) {
      const match = job.description.match(/"application_deadline"\s*:\s*"([^"]+)"/);
      if (match && match[1]) {
        const deadlineDate = parseDeadlineDate(match[1]);
        if (deadlineDate && deadlineDate.getTime() >= createdTime && now > deadlineDate.getTime()) {
          return false;
        }
      }
    }

    return true;
  });
}

/** Escape special characters for HTML attributes and text nodes. */
export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escape special XML characters for sitemap <loc> entries. */
export function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Format an ISO or fallback date string into YYYY-MM-DD. */
export function formatDateIso(dateStr, fallbackToday = new Date().toISOString().split("T")[0]) {
  if (!dateStr) return fallbackToday;
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? fallbackToday : d.toISOString().split("T")[0];
}

/** Fetch public active jobs and published blog posts from Supabase for sitemaps & prerendering. */
export async function fetchPublicSeoEntities(cwd = process.cwd()) {
  loadEnvFallback(cwd);
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { activeJobs: [], publishedPosts: [] };
  }

  let activeJobs = [];
  let publishedPosts = [];
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const [jobsRes, postsRes] = await Promise.all([
      supabase
        .from("jobs")
        .select("id, title, status, description, created_at, updated_at")
        .in("status", ["نشطة", "active"])
        .order("updated_at", { ascending: false }),
      supabase
        .from("blog_posts")
        .select("slug, title_ar, title_en, excerpt_ar, published_at, updated_at, created_at")
        .eq("published", true)
        .order("published_at", { ascending: false }),
    ]);

    if (!jobsRes.error && jobsRes.data) {
      activeJobs = filterActiveJobs(jobsRes.data);
    }
    if (!postsRes.error && postsRes.data) {
      publishedPosts = postsRes.data.filter((post) => Boolean(post.slug));
    }
  } catch (err) {
    console.warn("[SEO Build Helper] Could not fetch public entities from Supabase:", err?.message || err);
  }

  return { activeJobs, publishedPosts };
}
