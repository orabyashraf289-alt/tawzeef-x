import type { CandidateRow, JobRow } from "@/hooks/useJobs";
import type { JobOffer } from "@/hooks/useOffers";
import { exportReportElementToPdf, type PdfExportOptions } from "@/lib/reportPdfGenerator";
import type { InterviewRow } from "./reportTypes";

export interface ExportReportsExcelParams {
  candidates: CandidateRow[];
  jobs: JobRow[];
  interviews: InterviewRow[];
  offers: JobOffer[];
  locale: string;
  t: (key: string) => string;
}

export async function exportReportsToExcel({
  candidates,
  jobs,
  interviews,
  offers,
  locale,
  t,
}: ExportReportsExcelParams): Promise<void> {
  const XLSX = await import("@/lib/safeSpreadsheet");
  const wb = XLSX.utils.book_new();
  const dateLocale = locale === "en" ? "en-US" : "ar-SA";
  const isEn = locale === "en";

  const candidatesSheet = candidates.map((c) => ({
    [t("reports.xl.name")]: c.name,
    [t("reports.xl.email")]: c.email || "",
    [t("reports.xl.role")]: c.role || "",
    [isEn ? "Location / City" : "المدينة / المنطقة"]: (c as any).location || "",
    [isEn ? "ETEC License" : "الرخصة المهنية (ETEC)"]: (c as any).license_number || "غير مدخلة",
    [isEn ? "Qualification" : "المؤهل العلمي"]: (c as any).university_degree || (c as any).education || "",
    [t("reports.xl.stage")]: c.stage || "",
    [t("reports.xl.status")]: c.status,
    [t("reports.xl.source")]: c.source || "",
    [t("reports.xl.aiScore")]: c.ai_score ?? "",
    [t("reports.xl.createdAt")]: new Date(c.created_at).toLocaleDateString(dateLocale),
  }));
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(candidatesSheet),
    isEn ? "Candidates" : "المرشحون والامتثال",
  );

  const jobsSheet = jobs.map((j) => ({
    [t("reports.xl.jobTitle")]: j.title,
    [t("reports.xl.department")]: j.department,
    [t("reports.xl.location")]: j.location,
    [t("reports.xl.status")]: j.status,
    [t("reports.xl.type")]: j.type,
  }));
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(jobsSheet),
    isEn ? "Jobs" : "الوظائف",
  );

  const interviewsSheet = interviews.map((i) => ({
    [t("reports.xl.candidateName")]: i.candidate_name,
    [t("reports.xl.position")]: i.position,
    [t("reports.xl.date")]: i.date,
    [t("reports.xl.time")]: i.time,
    [t("reports.xl.status")]: i.status,
    [t("reports.xl.type")]: i.type,
    [isEn ? "AI Evaluated" : "تقييم الذكاء الاصطناعي"]: (i as typeof i & { ai_evaluation?: unknown }).ai_evaluation
      ? (isEn ? "Yes" : "نعم")
      : (isEn ? "No" : "لا"),
  }));
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(interviewsSheet),
    isEn ? "Interviews" : "المقابلات",
  );

  const offersSheet = offers.map((o) => ({
    [t("reports.xl.position")]: o.position,
    [t("reports.xl.salary")]: o.salary,
    [t("reports.xl.currency")]: o.currency,
    [t("reports.xl.status")]: o.status,
    [t("reports.xl.offerType")]: o.offer_type,
  }));
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(offersSheet),
    isEn ? "Offers" : "العروض",
  );

  // Summary Metrics Sheet
  const licensedTotal = candidates.filter((c) => Boolean((c as any).license_number)).length;
  const highAiMatches = candidates.filter((c) => typeof c.ai_score === "number" && c.ai_score >= 85).length;
  const summarySheet = [
    {
      [isEn ? "Metric" : "المؤشر القياسي"]: isEn ? "Total Candidates" : "إجمالي المرشحين",
      [isEn ? "Value" : "القيمة"]: candidates.length,
    },
    {
      [isEn ? "Metric" : "المؤشر القياسي"]: isEn ? "ETEC Licensed Candidates" : "الحاصلون على رخصة مهنية ETEC",
      [isEn ? "Value" : "القيمة"]: licensedTotal,
    },
    {
      [isEn ? "Metric" : "المؤشر القياسي"]: isEn ? "ETEC Compliance Rate" : "نسبة الامتثال للرخص المهنية",
      [isEn ? "Value" : "القيمة"]: `${candidates.length ? Math.round((licensedTotal / candidates.length) * 100) : 0}%`,
    },
    {
      [isEn ? "Metric" : "المؤشر القياسي"]: isEn ? "High AI Match (>=85%)" : "مطابقة ذكاء اصطناعي استثنائية (85%+)",
      [isEn ? "Value" : "القيمة"]: highAiMatches,
    },
    {
      [isEn ? "Metric" : "المؤشر القياسي"]: isEn ? "Active Jobs" : "الوظائف المفتوحة",
      [isEn ? "Value" : "القيمة"]: jobs.filter((j) => j.status === "active" || j.status === "مفتوحة").length,
    },
    {
      [isEn ? "Metric" : "المؤشر القياسي"]: isEn ? "Total Interviews" : "إجمالي المقابلات",
      [isEn ? "Value" : "القيمة"]: interviews.length,
    },
    {
      [isEn ? "Metric" : "المؤشر القياسي"]: isEn ? "Total Offers" : "إجمالي العروض الوظيفية",
      [isEn ? "Value" : "القيمة"]: offers.length,
    },
  ];
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(summarySheet),
    isEn ? "Executive Summary" : "الملخص التنفيذي والامتثال",
  );

  const dateStr = new Date().toLocaleDateString(dateLocale).replace(/\//g, "-");
  XLSX.writeFile(wb, `${isEn ? "recruitment-report" : "تقرير-التوظيف-الشامل"}-${dateStr}.xlsx`);
}

export async function exportReportsPdf(
  element: HTMLElement,
  options?: PdfExportOptions,
): Promise<boolean> {
  return exportReportElementToPdf(element, options);
}
