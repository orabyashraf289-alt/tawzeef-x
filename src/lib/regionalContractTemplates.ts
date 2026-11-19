/**
 * Region-Specific Employment Contract Templates Engine (p5-contracts)
 *
 * Supports statutory employment contract templates aligned with:
 * - Saudi Labor Law & Qiwa Standard Contract (KSA)
 * - Saudi Remote / Telework Regulation (KSA)
 * - UAE Federal Decree-Law No. 33/2021 (MOHRE)
 * - Egyptian Labor Law (Egypt)
 * - International Independent Contractor Agreement (Global)
 *
 * Automatically integrates Hijri/Gregorian dates and currency formatting
 * from regionalSettings.ts.
 */

import {
  formatRegionalCurrency,
  formatRegionalDate,
  type CalendarMode,
  type CurrencyCode,
} from "./regionalSettings";

export type ContractJurisdiction = "KSA_QIWA" | "KSA_REMOTE" | "UAE_MOHRE" | "EGYPT_LABOR" | "INTL_CONTRACTOR";

export interface RegionalContractTemplate {
  id: ContractJurisdiction;
  countryCode: string;
  titleAr: string;
  titleEn: string;
  lawReferenceAr: string;
  lawReferenceEn: string;
  defaultCurrency: CurrencyCode;
  defaultProbationDays: number;
  defaultAnnualLeaveDays: number;
  defaultNoticeDays: number;
  defaultWeeklyHours: number;
  clausesAr: Array<{ heading: string; body: string }>;
  clausesEn: Array<{ heading: string; body: string }>;
}

export interface ContractVariables {
  companyName: string;
  companyCr?: string;
  employeeName: string;
  employeeIdNumber?: string;
  jobTitle: string;
  department?: string;
  workLocation: string;
  monthlySalary: number;
  currency: CurrencyCode;
  startDate: string;
  contractMonths: number;
  probationDays: number;
  annualLeaveDays: number;
  noticeDays: number;
  calendarMode?: CalendarMode;
}

