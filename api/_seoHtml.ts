import fs from "fs";
import path from "path";

interface SeoRouteMetaFallback {
  title: string;
  description: string;
  keywords: string;
  h1: string;
  summary: string;
}

interface SeoRoutesConfigShape {
  baseUrl: string;
  siteName: string;
  navLinks: Array<{ path: string; label: string }>;
  routes: {
    "/blog": SeoRouteMetaFallback;
    "/careers": SeoRouteMetaFallback;
    [key: string]: SeoRouteMetaFallback | undefined;
  };
}

const DEFAULT_SEO_ROUTES_CONFIG: SeoRoutesConfigShape = {
  baseUrl: "https://www.tawzeefx.com",
  siteName: "توظيف إكس",
  navLinks: [
    { path: "/", label: "الرئيسية - توظيف إكس" },
    { path: "/features", label: "المميزات والحلول" },
    { path: "/pricing", label: "الأسعار والباقات" },
    { path: "/careers", label: "الوظائف الشاغرة" },
    { path: "/blog", label: "المدونة" },
    { path: "/about", label: "عن المنصة" },
    { path: "/contact", label: "تواصل معنا" },
    { path: "/privacy", label: "سياسة الخصوصية" },
    { path: "/terms", label: "الشروط والأحكام" },
  ],
  routes: {
    "/careers": {
      title: "الوظائف المتاحة | توظيف إكس (TawzeefX) - تصفح أحدث فرص العمل",
      description:
        "تصفح أحدث الوظائف الشاغرة وفرص العمل المتاحة عبر منصة توظيف إكس (TawzeefX) في السعودية والعالم العربي وقدّم سيرتك الذاتية مباشرة للشركات الموثوقة.",
      keywords: "وظائف توظيف إكس, وظائف شاغرة, فرص عمل في السعودية, تقديم وظائف, بوابة التوظيف, TawzeefX careers",
      h1: "الوظائف الشاغرة وفرص العمل على منصة توظيف إكس (TawzeefX)",
      summary: "اكتشف الوظائف المفتوحة في مختلف التخصصات وقدّم طلبك مباشرة مع إمكانية متابعة حالة الترشح.",
    },
    "/blog": {
      title: "المدونة | توظيف إكس (TawzeefX) - مقالات ونصائح التوظيف والموارد البشرية",
      description:
        "اقرأ أحدث المقالات والأدلة المتخصصة في التوظيف الذكي، إدارة المواهب، التوظيف عن بُعد، وأفضل ممارسات الموارد البشرية على مدونة توظيف إكس (TawzeefX).",
      keywords:
        "مدونة توظيف إكس, مقالات الموارد البشرية, نصائح المقابلات الشخصية, التوظيف الذكي, التوظيف بالذكاء الاصطناعي, TawzeefX blog",
      h1: "مدونة توظيف إكس (TawzeefX) للتوظيف الذكي والموارد البشرية",
      summary:
        "مقالات وأدلة عملية لفرق الموارد البشرية ومديري التوظيف حول الذكاء الاصطناعي، التوظيف عن بُعد، وبناء العلامة التجارية للمنشأة.",
    },
  },
};

let cachedSeoRoutesConfig: SeoRoutesConfigShape | null = null;

/** Load src/data/seoRoutes.json when present on disk, with safe typed fallback for serverless bundles. */
function getSeoRoutesConfig(): SeoRoutesConfigShape {
  if (cachedSeoRoutesConfig) return cachedSeoRoutesConfig;
  try {
    const configPath = path.resolve(process.cwd(), "src", "data", "seoRoutes.json");
    if (fs.existsSync(configPath)) {
      const parsed = JSON.parse(fs.readFileSync(configPath, "utf-8")) as Partial<SeoRoutesConfigShape>;
      cachedSeoRoutesConfig = {
        baseUrl: parsed.baseUrl || DEFAULT_SEO_ROUTES_CONFIG.baseUrl,
        siteName: parsed.siteName || DEFAULT_SEO_ROUTES_CONFIG.siteName,
        navLinks: Array.isArray(parsed.navLinks) && parsed.navLinks.length > 0
          ? parsed.navLinks
          : DEFAULT_SEO_ROUTES_CONFIG.navLinks,
        routes: {
          ...DEFAULT_SEO_ROUTES_CONFIG.routes,
          ...(parsed.routes || {}),
        },
      };
      return cachedSeoRoutesConfig;
    }
  } catch {
    // Fall back to static defaults when serverless bundle excludes src/data/seoRoutes.json.
  }
  cachedSeoRoutesConfig = DEFAULT_SEO_ROUTES_CONFIG;
  return cachedSeoRoutesConfig;
}

