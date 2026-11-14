import { test, expect } from "@playwright/test";
import { seedAuthSession, setupSupabaseMocks } from "../fixtures/supabaseMockHelper";
import { mockUser } from "../fixtures/mockData";

test.describe("Auth Flows — Login, Logout, Session Restore & Portals", () => {
  test.beforeEach(async ({ page }) => {
    await setupSupabaseMocks(page);
  });

  test("should successfully login with email and password", async ({ page }) => {
    await page.goto("/auth");
    await page.waitForLoadState("domcontentloaded");

    await page.locator("#auth-email").fill(mockUser.email);
    await page.locator("#auth-password").fill("CorrectPassword123!");
    await page.locator("button[type='submit']").click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 6000 });
  });

  test("should restore session after navigation using localStorage", async ({ page }) => {
    await seedAuthSession(page, mockUser);

    await page.goto("/pipeline");
    await page.waitForLoadState("domcontentloaded");

    await expect(page).toHaveURL(/\/pipeline/);
    await expect(page.locator("h1").filter({ hasText: /مسار التوظيف|Pipeline/i })).toBeVisible({ timeout: 6000 });
  });

  test("should navigate between HR portal, applicant login mode, and forgot-password flow", async ({ page }) => {
    await page.goto("/auth?mode=login");
    await page.waitForLoadState("domcontentloaded");

    const applicantLink = page.getByRole("link", { name: /تسجيل دخول المتقدم/i });
    await expect(applicantLink).toBeVisible();
    await applicantLink.click();
    await expect(page).toHaveURL(/type=applicant/);

    const forgotLink = page.getByRole("link", { name: /نسيت كلمة المرور/i });
    await expect(forgotLink).toBeVisible();
    await forgotLink.click();
    await expect(page).toHaveURL(/\/forgot-password/);
  });

  test("should logout and redirect user away from protected workspace", async ({ page }) => {
    await seedAuthSession(page, mockUser);

    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded");

    const logoutBtn = page.locator("button[title='تسجيل الخروج']").first();
    await expect(logoutBtn).toBeVisible({ timeout: 6000 });
    await logoutBtn.click();

    await expect(page).toHaveURL(/\/auth|\/$/, { timeout: 6000 });
  });
});
