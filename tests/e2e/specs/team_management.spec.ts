import { test, expect } from "@playwright/test";
import { setupSupabaseMocks } from "../fixtures/supabaseMockHelper";

test.describe("Team Management — Member Access & Revocation", () => {
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

  test("should render team members table and invite button", async ({ page }) => {
    await page.goto("/team");
    await page.waitForLoadState("domcontentloaded");

    const header = page.locator("h1, h2").filter({ hasText: /إدارة الفريق|أعضاء الفريق|Team/i }).first();
    await expect(header).toBeVisible({ timeout: 6000 });

    const inviteBtn = page.locator("button").filter({ hasText: /دعوة|إضافة عضو/i }).first();
    await expect(inviteBtn).toBeVisible();
  });
});
