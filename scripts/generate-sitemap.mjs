import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  escapeXml,
  fetchPublicSeoEntities,
  formatDateIso,
  getStaticSitemapRoutes,
  loadSeoRoutesConfig,
  resolveAppBaseUrl,
} from "./seo-helpers.mjs";

/** Build XML sitemap string from shared static routes, active jobs, and published blog posts. */
export async function generateSitemapXml(cwd = process.cwd(), options = {}) {
  const config = loadSeoRoutesConfig(cwd);
  const appBaseUrl = resolveAppBaseUrl(config);
  const staticRoutes = getStaticSitemapRoutes(config);
  const { activeJobs, publishedPosts } = options.entities ?? (await fetchPublicSeoEntities(cwd));
  const today = new Date().toISOString().split("T")[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  for (const route of staticRoutes) {
    xml += `  <url>\n`;
    xml += `    <loc>${escapeXml(`${appBaseUrl}${route.path}`)}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>${route.changefreq}</changefreq>\n`;
    xml += `    <priority>${route.priority}</priority>\n`;
    xml += `  </url>\n`;
  }

  for (const post of publishedPosts) {
    const lastmod = formatDateIso(post.updated_at || post.published_at || post.created_at, today);
    xml += `  <url>\n`;
    xml += `    <loc>${escapeXml(`${appBaseUrl}/blog/${encodeURIComponent(post.slug)}`)}</loc>\n`;
    xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.7</priority>\n`;
    xml += `  </url>\n`;
  }

  for (const job of activeJobs) {
    const lastmod = formatDateIso(job.updated_at || job.created_at, today);
    xml += `  <url>\n`;
    xml += `    <loc>${escapeXml(`${appBaseUrl}/apply/${encodeURIComponent(job.id)}`)}</loc>\n`;
    xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>0.8</priority>\n`;
    xml += `  </url>\n`;
  }

  xml += `</urlset>\n`;
  return xml;
}

async function generate() {
  const xml = await generateSitemapXml();
  const distDir = path.resolve(process.cwd(), "dist");
  if (fs.existsSync(distDir)) {
    fs.writeFileSync(path.join(distDir, "sitemap.xml"), xml, "utf-8");
    console.log("Generated sitemap in dist/sitemap.xml");
  }
}

const isDirectExecution =
  typeof process !== "undefined" &&
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectExecution) {
  generate();
}
