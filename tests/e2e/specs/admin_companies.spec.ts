import { test, expect } from "@playwright/test";
import { setupSupabaseMocks } from "../fixtures/supabaseMockHelper";
import { mockNonSuperAdmin, mockUser } from "../fixtures/mockData";

test.describe("Admin Companies — Super Admin Access Control Guards", () => {
  test("should block non-super-admin users from accessing /admin/companies via direct URL", async ({ page }) => {
    await setupSupabaseMocks(page, { user: mockNonSuperAdmin, role: "recruiter" });
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "sb-rlfewneisuezsamhosct-auth-token",
        JSON.stringify({
          access_token: "mock-jwt-token-recruiter",
          user: { id: "usr-recruiter-002", email: "recruiter@tawzeefx.com", role: "recruiter" },
        })
      );
    });

    await page.goto("/admin/companies");
    await page.waitForLoadState("domcontentloaded");

    // Recruiter should be blocked and redirected away from /admin/companies
    await expect(page).not.toHaveURL(/\/admin\/companies$/);
  });

  test("should allow super-admin to view and manage client companies", async ({ page }) => {
    await setupSupabaseMocks(page, { user: mockUser, role: "admin" });
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "sb-rlfewneisuezsamhosct-auth-token",
        JSON.stringify({
          access_token: "mock-jwt-token-admin",
          user: { id: "usr-admin-001", email: "admin@tawzeefx.com", role: "admin" },
        })
      );
    });

    await page.goto("/admin/companies");
    await page.waitForLoadState("domcontentloaded");

    const header = page.locator("h1, h2").filter({ hasText: /إدارة الشركات|الشركات العميلة/i }).first();
    await expect(header).toBeVisible({ timeout: 6000 });
  });
});
