import { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage.pom";

export class LandingPagePom extends BasePage {
  readonly brandLogo: Locator;
  readonly heroTitle: Locator;
  readonly startFreeButton: Locator;
  readonly loginButton: Locator;
  readonly featuresSection: Locator;
  readonly pricingSection: Locator;
  readonly demoTabs: Locator;

  constructor(page: Page) {
    super(page);
    this.brandLogo = page.locator("header").getByRole("link", { name: /Tawzeef|توظيف/i }).first();
    this.heroTitle = page.locator("h1");
    this.startFreeButton = page.getByRole("link", { name: /ابدأ مجاناً|ابدأ الآن/i }).first();
    this.loginButton = page.getByRole("link", { name: /تسجيل الدخول|دخول/i }).first();
    this.featuresSection = page.locator("#features");
    this.pricingSection = page.locator("#pricing");
    this.demoTabs = page.locator("[role='tablist']");
  }

  async navigate() {
    await this.goto("/");
    await this.waitForPageLoad();
  }

  async clickLogin() {
    await this.loginButton.click();
  }

  async clickStartFree() {
    await this.startFreeButton.click();
  }
}
