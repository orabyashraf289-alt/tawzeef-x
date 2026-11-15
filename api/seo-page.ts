import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import {
  buildDynamicBlogPageHtml,
  buildDynamicJobPageHtml,
  isUuid,
  SEO_BASE_URL,
  type BlogSeoRecord,
  type JobSeoRecord,
} from "./_seoHtml.js";

interface SeoRequest {
  query?: Record<string, string | string[] | undefined>;
  url?: string;
}

interface SeoResponse {
  setHeader(name: string, value: string): void;
  status(code: number): SeoResponse;
  send(body: string): SeoResponse;
}

let cachedTemplateHtml: string | null = null;

function readQueryParam(req: SeoRequest, key: string): string {
  const direct = req.query?.[key];
  if (Array.isArray(direct)) return (direct[0] || "").trim();
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  if (req.url) {
    try {
      const parsed = new URL(req.url, SEO_BASE_URL);
      return (parsed.searchParams.get(key) || "").trim();
    } catch {
      return "";
    }
  }
  return "";
}

function loadEnvFallback() {
  if (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) return;
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (!fs.existsSync(envPath)) return;
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const idx = line.indexOf("=");
      if (idx <= 0) continue;
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim();
      if (k && v && !process.env[k]) {
        process.env[k] = v.replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // Non-fatal fallback for local invocations.
  }
}

async function loadIndexTemplate(): Promise<string> {
  if (cachedTemplateHtml) return cachedTemplateHtml;

  const builtIndexPath = path.resolve(process.cwd(), "dist", "index.html");
  if (fs.existsSync(builtIndexPath)) {
    const content = fs.readFileSync(builtIndexPath, "utf-8");
    if (content.includes("/assets/")) {
      cachedTemplateHtml = content;
      return cachedTemplateHtml;
    }
  }

  // Fallback to static CDN dist/index.html if serverless bundle omitted dist/index.html.
  const response = await fetch(`${SEO_BASE_URL}/index.html`);
  if (!response.ok) {
    throw new Error(`Unable to load built HTML template (${response.status})`);
  }
  const fetched = await response.text();
  if (!fetched.includes("/assets/")) {
    throw new Error("Fetched HTML template missing production asset references");
  }
  cachedTemplateHtml = fetched;
  return cachedTemplateHtml;
}

export default async function handler(req: SeoRequest, res: SeoResponse) {
  loadEnvFallback();

  const kind = readQueryParam(req, "kind");
  const slug = readQueryParam(req, "slug");
  const id = readQueryParam(req, "id");

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

  try {
    const templateHtml = await loadIndexTemplate();
    let renderedHtml = templateHtml;

    if (kind === "blog" && slug) {
      let post: BlogSeoRecord | null = null;
      if (supabase) {
        const { data } = await supabase
          .from("blog_posts")
          .select(
            "slug, title_ar, title_en, excerpt_ar, excerpt_en, content_ar, cover_image, category, author_name, read_time_minutes, published_at, updated_at"
          )
          .eq("slug", slug)
          .eq("published", true)
          .maybeSingle();
        post = (data as BlogSeoRecord | null) || null;
      }
      renderedHtml = buildDynamicBlogPageHtml(templateHtml, slug, post);
    } else if (kind === "apply" && id) {
      let job: JobSeoRecord | null = null;
      if (supabase && isUuid(id)) {
        const { data: jobData } = await supabase
          .from("jobs")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (jobData) {
          let companyData: { name?: string | null; logo_url?: string | null } | null = null;
          if ((jobData as { company_id?: string | null }).company_id) {
            const { data: cData } = await supabase
              .rpc("get_public_job_employer", { _job_id: id })
              .maybeSingle();
            companyData = (cData as { name?: string | null; logo_url?: string | null } | null) || null;
          }
          job = { ...(jobData as JobSeoRecord), companies: companyData };
        }
      }
      renderedHtml = buildDynamicJobPageHtml(templateHtml, id, job);
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
    res.setHeader("X-Tawzeefx-Seo", kind ? `dynamic-${kind}` : "dynamic-ssr");
    return res.status(200).send(renderedHtml);
  } catch (err) {
    console.error("[SEO Dynamic Page] Error rendering metadata shell:", err);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(
      `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="UTF-8" /><meta name="robots" content="noindex, follow" /><title>توظيف إكس | TawzeefX</title><meta http-equiv="refresh" content="0;url=/" /></head><body><div id="root"></div></body></html>`
    );
  }
}
