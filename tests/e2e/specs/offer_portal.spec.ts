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

    const errorHeading = page.getByText(/لم يتم العثور على العرض|رابط غير صالح/i).first();
    await expect(errorHeading).toBeVisible({ timeout: 6000 });
  });

  test("should open valid offer, show salary details, allow digital signature and accept", async ({ page }) => {
    let acceptedCallPayload: Record<string, unknown> | null = null;
    await page.route("**/rest/v1/rpc/respond_to_offer*", async (route) => {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      if (body?._status === "accepted") {
        acceptedCallPayload = body;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, status: body?._status }),
      });
    });

    await page.goto(`/offer/${mockOffer.token}`);
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByText(mockOffer.position).first()).toBeVisible({ timeout: 6000 });

    const acceptBtn = page.getByRole("button", { name: /قبول العرض/i });
    await expect(acceptBtn).toBeVisible();
    await acceptBtn.click();

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible();
    await canvas.scrollIntoViewIfNeeded();
    // Wait for OfferPortal's 50ms canvas initialization resize before drawing
    await page.waitForTimeout(120);
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      await page.mouse.move(box.x + 20, box.y + 20);
      await page.mouse.down();
      await page.mouse.move(box.x + 80, box.y + 40);
      await page.mouse.move(box.x + 120, box.y + 20);
      await page.mouse.up();
    }

    const confirmSignBtn = page.getByRole("button", { name: /تأكيد القبول/i });
    await confirmSignBtn.click();

    await expect.poll(() => acceptedCallPayload?._status).toBe("accepted");
  });

  test("should allow candidate to reject offer with a reason", async ({ page }) => {
    let rejectedCallPayload: Record<string, unknown> | null = null;
    await page.route("**/rest/v1/rpc/respond_to_offer*", async (route) => {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      if (body?._status === "rejected") {
        rejectedCallPayload = body;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, status: body?._status }),
      });
    });

    await page.goto(`/offer/${mockOffer.token}`);
    await page.waitForLoadState("domcontentloaded");

    const rejectBtn = page.getByRole("button", { name: /رفض العرض/i });
    await expect(rejectBtn).toBeVisible({ timeout: 6000 });
    await rejectBtn.click();

    const reasonInput = page.locator("textarea").first();
    await expect(reasonInput).toBeVisible();
    await reasonInput.fill("تم قبول عرض آخر، شكراً لكم.");

    await page.getByRole("button", { name: /تأكيد الرفض/i }).click();
    await expect.poll(() => rejectedCallPayload?._status).toBe("rejected");
  });
});
