import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import tawzeefLogo from "@/assets/tawzeef-x-logo.png";
import SARSymbol from "@/components/SARSymbol";
import type { ConvertedOrder, OrderChecklist } from "@/types/convertedOrders";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  FileCheck2,
  Building2,
  Calendar,
  DollarSign,
  CheckCircle2,
  UploadCloud,
  FileText,
  ShieldCheck,
  Download,
  Printer,
  Sparkles,
  PenLine,
  Eraser,
  Clock,
  ArrowRight,
  User,
  Phone,
  Mail,
  MapPin,
  Check,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

const STORAGE_KEY_PREFIX = "tawzeef_converted_orders_";

export default function OrderOnboardingPortal() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<ConvertedOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Document files uploaded in this session
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, string>>({});
  const [checklist, setChecklist] = useState<OrderChecklist>({});
  const [bankIbanInput, setBankIbanInput] = useState("");

  // Signature Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasSignature, setHasSignature] = useState(false);
  const drawingRef = useRef(false);

  useEffect(() => {
    // Search across local storage keys for this order ID or order number
    let found: ConvertedOrder | null = null;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        try {
          const items: ConvertedOrder[] = JSON.parse(localStorage.getItem(key) || "[]");
          const match = items.find(
            (o) => o.id === orderId || o.order_number.toLowerCase() === orderId?.toLowerCase()
          );
          if (match) {
            found = match;
            break;
          }
        } catch {}
      }
    }

    if (found) {
      setOrder(found);
      setChecklist(found.documents_checklist || {});
      if (found.status === "completed" || found.status === "ready_for_work") {
        setIsCompleted(true);
      }
    } else {
      // Mock / fallback preview for demo if direct ID passed
      setOrder({
        id: orderId || "ord-preview",
        order_number: "ORD-2026-001",
        candidate_name: "أحمد بن محمد القحطاني",
        candidate_email: "ahmed.qahtani@example.com",
        candidate_phone: "0501234567",
        candidate_national_id: "1089345210",
        candidate_nationality: "سعودي",
        job_title: "معلم لغة عربية (المرحلة الثانوية)",
        department: "المرحلة الثانوية",
        company_id: "default",
        company_name: "مدارس الأندلس الأهلية",
        target_branch: "مجمع بنين - الرياض",
        source_branch: "مجمع بنين - الرياض",
        order_type: "direct_hire",
        status: "pending_documents",
        basic_salary: 8500,
        housing_allowance: 2000,
        transport_allowance: 700,
        other_allowances: 300,
        total_salary: 11500,
        currency: "SAR",
        joining_date: "2026-09-01",
        contract_period_months: 12,
        probation_period_months: 3,
        documents_checklist: {
          id_copy: true,
          educational_cert: true,
          medical_report: false,
          criminal_record: false,
          signed_contract: false,
          bank_iban: false,
        },
        notes: "نرحب بانضمامك لكادر مدارس الأندلس الأهلية.",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    setLoading(false);
  }, [orderId]);

  // Canvas drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    drawingRef.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.strokeStyle = "#047857";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    drawingRef.current = false;
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  // Mock upload handler for files
  const handleUploadFile = (fieldKey: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingField(fieldKey);
    setTimeout(() => {
      setUploadedFiles((prev) => ({ ...prev, [fieldKey]: file.name }));
      setChecklist((prev) => ({ ...prev, [fieldKey]: true }));
      setUploadingField(null);
      toast({ title: `تم رفع ${file.name} بنجاح ✅` });
    }, 600);
  };

  // Final Submit Handler
  const handleCompleteOnboarding = () => {
    if (!hasSignature && !isCompleted) {
      toast({ title: "يرجى التوقيع الإلكتروني أولاً لتأكيد الاستلام والمباشرة", variant: "destructive" });
      return;
    }

    setSubmitting(true);

    setTimeout(() => {
      setIsCompleted(true);
      setSubmitting(false);

      // Save updated status in localStorage for the company
      if (order) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
            try {
              const items: ConvertedOrder[] = JSON.parse(localStorage.getItem(key) || "[]");
              const updated = items.map((o) =>
                o.id === order.id || o.order_number === order.order_number
                  ? {
                      ...o,
                      status: "ready_for_work" as any,
                      documents_checklist: {
                        ...o.documents_checklist,
                        ...checklist,
                        signed_contract: true,
                        bank_iban: true,
                      },
                      updated_at: new Date().toISOString(),
                    }
                  : o
              );
              localStorage.setItem(key, JSON.stringify(updated));
            } catch {}
          }
        }
      }

      // Fire confetti
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
      });

      toast({
        title: "مبروك! تم تأكيد المباشرة ورفع المسوغات بنجاح 🎓🎉",
        description: "تم تحديث ملفك في إدارة الموارد البشرية، ونتمنى لك بداية موفقة.",
      });
    }, 1000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-700" dir="rtl">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-bold text-sm">جاري تحميل ملف المباشرة وأمر التعيين...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4" dir="rtl">
        <Card className="max-w-md w-full text-center p-6 space-y-4 shadow-lg rounded-2xl">
          <FileText className="w-12 h-12 text-slate-400 mx-auto" />
          <h2 className="text-lg font-black text-slate-800">أمر التعيين غير موجود أو انتهت صلاحيته</h2>
          <p className="text-xs text-slate-500">يرجى التواصل مع إدارة الموارد البشرية للحصول على رابط صالح.</p>
        </Card>
      </div>
    );
  }

  // Count checklist completion
  const checklistKeys = [
    { key: "id_copy", label: "صورة الهوية الوطنية / الإقامة", required: true },
    { key: "educational_cert", label: "المؤهل العلمي وشهادة التخرج", required: true },
    { key: "medical_report", label: "التقرير والكشف الطبي المعتمد", required: true },
    { key: "criminal_record", label: "شهادة خلو السوابق / براءة الذمة", required: false },
    { key: "bank_iban", label: "شهادة الآيبان البنكي (لتحويل الراتب)", required: true },
    { key: "experience_certs", label: "شهادات الخبرة والتوصيات", required: false },
  ];

  const completedCount = checklistKeys.filter((k) => !!(checklist as any)[k.key] || !!uploadedFiles[k.key]).length;

  return (
    <div className="min-h-screen bg-slate-50/80 text-slate-900 py-8 px-3 sm:px-6" dir="rtl">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Top Brand Banner */}
        <div className="flex items-center justify-between bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-500/20 p-2 flex items-center justify-center shadow-xs">
              <img src={tawzeefLogo} alt="Tawzeef-X" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                {order.company_name || "مدارس الأندلس الأهلية"}
              </h1>
              <p className="text-xs text-emerald-700 font-bold">بوابة استكمال مسوغات التعيين والمباشرة الرسمية 🎓</p>
            </div>
          </div>
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-xs">
            أمر تعيين #{order.order_number}
          </Badge>
        </div>

        {/* Welcome & Success Card */}
        {isCompleted ? (
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6 rounded-3xl shadow-lg text-center space-y-3">
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-black">أهلاً بك معنا يا {order.candidate_name}! 🎉</h2>
            <p className="text-xs text-emerald-100 max-w-lg mx-auto leading-relaxed">
              تم استلام مسوغات التعيين وتوقيع إقرار المباشرة بنجاح. ملفك معتمد الآن وجاهز لبدء العمل في{" "}
              <strong>{order.target_branch}</strong> بتاريخ <strong>{order.joining_date}</strong>.
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <Button onClick={() => window.print()} className="bg-white text-emerald-800 hover:bg-slate-100 font-bold text-xs rounded-xl shadow-sm gap-1.5">
                <Printer className="w-4 h-4" />
                طباعة قرار التعيين المعتمد
              </Button>
            </div>
          </motion.div>
        ) : (
          <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white p-6 rounded-3xl shadow-md space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-bold mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>مرحباً بك في أسرة العمل</span>
            </div>
            <h2 className="text-xl font-black">أهلاً بك، {order.candidate_name} 👋</h2>
            <p className="text-xs text-emerald-100 leading-relaxed max-w-xl">
              يسعدنا صدور قرار تعيينك الرسمي بمسمى <strong>({order.job_title})</strong>. يرجى مراجعة تفاصيل التعيين، ورفع المستندات المطلوبة، والتوقيع الرقمي لتأكيد المباشرة.
            </p>
          </div>
        )}

        {/* Placement Summary Grid */}
        <Card className="rounded-2xl border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-sm font-black text-slate-800 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-600" />
              تفاصيل الوظيفة والمقر المعتمد
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400 text-[11px] block">المسمى الوظيفي:</span>
                <span className="font-black text-slate-900 block">{order.job_title}</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 text-[11px] block">المجمع / الفرع:</span>
                <span className="font-bold text-emerald-700 block">{order.target_branch}</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 text-[11px] block">تاريخ المباشرة:</span>
                <span className="font-black text-slate-900 block">{order.joining_date || "مع بداية العام الدراسي"}</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 text-[11px] block">إجمالي الراتب الشهري:</span>
                <span className="font-black text-emerald-700 text-sm block">
                  {order.total_salary.toLocaleString()} <SARSymbol />
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 1: Upload Documents Section */}
        <Card className="rounded-2xl border-slate-200 shadow-sm bg-white">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-emerald-600" />
                  مسوغات ومستندات التعيين المطلوبة
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  يرجى التقاط أو رفع صور واضحة لمسوغات التعيين من جوالك أو جهازك.
                </CardDescription>
              </div>
              <div className="text-left">
                <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  {completedCount} / {checklistKeys.length} مكتمل
                </span>
              </div>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-3">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                style={{ width: `${(completedCount / checklistKeys.length) * 100}%` }}
              />
            </div>
          </CardHeader>

          <CardContent className="p-5 space-y-3">
            {checklistKeys.map((item) => {
              const isDone = !!(checklist as any)[item.key] || !!uploadedFiles[item.key];
              const fileName = uploadedFiles[item.key];

              return (
                <div
                  key={item.key}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border transition-all ${
                    isDone ? "bg-emerald-50/40 border-emerald-200" : "bg-slate-50/60 border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2.5 mb-2 sm:mb-0">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        isDone ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {isDone ? <Check className="w-3.5 h-3.5" /> : "•"}
                    </div>
                    <div>
                      <span className="font-bold text-xs text-slate-900 block">{item.label}</span>
                      {fileName ? (
                        <span className="text-[10px] text-emerald-700 font-mono font-medium">مرفق: {fileName}</span>
                      ) : isDone ? (
                        <span className="text-[10px] text-emerald-600 font-medium">تم التحقق من الملف سابقاً ✅</span>
                      ) : (
                        <span className="text-[10px] text-slate-400">
                          {item.required ? "مطلوب لإتمام المباشرة" : "اختياري"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => handleUploadFile(item.key, e)}
                        disabled={uploadingField === item.key || isCompleted}
                      />
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          isDone
                            ? "bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-50"
                            : "bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 shadow-xs"
                        }`}
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        {uploadingField === item.key ? "جاري الرفع..." : isDone ? "تحديث الملف" : "رفع المستند"}
                      </span>
                    </label>
                  </div>
                </div>
              );
            })}

            {/* Bank IBAN Input */}
            <div className="pt-2">
              <Label className="text-xs font-bold text-slate-800 block mb-1">
                رقم الحساب البنكي الدولي (IBAN) لتحويل الراتب
              </Label>
              <div className="relative">
                <Input
                  placeholder="SA0000000000000000000000"
                  value={bankIbanInput}
                  onChange={(e) => {
                    setBankIbanInput(e.target.value.toUpperCase());
                    if (e.target.value.length > 10) {
                      setChecklist((prev) => ({ ...prev, bank_iban: true }));
                    }
                  }}
                  className="font-mono text-xs uppercase h-10 rounded-xl bg-slate-50"
                  dir="ltr"
                  disabled={isCompleted}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Digital Signature & Acknowledgment */}
        <Card className="rounded-2xl border-slate-200 shadow-sm bg-white">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-black text-slate-800 flex items-center gap-2">
              <PenLine className="w-4 h-4 text-emerald-600" />
              التوقيع الرقمي وإقرار المباشرة
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              أقر أنا <strong>{order.candidate_name}</strong> بصحة البيانات المسجلة وقبولي المباشرة في الموعد المحدد.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            {!isCompleted && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>وقّع بيدك أو بالقلم داخل المربع التالي:</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearSignature}
                    className="h-7 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 gap-1"
                  >
                    <Eraser className="w-3.5 h-3.5" />
                    مسح التوقيع
                  </Button>
                </div>

                <div className="border-2 border-dashed border-emerald-300 rounded-2xl bg-emerald-50/20 overflow-hidden relative touch-none">
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={160}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-36 cursor-crosshair bg-transparent"
                  />
                  {!hasSignature && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-xs text-slate-400 font-medium">
                      ارسم توقيعك هنا ✍️
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Submit Action Button */}
            {!isCompleted ? (
              <Button
                onClick={handleCompleteOnboarding}
                disabled={submitting}
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-md gap-2"
              >
                {submitting ? "جاري الاعتماد وتأكيد المباشرة..." : "تأكيد واستكمال مسوغات التعيين والمباشرة ✅"}
              </Button>
            ) : (
              <div className="text-center py-2 text-xs font-bold text-emerald-800 bg-emerald-50 rounded-xl p-3 border border-emerald-200">
                ✓ تم توثيق التوقيع واعتماد مباشرة العمل رسمياً.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer Note */}
        <div className="text-center text-[10px] text-slate-400 pb-6">
          منظومة التوظيف والمباشرة الرقمية الذكية © 2026 Tawzeef-X · جميع الحقوق محفوظة
        </div>
      </div>
    </div>
  );
}
