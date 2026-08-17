import { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage.pom";

export class AuthPagePom extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly tabSignup: Locator;
  readonly tabLogin: Locator;
  readonly tabOtp: Locator;
  readonly forgotPasswordLink: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.locator("input[type='email']");
    this.passwordInput = page.locator("input[type='password']");
    this.submitButton = page.locator("button[type='submit']");
    this.tabSignup = page.getByRole("tab", { name: /إنشاء حساب|حساب جديد/i });
    this.tabLogin = page.getByRole("tab", { name: /تسجيل الدخول|دخول/i });
    this.tabOtp = page.getByRole("tab", { name: /رمز التحقق|OTP/i });
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
    await this.tabSignup.click();
  }
}