export const SEO_BASE_URL = (
  process.env.APP_BASE_URL ||
  process.env.VITE_APP_BASE_URL ||
  getSeoRoutesConfig().baseUrl ||
  "https://www.tawzeefx.com"
).replace(/\/+$/, "");

export interface BlogSeoRecord {
  slug: string;
  title_ar: string;
  title_en?: string | null;
  excerpt_ar?: string | null;
  excerpt_en?: string | null;
  content_ar?: string | null;
  cover_image?: string | null;
  category?: string | null;
  author_name?: string | null;
  read_time_minutes?: number | null;
  published_at?: string | null;
  updated_at?: string | null;
}

export interface JobSeoRecord {
  id: string;
  title: string;
  description?: string | null;
  requirements?: string[] | null;
  location?: string | null;
  department?: string | null;
  type?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  status?: string | null;
  school_name?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  companies?: { name?: string | null; logo_url?: string | null } | null;
}

const SPECS_TAG_REGEX = /<!--TX_JOB_SPECS:([\s\S]*?)-->/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_REGEX.test(value.trim());
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function resolveAbsoluteImageUrl(image?: string | null): string {
  if (!image || !image.trim()) return `${SEO_BASE_URL}/icon-512x512.png`;
  const trimmed = image.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) return `${SEO_BASE_URL}${trimmed}`;
  return `${SEO_BASE_URL}/icon-512x512.png`;
}

function stripMarkdownToPlainLines(markdown: string): string[] {
  return markdown
    .split("\n")
    .map((line) =>
      line
        .replace(/^#{1,6}\s+/, "")
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/^[-*]\s+/, "• ")
        .trim()
    )
    .filter(Boolean);
}

function buildSeoShellHtml(options: {
  routePath: string;
  heading: string;
  intro: string;
  metaLine?: string;
  paragraphs?: string[];
  extraLinks?: Array<{ href: string; label: string }>;
}): string {
  const config = getSeoRoutesConfig();
  const navHtml = (config.navLinks || [])
    .map(
      (link) =>
        `<a href="${escapeHtml(link.path)}" style="color:#0b57d0;text-decoration:none;font-weight:700;margin-inline-end:16px">${escapeHtml(link.label)}</a>`
    )
    .join("");

  const bodyParagraphs = (options.paragraphs || [])
    .slice(0, 14)
    .map((p) => `<p style="margin:0 0 12px;line-height:1.8;color:#334155">${escapeHtml(p)}</p>`)
    .join("");

  const extraLinksHtml =
    options.extraLinks && options.extraLinks.length > 0
      ? `<div style="margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0">${options.extraLinks
          .map(
            (l) =>
              `<a href="${escapeHtml(l.href)}" style="display:inline-block;margin-inline-end:14px;color:#0b57d0;font-weight:700">${escapeHtml(l.label)}</a>`
          )
          .join("")}</div>`
      : "";

  return `<div data-seo-prerender="${escapeHtml(options.routePath)}" style="max-width:960px;margin:0 auto;padding:24px 20px;font-family:Tajawal,Inter,system-ui,sans-serif;color:#0f172a;background:#ffffff">
      <header style="border-bottom:1px solid #e2e8f0;padding-bottom:14px;margin-bottom:24px">
        <nav aria-label="التنقل الرئيسي">${navHtml}</nav>
      </header>
      <main>
        ${options.metaLine ? `<p style="font-size:0.9rem;color:#64748b;margin:0 0 10px">${escapeHtml(options.metaLine)}</p>` : ""}
        <h1 style="font-size:1.75rem;line-height:1.4;margin:0 0 12px">${escapeHtml(options.heading)}</h1>
        <p style="font-size:1.05rem;line-height:1.8;color:#1e293b;margin:0 0 18px">${escapeHtml(options.intro)}</p>
        ${bodyParagraphs}
        ${extraLinksHtml}
      </main>
      <footer style="margin-top:32px;border-top:1px solid #e2e8f0;padding-top:16px;font-size:0.9rem;color:#64748b">
        <p>© ${escapeHtml(config.siteName)}</p>
      </footer>
    </div>`;
}

