import { beforeEach, describe, expect, it } from "vitest";
import {
  decryptSensitiveFields,
  decryptSensitiveValue,
  ENCRYPTION_ENVELOPE_PREFIX,
  encryptSensitiveFields,
  encryptSensitiveValue,
  isEncryptedEnvelope,
  maskSensitiveValue,
} from "@/lib/e2eEncryption";
import {
  buildComplianceCsvReport,
  buildCompliancePrintableHtml,
  evaluateComplianceReadiness,
  loadComplianceSchedule,
  saveComplianceSchedule,
} from "@/lib/complianceEngine";
import {
  buildPrintableContractHtml,
  REGIONAL_CONTRACT_TEMPLATES,
  renderRegionalContract,
} from "@/lib/regionalContractTemplates";
import {
  getLocaleDirection,
  isSupportedLocale,
  SUPPORTED_LOCALES,
} from "@/contexts/I18nContext";
import fr from "@/i18n/fr";
import ur from "@/i18n/ur";

describe("Track 1 — E2E AES-256-GCM Encryption & SOC 2 / PDPL Compliance Engine", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("encrypts and decrypts sensitive values with authenticated AES-256-GCM envelopes", async () => {
    const secret = "1088776655 — راتب 22,000 ر.س";
    const passphrase = "VaultMasterKey#2026";

    const envelope = await encryptSensitiveValue(secret, passphrase);
    expect(isEncryptedEnvelope(envelope)).toBe(true);
    expect(envelope.startsWith(ENCRYPTION_ENVELOPE_PREFIX)).toBe(true);
    expect(envelope).not.toContain("1088776655");

    const recovered = await decryptSensitiveValue(envelope, passphrase);
    expect(recovered).toBe(secret);

    // Wrong passphrase must fail authenticated GCM decryption
    await expect(decryptSensitiveValue(envelope, "WrongPassword#999")).rejects.toThrow();

    // Safe log masking
    expect(maskSensitiveValue(envelope)).toContain("AES-256-GCM");
    expect(maskSensitiveValue("0501234567")).toBe("05******67");
  });

  it("encrypts and decrypts selected candidate PII fields while leaving non-sensitive fields intact", async () => {
    const candidate = {
      id: "cand-42",
      name: "فهد العتيبي",
      national_id: "1099887766",
      phone: "+966501112233",
      expected_salary: "19000 SAR",
    };

    const encrypted = await encryptSensitiveFields(
      candidate,
      ["national_id", "phone", "expected_salary"],
      "TenantPass#2026",
    );

    expect(encrypted.name).toBe("فهد العتيبي");
    expect(isEncryptedEnvelope(encrypted.national_id)).toBe(true);
    expect(isEncryptedEnvelope(encrypted.phone)).toBe(true);
    expect(isEncryptedEnvelope(encrypted.expected_salary)).toBe(true);

    const decrypted = await decryptSensitiveFields(
      encrypted,
      ["national_id", "phone", "expected_salary"],
      "TenantPass#2026",
    );
    expect(decrypted).toEqual(candidate);
  });

  it("computes SOC 2 Type II & PDPL readiness scores and exports CSV/HTML evidence reports", () => {
    const summary = evaluateComplianceReadiness({
      auditEventsCount: 420,
      failedLoginsCount: 3,
      suspiciousEventsCount: 1,
      hasRetentionPolicy: true,
      hasRbacMatrix: true,
    });

    expect(summary.overallScore).toBe(100);
    expect(summary.soc2Score).toBe(100);
    expect(summary.pdplScore).toBe(100);
    expect(summary.totalControls).toBeGreaterThanOrEqual(8);

    const csv = buildComplianceCsvReport(summary, "شركة توظيف إكس");
    expect(csv).toContain("CC6.1");
    expect(csv).toContain("PDPL-18");

    const html = buildCompliancePrintableHtml(summary, "شركة توظيف إكس");
    expect(html).toContain("SOC 2 Type II");
    expect(html).toContain("شركة توظيف إكس");

    saveComplianceSchedule(
      {
        enabled: true,
        cadence: "quarterly",
        frameworks: ["SOC2", "PDPL"],
        recipients: "dpo@tawzeefx.com",
        lastGeneratedAt: summary.generatedAt,
      },
      "comp-1",
    );
    expect(loadComplianceSchedule("comp-1").cadence).toBe("quarterly");
  });
});

