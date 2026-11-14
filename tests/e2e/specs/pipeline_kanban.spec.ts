import { test, expect } from "@playwright/test";
import { seedAuthSession, setupSupabaseMocks } from "../fixtures/supabaseMockHelper";
import { mockCandidate, mockIneligibleCandidate, mockUser } from "../fixtures/mockData";

test.describe("Pipeline Kanban & Hiring Integrity Guards — /pipeline", () => {
  test.beforeEach(async ({ page }) => {
    await setupSupabaseMocks(page);
    await seedAuthSession(page, mockUser);
  });

  test("should render Kanban columns, candidates, and assessment integrity badges", async ({ page }) => {
    await page.goto("/pipeline");
    await page.waitForLoadState("domcontentloaded");

    const kanbanTitle = page.locator("h1").filter({ hasText: /مسار التوظيف|Pipeline/i });
    await expect(kanbanTitle).toBeVisible({ timeout: 6000 });

    await expect(page.getByText(mockCandidate.name).first()).toBeVisible();
    await expect(page.getByText(mockIneligibleCandidate.name).first()).toBeVisible();

    // Hiring integrity badges rendered from assessment_responses
    await expect(page.getByText("نزيه").first()).toBeVisible();
    await expect(page.getByText("شبهة غش").first()).toBeVisible();
  });

  test("should enforce AI score transition guard when dragging low-score candidate to restricted stage", async ({ page }) => {
    await page.goto("/pipeline");
    await page.waitForLoadState("domcontentloaded");

    const ineligibleCard = page.getByText(mockIneligibleCandidate.name).first();
    const targetColumn = page.getByText("مراجعة السيرة").first();

    await expect(ineligibleCard).toBeVisible({ timeout: 6000 });
    await expect(targetColumn).toBeVisible();

    const cardBox = await ineligibleCard.boundingBox();
    const colBox = await targetColumn.boundingBox();
    expect(cardBox).not.toBeNull();
    expect(colBox).not.toBeNull();

    if (cardBox && colBox) {
      await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(colBox.x + colBox.width / 2, colBox.y + colBox.height / 2, { steps: 12 });
      await page.mouse.up();

      const blockToast = page.getByText(/لا يمكن الانتقال|أقل من الحد الأدنى المطلوب/i).first();
      await expect(blockToast).toBeVisible({ timeout: 5000 });
    }
  });

  test("should switch smoothly between Kanban, Timeline and Analytics pipeline views", async ({ page }) => {
    await page.goto("/pipeline");
    await page.waitForLoadState("domcontentloaded");

    const statsBtn = page.getByRole("button", { name: /إحصائيات/i });
    await expect(statsBtn).toBeVisible({ timeout: 6000 });
    await statsBtn.click();

    await expect(page.getByText(mockCandidate.name).first()).toBeHidden();
  });
});
