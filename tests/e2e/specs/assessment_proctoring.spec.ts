import { test, expect } from "@playwright/test";
import { setupSupabaseMocks } from "../fixtures/supabaseMockHelper";
import { mockAssessment, mockTrackingCode } from "../fixtures/mockData";

interface FinishAttemptPayload {
  _tab_switches?: number;
  _tab_switch_log?: {
    events?: { type: string }[];
  };
}

test.describe("Assessment & Anti-Cheat Proctoring — /assessment/:token", () => {
  test.beforeEach(async ({ page }) => {
    await setupSupabaseMocks(page);
  });

  test("should render intro screen, enter tracking code and start timed attempt", async ({ page }) => {
    await page.goto(`/assessment/${mockAssessment.token}`);
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByText(mockAssessment.title).first()).toBeVisible({ timeout: 6000 });
    await expect(page.getByText(`${mockAssessment.duration_minutes} دقيقة`)).toBeVisible();

    const codeInput = page.locator("#tracking-code");
    await expect(codeInput).toBeVisible();
    await codeInput.fill(mockTrackingCode);

    const startBtn = page.getByRole("button", { name: /بدء الاختبار أو متابعة المحاولة|Start or resume/i });
    await startBtn.click();

    await expect(page.getByText(mockAssessment.questions[0].question_text)).toBeVisible({ timeout: 6000 });
    await expect(page.getByText(`1 / ${mockAssessment.questions.length}`)).toBeVisible();
  });

  test("should log visibility loss events and submit integrity metadata on finish", async ({ page }) => {
    await page.goto(`/assessment/${mockAssessment.token}`);
    await page.waitForLoadState("domcontentloaded");

    await page.locator("#tracking-code").fill(mockTrackingCode);
    await page.getByRole("button", { name: /بدء الاختبار أو متابعة المحاولة|Start or resume/i }).click();

    await expect(page.getByText(mockAssessment.questions[0].question_text)).toBeVisible({ timeout: 6000 });

    // Select answer for question 1
    await page.locator("label").filter({ hasText: "useRef" }).first().click();

    // Simulate tab-switch / visibility loss tracked for human integrity review
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { value: true, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await page.getByRole("button", { name: /^التالي$|^Next$/i }).click();
    await expect(page.getByText(mockAssessment.questions[1].question_text)).toBeVisible();

    // Select answer for question 2 and finish
    await page.locator("label").filter({ hasText: "useEffect" }).first().click();

    const finishRequestPromise = page.waitForRequest(
      (req) => req.url().includes("/rest/v1/rpc/finish_assessment_attempt") && req.method() === "POST"
    );
    await page.getByRole("button", { name: /تسليم الاختبار|Submit assessment/i }).click();

    const finishRequest = await finishRequestPromise;
    const finishPayload = finishRequest.postDataJSON() as FinishAttemptPayload;

    await expect(page.getByRole("heading", { name: /اجتزت الاختبار|Assessment passed/i })).toBeVisible({ timeout: 6000 });
    await expect(page.getByText("100%")).toBeVisible();

    expect(Number(finishPayload._tab_switches)).toBeGreaterThanOrEqual(1);
    expect(finishPayload._tab_switch_log?.events?.some((ev) => ev.type === "visibility_hidden")).toBe(true);
  });

  test("should show error alert when tracking code or token is unavailable", async ({ page }) => {
    await page.goto("/assessment/unknown-assessment-token");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByRole("alert")).toContainText(/الاختبار غير متاح|Assessment unavailable/i);
  });
});
