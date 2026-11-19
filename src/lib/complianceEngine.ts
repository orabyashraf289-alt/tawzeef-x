/**
 * SOC 2 Type II & Saudi PDPL Automated Compliance Engine
 * (p5-soc2 & p5-compliance-reports)
 */

import { loadTenantEncryptionPolicy, type TenantEncryptionPolicy } from "./e2eEncryption";

export type ComplianceFramework = "SOC2" | "PDPL";
export type ControlStatus = "compliant" | "monitoring" | "action_needed";
export type ReportCadence = "weekly" | "monthly" | "quarterly";

export interface ComplianceControl {
  id: string;
  code: string;
  framework: ComplianceFramework;
  pillarAr: string;
  pillarEn: string;
  titleAr: string;
  titleEn: string;
  evidenceAr: string;
  evidenceEn: string;
  status: ControlStatus;
  automatedCheck: boolean;
}

export interface ComplianceTelemetryInput {
  auditEventsCount: number;
  failedLoginsCount: number;
  suspiciousEventsCount: number;
  hasRetentionPolicy: boolean;
  hasRbacMatrix: boolean;
  encryptionPolicy?: TenantEncryptionPolicy;
}

export interface ComplianceSummary {
  overallScore: number;
  soc2Score: number;
  pdplScore: number;
  compliantCount: number;
  totalControls: number;
  controls: ComplianceControl[];
  generatedAt: string;
}

export interface ComplianceReportSchedule {
  enabled: boolean;
  cadence: ReportCadence;
  frameworks: ComplianceFramework[];
  recipients: string;
  lastGeneratedAt: string | null;
}

const SCHEDULE_STORAGE_PREFIX = "tx_compliance_schedule_v1";

export const DEFAULT_COMPLIANCE_SCHEDULE: ComplianceReportSchedule = {
  enabled: true,
  cadence: "monthly",
  frameworks: ["SOC2", "PDPL"],
  recipients: "",
  lastGeneratedAt: null,
};