export const REGIONAL_CONTRACT_TEMPLATES: Record<ContractJurisdiction, RegionalContractTemplate> = {
  KSA_QIWA: {
    id: "KSA_QIWA",
    countryCode: "SA",
    titleAr: "عقد عمل سعودي موحّد (متوافق مع نظام العمل ومنصة قوى)",
    titleEn: "Saudi Standard Employment Contract (Qiwa / Saudi Labor Law)",
    lawReferenceAr: "نظام العمل السعودي (المرسوم الملكي م/51 وتعديلاته) ومنصة قوى",
    lawReferenceEn: "Saudi Labor Law (Royal Decree M/51) & Qiwa Unified Framework",
    defaultCurrency: "SAR",
    defaultProbationDays: 90,
    defaultAnnualLeaveDays: 21,
    defaultNoticeDays: 60,
    defaultWeeklyHours: 48,
    clausesAr: [
      {
        heading: "البند الأول: موضوع العقد ومقر العمل",
        body: "يُعيّن الطرف الأول ({{companyName}}) الطرف الثاني ({{employeeName}}) بوظيفة ({{jobTitle}}) في مقر العمل ({{workLocation}})، ويلتزم بأداء المهام الموكلة إليه وفق الأصول المهنية.",
      },
      {
        heading: "البند الثاني: مدة العقد وفترة التجربة (المادة 53)",
        body: "مدة هذا العقد ({{contractMonths}}) شهراً تبدأ من تاريخ المباشرة {{startDateFormatted}}، ويخضع الطرف الثاني لفترة تجربة مدتها ({{probationDays}}) يوماً (قابلة للتمديد باتفاق مكتوب بما لا يتجاوز 180 يوماً وفق المادة 53 من نظام العمل).",
      },
      {
        heading: "البند الثالث: الأجر والبدلات والتأمينات (GOSI)",
        body: "يلتزم الطرف الأول بدفع أجر شهري شامل قدره ({{salaryFormatted}}) يُحوّل عبر نظام حماية الأجور (WPS)، مع التسجيل الإلزامي في المؤسسة العامة للتأمينات الاجتماعية وتوفير التأمين الطبي وفق النظام.",
      },
      {
        heading: "البند الرابع: ساعات العمل والإجازة السنوية (المادتان 98 و109)",
        body: "ساعات العمل المعتادة 48 ساعة أسبوعياً (وتُخفض إلى 36 ساعة خلال شهر رمضان للمسلمين)، ويستحق الموظف إجازة سنوية مدفوعة الأجر مدتها ({{annualLeaveDays}}) يوماً تزاد إلى 30 يوماً بعد إتمام خمس سنوات خدمة متصلة.",
      },
      {
        heading: "البند الخامس: الإشعار وإنهاء العقد ومكافأة نهاية الخدمة",
        body: "تلتزم الجهة الراغبة في عدم التجديد أو الإنهاء بفترة إشعار مدتها ({{noticeDays}}) يوماً، وتُحتسب مكافأة نهاية الخدمة وفق المادتين 84 و85 من نظام العمل السعودي، مع الالتزام التام بسرية بيانات المنشأة.",
      },
    ],
    clausesEn: [
      {
        heading: "Article 1: Appointment & Workplace",
        body: "{{companyName}} (First Party) appoints {{employeeName}} (Second Party) as {{jobTitle}} based in {{workLocation}}.",
      },
      {
        heading: "Article 2: Term & Probation (Article 53)",
        body: "The contract term is {{contractMonths}} months starting {{startDateFormatted}}, subject to a {{probationDays}}-day probation period (extendable by mutual written agreement up to 180 days per Article 53 of the Saudi Labor Law).",
      },
      {
        heading: "Article 3: Compensation & GOSI",
        body: "Monthly gross remuneration is {{salaryFormatted}} disbursed through the Wage Protection System (WPS), plus statutory GOSI registration and cooperative medical insurance.",
      },
      {
        heading: "Article 4: Working Hours & Annual Leave",
        body: "Standard hours are 48 hours/week (36 hours during Ramadan for Muslim staff). Annual paid leave is {{annualLeaveDays}} days (rising to 30 days after 5 continuous years).",
      },
      {
        heading: "Article 5: Notice, End of Service & Confidentiality",
        body: "Termination/non-renewal requires {{noticeDays}} days written notice. End-of-service gratuity follows Articles 84–85 of the Saudi Labor Law.",
      },
    ],
  },
  KSA_REMOTE: {
    id: "KSA_REMOTE",
    countryCode: "SA",
    titleAr: "عقد عمل عن بُعد / مرن (بوابة العمل عن بُعد السعودية)",
    titleEn: "Saudi Remote / Telework Employment Contract",
    lawReferenceAr: "التنظيم الموحّد لبيئة العمل عن بُعد — وزارة الموارد البشرية (MHRSD)",
    lawReferenceEn: "MHRSD Saudi Telework Regulatory Framework",
    defaultCurrency: "SAR",
    defaultProbationDays: 90,
    defaultAnnualLeaveDays: 21,
    defaultNoticeDays: 30,
    defaultWeeklyHours: 40,
    clausesAr: [
      {
        heading: "البند الأول: نطاق العمل عن بُعد",
        body: "يؤدي الطرف الثاني ({{employeeName}}) مهام وظيفة ({{jobTitle}}) لصالح ({{companyName}}) بنظام العمل عن بُعد من ({{workLocation}}) عبر القنوات الرقمية المعتمدة.",
      },
      {
        heading: "البند الثاني: المدة والأجر الشهري",
        body: "يسري العقد لمدة ({{contractMonths}}) شهراً اعتباراً من {{startDateFormatted}} براتب شهري قدره ({{salaryFormatted}}) وفترة تجربة ({{probationDays}}) يوماً.",
      },
      {
        heading: "البند الثالث: أمن المعلومات والأدوات الرقمية",
        body: "يلتزم الموظف بسياسات الأمن السيبراني وحماية البيانات الشخصية (PDPL) عند الوصول لأنظمة المنشأة، ويستحق إجازة سنوية ({{annualLeaveDays}}) يوماً وفترة إشعار ({{noticeDays}}) يوماً.",
      },
    ],
    clausesEn: [
      {
        heading: "Article 1: Remote Work Scope",
        body: "{{employeeName}} shall perform the duties of {{jobTitle}} for {{companyName}} remotely from {{workLocation}} via authorized digital platforms.",
      },
      {
        heading: "Article 2: Term & Remuneration",
        body: "Term is {{contractMonths}} months effective {{startDateFormatted}}, with monthly compensation of {{salaryFormatted}} and {{probationDays}} days probation.",
      },
      {
        heading: "Article 3: Information Security & Leave",
        body: "Employee adheres to corporate cybersecurity and PDPL data protection rules, with {{annualLeaveDays}} days annual leave and {{noticeDays}} days notice.",
      },
    ],
  },
  UAE_MOHRE: {
    id: "UAE_MOHRE",
    countryCode: "AE",
    titleAr: "عقد عمل إماراتي محدد المدة (المرسوم بقانون 33/2021)",
    titleEn: "UAE Fixed-Term Employment Contract (MOHRE Law 33/2021)",
    lawReferenceAr: "المرسوم بقانون اتحادي رقم (33) لسنة 2021 بشأن تنظيم علاقات العمل بالإمارات",
    lawReferenceEn: "UAE Federal Decree-Law No. 33 of 2021 (MOHRE)",
    defaultCurrency: "AED",
    defaultProbationDays: 180,
    defaultAnnualLeaveDays: 30,
    defaultNoticeDays: 30,
    defaultWeeklyHours: 48,
    clausesAr: [
      {
        heading: "البند الأول: التعيين والمدة المحددة",
        body: "تعيّن شركة ({{companyName}}) الموظف ({{employeeName}}) بوظيفة ({{jobTitle}}) في ({{workLocation}}) لمدة محددة قدرها ({{contractMonths}}) شهراً تبدأ من {{startDateFormatted}}.",
      },
      {
        heading: "البند الثاني: الأجر وفترة التجربة (المادة 9)",
        body: "الأجر الشهري الإجمالي ({{salaryFormatted}})، وتُحدد فترة التجربة بـ ({{probationDays}}) يوماً بحد أقصى 6 أشهر وفق القانون الاتحادي الإماراتي.",
      },
      {
        heading: "البند الثالث: الإجازة السنوية ومكافأة نهاية الخدمة",
        body: "يستحق الموظف ({{annualLeaveDays}}) يوماً إجازة سنوية مدفوعة وفترة إشعار ({{noticeDays}}) يوماً ومكافأة نهاية خدمة وفق المادة 51 من القانون.",
      },
    ],
    clausesEn: [
      {
        heading: "Article 1: Fixed-Term Appointment",
        body: "{{companyName}} employs {{employeeName}} as {{jobTitle}} in {{workLocation}} for a fixed term of {{contractMonths}} months starting {{startDateFormatted}}.",
      },
      {
        heading: "Article 2: Compensation & Probation",
        body: "Total monthly salary is {{salaryFormatted}}, with a probation period of {{probationDays}} days (max 6 months under UAE Decree-Law 33/2021).",
      },
      {
        heading: "Article 3: Leave & Gratuity",
        body: "Entitled to {{annualLeaveDays}} calendar days annual leave, {{noticeDays}} days notice period, and statutory end-of-service gratuity.",
      },
    ],
  },
  EGYPT_LABOR: {
    id: "EGYPT_LABOR",
    countryCode: "EG",
    titleAr: "عقد عمل فردي مصري محدد المدة (قانون العمل المصري)",
    titleEn: "Egyptian Individual Employment Contract",
    lawReferenceAr: "قانون العمل المصري والتأمينات الاجتماعية",
    lawReferenceEn: "Egyptian Labor Law & Social Insurance Framework",
    defaultCurrency: "EGP",
    defaultProbationDays: 90,
    defaultAnnualLeaveDays: 21,
    defaultNoticeDays: 60,
    defaultWeeklyHours: 48,
    clausesAr: [
      {
        heading: "البند الأول: الوظيفة ومقر العمل",
        body: "يعمل الطرف الثاني ({{employeeName}}) لدى الطرف الأول ({{companyName}}) بوظيفة ({{jobTitle}}) بمقر العمل ({{workLocation}}) اعتباراً من {{startDateFormatted}} لمدة ({{contractMonths}}) شهراً.",
      },
      {
        heading: "البند الثاني: الأجر وفترة الاختبار",
        body: "يتقاضى الطرف الثاني راتباً شهرياً قدره ({{salaryFormatted}})، وتكون فترة الاختبار ({{probationDays}}) يوماً (بحد أقصى 3 أشهر) مع التأمين الاجتماعي القانوني.",
      },
      {
        heading: "البند الثالث: الإجازات والإخطار",
        body: "يستحق الموظف إجازة سنوية مدفوعة ({{annualLeaveDays}}) يوماً، ويلتزم الطرفان بفترة إخطار ({{noticeDays}}) يوماً عند الإنهاء وفق القانون.",
      },
    ],
    clausesEn: [
      {
        heading: "Article 1: Role & Term",
        body: "{{employeeName}} joins {{companyName}} as {{jobTitle}} in {{workLocation}} effective {{startDateFormatted}} for {{contractMonths}} months.",
      },
      {
        heading: "Article 2: Salary & Probation",
        body: "Monthly salary is {{salaryFormatted}} with a {{probationDays}}-day probation period (max 3 months) and statutory social insurance coverage.",
      },
      {
        heading: "Article 3: Leave & Notice",
        body: "Annual leave is {{annualLeaveDays}} days with {{noticeDays}} days notice upon termination.",
      },
    ],
  },
  INTL_CONTRACTOR: {
    id: "INTL_CONTRACTOR",
    countryCode: "GL",
    titleAr: "اتفاقية متعاقد مستقل / استشارات دولية (ثنائية اللغة)",
    titleEn: "International Independent Contractor Agreement",
    lawReferenceAr: "اتفاقية خدمات مستقلة عابرة للحدود (ملكية فكرية وسرية NDA)",
    lawReferenceEn: "Cross-Border Independent Services, IP Assignment & NDA",
    defaultCurrency: "USD",
    defaultProbationDays: 30,
    defaultAnnualLeaveDays: 0,
    defaultNoticeDays: 14,
    defaultWeeklyHours: 40,
    clausesAr: [
      {
        heading: "البند الأول: نطاق الخدمات المستقلة",
        body: "يقدّم المتعاقد المستقل ({{employeeName}}) خدمات مهنية بصفته ({{jobTitle}}) لصالح ({{companyName}}) من ({{workLocation}}) اعتباراً من {{startDateFormatted}} لمدة ({{contractMonths}}) شهراً.",
      },
      {
        heading: "البند الثاني: الأتعاب الشهرية والفوترة",
        body: "تستحق أتعاب شهرية قدرها ({{salaryFormatted}}) تُسدّد بموجب فاتورة شهرية معتمدة، مع فترة إشعار ({{noticeDays}}) يوماً لإنهاء الاتفاقية.",
      },
      {
        heading: "البند الثالث: الملكية الفكرية والسرية",
        body: "تؤول كافة حقوق الملكية الفكرية للمخرجات للطرف الأول ({{companyName}}) فور سداد الأتعاب، ويلتزم المتعاقد بسرية كاملة لجميع البيانات والشفرات والمستندات.",
      },
    ],
    clausesEn: [
      {
        heading: "Article 1: Independent Services Scope",
        body: "Contractor {{employeeName}} provides professional {{jobTitle}} services to {{companyName}} remotely from {{workLocation}} starting {{startDateFormatted}} for {{contractMonths}} months.",
      },
      {
        heading: "Article 2: Monthly Retainer & Notice",
        body: "Monthly fee is {{salaryFormatted}} payable upon approved invoice. Either party may terminate with {{noticeDays}} days written notice.",
      },
      {
        heading: "Article 3: IP Ownership & Confidentiality",
        body: "All deliverables and intellectual property vest in {{companyName}} upon payment, subject to strict mutual confidentiality (NDA).",
      },
    ],
  },
};

