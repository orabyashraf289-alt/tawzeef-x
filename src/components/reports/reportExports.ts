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
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  const dateLocale = locale === "en" ? "en-US" : "ar-SA";

  const candidatesSheet = candidates.map((c) => ({
    [t("reports.xl.name")]: c.name,
    [t("reports.xl.email")]: c.email || "",
    [t("reports.xl.role")]: c.role || "",
    [t("reports.xl.stage")]: c.stage || "",
    [t("reports.xl.status")]: c.status,
    [t("reports.xl.source")]: c.source || "",
    [t("reports.xl.aiScore")]: c.ai_score ?? "",
    [t("reports.xl.createdAt")]: new Date(c.created_at).toLocaleDateString(dateLocale),
  }));
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(candidatesSheet),
    locale === "en" ? "Candidates" : "المرشحون",
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
    locale === "en" ? "Jobs" : "الوظائف",
  );

  const interviewsSheet = interviews.map((i) => ({
    [t("reports.xl.candidateName")]: i.candidate_name,
    [t("reports.xl.position")]: i.position,
    [t("reports.xl.date")]: i.date,
    [t("reports.xl.time")]: i.time,
    [t("reports.xl.status")]: i.status,
    [t("reports.xl.type")]: i.type,
  }));
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(interviewsSheet),
    locale === "en" ? "Interviews" : "المقابلات",
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
    locale === "en" ? "Offers" : "العروض",
  );

  const dateStr = new Date().toLocaleDateString(dateLocale);
  XLSX.writeFile(wb, `${locale === "en" ? "recruitment-report" : "تقرير-التوظيف"}-${dateStr}.xlsx`);
}

export async function exportReportsPdf(
  element: HTMLElement,
  options?: PdfExportOptions,
): Promise<boolean> {
  return exportReportElementToPdf(element, options);
}
