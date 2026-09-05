import { test, expect } from "@playwright/test";
import { setupSupabaseMocks } from "../fixtures/supabaseMockHelper";
import { mockJob } from "../fixtures/mockData";

test.describe("Jobs Publishing & Public Careers Portal", () => {
  test.beforeEach(async ({ page }) => {
    await setupSupabaseMocks(page);
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "sb-rlfewneisuezsamhosct-auth-token",
        JSON.stringify({
          access_token: "mock-jwt-token-12345",
          user: { id: "usr-admin-001", email: "admin@tawzeefx.com", role: "admin" },
        })
      );
    });
  });

  test("should render jobs management dashboard", async ({ page }) => {
    await page.goto("/jobs");
    await page.waitForLoadState("domcontentloaded");

    const header = page.locator("h1, h2").filter({ hasText: /الوظائف|إدارة الوظائف|Jobs/i }).first();
    await expect(header).toBeVisible({ timeout: 6000 });
  });

  test("should display published job on public /careers page", async ({ page }) => {
    await page.goto("/careers");
    await page.waitForLoadState("domcontentloaded");

    const jobTitle = page.locator(`text=${mockJob.title}`).first();
    await expect(jobTitle).toBeVisible({ timeout: 6000 });
  });
});
