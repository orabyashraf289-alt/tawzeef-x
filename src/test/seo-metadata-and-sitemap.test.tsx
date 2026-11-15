import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { getRouteSeoMetadata, RouteSeoManager } from "@/components/RouteSeoManager";
import seoRoutesConfig from "@/data/seoRoutes.json";
import { prerenderSeoRoutes } from "../../scripts/prerender-seo-routes.mjs";
import { generateSitemapXml } from "../../scripts/generate-sitemap.mjs";
import { filterActiveJobs, getStaticSitemapRoutes } from "../../scripts/seo-helpers.mjs";
import { INDEXNOW_KEY } from "../../scripts/ping-indexnow.mjs";
import { buildDynamicBlogPageHtml, buildDynamicJobPageHtml, isUuid } from "../../api/_seoHtml";

const ROOT = process.cwd();
const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop()!;
    fs.rmSync(dir, { recursive: true, force: true });
  }
  document.getElementById("route-seo-jsonld")?.remove();
});

describe("Technical SEO metadata, pre-rendering, internal links, and sitemap consistency", () => {
  it("declares the root canonical URL, Arabic brand keywords, and JSON-LD alternateName in index.html", () => {
    const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf-8");
    expect(html).toContain('<link rel="canonical" href="https://www.tawzeefx.com/" />');
    expect(html).toContain('<meta property="og:url" content="https://www.tawzeefx.com/" />');
    expect(html).toContain("توظيف إكس");
    expect(html).toContain("توظيف اكس");
    expect(html).toContain('<meta property="og:site_name" content="توظيف إكس" />');
    expect(html).toContain('<meta name="application-name" content="توظيف إكس" />');
    expect(html).toContain('"name": "توظيف إكس"');
    expect(html).toContain('<meta name="keywords"');
    expect(html).toContain('"alternateName"');

    const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "public", "manifest.json"), "utf-8"));
    expect(manifest.short_name).toBe("توظيف إكس");
    expect(seoRoutesConfig.siteName).toBe("توظيف إكس");
  });

  it("rewrites pre-rendered public routes to _seo HTML files while keeping SPA fallback for dynamic nested paths", () => {
    const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, "vercel.json"), "utf-8"));
    expect(vercel.cleanUrls).toBeUndefined();
    expect(vercel.rewrites[0]).toEqual({ source: "/sitemap.xml", destination: "/api/sitemap" });
    expect(vercel.rewrites).toContainEqual({ source: "/features", destination: "/_seo/features.html" });
    expect(vercel.rewrites).toContainEqual({ source: "/blog", destination: "/_seo/blog.html" });
    expect(vercel.rewrites).toContainEqual({
      source: "/blog/:slug",
      destination: "/api/seo-page?kind=blog&slug=:slug",
    });
    expect(vercel.rewrites).toContainEqual({
      source: "/apply/:id",
      destination: "/api/seo-page?kind=apply&id=:id",
    });
    expect(vercel.functions["api/seo-page.ts"].includeFiles).toBe("dist/index.html");
    expect(vercel.rewrites[vercel.rewrites.length - 1]).toEqual({
      source: "/((?!api/|sitemap\\.xml|robots\\.txt|llms\\.txt|8b4c9e2a1f7d4036b9c5a2e8d1407f3a\\.txt|_seo/).*)",
      destination: "/index.html",
    });
  });

  it("keeps static sitemap routes aligned between seoRoutes.json, api/sitemap.ts, and generate-sitemap.mjs", async () => {
    const expectedRoutes = getStaticSitemapRoutes(seoRoutesConfig);
    const apiGen = fs.readFileSync(path.join(ROOT, "api", "sitemap.ts"), "utf-8");

    expect(expectedRoutes[0]).toEqual({ path: "/", changefreq: "daily", priority: "1.0" });
    for (const route of expectedRoutes) {
      expect(apiGen).toContain(`path: "${route.path}"`);
    }
    expect(apiGen).toContain('.from("blog_posts")');

    const xml = await generateSitemapXml(ROOT, {
      entities: {
        activeJobs: [{ id: "job-123", updated_at: "2026-11-10T00:00:00Z" }],
        publishedPosts: [{ slug: "ai-hiring", published_at: "2026-11-12T00:00:00Z" }],
      },
    });
    expect(xml).toContain("<loc>https://www.tawzeefx.com/</loc>");
    expect(xml).toContain("<loc>https://www.tawzeefx.com/features</loc>");
    expect(xml).toContain("<loc>https://www.tawzeefx.com/blog/ai-hiring</loc>");
    expect(xml).toContain("<loc>https://www.tawzeefx.com/apply/job-123</loc>");
  });

  it("filters expired or stale jobs out of build-time sitemaps", () => {
    const now = new Date("2026-11-15T12:00:00Z").getTime();
    const jobs = [
      { id: "fresh", created_at: "2026-11-01T00:00:00Z", description: "" },
      { id: "old", created_at: "2025-01-01T00:00:00Z", description: "" },
      {
        id: "expired",
        created_at: "2026-10-01T00:00:00Z",
        description: '{"application_deadline":"2026-11-10"}',
      },
    ];
    expect(filterActiveJobs(jobs, now).map((j: { id: string }) => j.id)).toEqual(["fresh"]);
  });

  it("resolves bilingual indexable metadata for public routes and noindex for auth and private routes", () => {
    const home = getRouteSeoMetadata("/");
    expect(home.canonicalUrl).toBe("https://www.tawzeefx.com/");
    expect(home.robots).toBe("index, follow");
    expect(home.title).toContain("توظيف إكس");
    expect(home.description).toContain("توظيف إكس");
    expect(home.keywords).toContain("توظيف إكس");

    const features = getRouteSeoMetadata("/features/");
    expect(features.canonicalUrl).toBe("https://www.tawzeefx.com/features");
    expect(features.robots).toBe("index, follow");
    expect(features.title).toContain("المميزات");
    expect(features.keywords).toContain("نظام تتبع المتقدمين");

    const apply = getRouteSeoMetadata("/apply/job-1");
    expect(apply.canonicalUrl).toBe("https://www.tawzeefx.com/apply/job-1");
    expect(apply.robots).toBe("index, follow");
    expect(apply.title).toContain("التقديم");

    const auth = getRouteSeoMetadata("/auth");
    expect(auth.canonicalUrl).toBe("https://www.tawzeefx.com/auth");
    expect(auth.robots).toBe("noindex, follow");

    const dashboard = getRouteSeoMetadata("/dashboard");
    expect(dashboard.canonicalUrl).toBe("https://www.tawzeefx.com/dashboard");
    expect(dashboard.robots).toBe("noindex, nofollow");
  });

  it("updates document head tags and removes stale pre-rendered JSON-LD on navigation", async () => {
    const staleJsonLd = document.createElement("script");
    staleJsonLd.id = "route-seo-jsonld";
    staleJsonLd.setAttribute("data-route", "/");
    document.head.appendChild(staleJsonLd);

    render(
      <MemoryRouter initialEntries={["/features"]}>
        <RouteSeoManager />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(document.title).toContain("المميزات");
      expect(document.title).toContain("توظيف إكس");
      expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(
        "https://www.tawzeefx.com/features"
      );
      expect(document.head.querySelector('meta[name="description"]')?.getAttribute("content")).toContain(
        "توظيف إكس"
      );
      expect(document.head.querySelector('meta[name="keywords"]')?.getAttribute("content")).toContain(
        "توظيف إكس"
      );
      expect(document.head.querySelector('meta[property="og:url"]')?.getAttribute("content")).toBe(
        "https://www.tawzeefx.com/features"
      );
      expect(document.head.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe(
        "index, follow"
      );
      expect(document.getElementById("route-seo-jsonld")).toBeNull();
    });
  });

  it("pre-renders route-specific canonical HTML files with semantic content and schema markup", async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "tx-seo-prerender-"));
    tempDirs.push(tmpRoot);

    fs.mkdirSync(path.join(tmpRoot, "dist"), { recursive: true });
    fs.mkdirSync(path.join(tmpRoot, "src", "data"), { recursive: true });
    fs.copyFileSync(path.join(ROOT, "src", "data", "seoRoutes.json"), path.join(tmpRoot, "src", "data", "seoRoutes.json"));
    fs.copyFileSync(path.join(ROOT, "index.html"), path.join(tmpRoot, "dist", "index.html"));

    const generated = await prerenderSeoRoutes(tmpRoot, {
      entities: {
        activeJobs: [{ id: "job-abc", title: "مهندس برمجيات" }],
        publishedPosts: [{ slug: "ai-hiring", title_ar: "دليل التوظيف الذكي", excerpt_ar: "ملخص المقال" }],
      },
    });

    expect(generated).toContain("_seo/features.html");
    expect(generated).toContain("_seo/blog.html");
    expect(generated).toContain("_seo/auth.html");

    const featuresHtml = fs.readFileSync(path.join(tmpRoot, "dist", "_seo", "features.html"), "utf-8");
    expect(featuresHtml).toContain('<link rel="canonical" href="https://www.tawzeefx.com/features" />');
    expect(featuresHtml).toContain('href="/pricing"');
    expect(featuresHtml).toContain("BreadcrumbList");

    const homeHtml = fs.readFileSync(path.join(tmpRoot, "dist", "index.html"), "utf-8");
    expect(homeHtml).toContain('<link rel="canonical" href="https://www.tawzeefx.com/" />');
    expect(homeHtml).toContain("FAQPage");
    expect(homeHtml).toContain("SoftwareApplication");

    const careersHtml = fs.readFileSync(path.join(tmpRoot, "dist", "_seo", "careers.html"), "utf-8");
    expect(careersHtml).toContain('href="/apply/job-abc"');

    const blogHtml = fs.readFileSync(path.join(tmpRoot, "dist", "_seo", "blog.html"), "utf-8");
    expect(blogHtml).toContain('href="/blog/ai-hiring"');

    const authHtml = fs.readFileSync(path.join(tmpRoot, "dist", "_seo", "auth.html"), "utf-8");
    expect(authHtml).toContain('<meta name="robots" content="noindex, follow" />');
    expect(authHtml).not.toContain('id="route-seo-jsonld"');
  });

  it("links from LandingPage directly to core public routes and renders FAQ copy", () => {
    const landingSource = fs.readFileSync(path.join(ROOT, "src", "pages", "LandingPage.tsx"), "utf-8");
    for (const route of ["/features", "/pricing", "/careers", "/blog", "/about", "/contact", "/privacy", "/terms"]) {
      expect(landingSource).toContain(route);
    }
    expect(landingSource).toContain("seoRoutesConfig.faq");
  });

  it("renders SSR metadata, JSON-LD, and XSS-safe HTML for dynamic /blog/:slug and /apply/:id routes", () => {
    const templateHtml = fs.readFileSync(path.join(ROOT, "index.html"), "utf-8");

    const blogHtml = buildDynamicBlogPageHtml(templateHtml, "what-is-ats-applicant-tracking-system", {
      slug: "what-is-ats-applicant-tracking-system",
      title_ar: 'ما هو <script>alert(1)</script> نظام ATS',
      excerpt_ar: "ملخص نظام تتبع المتقدمين",
      content_ar: "## عنوان\n- ميزة أولى\n\nفقرة [المميزات](/features)",
      author_name: "فريق توظيف إكس",
      read_time_minutes: 7,
      published_at: "2026-11-12T09:00:00Z",
    });
    expect(blogHtml).toContain(
      '<link rel="canonical" href="https://www.tawzeefx.com/blog/what-is-ats-applicant-tracking-system" />'
    );
    expect(blogHtml).toContain('<meta property="og:type" content="article" />');
    expect(blogHtml).toContain("BlogPosting");
    expect(blogHtml).toContain("BreadcrumbList");
    expect(blogHtml).not.toContain("<script>alert(1)</script>");

    const missingBlogHtml = buildDynamicBlogPageHtml(templateHtml, "missing-slug", null);
    expect(missingBlogHtml).toContain('<meta name="robots" content="noindex, follow" />');

    const jobId = "123e4567-e89b-12d3-a456-426614174000";
    expect(isUuid(jobId)).toBe(true);
    expect(isUuid("test-123")).toBe(false);

    const activeJobHtml = buildDynamicJobPageHtml(templateHtml, jobId, {
      id: jobId,
      title: "مطور برمجيات أول",
      description: 'وصف الوظيفة\n\n<!--TX_JOB_SPECS:{"school_name":"شركة التقنية","application_deadline":"2099-12-31"}-->',
      location: "الرياض، السعودية",
      type: "دوام كامل",
      status: "نشطة",
      created_at: new Date().toISOString(),
    });
    expect(activeJobHtml).toContain(`<link rel="canonical" href="https://www.tawzeefx.com/apply/${jobId}" />`);
    expect(activeJobHtml).toContain("JobPosting");
    expect(activeJobHtml).toContain("شركة التقنية");
    expect(activeJobHtml).not.toContain("TX_JOB_SPECS");

    const closedJobHtml = buildDynamicJobPageHtml(templateHtml, jobId, {
      id: jobId,
      title: "وظيفة مغلقة",
      status: "مغلقة",
      created_at: new Date().toISOString(),
    });
    expect(closedJobHtml).toContain('<meta name="robots" content="noindex, follow" />');
  });

  it("includes matching IndexNow verification key file and blog cross-links", () => {
    const keyFilePath = path.join(ROOT, "public", `${INDEXNOW_KEY}.txt`);
    expect(fs.existsSync(keyFilePath)).toBe(true);
    expect(fs.readFileSync(keyFilePath, "utf-8").trim()).toBe(INDEXNOW_KEY);

    const blogPostSource = fs.readFileSync(path.join(ROOT, "src", "pages", "BlogPost.tsx"), "utf-8");
    expect(blogPostSource).toContain("blog.relatedPosts");
    expect(blogPostSource).toContain('to="/features"');
    expect(blogPostSource).toContain('to="/careers"');
  });
});
