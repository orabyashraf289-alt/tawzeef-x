import { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage.pom";

export class CandidateApplyPagePom extends BasePage {
  readonly fullNameInput: Locator;
  readonly emailInput: Locator;
  readonly phoneInput: Locator;
  readonly resumeFileInput: Locator;
  readonly submitButton: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.fullNameInput = page.locator("input[name='fullName'], input#fullName");
    this.emailInput = page.locator("input[type='email']");
    this.phoneInput = page.locator("input[type='tel']");
    this.resumeFileInput = page.locator("input[type='file']");
    this.submitButton = page.locator("button[type='submit']");
    this.successMessage = page.locator("[data-testid='apply-success'], .success-card");
  }

  async navigateToJob(jobId: string) {
    await this.goto(`/apply/${jobId}`);
    await this.waitForPageLoad();
  }
}
