import { test, expect } from "@playwright/test";
import { seedAuthSession, setupSupabaseMocks } from "../fixtures/supabaseMockHelper";
import { mockInvitation, mockInvitedUser } from "../fixtures/mockData";

test.describe("Company Invitation Acceptance — /invitation/:token", () => {
  test.beforeEach(async ({ page }) => {
    await setupSupabaseMocks(page, { user: mockInvitedUser, role: "recruiter" });
    await seedAuthSession(page, mockInvitedUser);
  });

  test("should show not found screen on invalid invitation token", async ({ page }) => {
    await page.goto("/invitation/stale-or-invalid-invite-token");
    await page.waitForLoadState("domcontentloaded");

    const notFoundEl = page.getByRole("heading", { name: /الدعوة غير موجودة|غير صالح/i });
    await expect(notFoundEl).toBeVisible({ timeout: 6000 });
  });

  test("should display company invitation details and allow accepting into company", async ({ page }) => {
    await page.goto(`/invitation/${mockInvitation.token}`);
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByRole("heading", { name: mockInvitation.company.name })).toBeVisible({ timeout: 6000 });

    const acceptBtn = page.getByRole("button", { name: /^قبول$/ });
    await expect(acceptBtn).toBeEnabled();
    await acceptBtn.click();

    await expect(page.getByRole("heading", { name: /تم قبول الدعوة/i })).toBeVisible({ timeout: 6000 });
    await expect(page.getByRole("button", { name: /الذهاب لبوابة الشركة/i })).toBeVisible();
  });
});
