import { ArrowRightLeft, Handshake, Users, type LucideIcon } from "lucide-react";
import type { ConvertedOrder, OrderChecklist, OrderStatus, OrderType } from "@/types/convertedOrders";

export type ConvertedOrdersTab = "all" | "direct_hire" | "agency_fulfillment" | "branch_transfer" | "analytics";

export function isConvertedOrdersTab(value: string): value is ConvertedOrdersTab {
  return ["all", "direct_hire", "agency_fulfillment", "branch_transfer", "analytics"].includes(value);
}

export function isOrderStatus(value: string): value is OrderStatus {
  return [
    "draft",
    "pending_documents",
    "contract_issued",
    "visa_processing",
    "medical_check",
    "ready_for_work",
    "completed",
    "cancelled",
  ].includes(value);
}

export const STATUS_BADGE_MAP: Record<OrderStatus, { label: string; class: string; dot: string }> = {
  draft: { label: "مسودة", class: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-400" },
  pending_documents: { label: "قيد استكمال المسوغات", class: "bg-amber-50 text-amber-800 border-amber-200", dot: "bg-amber-500" },
  contract_issued: { label: "تم إصدار العقد", class: "bg-blue-50 text-blue-800 border-blue-200", dot: "bg-blue-500" },
  visa_processing: { label: "قيد إجراءات التأشيرة", class: "bg-purple-50 text-purple-800 border-purple-200", dot: "bg-purple-500" },
  medical_check: { label: "قيد الفحص الطبي", class: "bg-cyan-50 text-cyan-800 border-cyan-200", dot: "bg-cyan-500" },
  ready_for_work: { label: "جاهز للمباشرة", class: "bg-emerald-50 text-emerald-800 border-emerald-300", dot: "bg-emerald-500" },
  completed: { label: "تمت المباشرة بنجاح ✅", class: "bg-emerald-100 text-emerald-900 border-emerald-400", dot: "bg-emerald-600" },
  cancelled: { label: "ملغي", class: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" },
};

export const ORDER_TYPE_LABELS: Record<OrderType, { label: string; icon: LucideIcon; color: string }> = {
  direct_hire: { label: "أمر تعيين مباشر", icon: Users, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  agency_fulfillment: { label: "أمر استقدام وتوريد", icon: Handshake, color: "text-purple-600 bg-purple-50 border-purple-200" },
  branch_transfer: { label: "تحويل بين الفروع", icon: ArrowRightLeft, color: "text-blue-600 bg-blue-50 border-blue-200" },
};

export const AL_ANDALUS_BRANCHES = [
  "مجمع بنين - الرياض",
  "مجمع بنات - الرياض",
  "مجمع بنين - جدة",
  "مجمع بنات - جدة",
  "مجمع بنين - الخبر والشرقية",
  "مجمع بنات - الخبر والشرقية",
  "القسم الدولي (International Section)",
  "الإدارة العامة",
];

export const CHECKLIST_ITEMS: ReadonlyArray<{ key: keyof OrderChecklist; label: string }> = [
  { key: "id_copy", label: "صورة الهوية الوطنية / الإقامة سارية المفعول" },
  { key: "educational_cert", label: "المؤهل العلمي وشهادة التخرج المعتمدة" },
  { key: "medical_report", label: "التقرير والكشف الطبي المعتمد" },
  { key: "criminal_record", label: "شهادة خلو السوابق / براءة الذمة" },
  { key: "signed_contract", label: "العقد الوظيفي الموقّع من الطرفين" },
  { key: "bank_iban", label: "شهادة الآيبان البنكي المعتمد لتحويل الراتب" },
  { key: "experience_certs", label: "شهادات الخبرة السابقة والتوصيات" },
];

export interface DirectOrderFormState {
  offer_id: string;
  candidate_id: string;
  candidate_name: string;
  candidate_email: string;
  candidate_phone: string;
  candidate_national_id: string;
  candidate_nationality: string;
  job_id: string;
  job_title: string;
  department: string;
  target_branch: string;
  basic_salary: number;
  currency: string;
  housing_allowance: number;
  transport_allowance: number;
  other_allowances: number;
  joining_date: string;
  contract_period_months: number;
  probation_period_months: number;
  notes: string;
}

export interface AgencyOrderFormState {
  agency_id: string;
  job_id: string;
  job_title: string;
  department: string;
  target_branch: string;
  quota: number;
  basic_salary: number;
  housing_allowance: number;
  transport_allowance: number;
  joining_date: string;
  notes: string;
}

export interface BranchTransferFormState {
  candidate_name: string;
  source_branch: string;
  target_branch: string;
  job_title: string;
  transfer_reason: string;
  notes: string;
}

export interface BranchOrderStats {
  branch: string;
  totalCount: number;
  completed: number;
  targetQuota: number;
  fulfillmentPct: number;
  payroll: number;
}

export interface OrdersStatsSummary {
  total: number;
  directHire: number;
  agencyFulfillment: number;
  branchTransfer: number;
  readyOrCompleted: number;
  pendingDocs: number;
  totalPayroll: number;
  branchStats: BranchOrderStats[];
}

export function createInitialDirectOrderForm(): DirectOrderFormState {
  return {
    offer_id: "",
    candidate_id: "",
    candidate_name: "",
    candidate_email: "",
    candidate_phone: "",
    candidate_national_id: "",
    candidate_nationality: "",
    job_id: "",
    job_title: "",
    department: "",
    target_branch: AL_ANDALUS_BRANCHES[0],
    basic_salary: 8000,
    currency: "SAR",
    housing_allowance: 2000,
    transport_allowance: 700,
    other_allowances: 0,
    joining_date: "",
    contract_period_months: 12,
    probation_period_months: 3,
    notes: "",
  };
}

export function createInitialAgencyOrderForm(): AgencyOrderFormState {
  return {
    agency_id: "",
    job_id: "",
    job_title: "",
    department: "",
    target_branch: AL_ANDALUS_BRANCHES[0],
    quota: 2,
    basic_salary: 7500,
    housing_allowance: 1800,
    transport_allowance: 600,
    joining_date: "",
    notes: "",
  };
}

export function createInitialBranchTransferForm(): BranchTransferFormState {
  return {
    candidate_name: "",
    source_branch: AL_ANDALUS_BRANCHES[0],
    target_branch: AL_ANDALUS_BRANCHES[1],
    job_title: "",
    transfer_reason: "",
    notes: "",
  };
}

export function getChecklistCount(cl?: OrderChecklist): { completed: number; total: number } {
  if (!cl) return { completed: 0, total: 7 };
  const items = Object.values(cl);
  const completed = items.filter(Boolean).length;
  return { completed, total: 7 };
}

export function getOnboardingPortalLink(order: ConvertedOrder): string | null {
  return order.onboarding_token &&
    order.candidate_id &&
    order.order_type === "direct_hire" &&
    !["draft", "cancelled"].includes(order.status)
    ? `${window.location.origin}/onboard/${order.onboarding_token}`
    : null;
}

export function getWhatsAppMessage(order: ConvertedOrder): string {
  const link = getOnboardingPortalLink(order);
  if (!link) return "رابط الإقرار متاح لأمر تعيين مباشر محفوظ ومرتبط بمرشح فقط.";
  return `السلام عليكم ورحمة الله وبركاته،\nأهلاً بك أ. ${order.candidate_name}، نبارك لك صدور أمر تعيينك بمسمى (${order.job_title}) لدى ${order.company_name || "الشركة"} برقم ${order.order_number}.\n\nيرجى فتح الرابط التالي لمراجعة التفاصيل وتسجيل إقرار الاستلام. تراجع الإدارة المستندات وتعتمد المباشرة لاحقاً:\n🔗 ${link}\n\nمع تمنياتنا لك بالتوفيق.`;
}
