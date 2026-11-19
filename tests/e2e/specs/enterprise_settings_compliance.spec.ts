import { test, expect } from "@playwright/test";
import { seedAuthSession, setupSupabaseMocks } from "../fixtures/supabaseMockHelper";
import { mockUser } from "../fixtures/mockData";

test.describe("Enterprise Overhaul — Settings, Regionalization, Contracts & Compliance", () => {
  test.beforeEach(async ({ page }) => {
    await setupSupabaseMocks(page, { role: "admin", isSuperAdmin: true });
    await seedAuthSession(page, mockUser);
  });

  test("renders redesigned Settings navigation, regional Hijri/currency controls, and 4-language switcher", async ({ page }) => {
    await page.goto("/settings?tab=regional", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByText(/التخصيص الإقليمي|Regional Customization/i).first(),
    ).toBeVisible({ timeout: 15000 });

    // Switch currency button to AED and confirm live conversion preview updates
    const aedBtn = page.getByRole("button", { name: /AED|درهم إماراتي/i }).first();
    await expect(aedBtn).toBeVisible({ timeout: 8000 });
    await aedBtn.click();

    // Navigate to Preferences tab via sidebar button (no full reload needed)
    const prefsBtn = page.getByRole("button", { name: /المظهر واللغة والتفضيلات|Preferences/i }).first();
    await expect(prefsBtn).toBeVisible({ timeout: 8000 });
    await prefsBtn.click();

    await expect(page.getByRole("button", { name: /Français/i }).first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole("button", { name: /اردو/i }).first()).toBeVisible({ timeout: 6000 });

    // Switch to French (LTR) and verify document dir updates
    await page.getByRole("button", { name: /Français/i }).first().click();
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");

    // Switch back to Arabic (RTL)
    await page.getByRole("button", { name: /العربية/i }).first().click();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  });

  test("manages scoped API keys inside Developer API Hub", async ({ page }) => {
    await page.goto("/settings?tab=api", { waitUntil: "domcontentloaded" });

    await expect(page.getByText(/بوابة المطورين|Public Recruitment API/i).first()).toBeVisible({ timeout: 15000 });

    const createBtn = page.getByRole("button", { name: /إنشاء مفتاح API جديد/i }).first();
    await expect(createBtn).toBeVisible({ timeout: 8000 });
    await createBtn.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByPlaceholder(/موقع التوظيف الخارجي/i).fill("ERP Integration E2E");
    await dialog.getByRole("button", { name: /توليد المفتاح الآن/i }).click();

    await expect(page.getByText(/احفظ مفتاح الـ API الآن/i)).toBeVisible({ timeout: 8000 });
    await expect(page.locator('input[value^="tx_live_"]')).toBeVisible();
  });

  test("switches regional legal contract templates inside Offers workspace", async ({ page }) => {
    await page.goto("/offers", { waitUntil: "domcontentloaded" });

    const contractsBtn = page.getByRole("button", { name: /قوالب العقود|Contracts/i }).first();
    await expect(contractsBtn).toBeVisible({ timeout: 15000 });
    await contractsBtn.click();

    await expect(page.getByText(/قوى|Qiwa|MOHRE/i).first()).toBeVisible({ timeout: 10000 });
  });

  test("opens SOC 2 / PDPL Compliance Center and executes live AES-256-GCM sandbox inside Audit Log", async ({ page }) => {
    await page.goto("/audit-log", { waitUntil: "domcontentloaded" });

    const complianceBtn = page.getByRole("button", { name: /مركز الامتثال|Compliance/i }).first();
    await expect(complianceBtn).toBeVisible({ timeout: 15000 });
    await complianceBtn.click();

    await expect(page.getByText(/SOC 2 Type II/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/PDPL/i).first()).toBeVisible();

    // Open E2E AES-256-GCM Vault tab and verify live browser Web Crypto round-trip
    const encryptionTab = page.getByRole("tab", { name: /التشفير|Encryption/i }).first();
    await expect(encryptionTab).toBeVisible({ timeout: 8000 });
    await encryptionTab.click();

    const encryptBtn = page.getByRole("button", { name: /تشفير AES-256-GCM|Encrypt AES-256-GCM/i }).first();
    await expect(encryptBtn).toBeVisible({ timeout: 8000 });
    await encryptBtn.click();

    await expect(page.getByTestId("e2e-cipher-output")).toContainText("TXENC:v1:", { timeout: 8000 });

    const decryptBtn = page.getByRole("button", { name: /فك التشفير والتحقق|Decrypt & Verify/i }).first();
    await decryptBtn.click();
    await expect(page.getByTestId("e2e-decrypted-output")).toContainText("1098456321", { timeout: 8000 });
  });
});
