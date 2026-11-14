import type {
  ApprovalDecision,
  RequisitionCurrency,
  RequisitionPriority,
  RequisitionStatus,
} from "@/hooks/useRequisitions";

export interface LocalizedOption<T extends string = string> {
  value: T;
  ar: string;
  en: string;
}

export const REQUISITION_CURRENCIES: LocalizedOption<RequisitionCurrency>[] = [
  { value: "SAR", ar: "ريال سعودي (SAR)", en: "Saudi Riyal (SAR)" },
  { value: "EGP", ar: "جنيه مصري (EGP)", en: "Egyptian Pound (EGP)" },
  { value: "USD", ar: "دولار أمريكي (USD)", en: "US Dollar (USD)" },
];

export const REQUISITION_PRIORITIES: LocalizedOption<RequisitionPriority>[] = [
  { value: "urgent", ar: "عاجل", en: "Urgent" },
  { value: "high", ar: "مرتفع", en: "High" },
  { value: "medium", ar: "متوسط", en: "Medium" },
  { value: "low", ar: "منخفض", en: "Low" },
];

export const EMPLOYMENT_TYPE_OPTIONS: LocalizedOption[] = [
  { value: "دوام كامل", ar: "دوام كامل", en: "Full-time" },
  { value: "دوام جزئي", ar: "دوام جزئي", en: "Part-time" },
  { value: "عمل عن بعد", ar: "عمل عن بعد", en: "Remote" },
  { value: "عقد محدد", ar: "عقد محدد", en: "Contract" },
  { value: "تدريب", ar: "تدريب", en: "Internship" },
];

export const REQUISITION_STATUS_META: Record<
  RequisitionStatus,
  { ar: string; en: string; badgeClass: string }
> = {
  draft: {
    ar: "مسودة",
    en: "Draft",
    badgeClass: "bg-muted text-muted-foreground border-border",
  },
  pending_approval: {
    ar: "بانتظار الاعتماد",
    en: "Pending Approval",
    badgeClass: "bg-warning/15 text-warning border-warning/30",
  },
  approved: {
    ar: "معتمد",
    en: "Approved",
    badgeClass: "bg-success/15 text-success border-success/30",
  },
  rejected: {
    ar: "مرفوض",
    en: "Rejected",
    badgeClass: "bg-destructive/15 text-destructive border-destructive/30",
  },
  converted: {
    ar: "محوّل لوظيفة",
    en: "Converted to Job",
    badgeClass: "bg-primary/15 text-primary border-primary/30",
  },
  closed: {
    ar: "مغلق",
    en: "Closed",
    badgeClass: "bg-secondary text-secondary-foreground border-border",
  },
};

export const REQUISITION_PRIORITY_META: Record<
  RequisitionPriority,
  { ar: string; en: string; badgeClass: string }
> = {
  urgent: {
    ar: "عاجل",
    en: "Urgent",
    badgeClass: "bg-destructive/15 text-destructive border-destructive/30",
  },
  high: {
    ar: "مرتفع",
    en: "High",
    badgeClass: "bg-warning/15 text-warning border-warning/30",
  },
  medium: {
    ar: "متوسط",
    en: "Medium",
    badgeClass: "bg-info/15 text-info border-info/30",
  },
  low: {
    ar: "منخفض",
    en: "Low",
    badgeClass: "bg-muted text-muted-foreground border-border",
  },
};

export const APPROVAL_DECISION_META: Record<
  ApprovalDecision | string,
  { ar: string; en: string; badgeClass: string }
> = {
  approved: {
    ar: "معتمد",
    en: "Approved",
    badgeClass: "bg-success/15 text-success border-success/30",
  },
  rejected: {
    ar: "مرفوض",
    en: "Rejected",
    badgeClass: "bg-destructive/15 text-destructive border-destructive/30",
  },
  pending: {
    ar: "قيد المراجعة",
    en: "Pending",
    badgeClass: "bg-warning/15 text-warning border-warning/30",
  },
};