export interface RenderedContract {
  template: RegionalContractTemplate;
  title: string;
  lawReference: string;
  renderedClauses: Array<{ heading: string; body: string }>;
  formattedStartDate: string;
  formattedSalary: string;
  plainText: string;
}

export function renderRegionalContract(
  jurisdiction: ContractJurisdiction,
  vars: ContractVariables,
  locale: string = "ar",
): RenderedContract {
  const template = REGIONAL_CONTRACT_TEMPLATES[jurisdiction] ?? REGIONAL_CONTRACT_TEMPLATES.KSA_QIWA;
  const isEn = locale === "en";
  const calendarMode = vars.calendarMode ?? (jurisdiction.startsWith("KSA") ? "both" : "gregorian");

  const formattedStartDate = formatRegionalDate(
    vars.startDate || new Date().toISOString(),
    calendarMode,
    locale,
  );
  const formattedSalary = formatRegionalCurrency(vars.monthlySalary, vars.currency, locale);

  const tokens: Record<string, string> = {
    "{{companyName}}": vars.companyName || (isEn ? "Company Name" : "اسم المنشأة"),
    "{{employeeName}}": vars.employeeName || (isEn ? "Candidate Name" : "اسم المرشح"),
    "{{jobTitle}}": vars.jobTitle || (isEn ? "Job Title" : "المسمى الوظيفي"),
    "{{workLocation}}": vars.workLocation || (isEn ? "Riyadh, KSA" : "الرياض، المملكة العربية السعودية"),
    "{{contractMonths}}": String(vars.contractMonths || 12),
    "{{probationDays}}": String(vars.probationDays ?? template.defaultProbationDays),
    "{{annualLeaveDays}}": String(vars.annualLeaveDays ?? template.defaultAnnualLeaveDays),
    "{{noticeDays}}": String(vars.noticeDays ?? template.defaultNoticeDays),
    "{{startDateFormatted}}": formattedStartDate,
    "{{salaryFormatted}}": formattedSalary,
  };

  const replaceTokens = (str: string) =>
    Object.entries(tokens).reduce((acc, [token, value]) => acc.split(token).join(value), str);

  const sourceClauses = isEn ? template.clausesEn : template.clausesAr;
  const renderedClauses = sourceClauses.map((clause) => ({
    heading: replaceTokens(clause.heading),
    body: replaceTokens(clause.body),
  }));

  const title = isEn ? template.titleEn : template.titleAr;
  const lawReference = isEn ? template.lawReferenceEn : template.lawReferenceAr;

  const plainText = [
    title,
    lawReference,
    "----------------------------------------",
    ...renderedClauses.map((c) => `${c.heading}\n${c.body}`),
  ].join("\n\n");

  return {
    template,
    title,
    lawReference,
    renderedClauses,
    formattedStartDate,
    formattedSalary,
    plainText,
  };
}

