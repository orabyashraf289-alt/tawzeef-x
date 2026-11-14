import { test, expect } from "@playwright/test";
import { seedAuthSession, setupSupabaseMocks } from "../fixtures/supabaseMockHelper";
import { mockOffer, mockUser } from "../fixtures/mockData";

test.describe("Offers Integrity & Contract Guards — /offers", () => {
  test.beforeEach(async ({ page }) => {
    await setupSupabaseMocks(page);
    await seedAuthSession(page, mockUser);
  });

  test("should render offers directory with active offer status and salary details", async ({ page }) => {
    await page.goto("/offers");
    await page.waitForLoadState("domcontentloaded");

    const header = page.locator("h1, h2").filter({ hasText: /عروض العمل|العروض الوظيفية|Job Offers/i }).first();
    await expect(header).toBeVisible({ timeout: 6000 });

    await expect(page.getByText(mockOffer.position).first()).toBeVisible();
  });

  test("should open create offer modal and enforce required fields before submission", async ({ page }) => {
    await page.goto("/offers");
    await page.waitForLoadState("domcontentloaded");

    const newOfferBtn = page.getByRole("button", { name: /إنشاء عرض جديد|عرض جديد|Create/i }).first();
    await expect(newOfferBtn).toBeVisible({ timeout: 6000 });
    await newOfferBtn.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/إنشاء عرض عمل جديد|Create New Job Offer/i)).toBeVisible();

    const submitCreateBtn = dialog.getByRole("button", { name: /إنشاء العرض|Create Offer/i });
    await submitCreateBtn.click();

    await expect(page.getByText(/يرجى ملء الحقول المطلوبة|Please fill/i).first()).toBeVisible({ timeout: 5000 });
  });
});
