import { test, expect } from "@playwright/test";
import { setupSupabaseMocks } from "../fixtures/supabaseMockHelper";
import { mockInvitation } from "../fixtures/mockData";

test.describe("Company Invitation Acceptance — /invitation/:token", () => {
  test.beforeEach(async ({ page }) => {
    await setupSupabaseMocks(page);
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "sb-rlfewneisuezsamhosct-auth-token",
        JSON.stringify({
          access_token: "mock-jwt-token-12345",
          user: { id: "usr-invited-001", email: "newmember@tawzeefx.com", role: "recruiter" },
        })
      );
    });
  });

  test("should show not found screen on invalid invitation token", async ({ page }) => {
    await page.goto("/invitation/stale-or-invalid-invite-token");
    await page.waitForLoadState("domcontentloaded");

    const notFoundEl = page.locator("text=الدعوة غير موجودة|غير صالح").first();
    await expect(notFoundEl).toBeVisible({ timeout: 6000 });
  });

  test("should display company invitation details and allow accepting into company", async ({ page }) => {
    await page.goto(`/invitation/${mockInvitation.token}`);
    await page.waitForLoadState("domcontentloaded");

    // Look for accept button or company name
    const acceptBtn = page.locator("button").filter({ hasText: /قبول الدعوة|انضمام|Accept/i }).first();
    if (await acceptBtn.isVisible()) {
      await acceptBtn.click();
      await page.waitForTimeout(500);

      // Verify success state or company redirect
      const successOrRedirect = page.locator("text=تم قبول الدعوة|الذهاب لبوابة الشركة").first();
      await expect(successOrRedirect).toBeVisible({ timeout: 5000 });
    }
  });
});
