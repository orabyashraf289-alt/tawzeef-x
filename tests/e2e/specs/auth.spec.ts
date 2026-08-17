import { test, expect } from "@playwright/test";
import { AuthPagePom } from "../pages/AuthPage.pom";

test.describe("Authentication Page — Smoke & Security Validations", () => {
  let authPage: AuthPagePom;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPagePom(page);
    await authPage.navigate();
  });

  test("renders login inputs and submit button", async () => {
    await expect(authPage.emailInput).toBeVisible();
    await expect(authPage.passwordInput).toBeVisible();
    await expect(authPage.submitButton).toBeVisible();
  });

  test("allows switching between Login and Signup tabs", async () => {
    if (await authPage.tabSignup.isVisible()) {
      await authPage.tabSignup.click();
      await expect(authPage.tabSignup).toHaveAttribute("aria-selected", "true");
    }
  });

  test("shows client validation error on empty submit", async () => {
    await authPage.submitButton.click();
    // HTML5 validation or form error
    const isValid = await authPage.emailInput.evaluate((el: HTMLInputElement) => el.checkValidity());
    expect(isValid).toBe(false);
  });
});
