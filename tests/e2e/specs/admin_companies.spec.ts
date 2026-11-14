import { test, expect } from "@playwright/test";
import { seedAuthSession, setupSupabaseMocks } from "../fixtures/supabaseMockHelper";
import { mockCompany, mockNonSuperAdmin, mockUser } from "../fixtures/mockData";

test.describe("Admin Companies — Super Admin Access Control Guards", () => {
  test("should block non-super-admin users from accessing /admin/companies via direct URL", async ({ page }) => {
    await setupSupabaseMocks(page, {
      user: mockNonSuperAdmin,
      role: "recruiter",
      isSuperAdmin: false,
    });
    await seedAuthSession(page, mockNonSuperAdmin);

    await page.goto("/admin/companies");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByRole("heading", { name: "403" })).toBeVisible({ timeout: 6000 });
    await expect(page.getByRole("heading", { name: /ليس لديك صلاحية|Access Denied/i })).toBeVisible();
  });

  test("should allow super-admin to view and manage client companies", async ({ page }) => {
    await setupSupabaseMocks(page, {
      user: mockUser,
      role: "admin",
      isSuperAdmin: true,
    });
    await seedAuthSession(page, mockUser);

    await page.goto("/admin/companies");
    await page.waitForLoadState("domcontentloaded");

    const header = page
      .locator("h1, h2")
      .filter({ hasText: /إدارة الشركات والاشتراكات|إدارة الشركات/i })
      .first();
    await expect(header).toBeVisible({ timeout: 6000 });
    await expect(page.getByText(mockCompany.name).first()).toBeVisible({ timeout: 6000 });
  });
});