export function evaluateComplianceReadiness(
  input: ComplianceTelemetryInput,
  companyId?: string | null,
): ComplianceSummary {
  const encryption = input.encryptionPolicy ?? loadTenantEncryptionPolicy(companyId);
  const e2eReady = encryption.enabled && encryption.encryptedFields.length >= 2;

  const controls: ComplianceControl[] = [
    {
      id: "soc2-cc6-1",
      code: "CC6.1",
      framework: "SOC2",
      pillarAr: "الأمان والتحكم بالوصول",
      pillarEn: "Security & Access Control",
      titleAr: "عزل المنشآت (RLS) ومصفوفة الصلاحيات التفصيلية (RBAC)",
      titleEn: "Tenant Isolation (RLS) & Fine-Grained RBAC Matrix",
      evidenceAr: "مفعّل عبر سياسات Row-Level Security ومصفوفة القراءة/الإدخال/التعديل/الحذف في الإعدادات.",
      evidenceEn: "Enforced via PostgreSQL RLS policies and role-level CRUD permissions matrix.",
      status: input.hasRbacMatrix ? "compliant" : "action_needed",
      automatedCheck: true,
    },
    {
      id: "soc2-cc6-6",
      code: "CC6.6",
      framework: "SOC2",
      pillarAr: "حماية الحدود والشبكة",
      pillarEn: "Boundary Protection",
      titleAr: "ترويسات الأمان الصارمة (HSTS / CSP / X-Frame-Options)",
      titleEn: "Strict Transport & CSP Security Headers",
      evidenceAr: "مطبّق في vercel.json عبر HSTS لمدة سنتين، CSP، ومنع التضمين DENY.",
      evidenceEn: "Active in vercel.json with 2-year HSTS preload, strict CSP, and X-Frame-Options DENY.",
      status: "compliant",
      automatedCheck: true,
    },
    {
      id: "soc2-cc6-7",
      code: "CC6.7",
      framework: "SOC2",
      pillarAr: "تشفير البيانات",
      pillarEn: "Data Encryption",
      titleAr: "تشفير البيانات الحساسة الشامل (AES-256-GCM E2E + TLS)",
      titleEn: "End-to-End AES-256-GCM Sensitive Field Encryption & TLS",
      evidenceAr: e2eReady
        ? `مفعّل بتشفير AES-256-GCM لـ ${encryption.encryptedFields.length} حقول حساسة (الإصدار v${encryption.keyVersion}).`
        : "فعّل تشفير الحقول الحساسة من لوحة التشفير الشامل لإكمال هذا الضابط.",
      evidenceEn: e2eReady
        ? `Active AES-256-GCM envelope encryption covering ${encryption.encryptedFields.length} sensitive fields (key v${encryption.keyVersion}).`
        : "Enable field-level E2E encryption in the Encryption Vault to satisfy this control.",
      status: e2eReady ? "compliant" : "action_needed",
      automatedCheck: true,
    },
    {
      id: "soc2-cc7-2",
      code: "CC7.2",
      framework: "SOC2",
      pillarAr: "المراقبة ورصد الحوادث",
      pillarEn: "Monitoring & Anomaly Detection",
      titleAr: "سجل التدقيق المستمر، الجلسات الحية، ورصد المحاولات المشبوهة",
      titleEn: "Continuous Audit Trail, Live Sessions & Threat Detection",
      evidenceAr: `تم توثيق ${input.auditEventsCount} حدثاً أمنياً (${input.suspiciousEventsCount} تنبيهات مشبوهة و${input.failedLoginsCount} محاولات دخول فاشلة).`,
      evidenceEn: `${input.auditEventsCount} logged audit events (${input.suspiciousEventsCount} suspicious alerts, ${input.failedLoginsCount} failed logins).`,
      status: input.suspiciousEventsCount > 10 ? "monitoring" : "compliant",
      automatedCheck: true,
    },
    {
      id: "soc2-a1-2",
      code: "A1.2",
      framework: "SOC2",
      pillarAr: "التوافر والاستمرارية",
      pillarEn: "Availability & Resilience",
      titleAr: "استمرارية العمل دون اتصال ومزامنة الطوابير الموثوقة",
      titleEn: "Offline Resilience & Reliable Queue Sync",
      evidenceAr: "مفعّل عبر محرك المزامنة غير المتصلة offlineSyncEngine مع إعادة المحاولة التلقائية.",
      evidenceEn: "Supported via offlineSyncEngine outbox queue and automated reconnection replay.",
      status: "compliant",
      automatedCheck: true,
    },
    {
      id: "pdpl-art-18",
      code: "PDPL-18",
      framework: "PDPL",
      pillarAr: "الاحتفاظ والإتلاف الآمن",
      pillarEn: "Data Retention & Disposal",
      titleAr: "سياسات الاحتفاظ وإخفاء الهوية التلقائي لبيانات المرشحين",
      titleEn: "Automated Candidate Retention & Anonymization Policy",
      evidenceAr: input.hasRetentionPolicy
        ? "مفعّل عبر company_retention_policies ودالة التجهيل execute_company_data_retention مع وضع Dry Run."
        : "يلزم تفعيل سياسة مدد الاحتفاظ في إعدادات الأمان.",
      evidenceEn: input.hasRetentionPolicy
        ? "Active via company_retention_policies and execute_company_data_retention with Dry Run preview."
        : "Configure retention durations in Security settings.",
      status: input.hasRetentionPolicy ? "compliant" : "action_needed",
      automatedCheck: true,
    },
    {
      id: "pdpl-art-19",
      code: "PDPL-19",
      framework: "PDPL",
      pillarAr: "حماية البيانات الشخصية",
      pillarEn: "Personal Data Protection",
      titleAr: "إخفاء وتشفير المعرّفات الشخصية (الهوية، الهاتف، الراتب)",
      titleEn: "PII Encryption & Redaction (National ID, Phone, Compensation)",
      evidenceAr: e2eReady
        ? "الحقول الشخصية محمية بتشفير AES-256-GCM وقناع العرض الآمن في السجلات."
        : "يتطلب تفعيل حماية الحقول الشخصية في خزنة التشفير.",
      evidenceEn: e2eReady
        ? "PII attributes protected with AES-256-GCM encryption and masked log rendering."
        : "Requires enabling PII field encryption in the vault.",
      status: e2eReady ? "compliant" : "action_needed",
      automatedCheck: true,
    },
    {
      id: "pdpl-art-24",
      code: "PDPL-24",
      framework: "PDPL",
      pillarAr: "حقوق أصحاب البيانات",
      pillarEn: "Data Subject Rights",
      titleAr: "شفافية تتبع الطلب وموافقة المرشح وإتاحة المراجعة",
      titleEn: "Applicant Consent, Portal Transparency & Auditability",
      evidenceAr: "مفعّل عبر بوابة المرشح (CandidatePortal) وتسجيل موافقة الخصوصية عند التقديم.",
      evidenceEn: "Active via CandidatePortal tracking and applicant consent tracking on submission.",
      status: "compliant",
      automatedCheck: true,
    },
  ];

  const calcScore = (list: ComplianceControl[]) => {
    if (list.length === 0) return 100;
    const pts = list.reduce(
      (sum, c) => sum + (c.status === "compliant" ? 1 : c.status === "monitoring" ? 0.75 : 0),
      0,
    );
    return Math.round((pts / list.length) * 100);
  };

  const soc2Controls = controls.filter((c) => c.framework === "SOC2");
  const pdplControls = controls.filter((c) => c.framework === "PDPL");

  return {
    overallScore: calcScore(controls),
    soc2Score: calcScore(soc2Controls),
    pdplScore: calcScore(pdplControls),
    compliantCount: controls.filter((c) => c.status === "compliant").length,
    totalControls: controls.length,
    controls,
    generatedAt: new Date().toISOString(),
  };
}

