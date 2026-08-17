import { test, expect } from "@playwright/test";
import { LandingPagePom } from "../pages/LandingPage.pom";

test.describe("Landing Page — Smoke & UI Verifications", () => {
  let landingPage: LandingPagePom;

  test.beforeEach(async ({ page }) => {
    landingPage = new LandingPagePom(page);
    await landingPage.navigate();
  });

  test("renders hero title and main branding elements", async ({ page }) => {
    await expect(landingPage.heroTitle).toBeVisible();
    await expect(page).toHaveTitle(/توظيف|Tawzeef/i);
  });

  test("maintains RTL text layout direction", async () => {
    const isRtl = await landingPage.isRTL();
    expect(isRtl).toBe(true);
  });

  test("has active CTA buttons redirecting to auth", async ({ page }) => {
    await expect(landingPage.startFreeButton).toBeVisible();
    const href = await landingPage.startFreeButton.getAttribute("href");
    expect(href).toContain("/auth");
  });

  test("displays pricing tier section", async () => {
    await expect(landingPage.pricingSection).toBeVisible();
  });
});
