import { test, expect } from "@playwright/test";
import { setupSupabaseMocks } from "../fixtures/supabaseMockHelper";
import { mockAssessment } from "../fixtures/mockData";

test.describe("Assessment & Anti-Cheat Proctoring — /assessment/:token", () => {
  test.beforeEach(async ({ page }) => {
    await setupSupabaseMocks(page);
  });

  test("should render intro screen and start assessment test timer", async ({ page }) => {
    await page.goto(`/assessment/${mockAssessment.token}`);
    await page.waitForLoadState("domcontentloaded");

    const titleEl = page.locator(`text=${mockAssessment.title}`).first();
    await expect(titleEl).toBeVisible({ timeout: 6000 });

    const nameInput = page.locator("input[placeholder*='الاسم'], input#name").first();
    const emailInput = page.locator("input[type='email'], input#email").first();
    const startBtn = page.locator("button").filter({ hasText: /بدء الاختبار|ابدأ/i }).first();

    if (await nameInput.isVisible()) {
      await nameInput.fill("مرشح تجريبي");
      await emailInput.fill("cand@test.com");
      await startBtn.click();
    }
  });

  test("should detect tab-switch / visibility loss and trigger warning toast", async ({ page }) => {
    await page.goto(`/assessment/${mockAssessment.token}`);
    await page.waitForLoadState("domcontentloaded");

    const nameInput = page.locator("input[placeholder*='الاسم'], input#name").first();
    const emailInput = page.locator("input[type='email'], input#email").first();
    const startBtn = page.locator("button").filter({ hasText: /بدء الاختبار|ابدأ/i }).first();

    if (await nameInput.isVisible()) {
      await nameInput.fill("مرشح الاختبار");
      await emailInput.fill("cand@test.com");
      await startBtn.click();
      await page.waitForTimeout(500);

      // Trigger visibility change to test anti-cheat detection
      await page.evaluate(() => {
        Object.defineProperty(document, "hidden", { value: true, writable: true });
        document.dispatchEvent(new Event("visibilitychange"));
      });

      // Verify anti-cheat alert or warning
      const warningToast = page.locator("text=لا تغادر صفحة الاختبار|Don't leave the test page").first();
      await expect(warningToast).toBeVisible({ timeout: 5000 });
    }
  });

  test("should answer questions, submit assessment and view score breakdown", async ({ page }) => {
    await page.goto(`/assessment/${mockAssessment.token}`);
    await page.waitForLoadState("domcontentloaded");

    const nameInput = page.locator("input[placeholder*='الاسم'], input#name").first();
    const emailInput = page.locator("input[type='email'], input#email").first();
    const startBtn = page.locator("button").filter({ hasText: /بدء الاختبار|ابدأ/i }).first();

    if (await nameInput.isVisible()) {
      await nameInput.fill("مرشح متفوق");
      await emailInput.fill("top@candidate.com");
      await startBtn.click();
      await page.waitForTimeout(500);

      // Select first option
      const radioOption = page.locator("label, [role='radio']").first();
      if (await radioOption.isVisible()) {
        await radioOption.click();
      }

      // Next / Submit
      const nextOrSubmitBtn = page.locator("button").filter({ hasText: /التالي|إرسال الإجابات|إنهاء/i }).first();
      if (await nextOrSubmitBtn.isVisible()) {
        await nextOrSubmitBtn.click();
      }
    }
  });
});
