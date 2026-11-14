import { test, expect } from "@playwright/test";
import { seedAuthSession, setupSupabaseMocks } from "../fixtures/supabaseMockHelper";
import { mockUser } from "../fixtures/mockData";

test.describe("Team Management — Member Access & Invitations — /team", () => {
  test.beforeEach(async ({ page }) => {
    await setupSupabaseMocks(page);
    await seedAuthSession(page, mockUser);
  });

  test("should render team management heading and open invite member modal", async ({ page }) => {
    await page.goto("/team");
    await page.waitForLoadState("domcontentloaded");

    const header = page.locator("h1, h2").filter({ hasText: /إدارة الفريق|أعضاء الفريق|Team/i }).first();
    await expect(header).toBeVisible({ timeout: 6000 });

    const inviteBtn = page.getByRole("button", { name: /دعوة موظف|إضافة عضو/i }).first();
    await expect(inviteBtn).toBeVisible();
    await inviteBtn.click();

    await expect(page.getByRole("dialog")).toBeVisible();
  });
});
