import { test, expect } from "@playwright/test";
import { seedAuthSession, setupSupabaseMocks } from "../fixtures/supabaseMockHelper";
import { mockPipelineStages, mockUser } from "../fixtures/mockData";

test.describe("Workflow Editor & Stage Transition Automation — /workflow", () => {
  test.beforeEach(async ({ page }) => {
    await setupSupabaseMocks(page);
    await seedAuthSession(page, mockUser);
  });

  test("should render workflow stages editor and switch to automation builder tab", async ({ page }) => {
    await page.goto("/workflow");
    await page.waitForLoadState("domcontentloaded");

    const header = page.locator("h1").filter({ hasText: /مراحل التوظيف|Recruitment Stages/i });
    await expect(header).toBeVisible({ timeout: 6000 });

    await expect(page.getByText(mockPipelineStages[0].name).first()).toBeVisible();

    const automationTab = page.getByRole("tab", { name: /محرك الأتمتة|Automation Builder/i });
    await expect(automationTab).toBeVisible();
    await automationTab.click();
    await expect(automationTab).toHaveAttribute("aria-selected", "true");
  });
});
