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
        ar: "نجحت جميع الاختبارات: 770/770 عبر 108 ملف اختبار (بما فيها سجل الصلاحيات والامتثال والتشفير).",
        en: "All tests passed: 770/770 across 108 test suites (including permissions, compliance, and E2E encryption).",
      },
      details:
        "Test Files 108 passed (108) · Tests 770 passed (770) · 100% Deny-by-Default route coverage",
      docsUrl: "https://vitest.dev/",
    },
    {
      id: "dependency-audit",
      label: { ar: "فحص أمن الحزم والتبعيات", en: "Production Dependency Security Audit" },
      command: "npm audit --omit=dev",
      status: "warn",
      summary: {
        ar: "تم تقليص الثغرات عالية الخطورة من 19 إلى 3 عبر تحديثات غير كاسرة (المتبقي يتطلب ترقيات كبرى لـ zod v4 و xlsx بدون إصلاح رسمي).",
        en: "Reduced high-severity production advisories from 19 to 3 via non-breaking lockfile patches (remaining require breaking major upgrades or upstream xlsx fix).",
      },
      details:
        "Patched: pdfjs-dist, dompurify, lodash, rollup, postcss, nanoid, source-map-js, @xmldom/xmldom, @remix-run/router, yaml · Remaining prod: 3 high (xlsx, zod<4.6.6), 6 moderate",
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
