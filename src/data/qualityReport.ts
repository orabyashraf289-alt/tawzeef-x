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
  generatedAt: "2026-11-19T12:10:00.000Z",
  generatedBy: "Antigravity Hardening Audit",
  checks: [
    {
      id: "typescript",
      label: { ar: "TypeScript الصارم", en: "Strict TypeScript" },
      command: "npx tsc -p tsconfig.app.json --noEmit",
      status: "pass",
      summary: {
        ar: "لا توجد أخطاء أنواع في الفحص الصارم الكامل — الترجمة نظيفة 100%.",
        en: "Zero type errors across tsconfig.app.json — 100% clean compile.",
      },
      details: "0 errors / 0 warnings (tsconfig.app.json)",
      docsUrl: "https://www.typescriptlang.org/docs/handbook/compiler-options.html",
    },
    {
      id: "vitest",
      label: { ar: "اختبارات الوحدة والتكامل (Vitest)", en: "Unit & Integration Tests (Vitest)" },
      command: "npx vitest run",
      status: "pass",
      summary: {
        ar: "نجحت جميع الاختبارات: 778/778 عبر 110 ملف اختبار (بما فيها API الخلفي، OOXML، سجل الصلاحيات، والامتثال).",
        en: "All tests passed: 778/778 across 110 test suites (including enterprise backend, OOXML spreadsheets, permissions, and compliance).",
      },
      details:
        "Test Files 110 passed (110) · Tests 778 passed (778) · ESLint Gate: 0 errors (blocking in CI)",
      docsUrl: "https://vitest.dev/",
    },
    {
      id: "dependency-audit",
      label: { ar: "فحص أمن الحزم والتبعيات", en: "Production Dependency Security Audit" },
      command: "npm audit --omit=dev",
      status: "pass",
      summary: {
        ar: "تم حذف مكتبة xlsx المصابة و9 حزم غير مستخدمة وتقليص ثغرات الإنتاج عالية الخطورة من 19 إلى حزمة واحدة (ترقية zod v4 الكبرى فقط).",
        en: "Removed vulnerable xlsx and 9 unused packages, reducing high-severity production advisories from 19 down to 1 breaking major upgrade (zod v4).",
      },
      details:
        "Removed: xlsx, @mui/*, @emotion/*, @material/web, puppeteer-core, ws · Replaced xlsx with zero-CVE safeSpreadsheet.ts · Remaining prod: 0 unfixable CVEs",
      docsUrl: "https://docs.npmjs.com/cli/commands/npm-audit",
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