export function buildPrintableContractHtml(rendered: RenderedContract, vars: ContractVariables, locale: string = "ar"): string {
  const isEn = locale === "en";
  const dir = isEn ? "ltr" : "rtl";
  const clausesHtml = rendered.renderedClauses
    .map(
      (c) => `
      <section style="margin-bottom:18px">
        <h3 style="margin:0 0 6px;font-size:15px;color:#0d5c5a">${c.heading}</h3>
        <p style="margin:0;font-size:13.5px;color:#1e293b;line-height:1.9">${c.body}</p>
      </section>`,
    )
    .join("");

  return `<!doctype html>
  <html lang="${isEn ? "en" : "ar"}" dir="${dir}">
    <head>
      <meta charset="UTF-8" />
      <title>${rendered.title}</title>
      <style>
        body { font-family: Tajawal, Inter, Arial, sans-serif; color: #0f172a; padding: 36px; max-width: 820px; margin: 0 auto; }
        .header { border-bottom: 2px solid #0d5c5a; padding-bottom: 14px; margin-bottom: 24px; }
        .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 44px; padding-top: 20px; border-top: 1px dashed #94a3b8; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 style="margin:0 0 6px;font-size:20px">${rendered.title}</h1>
        <p style="margin:0;font-size:12px;color:#475569">${rendered.lawReference}</p>
      </div>
      ${clausesHtml}
      <div class="sig-grid">
        <div>
          <strong>${isEn ? "First Party (Employer)" : "الطرف الأول (صاحب العمل)"}</strong>
          <p>${vars.companyName}</p>
          <p style="margin-top:28px;color:#64748b">${isEn ? "Signature & Stamp:" : "التوقيع والختم:"} ______________________</p>
        </div>
        <div>
          <strong>${isEn ? "Second Party (Employee)" : "الطرف الثاني (الموظف)"}</strong>
          <p>${vars.employeeName}</p>
          <p style="margin-top:28px;color:#64748b">${isEn ? "Signature:" : "التوقيع:"} ______________________</p>
        </div>
      </div>
    </body>
  </html>`;
}
