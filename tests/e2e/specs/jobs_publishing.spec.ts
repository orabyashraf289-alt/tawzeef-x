import { test, expect } from "@playwright/test";
import { seedAuthSession, setupSupabaseMocks } from "../fixtures/supabaseMockHelper";
import { mockJob, mockUser } from "../fixtures/mockData";

test.describe("Jobs Publishing & Public Careers Portal", () => {
  test.beforeEach(async ({ page }) => {
    await setupSupabaseMocks(page);
    await seedAuthSession(page, mockUser);
  });

  test("should render jobs management dashboard with active job listing", async ({ page }) => {
    await page.goto("/jobs");
    await page.waitForLoadState("domcontentloaded");

    const header = page.locator("h1, h2").filter({ hasText: /إدارة الوظائف|الوظائف|Jobs/i }).first();
    await expect(header).toBeVisible({ timeout: 6000 });
    await expect(page.getByText(mockJob.title).first()).toBeVisible({ timeout: 6000 });
  });

  test("should display active published job on public /careers page", async ({ page }) => {
    await page.goto("/careers");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByText(mockJob.title).first()).toBeVisible({ timeout: 6000 });
  });
});
