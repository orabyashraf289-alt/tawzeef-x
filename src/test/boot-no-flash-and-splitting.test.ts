import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import { prerenderSeoRoutes } from "../../scripts/prerender-seo-routes.mjs";

const ROOT = process.cwd();
const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    fs.rmSync(tempDirs.pop()!, { recursive: true, force: true });
  }
});

describe("Zero-flash boot guard and bundle splitting safeguards", () => {
  it("hides pre-rendered SEO shell during JS boot, syncs theme before first paint, and omits blocking Material Symbols", () => {
    const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf-8");

    expect(html).toContain('id="tx-boot-style"');
    expect(html).toContain("html.tx-js-booting [data-seo-prerender]");
    expect(html).toContain("display: none !important");
    expect(html).toContain('localStorage.getItem("tawzeef-x-theme")');
    expect(html).toContain("tx-js-booting");
    expect(html).toContain("__txBootFallback");
    expect(html).not.toContain("Material+Symbols+Outlined");
    expect(html).not.toContain("Material+Symbols+Rounded");
  });

  it("clears boot guard styles and class in main.tsx right before React mounts", () => {
    const mainSrc = fs.readFileSync(path.join(ROOT, "src", "main.tsx"), "utf-8");
    expect(mainSrc).toContain('classList.remove("tx-js-booting")');
    expect(mainSrc).toContain('getElementById("tx-boot-style")?.remove()');
  });

  it("keeps ThemeContext free of unused MUI/Emotion runtime and lazy-loads heavy entry routes in App.tsx", () => {
    const themeSrc = fs.readFileSync(path.join(ROOT, "src", "contexts", "ThemeContext.tsx"), "utf-8");
    expect(themeSrc).not.toContain("@mui/material");
    expect(themeSrc).not.toContain("materialTheme");

    const appSrc = fs.readFileSync(path.join(ROOT, "src", "App.tsx"), "utf-8");
    expect(appSrc).toContain('const LandingPage = lazy(() => import("./pages/LandingPage"))');
    expect(appSrc).toContain('const Auth = lazy(() => import("./pages/Auth"))');
    expect(appSrc).toContain('const CompanyRegistration = lazy(() => import("@/pages/CompanyRegistration"))');
  });

  it("preserves boot guard in all pre-rendered HTML routes while retaining Wave-1 SEO markup", async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "tx-boot-guard-"));
    tempDirs.push(tmpRoot);

    fs.mkdirSync(path.join(tmpRoot, "dist"), { recursive: true });
    fs.mkdirSync(path.join(tmpRoot, "src", "data"), { recursive: true });
    fs.copyFileSync(path.join(ROOT, "src", "data", "seoRoutes.json"), path.join(tmpRoot, "src", "data", "seoRoutes.json"));
    fs.copyFileSync(path.join(ROOT, "index.html"), path.join(tmpRoot, "dist", "index.html"));

    await prerenderSeoRoutes(tmpRoot, {
      entities: { activeJobs: [], publishedPosts: [] },
    });

    const homeHtml = fs.readFileSync(path.join(tmpRoot, "dist", "index.html"), "utf-8");
    expect(homeHtml).toContain('id="tx-boot-style"');
    expect(homeHtml).toContain('data-seo-prerender="/"');
    expect(homeHtml).toContain("FAQPage");

    const authHtml = fs.readFileSync(path.join(tmpRoot, "dist", "_seo", "auth.html"), "utf-8");
    expect(authHtml).toContain('id="tx-boot-style"');
    expect(authHtml).toContain('data-seo-prerender="/auth"');
  });

  it("pins Rollup helpers and React runtime in vendor-react so heavy charts/PDF chunks stay lazy", () => {
    const viteCfg = fs.readFileSync(path.join(ROOT, "vite.config.ts"), "utf-8");
    expect(viteCfg).toContain('id.includes("vite/preload-helper")');
    expect(viteCfg).toContain('id.includes("commonjsHelpers")');
    expect(viteCfg).toContain('return "vendor-react"');
  });
});
