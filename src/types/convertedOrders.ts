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
