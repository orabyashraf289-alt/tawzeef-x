import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { getRouteSeoMetadata, RouteSeoManager } from "@/components/RouteSeoManager";

const ROOT = process.cwd();

describe("Technical SEO metadata, canonical tags, and sitemap URL consistency", () => {
  it("declares the root canonical URL, Arabic brand keywords, and JSON-LD alternateName in index.html", () => {
    const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf-8");
    expect(html).toContain('<link rel="canonical" href="https://www.tawzeefx.com/" />');
    expect(html).toContain('<meta property="og:url" content="https://www.tawzeefx.com/" />');
    expect(html).toContain("توظيف إكس");
    expect(html).toContain("توظيف اكس");
    expect(html).toContain('<meta name="keywords"');
    expect(html).toContain('"alternateName"');
  });

  it("uses path '/' for the homepage in both sitemap generators to match index.html", () => {
    const staticGen = fs.readFileSync(path.join(ROOT, "scripts", "generate-sitemap.mjs"), "utf-8");
    const apiGen = fs.readFileSync(path.join(ROOT, "api", "sitemap.ts"), "utf-8");
    expect(staticGen).toContain('{ path: "/", changefreq: "daily", priority: "1.0" }');
    expect(apiGen).toContain('{ path: "/", changefreq: "daily", priority: "1.0" }');
  });

  it("resolves bilingual indexable metadata for public routes and noindex for private routes", () => {
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

    const pricing = getRouteSeoMetadata("/pricing");
    expect(pricing.canonicalUrl).toBe("https://www.tawzeefx.com/pricing");
    expect(pricing.robots).toBe("index, follow");

    const careers = getRouteSeoMetadata("/careers");
    expect(careers.canonicalUrl).toBe("https://www.tawzeefx.com/careers");
    expect(careers.robots).toBe("index, follow");

    const apply = getRouteSeoMetadata("/apply/job-1");
    expect(apply.canonicalUrl).toBe("https://www.tawzeefx.com/apply/job-1");
    expect(apply.robots).toBe("index, follow");
    expect(apply.title).toContain("التقديم");

    const dashboard = getRouteSeoMetadata("/dashboard");
    expect(dashboard.canonicalUrl).toBe("https://www.tawzeefx.com/dashboard");
    expect(dashboard.robots).toBe("noindex, nofollow");
  });

  it("updates document title, canonical link, keywords, and meta tags on client-side navigation", async () => {
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
    });
  });
});
