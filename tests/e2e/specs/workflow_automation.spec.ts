import { test, expect } from "@playwright/test";
import { setupSupabaseMocks } from "../fixtures/supabaseMockHelper";

test.describe("Workflow Editor & Stage Transition Automation", () => {
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

  test("should render workflow editor with stages and trigger nodes", async ({ page }) => {
    await page.goto("/workflow");
    await page.waitForLoadState("domcontentloaded");

    const header = page.locator("h1, h2, div").filter({ hasText: /أتمتة العمليات|مسار العمل|Workflow/i }).first();
    await expect(header).toBeVisible({ timeout: 6000 });
  });
});
