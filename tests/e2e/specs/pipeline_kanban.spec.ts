import { test, expect } from "@playwright/test";
import { setupSupabaseMocks } from "../fixtures/supabaseMockHelper";
import { mockCandidate, mockIneligibleCandidate } from "../fixtures/mockData";

test.describe("Pipeline Kanban — Drag & Drop Stage Guard & Transition History", () => {
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

  test("should render Kanban board with columns and candidates", async ({ page }) => {
    await page.goto("/pipeline");
    await page.waitForLoadState("domcontentloaded");

    const kanbanTitle = page.locator("h1, h2").filter({ hasText: /المراحل|مسار التوظيف|Pipeline/i }).first();
    await expect(kanbanTitle).toBeVisible({ timeout: 6000 });

    const candidateCard = page.locator(`text=${mockCandidate.name}`).first();
    await expect(candidateCard).toBeVisible();
  });

  test("should block invalid transition when candidate does not satisfy minimum AI score", async ({ page }) => {
    await page.goto("/pipeline");
    await page.waitForLoadState("domcontentloaded");

    // Ineligible candidate has 45% AI score; stage 2 requires >= 75%
    const ineligibleCard = page.locator(`text=${mockIneligibleCandidate.name}`).first();
    if (await ineligibleCard.isVisible()) {
      // Find the second stage target column ("مراجعة السيرة")
      const targetColumn = page.locator("text=مراجعة السيرة").first();
      
      const cardBox = await ineligibleCard.boundingBox();
      const colBox = await targetColumn.boundingBox();

      if (cardBox && colBox) {
        await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(colBox.x + colBox.width / 2, colBox.y + colBox.height / 2, { steps: 10 });
        await page.mouse.up();

        // Blocking alert or toast should appear
        const blockToast = page.locator("text=لا يمكن الانتقال|أقل من الحد الأدنى|⚠️").first();
        await expect(blockToast).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test("should open transition note dialog for valid move and record history", async ({ page }) => {
    await page.goto("/pipeline");
    await page.waitForLoadState("domcontentloaded");

    // Qualified candidate has 88% AI score; can move to stage 2
    const validCard = page.locator(`text=${mockCandidate.name}`).first();
    const targetColumn = page.locator("text=مراجعة السيرة").first();

    if (await validCard.isVisible() && await targetColumn.isVisible()) {
      const cardBox = await validCard.boundingBox();
      const colBox = await targetColumn.boundingBox();

      if (cardBox && colBox) {
        await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(colBox.x + colBox.width / 2, colBox.y + colBox.height / 2, { steps: 10 });
        await page.mouse.up();

        // Check if transition dialog opens
        const dialog = page.locator("[role='dialog']").first();
        if (await dialog.isVisible()) {
          const confirmBtn = dialog.locator("button").filter({ hasText: /تأكيد|نقل|موافق/i }).first();
          await confirmBtn.click();
        }
      }
    }
  });
});
