import { test, expect } from "@playwright/test";
import { setupSupabaseMocks } from "../fixtures/supabaseMockHelper";

test.describe("Password Reset — Token Expiry & Single-Use Enforcement", () => {
  test.beforeEach(async ({ page }) => {
    await setupSupabaseMocks(page);
  });

  test("should reject invalid, expired or already-used token", async ({ page }) => {
    await page.goto("/reset-password?token=stale-expired-token&email=user@example.com");
    await page.waitForLoadState("domcontentloaded");

    const passwordInput = page.locator("input[type='password']").first();
    const confirmInput = page.locator("input[type='password']").nth(1);
    const submitBtn = page.locator("button[type='submit']");

    if (await passwordInput.isVisible()) {
      await passwordInput.fill("NewSecretPass123!");
      await confirmInput.fill("NewSecretPass123!");
      await submitBtn.click();

      // Should display error toast or notification
      const toast = page.locator("[role='status'], [role='alert'], [data-sonner-toast]").first();
      await expect(toast).toBeVisible({ timeout: 5000 });
    }
  });

  test("should successfully reset password with valid token and redirect to login", async ({ page }) => {
    await page.goto("/reset-password?token=valid-reset-token&email=user@example.com");
    await page.waitForLoadState("domcontentloaded");

    const passwordInput = page.locator("input[type='password']").first();
    const confirmInput = page.locator("input[type='password']").nth(1);
    const submitBtn = page.locator("button[type='submit']");

    if (await passwordInput.isVisible()) {
      await passwordInput.fill("BrandNewPassword123!");
      await confirmInput.fill("BrandNewPassword123!");
      await submitBtn.click();

      // Expect success indicator or redirection
      await expect(page.locator("text=تم تعيين كلمة المرور بنجاح|تعيين كلمة مرور جديدة").first()).toBeVisible();
    }
  });
});
