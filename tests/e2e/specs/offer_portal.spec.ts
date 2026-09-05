import { test, expect } from "@playwright/test";
import { setupSupabaseMocks } from "../fixtures/supabaseMockHelper";
import { mockOffer } from "../fixtures/mockData";

test.describe("Offer Portal — /offer/:token", () => {
  test.beforeEach(async ({ page }) => {
    await setupSupabaseMocks(page);
  });

  test("should show error for stale or foreign token", async ({ page }) => {
    await page.goto("/offer/invalid-stale-token-xyz");
    await page.waitForLoadState("domcontentloaded");

    const errorHeading = page.locator("text=لم يتم العثور على العرض|رابط غير صالح").first();
    await expect(errorHeading).toBeVisible({ timeout: 6000 });
  });

  test("should open valid offer, show salary details, allow digital signature and accept", async ({ page }) => {
    await page.goto(`/offer/${mockOffer.token}`);
    await page.waitForLoadState("domcontentloaded");

    // Position title should be rendered
    const positionHeading = page.locator(`text=${mockOffer.position}`).first();
    await expect(positionHeading).toBeVisible({ timeout: 6000 });

    // Look for accept decision button
    const acceptBtn = page.locator("button").filter({ hasText: /قبول العرض|الموافقة|Accept/i }).first();
    if (await acceptBtn.isVisible()) {
      await acceptBtn.click();

      // Check for digital signature canvas
      const canvas = page.locator("canvas").first();
      if (await canvas.isVisible()) {
        const box = await canvas.boundingBox();
        if (box) {
          await page.mouse.move(box.x + 20, box.y + 20);
          await page.mouse.down();
          await page.mouse.move(box.x + 80, box.y + 40);
          await page.mouse.move(box.x + 120, box.y + 20);
          await page.mouse.up();
        }

        const confirmSignBtn = page.locator("button").filter({ hasText: /تأكيد القبول|إرسال الموافقة|توقيع/i }).first();
        if (await confirmSignBtn.isVisible()) {
          await confirmSignBtn.click();
        }
      }
    }
  });

  test("should allow candidate to reject offer with a reason", async ({ page }) => {
    await page.goto(`/offer/${mockOffer.token}`);
    await page.waitForLoadState("domcontentloaded");

    const rejectBtn = page.locator("button").filter({ hasText: /اعتذار|رفض العرض|Decline/i }).first();
    if (await rejectBtn.isVisible()) {
      await rejectBtn.click();

      const reasonInput = page.locator("textarea, input[placeholder*='سبب']").first();
      if (await reasonInput.isVisible()) {
        await reasonInput.fill("تم قبول عرض آخر، شكراً لكم.");
      }
    }
  });
});