describe("Track 2 — Region-Specific Legal Contract Templates", () => {
  it("renders KSA Qiwa, UAE MOHRE, Egypt Labor, and International contracts with Hijri & Currency", () => {
    expect(Object.keys(REGIONAL_CONTRACT_TEMPLATES)).toHaveLength(5);

    const ksa = renderRegionalContract(
      "KSA_QIWA",
      {
        companyName: "شركة النخبة التقنية",
        employeeName: "سارة القحطاني",
        jobTitle: "مهندسة ذكاء اصطناعي",
        workLocation: "الرياض",
        monthlySalary: 22000,
        currency: "SAR",
        startDate: "2026-12-01",
        contractMonths: 12,
        probationDays: 90,
        annualLeaveDays: 21,
        noticeDays: 60,
        calendarMode: "both",
      },
      "ar",
    );

    expect(ksa.plainText).toContain("شركة النخبة التقنية");
    expect(ksa.plainText).toContain("سارة القحطاني");
    expect(ksa.plainText).toContain("المادة 53");
    expect(ksa.formattedSalary).toContain("ر.س");
    expect(ksa.formattedStartDate).toContain("(");

    const uae = renderRegionalContract(
      "UAE_MOHRE",
      {
        companyName: "Gulf Cloud LLC",
        employeeName: "Omar Hassan",
        jobTitle: "Product Lead",
        workLocation: "Dubai, UAE",
        monthlySalary: 25000,
        currency: "AED",
        startDate: "2026-12-01",
        contractMonths: 24,
        probationDays: 180,
        annualLeaveDays: 30,
        noticeDays: 30,
      },
      "en",
    );

    expect(uae.plainText).toContain("Decree-Law 33/2021");
    expect(uae.formattedSalary).toContain("AED");

    const printable = buildPrintableContractHtml(ksa, {
      companyName: "شركة النخبة التقنية",
      employeeName: "سارة القحطاني",
      jobTitle: "مهندسة ذكاء اصطناعي",
      workLocation: "الرياض",
      monthlySalary: 22000,
      currency: "SAR",
      startDate: "2026-12-01",
      contractMonths: 12,
      probationDays: 90,
      annualLeaveDays: 21,
      noticeDays: 60,
    });
    expect(printable).toContain("التوقيع والختم");
  });
});

describe("Track 3 — French (FR) & Urdu (UR) Localization Packs", () => {
  it("supports AR, EN, FR, UR with accurate RTL/LTR direction and translated UI packs", () => {
    expect(SUPPORTED_LOCALES.map((l) => l.code)).toEqual(["ar", "en", "fr", "ur"]);
    expect(isSupportedLocale("fr")).toBe(true);
    expect(isSupportedLocale("ur")).toBe(true);
    expect(isSupportedLocale("de")).toBe(false);

    expect(getLocaleDirection("ar")).toBe("rtl");
    expect(getLocaleDirection("ur")).toBe("rtl");
    expect(getLocaleDirection("en")).toBe("ltr");
    expect(getLocaleDirection("fr")).toBe("ltr");

    expect(fr["nav.dashboard"]).toBe("Tableau de bord");
    expect(fr["nav.settings"]).toBe("Paramètres");
    expect(fr["offers.title"]).toContain("Offres");

    expect(ur["nav.dashboard"]).toBe("ڈیش بورڈ");
    expect(ur["nav.settings"]).toBe("ترتیبات");
    expect(ur["nav.candidates"]).toBe("امیدوار");
  });
});
