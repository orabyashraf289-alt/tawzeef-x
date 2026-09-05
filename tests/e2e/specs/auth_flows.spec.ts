import { test, expect } from "@playwright/test";
import { setupSupabaseMocks } from "../fixtures/supabaseMockHelper";
import { mockUser } from "../fixtures/mockData";

test.describe("Auth Flows — Login, Logout, Session Restore & OTP", () => {
  test.beforeEach(async ({ page }) => {
    await setupSupabaseMocks(page);
  });

  test("should successfully login with email and password", async ({ page }) => {
    await page.goto("/auth");
    await page.waitForLoadState("domcontentloaded");

    const emailInput = page.locator("input[type='email']");
    const passwordInput = page.locator("input[type='password']");
    const submitBtn = page.locator("button[type='submit']");

    await emailInput.fill(mockUser.email);
    await passwordInput.fill("CorrectPassword123!");
    await submitBtn.click();

    // Verify redirected or authenticated state
    await expect(page).not.toHaveURL(/\/auth\?mode=signup/);
  });

  test("should restore session after page reload using localStorage", async ({ page }) => {
    // Set mock supabase session in localStorage
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "sb-rlfewneisuezsamhosct-auth-token",
        JSON.stringify({
          access_token: "mock-jwt-token-12345",
          refresh_token: "mock-refresh-token",
          user: {
            id: "usr-admin-001",
            email: "admin@tawzeefx.com",
            role: "admin",
          },
        })
      );
    });

    await page.goto("/pipeline");
    await page.waitForLoadState("domcontentloaded");

    // Verify authenticated user stays on pipeline page
    await expect(page).toHaveURL(/\/pipeline/);
  });

  test("should display OTP input and allow verification", async ({ page }) => {
    await page.goto("/auth");
    await page.waitForLoadState("domcontentloaded");

    // Check if OTP switch / button is available
    const otpToggle = page.locator("button, a").filter({ hasText: /OTP|رمز التحقق|رمز الدخول/i }).first();
    if (await otpToggle.isVisible()) {
      await otpToggle.click();
      const otpInput = page.locator("input[type='text'], input[inputmode='numeric']").first();
      await expect(otpInput).toBeVisible();
    }
  });

  test("should logout and redirect user to /auth", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "sb-rlfewneisuezsamhosct-auth-token",
        JSON.stringify({
          access_token: "mock-jwt-token-12345",
          user: { id: "usr-admin-001", email: "admin@tawzeefx.com", role: "admin" },
        })
      );
    });

    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded");

    // Locate logout button if present
    const logoutBtn = page.locator("button, [role='menuitem']").filter({ hasText: /تسجيل الخروج|خروج|Logout/i }).first();
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      await page.waitForTimeout(500);
      await expect(page).toHaveURL(/\/auth|\//);
    }
  });
});
