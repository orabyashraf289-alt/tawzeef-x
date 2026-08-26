import { memo, useRef } from "react";
import type { ConvertedOrder } from "@/types/convertedOrders";
import { Button } from "@/components/ui/button";
import { Printer, Download, X, CheckCircle2, ShieldCheck, Building2, QrCode } from "lucide-react";
import tawzeefLogo from "@/assets/tawzeef-x-logo.png";
import SARSymbol from "@/components/SARSymbol";

interface PrintableEmploymentOrderProps {
  order: ConvertedOrder;
  onClose?: () => void;
}

export const PrintableEmploymentOrder = memo(function PrintableEmploymentOrder({
  order,
  onClose,
}: PrintableEmploymentOrderProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const statusArabic: Record<string, string> = {
    draft: "مسودة",
    pending_documents: "قيد استكمال المسوغات",
    contract_issued: "تم إصدار العقد",
    visa_processing: "قيد إجراءات التأشيرة",
    medical_check: "قيد الفحص الطبي",
    ready_for_work: "جاهز للمباشرة",
    completed: "تمت المباشرة بنجاح",
    cancelled: "ملغي",
  };

  return (
    <div className="space-y-4">
      {/* Top Action Bar (hidden on print) */}
      <div className="flex items-center justify-between pb-3 border-b border-border print:hidden">
        <div className="flex items-center gap-2">
          <Button
            onClick={handlePrint}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 px-4 rounded-xl shadow-sm"
          >
            <Printer className="w-4 h-4" />
            طباعة أمر التعيين (A4)
          </Button>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose} className="rounded-lg">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Printable A4 Container */}
      <div
        ref={printRef}
        className="bg-white text-slate-900 p-8 sm:p-12 rounded-2xl border border-slate-200 shadow-lg max-w-[850px] mx-auto print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none text-right font-sans"
        dir="rtl"
      >
        {/* Document Header */}
        <div className="flex items-center justify-between border-b-2 border-emerald-600 pb-5 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-500/20 p-2 flex items-center justify-center">
              <img src={tawzeefLogo} alt="Tawzeef-X" className="w-10 h-10 object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">
                {order.company_name || "منظومة توظيف إكس الأهلية"}
              </h1>
              <p className="text-xs text-slate-500 font-bold mt-1">
                الإدارة العامة للموارد البشرية والتوظيف
              </p>
              <p className="text-[10px] text-emerald-700 font-semibold tracking-wider uppercase">
                Human Resources & Talent Acquisition Department
              </p>
            </div>
          </div>

          <div className="text-left space-y-1">
            <div className="inline-block px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-black">
              رقم الأمر: {order.order_number}
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              التاريخ: {new Date(order.created_at).toLocaleDateString("ar-SA")}
            </p>
            <p className="text-[10px] text-slate-400 font-mono">
              Ref: {order.id.slice(0, 10).toUpperCase()}
            </p>
          </div>
        </div>

        {/* Title Banner */}
        <div className="text-center my-6 py-2.5 bg-slate-50 border-y border-slate-200 rounded-lg">
          <h2 className="text-lg font-black text-slate-900">
            قرار تعيين وأمر مباشرة عمل رسمي
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Official Employment & Job Placement Order
          </p>
        </div>

        {/* Section 1: Candidate Personal Info */}
        <div className="space-y-4 mb-6">
          <h3 className="text-xs font-black text-emerald-800 flex items-center gap-1.5 pb-1 border-b border-slate-200">
            <div className="w-1.5 h-3 bg-emerald-600 rounded-full" />
            أولاً: البيانات الشخصية للمرشح / الموظف
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">الاسم الكامل:</span>
              <span className="font-black text-slate-900">{order.candidate_name}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">رقم الهوية / الإقامة:</span>
              <span className="font-bold text-slate-800 font-mono">{order.candidate_national_id || "1089345210"}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">الجنسية:</span>
              <span className="font-bold text-slate-800">{order.candidate_nationality || "سعودي"}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">رقم الجوال:</span>
              <span className="font-bold text-slate-800 font-mono" dir="ltr">{order.candidate_phone || "0501234567"}</span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-400 block text-[11px]">البريد الإلكتروني:</span>
              <span className="font-bold text-slate-800 font-mono" dir="ltr">{order.candidate_email || "candidate@example.com"}</span>
            </div>
          </div>
        </div>

        {/* Section 2: Job Placement */}
        <div className="space-y-4 mb-6">
          <h3 className="text-xs font-black text-emerald-800 flex items-center gap-1.5 pb-1 border-b border-slate-200">
            <div className="w-1.5 h-3 bg-emerald-600 rounded-full" />
            ثانياً: تفاصيل التعيين والموضع الوظيفي
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">المسمى الوظيفي:</span>
              <span className="font-black text-slate-900 text-sm">{order.job_title}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">القسم / المرحلة:</span>
              <span className="font-bold text-slate-800">{order.department || "المرحلة التعليمية"}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">الفرع / المجمع الموجه إليه:</span>
              <span className="font-black text-emerald-700">{order.target_branch || "المجمع الرئيسي"}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">نوع أمر التعيين:</span>
              <span className="font-bold text-slate-800">
                {order.order_type === "direct_hire"
                  ? "توظيف مباشر"
                  : order.order_type === "branch_transfer"
                  ? "تحويل بين فروع المنشأة"
                  : "استقدام وتوريد عبر مكتب"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">تاريخ المباشرة المعتمد:</span>
              <span className="font-black text-slate-900 font-mono">
                {order.joining_date ? new Date(order.joining_date).toLocaleDateString("ar-SA") : "عند استكمال المسوغات"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">حالة أمر التعيين:</span>
              <span className="font-bold text-emerald-800">{statusArabic[order.status] || order.status}</span>
            </div>
          </div>
        </div>

        {/* Section 3: Financial Package Breakdown */}
        <div className="space-y-4 mb-6">
          <h3 className="text-xs font-black text-emerald-800 flex items-center gap-1.5 pb-1 border-b border-slate-200">
            <div className="w-1.5 h-3 bg-emerald-600 rounded-full" />
            ثالثاً: تفاصيل الحزمة المالية الشهرية (بالريال السعودي)
          </h3>

          <div className="rounded-xl border border-slate-200 overflow-hidden text-xs">
            <table className="w-full text-right">
              <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-2.5">البند المالي</th>
                  <th className="p-2.5">القيمة الشهرية</th>
                  <th className="p-2.5">ملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="p-2.5 font-bold">الراتب الأساسي (Basic Salary)</td>
                  <td className="p-2.5 font-black text-slate-900 font-mono">{order.basic_salary.toLocaleString()} <SARSymbol /></td>
                  <td className="p-2.5 text-slate-500">يخضع لخصم التأمينات الاجتماعية (GOSI)</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold">بدل السكن (Housing Allowance)</td>
                  <td className="p-2.5 font-black text-slate-900 font-mono">{(order.housing_allowance || 0).toLocaleString()} <SARSymbol /></td>
                  <td className="p-2.5 text-slate-500">أو توفير سكن عيني مناسب</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold">بدل النقل (Transport Allowance)</td>
                  <td className="p-2.5 font-black text-slate-900 font-mono">{(order.transport_allowance || 0).toLocaleString()} <SARSymbol /></td>
                  <td className="p-2.5 text-slate-500">بدل نقدي شهري</td>
                </tr>
                {order.other_allowances ? (
                  <tr>
                    <td className="p-2.5 font-bold">بدلات وحوافز أخرى</td>
                    <td className="p-2.5 font-black text-slate-900 font-mono">{order.other_allowances.toLocaleString()} <SARSymbol /></td>
                    <td className="p-2.5 text-slate-500">بدل طبيعة عمل / إشراف</td>
                  </tr>
                ) : null}
                <tr className="bg-emerald-50/80 font-black text-emerald-950">
                  <td className="p-3 text-sm font-black">إجمالي الراتب الشهري (Total Monthly Package)</td>
                  <td className="p-3 text-sm font-black text-emerald-800 font-mono">{order.total_salary.toLocaleString()} <SARSymbol /></td>
                  <td className="p-3 text-xs text-emerald-700">شاملاً كافة البدلات الشهرية</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 4: Conditions & Checklist */}
        <div className="space-y-4 mb-6">
          <h3 className="text-xs font-black text-emerald-800 flex items-center gap-1.5 pb-1 border-b border-slate-200">
            <div className="w-1.5 h-3 bg-emerald-600 rounded-full" />
            رابعاً: الضوابط ومسوغات التعيين
          </h3>

          <div className="grid grid-cols-2 gap-3 text-[11px] bg-slate-50/50 p-3 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[9px]">✓</span>
              <span>مدة العقد: {order.contract_period_months || 12} شهراً قابلة للتجديد بموافقة الطرفين.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[9px]">✓</span>
              <span>فترة التجربة: {order.probation_period_months || 3} أشهر وفقاً للمادة 53 من نظام العمل السعودي.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[9px]">✓</span>
              <span>يخضع التعيين للائحة التنظيمية الداخلية والاعتمادات الرسمية.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[9px]">✓</span>
              <span>يلتزم الموظف بمباشرة العمل في الموعد والمقر المحددين أعلاه.</span>
            </div>
          </div>
        </div>

        {/* Section 5: Official Signatures & Verification Stamp */}
        <div className="mt-10 pt-6 border-t-2 border-slate-200 grid grid-cols-3 gap-6 text-center text-xs">
          {/* Candidate Signature */}
          <div className="space-y-12">
            <p className="font-black text-slate-800">إقرار وقبول المرشح / الموظف</p>
            <div className="border-b border-dashed border-slate-400 w-36 mx-auto" />
            <p className="text-[10px] text-slate-400">التوقيع / التاريخ</p>
          </div>

          {/* QR Verification Seal */}
          <div className="flex flex-col items-center justify-center space-y-1">
            <div className="w-16 h-16 rounded-xl border border-slate-300 p-1.5 flex items-center justify-center bg-slate-50">
              <QrCode className="w-12 h-12 text-slate-700" />
            </div>
            <span className="text-[9px] font-mono text-slate-400">VERIFIED #{order.order_number}</span>
            <span className="text-[9px] text-emerald-700 font-bold">معتمد إلكترونياً</span>
          </div>

          {/* HR & Director Seal */}
          <div className="space-y-12">
            <p className="font-black text-slate-800">مدير عام الموارد البشرية والتوظيف</p>
            <div className="border-b border-dashed border-slate-400 w-36 mx-auto" />
            <p className="text-[10px] text-slate-400">الختم والاعتماد الرسمي</p>
          </div>
        </div>

        {/* Document Footer Note */}
        <div className="mt-8 pt-3 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400 font-medium">
          <span>صدر هذا القرار آلياً عبر منصة توظيف إكس الذكية (Tawzeef-X)</span>
          <span>صفحة 1 من 1</span>
          <span>وثيقة إدارية رسمية معتمدة</span>
        </div>
      </div>
    </div>
  );
});
