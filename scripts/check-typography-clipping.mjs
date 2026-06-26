#!/usr/bin/env node
/**
 * Optional Playwright-based pixel-level typography clipping check.
 *
 * Why optional: Playwright + Chromium adds ~300MB to CI installs. The
 * Vitest test (src/test/typography-clipping.test.tsx) already guards the
 * CSS rules that prevent clipping in production. Run this script when
 * you want a full visual confirmation:
 *
 *   1. Start the dev server:  npm run dev
 *   2. In another terminal:   npx playwright install chromium  (one-time)
 *   3. Then:                  node scripts/check-typography-clipping.mjs
 *
 * Exits with code 1 if any sample on /typography reports clipping.
 */

import { chromium } from "playwright";

const URL = process.env.TYPOGRAPHY_URL || "http://localhost:8080/typography";

async function checkDir(page, dir) {
  await page.click(`[data-testid="dir-${dir}"]`);
  await page.waitForTimeout(500);
  const banner = await page.$('[data-testid="result-banner"]');
  const failures = Number(await banner.getAttribute("data-failures"));
  const total = Number(await banner.getAttribute("data-total"));
  return { dir, failures, total };
}

async function checkAtScale(page, scale) {
  await page.$eval(
    '[data-testid="scale-slider"]',
    (el, v) => {
      el.value = String(v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    },
    scale
  );
  await page.waitForTimeout(500);
  const banner = await page.$('[data-testid="result-banner"]');
  return Number(await banner.getAttribute("data-failures"));
}

(async () => {
  let browser;
  try {
    browser = await chromium.launch();
    const allFailures = [];

    for (const viewport of [
      { width: 390, height: 844 },   // mobile
      { width: 820, height: 1180 },  // tablet
      { width: 1440, height: 900 },  // desktop
    ]) {
      const ctx = await browser.newContext({ viewport });
      const page = await ctx.newPage();
      await page.goto(URL, { waitUntil: "networkidle" });
      await page.waitForSelector('[data-testid="result-banner"]');

      for (const dir of ["rtl", "ltr"]) {
        const r = await checkDir(page, dir);
        if (r.failures > 0) {
          allFailures.push(`${viewport.width}px / ${dir} → ${r.failures}/${r.total}`);
        }
        for (const scale of [85, 100, 125, 150]) {
          const f = await checkAtScale(page, scale);
          if (f > 0) {
            allFailures.push(`${viewport.width}px / ${dir} / ${scale}% → ${f} clipped`);
          }
        }
      }

      await ctx.close();
    }

    if (allFailures.length > 0) {
      console.error("❌ Typography clipping detected:");
      allFailures.forEach((f) => console.error("  •", f));
      process.exit(1);
    }
    console.log("✅ No typography clipping detected across all viewports/dirs/scales.");
  } catch (err) {
    console.error("Error running clipping check:", err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
})();
