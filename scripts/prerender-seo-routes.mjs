import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  escapeHtml,
  fetchPublicSeoEntities,
  loadSeoRoutesConfig,
  resolveAppBaseUrl,
} from "./seo-helpers.mjs";

/** Safely serialize JSON-LD for embedding inside an HTML <script> tag. */
function serializeJsonLd(data) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** Build Schema.org JSON-LD graph tailored to each public route. */
function buildRouteJsonLd(routePath, entry, canonicalUrl, config, baseUrl) {
  if (String(entry.robots || "").startsWith("noindex")) {
    return null;
  }

  const graph = [
    {
      "@type": entry.schemaType || "WebPage",
      "@id": `${canonicalUrl}#webpage`,
      url: canonicalUrl,
      name: entry.title,
      description: entry.description,
      inLanguage: "ar",
      isPartOf: { "@id": `${baseUrl}/#website` },
    },
  ];

  const breadcrumbItems = [
    {
      "@type": "ListItem",
      position: 1,
      name: "الرئيسية",
      item: `${baseUrl}/`,
    },
  ];

  if (routePath !== "/") {
    breadcrumbItems.push({
      "@type": "ListItem",
      position: 2,
      name: entry.breadcrumbName || entry.h1 || entry.title,
      item: canonicalUrl,
    });
  }

  graph.push({
    "@type": "BreadcrumbList",
    "@id": `${canonicalUrl}#breadcrumb`,
    itemListElement: breadcrumbItems,
  });

  if (routePath === "/" && Array.isArray(config.faq) && config.faq.length > 0) {
    graph.push({
      "@type": "SoftwareApplication",
      "@id": `${baseUrl}/#software`,
      name: config.siteName,
      alternateName: [config.brandNameAr, "توظيف اكس", config.brandNameEn, "Tawzeef-X"],
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: `${baseUrl}/`,
      inLanguage: ["ar", "en"],
      description: entry.description,
    });

    graph.push({
      "@type": "FAQPage",
      "@id": `${baseUrl}/#faq`,
      mainEntity: config.faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    });
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}

/** Render a visible, semantic HTML shell inside #root for Wave-1 crawlers & link discovery. */
function buildSemanticShellHtml(routePath, entry, config, { activeJobs, publishedPosts }) {
  const navHtml = (config.navLinks || [])
    .map(
      (link) =>
        `<a href="${escapeHtml(link.path)}" style="color:#0b57d0;text-decoration:none;font-weight:700;margin-inline-end:16px">${escapeHtml(link.label)}</a>`
    )
    .join("");

  const highlightsHtml =
    Array.isArray(entry.highlights) && entry.highlights.length > 0
      ? `<ul style="line-height:1.9;padding-inline-start:20px;margin:16px 0">${entry.highlights
          .map((item) => `<li>${escapeHtml(item)}</li>`)
          .join("")}</ul>`
      : "";

  let dynamicSectionHtml = "";
  if (routePath === "/" && Array.isArray(config.faq) && config.faq.length > 0) {
    dynamicSectionHtml = `
      <section aria-label="الأسئلة الشائعة" style="margin-top:28px;border-top:1px solid #e2e8f0;padding-top:20px">
        <h2 style="font-size:1.25rem;margin-bottom:12px">الأسئلة الشائعة حول منصة توظيف إكس (TawzeefX)</h2>
        ${config.faq
          .map(
            (item) =>
              `<article style="margin-bottom:14px"><h3 style="font-size:1rem;margin:0 0 6px">${escapeHtml(item.question)}</h3><p style="margin:0;color:#475569;line-height:1.7">${escapeHtml(item.answer)}</p></article>`
          )
          .join("")}
      </section>`;
  } else if (routePath === "/careers" && activeJobs.length > 0) {
    dynamicSectionHtml = `
      <section aria-label="الوظائف الشاغرة المتاحة" style="margin-top:24px">
        <h2 style="font-size:1.2rem;margin-bottom:10px">الوظائف المفتوحة للتقديم</h2>
        <ul style="line-height:1.9;padding-inline-start:20px">
          ${activeJobs
            .slice(0, 50)
            .map(
              (job) =>
                `<li><a href="/apply/${encodeURIComponent(job.id)}" style="color:#0b57d0">${escapeHtml(job.title || "فرصة وظيفية")}</a></li>`
            )
            .join("")}
        </ul>
      </section>`;
  } else if (routePath === "/blog" && publishedPosts.length > 0) {
    dynamicSectionHtml = `
      <section aria-label="مقالات مدونة توظيف إكس" style="margin-top:24px">
        <h2 style="font-size:1.2rem;margin-bottom:10px">أحدث مقالات التوظيف والموارد البشرية</h2>
        <ul style="line-height:1.9;padding-inline-start:20px">
          ${publishedPosts
            .map(
              (post) =>
                `<li><a href="/blog/${encodeURIComponent(post.slug)}" style="color:#0b57d0">${escapeHtml(post.title_ar || post.title_en || post.slug)}</a>${post.excerpt_ar ? ` — ${escapeHtml(post.excerpt_ar)}` : ""}</li>`
            )
            .join("")}
        </ul>
      </section>`;
  }

  return `<div data-seo-prerender="${escapeHtml(routePath)}" style="max-width:960px;margin:0 auto;padding:24px 20px;font-family:Tajawal,Inter,system-ui,sans-serif;color:#0f172a;background:#ffffff">
      <header style="border-bottom:1px solid #e2e8f0;padding-bottom:14px;margin-bottom:24px">
        <nav aria-label="التنقل الرئيسي">${navHtml}</nav>
      </header>
      <main>
        <h1 style="font-size:1.75rem;line-height:1.4;margin:0 0 12px">${escapeHtml(entry.h1 || entry.title)}</h1>
        <p style="font-size:1.05rem;line-height:1.8;color:#334155;margin:0 0 16px">${escapeHtml(entry.summary || entry.description)}</p>
        ${highlightsHtml}
        ${dynamicSectionHtml}
      </main>
      <footer style="margin-top:32px;border-top:1px solid #e2e8f0;padding-top:16px;font-size:0.9rem;color:#64748b">
        <p>© ${escapeHtml(config.siteName)}</p>
      </footer>
    </div>`;
}

/** Update head meta tags, canonical link, JSON-LD, and root shell inside built Vite HTML. */
function renderRouteHtml(templateHtml, routePath, entry, config, baseUrl, entities) {
  const canonicalUrl = routePath === "/" ? `${baseUrl}/` : `${baseUrl}${routePath}`;
  const robots = entry.robots || "index, follow";

  let html = templateHtml
    .replace(/<script id="route-seo-jsonld"[\s\S]*?<\/script>\s*/g, "")
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(entry.title)}</title>`)
    .replace(
      /<meta name="description" content="[^"]*"\s*\/?>/,
      `<meta name="description" content="${escapeHtml(entry.description)}" />`
    )
    .replace(
      /<meta name="keywords" content="[^"]*"\s*\/?>/,
      `<meta name="keywords" content="${escapeHtml(entry.keywords)}" />`
    )
    .replace(
      /<meta name="robots" content="[^"]*"\s*\/?>/,
      `<meta name="robots" content="${escapeHtml(robots)}" />`
    )
    .replace(
      /<link rel="canonical" href="[^"]*"\s*\/?>/,
      `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`
    )
    .replace(
      /<meta property="og:title" content="[^"]*"\s*\/?>/,
      `<meta property="og:title" content="${escapeHtml(entry.title)}" />`
    )
    .replace(
      /<meta property="og:description" content="[^"]*"\s*\/?>/,
      `<meta property="og:description" content="${escapeHtml(entry.description)}" />`
    )
    .replace(
      /<meta property="og:url" content="[^"]*"\s*\/?>/,
      `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`
    )
    .replace(
      /<meta name="twitter:title" content="[^"]*"\s*\/?>/,
      `<meta name="twitter:title" content="${escapeHtml(entry.title)}" />`
    )
    .replace(
      /<meta name="twitter:description" content="[^"]*"\s*\/?>/,
      `<meta name="twitter:description" content="${escapeHtml(entry.description)}" />`
    );

  const jsonLd = buildRouteJsonLd(routePath, entry, canonicalUrl, config, baseUrl);
  if (jsonLd) {
    const jsonLdTag = `    <script id="route-seo-jsonld" data-route="${escapeHtml(routePath)}" type="application/ld+json">\n    ${serializeJsonLd(jsonLd)}\n    </script>\n  </head>`;
    html = html.replace("</head>", jsonLdTag);
  }

  const shellHtml = buildSemanticShellHtml(routePath, entry, config, entities);
  html = html.replace(/<div id="root">[\s\S]*?<\/body>/, `<div id="root">${shellHtml}</div>\n  </body>`);
  return html;
}

/** Generate pre-rendered flat HTML files in dist/ for all marked routes. */
export async function prerenderSeoRoutes(cwd = process.cwd(), options = {}) {
  const distDir = path.resolve(cwd, "dist");
  const indexHtmlPath = path.join(distDir, "index.html");
  if (!fs.existsSync(indexHtmlPath)) {
    throw new Error("dist/index.html not found; run vite build before prerendering SEO routes.");
  }

  const templateHtml = fs.readFileSync(indexHtmlPath, "utf-8");
  const config = loadSeoRoutesConfig(cwd);
  const baseUrl = resolveAppBaseUrl(config);
  const entities = options.entities ?? (await fetchPublicSeoEntities(cwd));

  const seoOutDir = path.join(distDir, "_seo");
  fs.mkdirSync(seoOutDir, { recursive: true });

  const renderedFiles = [];
  for (const [routePath, entry] of Object.entries(config.routes)) {
    if (!entry.prerender) continue;
    const outputRelPath = routePath === "/" ? "index.html" : `_seo/${routePath.replace(/^\/+/, "")}.html`;
    const outputPath = path.join(distDir, outputRelPath);
    const renderedHtml = renderRouteHtml(templateHtml, routePath, entry, config, baseUrl, entities);
    fs.writeFileSync(outputPath, renderedHtml, "utf-8");
    renderedFiles.push(outputRelPath.replace(/\\/g, "/"));
  }

  console.log(`[SEO Prerender] Generated ${renderedFiles.length} pre-rendered HTML files: ${renderedFiles.join(", ")}`);
  return renderedFiles;
}

const isDirectExecution =
  typeof process !== "undefined" &&
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectExecution) {
  prerenderSeoRoutes().catch((err) => {
    console.error("[SEO Prerender] Failed:", err);
    process.exit(1);
  });
}
