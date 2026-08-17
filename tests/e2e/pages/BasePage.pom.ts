import { Page, Locator } from "@playwright/test";

export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(path = "/") {
    await this.page.goto(path);
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState("domcontentloaded");
  }

  async isRTL(): Promise<boolean> {
    const dir = await this.page.locator("html").getAttribute("dir");
    return dir === "rtl";
  }

  async getToast(): Promise<Locator> {
    return this.page.locator("[data-sonner-toast], [role='status'], [role='alert']");
  }
}