export function injectDynamicDocumentMetadata(
  templateHtml: string,
  params: {
    routePath: string;
    title: string;
    description: string;
    keywords: string;
    canonicalUrl: string;
    robots: string;
    ogType?: string;
    imageUrl?: string;
    jsonLd?: unknown;
    shellHtml: string;
  }
): string {
  const imageUrl = params.imageUrl || `${SEO_BASE_URL}/icon-512x512.png`;
  const ogType = params.ogType || "website";

  let html = templateHtml
    .replace(/<script id="route-seo-jsonld"[\s\S]*?<\/script>\s*/g, "")
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(params.title)}</title>`)
    .replace(
      /<meta name="description" content="[^"]*"\s*\/?>/,
      `<meta name="description" content="${escapeHtml(params.description)}" />`
    )
    .replace(
      /<meta name="keywords" content="[^"]*"\s*\/?>/,
      `<meta name="keywords" content="${escapeHtml(params.keywords)}" />`
    )
    .replace(
      /<meta name="robots" content="[^"]*"\s*\/?>/,
      `<meta name="robots" content="${escapeHtml(params.robots)}" />`
    )
    .replace(
      /<link rel="canonical" href="[^"]*"\s*\/?>/,
      `<link rel="canonical" href="${escapeHtml(params.canonicalUrl)}" />`
    )
    .replace(
      /<meta property="og:type" content="[^"]*"\s*\/?>/,
      `<meta property="og:type" content="${escapeHtml(ogType)}" />`
    )
    .replace(
      /<meta property="og:title" content="[^"]*"\s*\/?>/,
      `<meta property="og:title" content="${escapeHtml(params.title)}" />`
    )
    .replace(
      /<meta property="og:description" content="[^"]*"\s*\/?>/,
      `<meta property="og:description" content="${escapeHtml(params.description)}" />`
    )
    .replace(
      /<meta property="og:url" content="[^"]*"\s*\/?>/,
      `<meta property="og:url" content="${escapeHtml(params.canonicalUrl)}" />`
    )
    .replace(
      /<meta property="og:image" content="[^"]*"\s*\/?>/,
      `<meta property="og:image" content="${escapeHtml(imageUrl)}" />`
    )
    .replace(
      /<meta name="twitter:title" content="[^"]*"\s*\/?>/,
      `<meta name="twitter:title" content="${escapeHtml(params.title)}" />`
    )
    .replace(
      /<meta name="twitter:description" content="[^"]*"\s*\/?>/,
      `<meta name="twitter:description" content="${escapeHtml(params.description)}" />`
    )
    .replace(
      /<meta name="twitter:image" content="[^"]*"\s*\/?>/,
      `<meta name="twitter:image" content="${escapeHtml(imageUrl)}" />`
    );

  if (params.jsonLd && !params.robots.startsWith("noindex")) {
    const jsonLdTag = `    <script id="route-seo-jsonld" data-route="${escapeHtml(params.routePath)}" type="application/ld+json">\n    ${serializeJsonLd(params.jsonLd)}\n    </script>\n  </head>`;
    html = html.replace("</head>", jsonLdTag);
  }

  return html.replace(/<div id="root">[\s\S]*?<\/body>/, `<div id="root">${params.shellHtml}</div>\n  </body>`);
}

/** Render SSR-ready HTML for a published blog article slug (or noindex redirect fallback if missing). */
export function buildDynamicBlogPageHtml(
  templateHtml: string,
  slug: string,
  post: BlogSeoRecord | null
): string {
  const encodedSlug = encodeURIComponent(slug);
  const routePath = `/blog/${encodedSlug}`;

  if (!post) {
    const blogMeta = getSeoRoutesConfig().routes["/blog"];
    return injectDynamicDocumentMetadata(templateHtml, {
      routePath,
      title: blogMeta.title,
      description: blogMeta.description,
      keywords: blogMeta.keywords,
      canonicalUrl: `${SEO_BASE_URL}/blog`,
      robots: "noindex, follow",
      shellHtml: buildSeoShellHtml({
        routePath,
        heading: blogMeta.h1,
        intro: blogMeta.summary,
        extraLinks: [{ href: "/blog", label: "العودة إلى مدونة توظيف إكس" }],
      }),
    });
  }

  const headline = post.title_ar || post.title_en || slug;
  const description = (post.excerpt_ar || post.excerpt_en || headline).trim();
  const title = `${headline} | مدونة توظيف إكس (TawzeefX)`;
  const canonicalUrl = `${SEO_BASE_URL}/blog/${encodedSlug}`;
  const imageUrl = resolveAbsoluteImageUrl(post.cover_image);
  const keywords = `${headline}, توظيف إكس, TawzeefX, مدونة توظيف إكس, التوظيف الذكي, نظام تتبع المتقدمين ATS${post.category ? `, ${post.category}` : ""}`;
  const paragraphs = stripMarkdownToPlainLines(post.content_ar || description);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${canonicalUrl}#article`,
        headline,
        description,
        url: canonicalUrl,
        mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl },
        datePublished: post.published_at || undefined,
        dateModified: post.updated_at || post.published_at || undefined,
        author: { "@type": "Person", name: post.author_name || "فريق توظيف إكس (TawzeefX)" },
        publisher: { "@id": `${SEO_BASE_URL}/#organization` },
        image: imageUrl,
        inLanguage: "ar",
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "الرئيسية", item: `${SEO_BASE_URL}/` },
          { "@type": "ListItem", position: 2, name: "المدونة", item: `${SEO_BASE_URL}/blog` },
          { "@type": "ListItem", position: 3, name: headline, item: canonicalUrl },
        ],
      },
    ],
  };

  const metaParts = [
    post.author_name || "فريق توظيف إكس",
    post.read_time_minutes ? `${post.read_time_minutes} دقائق قراءة` : "",
  ]
    .filter(Boolean)
    .join(" • ");

  return injectDynamicDocumentMetadata(templateHtml, {
    routePath,
    title,
    description,
    keywords,
    canonicalUrl,
    robots: "index, follow",
    ogType: "article",
    imageUrl,
    jsonLd,
    shellHtml: buildSeoShellHtml({
      routePath,
      heading: headline,
      intro: description,
      metaLine: metaParts,
      paragraphs,
      extraLinks: [
        { href: "/blog", label: "جميع مقالات المدونة" },
        { href: "/features", label: "مميزات نظام توظيف إكس" },
        { href: "/careers", label: "الوظائف الشاغرة المتاحة" },
      ],
    }),
  });
}

