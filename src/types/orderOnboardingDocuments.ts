export const ORDER_DOCUMENT_KINDS = [
  { key: "id_copy", label: "صورة الهوية الوطنية / الإقامة" },
  { key: "educational_cert", label: "المؤهل العلمي وشهادة التخرج" },
  { key: "medical_report", label: "التقرير والكشف الطبي" },
  { key: "criminal_record", label: "شهادة خلو السوابق" },
  { key: "signed_contract", label: "العقد الموقع" },
  { key: "bank_iban", label: "شهادة الآيبان البنكي" },
  { key: "experience_certs", label: "شهادات الخبرة والتوصيات" },
] as const;

export type OrderDocument = {
  id: string;
  kind: string;
  file_name: string;
  storage_path: string;
  review_status: "pending" | "approved" | "rejected";
  review_note: string | null;
  created_at: string;
};
