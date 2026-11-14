import { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage.pom";

export class CandidateApplyPagePom extends BasePage {
  readonly skipCvButton: Locator;
  readonly fullNameInput: Locator;
  readonly emailInput: Locator;
  readonly phoneInput: Locator;
  readonly resumeFileInput: Locator;
  readonly agreeTermsCheckbox: Locator;
  readonly submitButton: Locator;
  readonly successHeading: Locator;

  constructor(page: Page) {
    super(page);
    this.skipCvButton = page.getByRole("button", { name: /المتابعة بدون سيرة ذاتية|المتابعة بإدخال البيانات يدويًا/i });
    this.fullNameInput = page.locator("input[placeholder*='محمد عبدالله'], input[placeholder*='الاسم']").first();
    this.emailInput = page.locator("input[type='email']").first();
    this.phoneInput = page.locator("input[placeholder*='966'], input[type='tel']").first();
    this.resumeFileInput = page.locator("input[type='file']");
    this.agreeTermsCheckbox = page.locator("#agree-terms");
    this.submitButton = page.getByRole("button", { name: /إرسال طلب التقديم/i });
    this.successHeading = page.getByRole("heading", { name: /تهانينا/i });
  }

  async navigateToJob(jobId: string) {
    await this.goto(`/apply/${jobId}`);
    await this.waitForPageLoad();
  }
}
