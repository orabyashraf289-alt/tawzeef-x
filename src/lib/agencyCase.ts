export const AGENCY_STAGES = [
  { title: "تقديم المرشح", evidence: null },
  { title: "المقابلة", evidence: null },
  { title: "تجهيز الأوراق", evidence: null },
  { title: "تسليم الأوراق", evidence: "passport" },
  { title: "التحليل", evidence: "analysis" },
  { title: "الكشف الطبي", evidence: "medical" },
  { title: "دخول الجواز السفارة", evidence: null },
  { title: "اعتماد التأشيرة", evidence: "visa" },
] as const;

export const AGENCY_DOCUMENTS = [
  { value: "cv", title: "سيرة ذاتية" },
  { value: "passport", title: "جواز السفر / الأوراق" },
  { value: "analysis", title: "تقرير التحليل" },
  { value: "medical", title: "الكشف الطبي" },
  { value: "visa", title: "التأشيرة" },
  { value: "other", title: "مرفق آخر" },
] as const;

export type AgencyDocumentKind = (typeof AGENCY_DOCUMENTS)[number]["value"];
export type AgencyCaseStatus = "in_progress" | "awaiting_admin" | "needs_changes" | "file_accepted";

export const AGENCY_CASE_STATUS: Record<AgencyCaseStatus, string> = {
  in_progress: "قيد إجراءات المكتب",
  awaiting_admin: "بانتظار مراجعة الإدارة",
  needs_changes: "مطلوب استكمال",
  file_accepted: "اعتمدت الإدارة الملف",
};

export function nextAgencyStage(index: number, status: AgencyCaseStatus, documentKinds: readonly string[]) {
  if (status !== "in_progress" || index < 0 || index >= AGENCY_STAGES.length - 1) return null;
  const next = AGENCY_STAGES[index + 1];
  return { index: index + 1, title: next.title, requiredEvidence: next.evidence,
    canAdvance: !next.evidence || documentKinds.includes(next.evidence) };
}
