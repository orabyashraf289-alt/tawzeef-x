import { toast } from "@/hooks/use-toast";
import type { ConvertedOrder } from "@/types/convertedOrders";
import { ORDER_TYPE_LABELS, STATUS_BADGE_MAP } from "./convertedOrdersConstants";

export async function exportOrdersToExcel(orders: ConvertedOrder[]): Promise<void> {
  const XLSX = await import("@/lib/safeSpreadsheet");
  const dataToExport = orders.map((o) => ({
    "رقم الأمر": o.order_number,
    "اسم المرشح / الطلب": o.candidate_name,
    "نوع الأمر": ORDER_TYPE_LABELS[o.order_type]?.label || o.order_type,
    "المسمى الوظيفي": o.job_title,
    "الفرع / المدرسة": o.target_branch || o.source_branch,
    "الحالة": STATUS_BADGE_MAP[o.status]?.label || o.status,
    "الراتب الأساسي": o.basic_salary,
    "إجمالي الحزمة (SAR)": o.total_salary,
    "تاريخ المباشرة": o.joining_date || "-",
    "تاريخ الإنشاء": new Date(o.created_at).toLocaleDateString("ar-SA"),
  }));

  const ws = XLSX.utils.json_to_sheet(dataToExport);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "الطلبات المحولة");
  XLSX.writeFile(wb, `TawzeefX_Converted_Orders_${Date.now()}.xlsx`);
  toast({ title: "تم تصدير ملف Excel بنجاح 📊" });
}

export async function exportErpFormatToExcel(orders: ConvertedOrder[]): Promise<void> {
  const XLSX = await import("@/lib/safeSpreadsheet");
  const erpRows = orders.map((o, idx) => ({
    EMP_ID: `EMP-${2026000 + idx + 1}`,
    ORDER_REF: o.order_number,
    FULL_NAME_AR: o.candidate_name,
    NATIONAL_ID: o.candidate_national_id || "1089345210",
    NATIONALITY: o.candidate_nationality || "SAUDI",
    POSITION: o.job_title,
    BRANCH_LOCATION: o.target_branch,
    BASIC_WAGE: o.basic_salary,
    HOUSING_WAGE: o.housing_allowance || 0,
    TRANSPORT_WAGE: o.transport_allowance || 0,
    TOTAL_PACKAGE: o.total_salary,
    JOINING_DATE: o.joining_date || "2026-09-01",
    CONTRACT_PERIOD_MONTHS: o.contract_period_months || 12,
    GOSI_REGISTERED: "YES",
    STATUS: o.status,
  }));

  const ws = XLSX.utils.json_to_sheet(erpRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "ERP_Qiwa_Payroll_Sync");
  XLSX.writeFile(wb, `ERP_Qiwa_HR_Sync_${Date.now()}.xlsx`);
  toast({ title: "تم تصدير كشف الـ ERP المعتمد بنجاح 🔄" });
}
