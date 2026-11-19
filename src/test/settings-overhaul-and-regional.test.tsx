import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  convertCurrency,
  DEFAULT_REGIONAL_SETTINGS,
  formatRegionalCurrency,
  formatRegionalDate,
  loadRegionalSettings,
  saveRegionalSettings,
} from "@/lib/regionalSettings";
import {
  buildSettingsGroups,
  buildSettingsTabs,
  matchesSettingsQuery,
} from "@/components/settings/settingsTabs";
import { SettingsSidebar } from "@/components/settings/SettingsSidebar";
import { RegionalSettingsSection } from "@/components/settings/RegionalSettingsSection";

vi.mock("@/contexts/I18nContext", () => ({
  useI18n: () => ({
    locale: "ar",
    setLocale: vi.fn(),
    t: (k: string) => k,
  }),
}));

vi.mock("@/contexts/CompanyContext", () => ({
  useCompany: () => ({
    activeCompanyId: "company-test-1",
    activeCompany: { id: "company-test-1", name: "توظيف إكس" },
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

describe("Settings overhaul, smart search, and regional customization", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("converts and formats currencies accurately across SAR, USD, AED, and EGP", () => {
    expect(convertCurrency(10000, "SAR", "SAR")).toBe(10000);
    expect(convertCurrency(10000, "SAR", "USD")).toBe(2667);
    expect(convertCurrency(10000, "SAR", "AED")).toBe(9790);
    expect(convertCurrency(1000, "SAR", "EGP")).toBe(13150);

    const usdFormatted = formatRegionalCurrency(2667, "USD", "en");
    expect(usdFormatted).toContain("$");
    expect(usdFormatted).toContain("2,667");

    const sarFormatted = formatRegionalCurrency(15000, "SAR", "ar");
    expect(sarFormatted).toContain("ر.س");
  });

  it("formats Gregorian, Hijri (Umm al-Qura), and Dual dates cleanly", () => {
    const sample = new Date("2026-11-19T09:00:00Z");
    const greg = formatRegionalDate(sample, "gregorian", "en", "Asia/Riyadh");
    const hijri = formatRegionalDate(sample, "hijri", "en", "Asia/Riyadh");
    const dual = formatRegionalDate(sample, "both", "en", "Asia/Riyadh");

    expect(greg).toContain("2026");
    expect(hijri.length).toBeGreaterThan(5);
    expect(dual).toContain("(");
    expect(dual).toContain(")");
    expect(dual).toContain(greg);
  });

  it("persists and reloads per-company regional settings safely", () => {
    expect(loadRegionalSettings("company-test-1")).toEqual(DEFAULT_REGIONAL_SETTINGS);

    saveRegionalSettings(
      {
        calendarMode: "hijri",
        currency: "AED",
        autoConvertSalaries: false,
        timezone: "Asia/Dubai",
        workweek: "mon-fri",
      },
      "company-test-1",
    );

    const reloaded = loadRegionalSettings("company-test-1");
    expect(reloaded.calendarMode).toBe("hijri");
    expect(reloaded.currency).toBe("AED");
    expect(reloaded.autoConvertSalaries).toBe(false);
    expect(reloaded.timezone).toBe("Asia/Dubai");
    expect(reloaded.workweek).toBe("mon-fri");
    expect(reloaded.updatedAt).toBeTruthy();
  });

  it("filters tabs by user role and localizes every tab cleanly in English", () => {
    const t = (key: string) => key;
    const superTabs = buildSettingsTabs({ t, locale: "en", isPlatformSuperAdmin: true, role: "admin" });
    const reviewerTabs = buildSettingsTabs({ t, locale: "en", isPlatformSuperAdmin: false, role: "reviewer" });
    const recruiterTabs = buildSettingsTabs({ t, locale: "en", isPlatformSuperAdmin: false, role: "recruiter" });

    expect(superTabs.some((tab) => tab.id === "public-contact")).toBe(true);
    expect(superTabs.some((tab) => tab.id === "regional")).toBe(true);
    expect(superTabs.some((tab) => tab.id === "marketplace")).toBe(true);

    // Every English tab label should contain zero Arabic characters
    for (const tab of superTabs) {
      expect(/[\u0600-\u06FF]/.test(tab.label)).toBe(false);
    }

    // Reviewers should not see admin-only governance/billing/API/HRIS tabs
    expect(reviewerTabs.some((tab) => tab.id === "permissions_matrix")).toBe(false);
    expect(reviewerTabs.some((tab) => tab.id === "api")).toBe(false);
    expect(reviewerTabs.some((tab) => tab.id === "hris")).toBe(false);
    expect(reviewerTabs.some((tab) => tab.id === "subscription")).toBe(false);
    expect(reviewerTabs.some((tab) => tab.id === "account")).toBe(true);
    expect(reviewerTabs.some((tab) => tab.id === "preferences")).toBe(true);

    // Recruiters see recruitment & marketplace tabs but not RBAC/API/HRIS/Billing
    expect(recruiterTabs.some((tab) => tab.id === "regional")).toBe(true);
    expect(recruiterTabs.some((tab) => tab.id === "marketplace")).toBe(true);
    expect(recruiterTabs.some((tab) => tab.id === "permissions_matrix")).toBe(false);
  });

  it("matches settings tabs by hidden keywords in SettingsSidebar", () => {
    const t = (key: string) => key;
    const tabs = buildSettingsTabs({ t, locale: "ar", isPlatformSuperAdmin: false, role: "admin" });
    const groups = buildSettingsGroups({ locale: "ar", isPlatformSuperAdmin: false });

    const emailTab = tabs.find((tab) => tab.id === "email")!;
    const regionalTab = tabs.find((tab) => tab.id === "regional")!;
    expect(matchesSettingsQuery(emailTab, "smtp")).toBe(true);
    expect(matchesSettingsQuery(regionalTab, "أم القرى")).toBe(true);

    render(
      <SettingsSidebar
        tabs={tabs}
        groups={groups}
        activeTab="account"
        searchQuery="SMTP"
        onSearchChange={vi.fn()}
        onTabChange={vi.fn()}
        locale="ar"
      />,
    );

    expect(screen.getByText("settings.email")).toBeInTheDocument();
    expect(screen.queryByText("الفلاتر المحفوظة")).not.toBeInTheDocument();
  });

  it("lets users switch calendar mode and currency in RegionalSettingsSection with live preview", () => {
    render(<RegionalSettingsSection />);

    expect(screen.getByTestId("regional-date-preview").textContent).toBeTruthy();
    const initialSalary = screen.getByTestId("converted-primary-salary").textContent;
    expect(initialSalary).toContain("ر.س");

    fireEvent.click(screen.getByRole("button", { name: /USD/i }));
    expect(screen.getByTestId("converted-primary-salary").textContent).toContain("$");
    expect(loadRegionalSettings("company-test-1").currency).toBe("USD");
  });
});
