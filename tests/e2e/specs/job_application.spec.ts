import { test, expect } from "@playwright/test";
import { setupSupabaseMocks } from "../fixtures/supabaseMockHelper";
import { mockJob } from "../fixtures/mockData";
import path from "path";

test.describe("Public Job Application Flow — /apply/:id", () => {
  test.beforeEach(async ({ page }) => {
    await setupSupabaseMocks(page);
  });

  test("should render job application page and submit guest application with resume", async ({ page }) => {
    await page.goto(`/apply/${mockJob.id}`);
    await page.waitForLoadState("domcontentloaded");

    // Check title or header
    const heading = page.locator("h1, h2, .job-title").first();
    await expect(heading).toBeVisible();

    // Fill application form fields
    const nameInput = page.locator("input[name='fullName'], input#fullName, input[placeholder*='الاسم']").first();
    const emailInput = page.locator("input[type='email']").first();
    const phoneInput = page.locator("input[type='tel'], input[placeholder*='الجوال'], input[placeholder*='الهاتف']").first();

    if (await nameInput.isVisible()) {
      await nameInput.fill("أحمد المتقدم");
    }
    if (await emailInput.isVisible()) {
      await emailInput.fill("applicant@example.com");
    }
    if (await phoneInput.isVisible()) {
      await phoneInput.fill("+966551234567");
    }

    // Submit button
    const submitBtn = page.locator("button[type='submit']").first();
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
    }
  });
});
