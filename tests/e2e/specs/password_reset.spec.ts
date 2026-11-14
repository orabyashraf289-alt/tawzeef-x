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

    await expect(passwordInput).toBeVisible({ timeout: 6000 });
    await passwordInput.fill("NewSecretPass123!");
    await confirmInput.fill("NewSecretPass123!");
    await submitBtn.click();

    const toast = page.locator("[role='status'], [role='alert'], [data-sonner-toast]").first();
    await expect(toast).toBeVisible({ timeout: 5000 });
  });

  test("should successfully reset password with valid token and display confirmation", async ({ page }) => {
    await page.goto("/reset-password?token=valid-reset-token&email=user@example.com");
    await page.waitForLoadState("domcontentloaded");

    const passwordInput = page.locator("input[type='password']").first();
    const confirmInput = page.locator("input[type='password']").nth(1);
    const submitBtn = page.locator("button[type='submit']");

    await expect(passwordInput).toBeVisible({ timeout: 6000 });
    await passwordInput.fill("BrandNewPassword123!");
    await confirmInput.fill("BrandNewPassword123!");
    await submitBtn.click();

    await expect(
      page.getByRole("heading", { name: /تم التحديث بنجاح/i })
    ).toBeVisible({ timeout: 6000 });
  });
});
