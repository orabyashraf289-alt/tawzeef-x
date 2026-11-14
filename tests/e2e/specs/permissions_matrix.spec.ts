import { test, expect } from "@playwright/test";
import { seedAuthSession, setupSupabaseMocks } from "../fixtures/supabaseMockHelper";
import { mockUser } from "../fixtures/mockData";

test.describe("Permissions Matrix Live Enforcement — /team", () => {
  test.beforeEach(async ({ page }) => {
    await setupSupabaseMocks(page);
    await seedAuthSession(page, mockUser);
  });

  test("should render permissions matrix tab and screen/operation controls in team management", async ({ page }) => {
    await page.goto("/team");
    await page.waitForLoadState("domcontentloaded");

    const matrixTab = page.locator("button, [role='tab']").filter({ hasText: /الصلاحيات|مصفوفة الصلاحيات|Permissions/i }).first();
    await expect(matrixTab).toBeVisible({ timeout: 6000 });
    await matrixTab.click();

    await expect(page.getByText(/صلاحيات الشاشات وعمليات التوظيف/i)).toBeVisible({ timeout: 6000 });
  });

  test("should toggle permissions switches interactively and save matrix changes", async ({ page }) => {
    await page.goto("/team");
    await page.waitForLoadState("domcontentloaded");

    const matrixTab = page.locator("button, [role='tab']").filter({ hasText: /الصلاحيات|مصفوفة الصلاحيات|Permissions/i }).first();
    await expect(matrixTab).toBeVisible({ timeout: 6000 });
    await matrixTab.click();

    const switchToggle = page.locator("[role='switch']").first();
    await expect(switchToggle).toBeVisible({ timeout: 6000 });
    await expect(switchToggle).toBeEnabled({ timeout: 6000 });

    const initialState = await switchToggle.getAttribute("aria-checked");
    await switchToggle.click();
    const newState = await switchToggle.getAttribute("aria-checked");
    expect(newState).not.toBe(initialState);

    const saveBtn = page.getByRole("button", { name: /حفظ مصفوفة الصلاحيات/i });
    await expect(saveBtn).toBeEnabled();

    const upsertRequest = page.waitForRequest(
      (req) => req.url().includes("/rest/v1/granular_permissions") && req.method() === "POST"
    );
    await saveBtn.click();
    await upsertRequest;
  });
});
