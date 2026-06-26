/**
 * Latest code-quality snapshot.
 * Update this file after each manual run of:
 *   - npx tsc --noEmit
 *   - bunx vitest run
 *   - supabase linter
 *   - security scan
 */

export interface QualityCheck {
  id: string;
  label: { ar: string; en: string };
  command: string;
  status: "pass" | "warn" | "fail";
  summary: { ar: string; en: string };
  details?: string;
  docsUrl?: string;
}

export interface QualityReport {
  generatedAt: string; // ISO
  generatedBy: string;
  checks: QualityCheck[];
}

export const QUALITY_REPORT: QualityReport = {
  generatedAt: "2026-06-14T21:38:00.000Z",
  generatedBy: "Lovable Agent",
  checks: [
    {
      id: "typescript",
      label: { ar: "TypeScript", en: "TypeScript" },
      command: "npx tsc --noEmit",
      status: "pass",
      summary: {
        ar: "لا توجد أخطاء أنواع — الترجمة نظيفة.",
        en: "No type errors — clean compile.",
      },
      details: "0 errors / 0 warnings",
      docsUrl: "https://www.typescriptlang.org/docs/handbook/compiler-options.html",
    },
    {
      id: "vitest",
      label: { ar: "اختبارات الوحدة (Vitest)", en: "Unit Tests (Vitest)" },
      command: "bunx vitest run",
      status: "pass",
      summary: {
        ar: "نجحت جميع الاختبارات: 158/158 في 13 ملف.",
        en: "All tests passed: 158/158 across 13 files.",
      },
      details:
        "Test Files 13 passed (13) · Tests 158 passed (158) · Duration ~8s",
      docsUrl: "https://vitest.dev/",
    },
    {
      id: "supabase-linter",
      label: { ar: "Supabase Linter", en: "Supabase Linter" },
      command: "supabase linter",
      status: "warn",
      summary: {
        ar:
          "22 تحذيراً من نوع SECURITY DEFINER، جميعها متعمّدة وموثّقة (دوال RLS مساعدة و RPCs عامة آمنة).",
        en:
          "22 SECURITY DEFINER warnings, all intentional and documented (RLS helper functions and safe public RPCs).",
      },
      details:
        "0 ERRORS · 22 WARNs (SECURITY DEFINER intentional: has_role, has_company_access, has_agency_access, get_offer_by_token, respond_to_offer, start_assessment_response, accept/decline_company_invitation …)",
      docsUrl:
        "https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable",
    },
    {
      id: "rls-coverage",
      label: { ar: "تفعيل RLS", en: "RLS Coverage" },
      command: "SELECT … FROM pg_tables WHERE rowsecurity = false",
      status: "pass",
      summary: {
        ar: "جميع جداول public مفعّل عليها RLS (49/49).",
        en: "All public tables have RLS enabled (49/49).",
      },
      details: "0 tables without RLS",
      docsUrl: "https://supabase.com/docs/guides/auth/row-level-security",
    },
    {
      id: "security-scan",
      label: { ar: "فحص الأمان", en: "Security Scan" },
      command: "security run_security_scan",
      status: "warn",
      summary: {
        ar:
          "27 نتيجة (تحذيرات SECURITY DEFINER فقط) — لا توجد ثغرات RLS أو GRANT.",
        en:
          "27 findings (SECURITY DEFINER warnings only) — no RLS or GRANT vulnerabilities.",
      },
      details: "0 critical · 0 high · 27 warn (all reviewed and accepted)",
      docsUrl: "https://supabase.com/docs/guides/database/postgres/row-level-security",
    },
  ],
};

export function reportStatus(r: QualityReport): "pass" | "warn" | "fail" {
  if (r.checks.some((c) => c.status === "fail")) return "fail";
  if (r.checks.some((c) => c.status === "warn")) return "warn";
  return "pass";
}
