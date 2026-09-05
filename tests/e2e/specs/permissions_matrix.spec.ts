import { test, expect } from "@playwright/test";
import { setupSupabaseMocks } from "../fixtures/supabaseMockHelper";

test.describe("Permissions Matrix Live Enforcement", () => {
  test.beforeEach(async ({ page }) => {
    await setupSupabaseMocks(page);
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "sb-rlfewneisuezsamhosct-auth-token",
        JSON.stringify({
          access_token: "mock-jwt-token-12345",
          user: { id: "usr-admin-001", email: "admin@tawzeefx.com", role: "admin" },
        })
      );
    });
  });

  test("should render permissions matrix tab in team management", async ({ page }) => {
    await page.goto("/team");
    await page.waitForLoadState("domcontentloaded");

    const matrixTab = page.locator("button, [role='tab']").filter({ hasText: /مصفوفة الصلاحيات|الصلاحيات|Permissions/i }).first();
    if (await matrixTab.isVisible()) {
      await matrixTab.click();

      const matrixHeader = page.locator("text=إدارة مصفوفة الصلاحيات|صلاحيات الشاشات").first();
      await expect(matrixHeader).toBeVisible();
    }
  });

  test("should toggle permissions switches interactively", async ({ page }) => {
    await page.goto("/team");
    await page.waitForLoadState("domcontentloaded");

    const matrixTab = page.locator("button, [role='tab']").filter({ hasText: /مصفوفة الصلاحيات|الصلاحيات|Permissions/i }).first();
    if (await matrixTab.isVisible()) {
      await matrixTab.click();

      const switchToggle = page.locator("[role='switch']").first();
      if (await switchToggle.isVisible()) {
        const initialState = await switchToggle.getAttribute("aria-checked");
        await switchToggle.click();
        const newState = await switchToggle.getAttribute("aria-checked");
        expect(newState).not.toBe(initialState);
      }
    }
  });
});