function parseJobDescriptionAndSpecs(rawDescription?: string | null): {
  cleanDescription: string;
  specs: { school_name?: string; application_deadline?: string };
} {
  const raw = rawDescription || "";
  const match = raw.match(SPECS_TAG_REGEX);
  const cleanDescription = raw.replace(SPECS_TAG_REGEX, "").trim();
  if (!match?.[1]) return { cleanDescription, specs: {} };
  try {
    return { cleanDescription, specs: JSON.parse(match[1]) };
  } catch {
    return { cleanDescription, specs: {} };
  }
}

function parseIsoOrDmyDate(raw?: string | null): Date | null {
  if (!raw) return null;
  const iso = String(raw).match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (iso) {
    return new Date(`${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}T23:59:59Z`);
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Render SSR-ready HTML with JobPosting schema for active jobs, or noindex fallback when closed/missing. */
export function buildDynamicJobPageHtml(
  templateHtml: string,
  jobId: string,
  job: JobSeoRecord | null
): string {
  const encodedId = encodeURIComponent(jobId);
  const routePath = `/apply/${encodedId}`;
  const canonicalUrl = `${SEO_BASE_URL}/apply/${encodedId}`;

  const rawStatus = String(job?.status || "").trim().toLowerCase();
  const isActiveStatus = rawStatus === "نشطة" || rawStatus === "active";
  const createdTime = job?.created_at ? new Date(job.created_at).getTime() : Date.now();
  const { cleanDescription, specs } = parseJobDescriptionAndSpecs(job?.description);
  const parsedDeadline = parseIsoOrDmyDate(specs.application_deadline);

  let validThroughTime = createdTime + 90 * 24 * 60 * 60 * 1000;
  if (parsedDeadline && parsedDeadline.getTime() >= createdTime) {
    validThroughTime = parsedDeadline.getTime();
  }
  const isOpen = Boolean(job && isActiveStatus && Date.now() <= validThroughTime);

  if (!job || !isOpen) {
    const careersMeta = getSeoRoutesConfig().routes["/careers"];
    return injectDynamicDocumentMetadata(templateHtml, {
      routePath,
      title: job?.title
        ? `${job.title} (مغلقة) | توظيف إكس (TawzeefX)`
        : careersMeta.title,
      description: careersMeta.description,
      keywords: careersMeta.keywords,
      canonicalUrl: `${SEO_BASE_URL}/careers`,
      robots: "noindex, follow",
      shellHtml: buildSeoShellHtml({
        routePath,
        heading: job?.title ? `انتهى التقديم على وظيفة ${job.title}` : "تصفح أحدث الوظائف المتاحة على توظيف إكس",
        intro: "يمكنك استعراض جميع الفرص الوظيفية النشطة حالياً عبر بوابة الوظائف في توظيف إكس (TawzeefX).",
        extraLinks: [{ href: "/careers", label: "الانتقال إلى صفحة الوظائف الشاغرة" }],
      }),
    });
  }

  const employerName =
    [specs.school_name, job.school_name, job.companies?.name].find(
      (n) => typeof n === "string" && n.trim().length > 0
    )?.trim() || "جهة التوظيف";

  const location = job.location || "المملكة العربية السعودية";
  const plainDesc = (cleanDescription || `وظيفة ${job.title} لدى ${employerName} في ${location}`).trim();
  const metaDesc = `قدّم الآن على شاغر ${job.title} لدى ${employerName} (${location}) عبر منصة توظيف إكس (TawzeefX).`;
  const title = `وظيفة ${job.title} | ${employerName} | توظيف إكس (TawzeefX)`;
  const logoUrl = resolveAbsoluteImageUrl(job.companies?.logo_url);

  const employmentTypeMap: Record<string, string> = {
    "دوام كامل": "FULL_TIME",
    "دوام جزئي": "PART_TIME",
    "عقد": "CONTRACTOR",
    "تدريب": "INTERN",
    "مؤقت": "TEMPORARY",
    "عن بُعد": "FULL_TIME",
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "JobPosting",
        title: job.title,
        description: plainDesc,
        identifier: {
          "@type": "PropertyValue",
          name: "TawzeefX",
          value: `TX-${job.id.slice(0, 8)}`,
        },
        datePosted: job.created_at ? new Date(job.created_at).toISOString() : new Date().toISOString(),
        validThrough: new Date(validThroughTime).toISOString(),
        employmentType: job.type && employmentTypeMap[job.type] ? employmentTypeMap[job.type] : "FULL_TIME",
        hiringOrganization: {
          "@type": "Organization",
          name: employerName,
          sameAs: `${SEO_BASE_URL}/`,
          logo: logoUrl,
        },
        jobLocation: {
          "@type": "Place",
          address: {
            "@type": "PostalAddress",
            streetAddress: location,
            addressLocality: location,
            addressCountry: "SA",
          },
        },
        ...(job.type === "عن بُعد" ? { jobLocationType: "TELECOMMUTE" } : {}),
        ...(job.salary_min || job.salary_max
          ? {
              baseSalary: {
                "@type": "MonetaryAmount",
                currency: "SAR",
                value: {
                  "@type": "QuantitativeValue",
                  ...(job.salary_min ? { minValue: Number(job.salary_min) } : {}),
                  ...(job.salary_max ? { maxValue: Number(job.salary_max) } : {}),
                  unitText: "MONTH",
                },
              },
            }
          : {}),
        directApply: true,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "الرئيسية", item: `${SEO_BASE_URL}/` },
          { "@type": "ListItem", position: 2, name: "الوظائف المتاحة", item: `${SEO_BASE_URL}/careers` },
          { "@type": "ListItem", position: 3, name: job.title, item: canonicalUrl },
        ],
      },
    ],
  };

  return injectDynamicDocumentMetadata(templateHtml, {
    routePath,
    title,
    description: metaDesc,
    keywords: `${job.title}, وظائف ${location}, ${employerName}, وظائف توظيف إكس, TawzeefX`,
    canonicalUrl,
    robots: "index, follow",
    imageUrl: logoUrl,
    jsonLd,
    shellHtml: buildSeoShellHtml({
      routePath,
      heading: `${job.title} — ${employerName}`,
      intro: metaDesc,
      metaLine: [employerName, location, job.type || "", job.department || ""].filter(Boolean).join(" • "),
      paragraphs: plainDesc.split(/\n+/).filter(Boolean),
      extraLinks: [
        { href: "/careers", label: "تصفح جميع الوظائف الشاغرة" },
        { href: "/features", label: "تعرف على منصة توظيف إكس" },
      ],
    }),
  });
}
