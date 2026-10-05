export type OrderType = "direct_hire" | "agency_fulfillment" | "branch_transfer";

export type OrderStatus =
  | "draft"              // مسودة
  | "pending_documents"  // بانتظار مسوغات التعيين
  | "contract_issued"    // تم إصدار العقد
  | "visa_processing"    // قيد إجراءات التأشيرة/الاستقدام
  | "medical_check"      // الفحص الطبي
  | "ready_for_work"     // جاهز للمباشرة
  | "completed"          // تمت المباشرة بنجاح
  | "cancelled";         // ملغي

export interface OrderChecklist {
  id_copy?: boolean;          // صورة الهوية / الإقامة
  educational_cert?: boolean; // المؤهل العلمي المعتمد
  medical_report?: boolean;   // التقرير الطبي
  criminal_record?: boolean;  // شهادة خلو سوابق / براءة ذمة
  signed_contract?: boolean;  // العقد الموقع
  bank_iban?: boolean;        // شهادة الآيبان البنكي
  experience_certs?: boolean; // شهادات الخبرة السابقة
}

export interface ConvertedOrder {
  id: string;
  order_number: string; // e.g. ORD-2026-0001
  candidate_id?: string;
  candidate_name: string;
  candidate_email?: string;
  candidate_phone?: string;
  candidate_national_id?: string;
  candidate_nationality?: string;

  job_id?: string;
  job_title: string;
  department?: string;

  company_id: string;
  company_name?: string;
  source_branch?: string;
  target_branch?: string;

  agency_id?: string;
  agency_name?: string;
  agency_quota?: number; // العدد المطلوب في حال طلب وكالة
  agency_fulfilled_count?: number; // العدد المكتمل

  order_type: OrderType;
  status: OrderStatus;

  basic_salary: number;
  housing_allowance?: number;
  transport_allowance?: number;
  other_allowances?: number;
  total_salary: number;
  currency: string;

  joining_date?: string; // تاريخ المباشرة المتوقع
  contract_period_months?: number; // مدة العقد بالأشهر
  probation_period_months?: number; // فترة التجربة بالأشهر

  documents_checklist?: OrderChecklist;

  transfer_reason?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

/** Validate rows from the optional legacy storage before exposing them to UI. */
export function isConvertedOrder(value: unknown): value is ConvertedOrder {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  const requiredStrings = ["id", "order_number", "candidate_name", "job_title", "company_id", "currency", "created_at", "updated_at"];
  if (!requiredStrings.every((key) => typeof row[key] === "string")) return false;
  if (typeof row.order_type !== "string" || !["direct_hire", "agency_fulfillment", "branch_transfer"].includes(row.order_type)) return false;
  if (typeof row.status !== "string" || !["draft", "pending_documents", "contract_issued", "visa_processing", "medical_check", "ready_for_work", "completed", "cancelled"].includes(row.status)) return false;
  if (!["basic_salary", "total_salary"].every((key) => typeof row[key] === "number" && Number.isFinite(row[key]))) return false;
  const optionalStrings = ["candidate_id", "candidate_email", "candidate_phone", "candidate_national_id", "candidate_nationality", "job_id", "department", "company_name", "source_branch", "target_branch", "agency_id", "agency_name", "joining_date", "transfer_reason", "notes", "created_by"];
  if (!optionalStrings.every((key) => row[key] === undefined || typeof row[key] === "string")) return false;
  const optionalNumbers = ["agency_quota", "agency_fulfilled_count", "housing_allowance", "transport_allowance", "other_allowances", "contract_period_months", "probation_period_months"];
  if (!optionalNumbers.every((key) => row[key] === undefined || (typeof row[key] === "number" && Number.isFinite(row[key])))) return false;
  if (row.documents_checklist !== undefined) {
    if (!row.documents_checklist || typeof row.documents_checklist !== "object" || Array.isArray(row.documents_checklist)) return false;
    if (!Object.values(row.documents_checklist).every((checked) => typeof checked === "boolean")) return false;
  }
  return true;
}
