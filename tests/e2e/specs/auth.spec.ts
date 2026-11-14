import { test, expect } from "@playwright/test";
import { AuthPagePom } from "../pages/AuthPage.pom";
import { setupSupabaseMocks } from "../fixtures/supabaseMockHelper";

test.describe("Authentication Page — Smoke & Security Validations", () => {
  let authPage: AuthPagePom;

  test.beforeEach(async ({ page }) => {
    await setupSupabaseMocks(page);
    authPage = new AuthPagePom(page);
    await authPage.navigate();
  });

  test("renders login inputs and submit button", async () => {
    await expect(authPage.emailInput).toBeVisible();
    await expect(authPage.passwordInput).toBeVisible();
    await expect(authPage.submitButton).toBeVisible();
  });

  test("allows switching between Login and Signup views", async () => {
    await authPage.switchToSignup();
    await expect(authPage.fullNameInput).toBeVisible({ timeout: 5000 });
    await expect(authPage.companyNameInput).toBeVisible();

    await authPage.switchToLogin();
    await expect(authPage.fullNameInput).toBeHidden();
  });

  test("shows client validation error on empty submit", async () => {
    await authPage.submitButton.click();
    const isValid = await authPage.emailInput.evaluate((el: HTMLInputElement) => el.checkValidity());
    expect(isValid).toBe(false);
  });
});