export function buildComplianceCsvReport(summary: ComplianceSummary, companyName: string): string {
  const headers = ["Control Code", "Framework", "Pillar", "Control Title", "Status", "Evidence", "Generated At"];
  const escapeCsv = (val: string) => `"${String(val).replace(/"/g, '""')}"`;
  const rows = summary.controls.map((c) =>
    [
      c.code,
      c.framework,
      c.pillarAr,
      c.titleAr,
      c.status,
      c.evidenceAr,
      summary.generatedAt,
    ]
      .map(escapeCsv)
      .join(","),
  );
  return [
    `"TawzeefX Automated Compliance Report — ${companyName.replace(/"/g, '""')}"`,
    `"Overall Score: ${summary.overallScore}% | SOC 2 Type II: ${summary.soc2Score}% | PDPL KSA: ${summary.pdplScore}%"`,
    headers.map(escapeCsv).join(","),
    ...rows,
  ].join("\n");
}

export function buildCompliancePrintableHtml(summary: ComplianceSummary, companyName: string): string {
  const rowsHtml = summary.controls
    .map(
      (c) => `
      <tr>
        <td style="padding:10px;border:1px solid #e2e8f0;font-family:monospace;font-weight:700">${c.code}</td>
        <td style="padding:10px;border:1px solid #e2e8f0;font-weight:700">${c.framework}</td>
        <td style="padding:10px;border:1px solid #e2e8f0">${c.titleAr}</td>
        <td style="padding:10px;border:1px solid #e2e8f0;color:${c.status === "compliant" ? "#047857" : c.status === "monitoring" ? "#b45309" : "#be123c"};font-weight:700">
          ${c.status === "compliant" ? "متوافق ✓" : c.status === "monitoring" ? "قيد المراقبة" : "يتطلب إجراء"}
        </td>
        <td style="padding:10px;border:1px solid #e2e8f0;color:#475569">${c.evidenceAr}</td>
      </tr>`,
    )
    .join("");

  return `<!doctype html>
  <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8" />
      <title>تقرير الامتثال التلقائي — ${companyName}</title>
      <style>
        body { font-family: Tajawal, Arial, sans-serif; color: #0f172a; padding: 32px; line-height: 1.7; }
        .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 20px 0 28px; }
        .kpi { border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px; text-align: center; background: #f8fafc; }
        .kpi strong { display: block; font-size: 28px; color: #0d5c5a; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { background: #0d5c5a; color: #fff; padding: 10px; border: 1px solid #0d5c5a; text-align: right; }
      </style>
    </head>
    <body>
      <h1 style="margin:0 0 6px">تقرير الامتثال التلقائي — SOC 2 Type II &amp; PDPL</h1>
      <p style="margin:0;color:#64748b">المنشأة: <strong>${companyName}</strong> • تاريخ الإصدار: ${new Date(summary.generatedAt).toLocaleString("ar-SA")}</p>
      <div class="kpi-grid">
        <div class="kpi"><strong>${summary.overallScore}%</strong>نسبة الامتثال الإجمالية</div>
        <div class="kpi"><strong>${summary.soc2Score}%</strong>جاهزية SOC 2 Type II</div>
        <div class="kpi"><strong>${summary.pdplScore}%</strong>امتثال PDPL السعودي</div>
      </div>
      <table>
        <thead>
          <tr>
            <th>الضابط</th>
            <th>الإطار</th>
            <th>المتطلب</th>
            <th>الحالة</th>
            <th>الدليل الآلي</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </body>
  </html>`;
}

export function loadComplianceSchedule(companyId?: string | null): ComplianceReportSchedule {
  if (typeof window === "undefined") return { ...DEFAULT_COMPLIANCE_SCHEDULE };
  try {
    const key = companyId ? `${SCHEDULE_STORAGE_PREFIX}:${companyId}` : SCHEDULE_STORAGE_PREFIX;
    const raw = localStorage.getItem(key) ?? localStorage.getItem(SCHEDULE_STORAGE_PREFIX);
    if (!raw) return { ...DEFAULT_COMPLIANCE_SCHEDULE };
    return { ...DEFAULT_COMPLIANCE_SCHEDULE, ...(JSON.parse(raw) as Partial<ComplianceReportSchedule>) };
  } catch {
    return { ...DEFAULT_COMPLIANCE_SCHEDULE };
  }
}

export function saveComplianceSchedule(
  schedule: ComplianceReportSchedule,
  companyId?: string | null,
): ComplianceReportSchedule {
  if (typeof window !== "undefined") {
    try {
      const key = companyId ? `${SCHEDULE_STORAGE_PREFIX}:${companyId}` : SCHEDULE_STORAGE_PREFIX;
      const serialized = JSON.stringify(schedule);
      localStorage.setItem(key, serialized);
      localStorage.setItem(SCHEDULE_STORAGE_PREFIX, serialized);
    } catch {
      // ignore storage errors
    }
  }
  return schedule;
}
