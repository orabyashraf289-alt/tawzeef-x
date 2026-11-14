import { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage.pom";

export class AuthPagePom extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly fullNameInput: Locator;
  readonly companyNameInput: Locator;
  readonly submitButton: Locator;
  readonly switchToSignupButton: Locator;
  readonly switchToLoginButton: Locator;
  readonly forgotPasswordLink: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.locator("#auth-email, input[type='email']").first();
    this.passwordInput = page.locator("#auth-password, input[type='password']").first();
    this.fullNameInput = page.locator("#auth-fullname");
    this.companyNameInput = page.locator("#auth-company");
    this.submitButton = page.locator("button[type='submit']");
    this.switchToSignupButton = page.getByRole("button", { name: /إنشاء حساب جهة توظيف/i });
    this.switchToLoginButton = page.getByRole("button", { name: /سجّل دخولك/i });
    this.forgotPasswordLink = page.getByRole("link", { name: /نسيت كلمة المرور/i });
  }

  async navigate() {
    await this.goto("/auth");
    await this.waitForPageLoad();
  }

  async login(email: string, pass: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(pass);
    await this.submitButton.click();
  }

  async switchToSignup() {
    await this.switchToSignupButton.click();
  }

  async switchToLogin() {
    await this.switchToLoginButton.click();
  }
}
