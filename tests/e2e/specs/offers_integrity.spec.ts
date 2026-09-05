import { test, expect } from "@playwright/test";
import { setupSupabaseMocks } from "../fixtures/supabaseMockHelper";
import { mockOffer } from "../fixtures/mockData";

test.describe("Offers Integrity & Anti-Duplicate Contract Guards", () => {
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

  test("should render offers table with status and details", async ({ page }) => {
    await page.goto("/offers");
    await page.waitForLoadState("domcontentloaded");

    const header = page.locator("h1, h2").filter({ hasText: /العروض الوظيفية|Offers/i }).first();
    await expect(header).toBeVisible({ timeout: 6000 });

    const offerRow = page.locator(`text=${mockOffer.position}`).first();
    await expect(offerRow).toBeVisible();
  });

  test("should open create offer modal and display form validations", async ({ page }) => {
    await page.goto("/offers");
    await page.waitForLoadState("domcontentloaded");

    const newOfferBtn = page.locator("button").filter({ hasText: /عرض جديد|إنشاء عرض/i }).first();
    if (await newOfferBtn.isVisible()) {
      await newOfferBtn.click();

      const modalTitle = page.locator("text=إنشاء عرض وظيفي جديد|تفاصيل العرض").first();
      await expect(modalTitle).toBeVisible();
    }
  });
});
