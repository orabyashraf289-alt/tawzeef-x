import { test, expect } from "@playwright/test";
import { setupSupabaseMocks } from "../fixtures/supabaseMockHelper";
import { mockJob } from "../fixtures/mockData";
import { CandidateApplyPagePom } from "../pages/CandidateApplyPage.pom";

test.describe("Public Job Application Flow — /apply/:id", () => {
  test.beforeEach(async ({ page }) => {
    await setupSupabaseMocks(page);
  });

  test("should complete multi-step application wizard and display digital tracking pass", async ({ page }) => {
    const applyPage = new CandidateApplyPagePom(page);
    await applyPage.navigateToJob(mockJob.id);

    await expect(page.locator("h1#job-title")).toContainText(mockJob.title, { timeout: 6000 });

    // Step 1 -> Step 2 (skip manual upload)
    await applyPage.skipCvButton.click();

    // Step 2: Candidate basic contact details
    await applyPage.fullNameInput.fill("أحمد بن سالم المتقدم");
    await applyPage.emailInput.fill("applicant@example.com");
    await applyPage.phoneInput.fill("+966551234567");
    await page.getByRole("button", { name: /متابعة: المهارات والمؤهلات/i }).click();

    // Step 3 -> Step 4
    await page.getByRole("button", { name: /متابعة: التفضيلات والرسالة/i }).click();

    // Step 4 -> Step 5
    await page.getByRole("button", { name: /متابعة: المراجعة الذكية ومقياس التوافق/i }).click();

    // Step 5: Agree to declaration & submit application
    await applyPage.agreeTermsCheckbox.click();

    const applicationPostPromise = page.waitForRequest(
      (req) => req.url().includes("/rest/v1/applications") && req.method() === "POST"
    );
    await applyPage.submitButton.click();
    const request = await applicationPostPromise;
    expect(request.postDataJSON()).toMatchObject({
      job_id: mockJob.id,
      name: "أحمد بن سالم المتقدم",
      email: "applicant@example.com",
    });

    await expect(applyPage.successHeading).toBeVisible({ timeout: 6000 });
    await expect(page.getByText(/TX-/)).toBeVisible();
  });
});
