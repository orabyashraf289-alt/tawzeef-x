import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, FileText, PenLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import tawzeefLogo from "@/assets/tawzeef-x-logo.png";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Summary = {
  order_number: string;
  candidate_name: string;
  job_title: string;
  company_name: string | null;
  target_branch: string | null;
  joining_date: string | null;
  total_salary: number;
  currency: string;
  status: string;
  onboarding_acknowledged_at: string | null;
};

const validToken = (value: string | undefined) => !!value &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

function isSummary(value: unknown): value is Summary {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return ["order_number", "candidate_name", "job_title", "currency", "status"]
    .every(key => typeof row[key] === "string") && typeof row.total_salary === "number";
}

export default function OrderOnboardingPortal() {
  const { orderId: token } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setOrder(null);
    const load = async () => {
      if (!validToken(token)) { setLoading(false); return; }
      const { data, error } = await supabase.rpc("get_order_onboarding" as any, { _token: token });
      if (!active) return;
      if (error) toast({ title: "تعذر تحميل أمر التعيين", variant: "destructive" });
      setOrder(isSummary(data) ? data : null);
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [token]);

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * canvas.width / rect.width,
      y: (event.clientY - rect.top) * canvas.height / rect.height };
  };

  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(event.pointerId);
    drawing.current = true;
    const { x, y } = point(event);
    const context = canvas.getContext("2d")!;
    context.beginPath();
    context.moveTo(x, y);
  };

  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !canvasRef.current) return;
    const { x, y } = point(event);
    const context = canvasRef.current.getContext("2d")!;
    context.lineWidth = 3;
    context.lineCap = "round";
    context.strokeStyle = "#047857";
    context.lineTo(x, y);
    context.stroke();
    setHasSignature(true);
  };

  const acknowledge = async () => {
    if (!token || !hasSignature || !canvasRef.current) return;
    setSubmitting(true);
    try {
      const signature = canvasRef.current.toDataURL("image/png");
      if (signature.length > 200000) throw new Error("التوقيع كبير جدًا، يرجى مسحه وإعادة رسمه");
      const { data, error } = await supabase.rpc("acknowledge_order_onboarding" as any,
        { _token: token, _signature: signature });
      if (error) throw error;
      if (data !== true) throw new Error("لم يُحفظ الإقرار؛ ربما تم إقراره سابقًا أو تغيرت حالة الأمر");
      setOrder(previous => previous ? { ...previous, onboarding_acknowledged_at: new Date().toISOString() } : null);
      toast({ title: "تم حفظ إقرارك، وستراجع إدارة الموارد البشرية الملف" });
    } catch (error) {
      toast({ title: "تعذر حفظ الإقرار", description: error instanceof Error ? error.message : undefined,
        variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div dir="rtl" className="min-h-screen grid place-items-center text-slate-600">جاري تحميل أمر التعيين...</div>;
  if (!order) return (
    <div dir="rtl" className="min-h-screen grid place-items-center bg-slate-50 p-4">
      <Card className="max-w-md w-full p-6 text-center space-y-3">
        <FileText className="mx-auto text-slate-400" />
        <h1 className="font-bold">رابط أمر التعيين غير صالح أو لم يعد متاحًا</h1>
        <p className="text-sm text-slate-500">يرجى التواصل مع إدارة الموارد البشرية للحصول على رابط صحيح.</p>
      </Card>
    </div>
  );

  return (
    <main dir="rtl" className="min-h-screen bg-slate-50 p-4 sm:py-10 text-slate-900">
      <div className="max-w-2xl mx-auto space-y-5">
        <header className="flex items-center gap-3 bg-white border rounded-2xl p-4">
          <img src={tawzeefLogo} alt="Tawzeef-X" className="w-10 h-10 object-contain" />
          <div><h1 className="font-bold">إقرار استلام أمر التعيين</h1>
            <p className="text-sm text-slate-500">{order.company_name} · {order.order_number}</p></div>
        </header>
        <Card>
          <CardHeader><CardTitle className="text-lg">أهلًا {order.candidate_name}</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>المسمى الوظيفي: <strong>{order.job_title}</strong></p>
            <p>الفرع: <strong>{order.target_branch || "يحدد لاحقًا"}</strong></p>
            <p>تاريخ المباشرة المقترح: <strong>{order.joining_date || "يحدد لاحقًا"}</strong></p>
            <p>إجمالي الراتب الشهري: <strong>{order.total_salary.toLocaleString()} {order.currency}</strong></p>
            <p className="rounded-xl bg-amber-50 p-3 text-amber-900">
              توقيعك هنا يثبت استلام تفاصيل الأمر. تراجع الإدارة المستندات وتؤكد المباشرة في خطوة منفصلة.
            </p>
          </CardContent>
        </Card>
        {order.onboarding_acknowledged_at ? (
          <Card className="border-emerald-200"><CardContent className="p-6 flex items-center gap-3 text-emerald-800">
            <CheckCircle2 /> تم تسجيل إقرار استلامك. ستتواصل معك إدارة الموارد البشرية لاستكمال المسوغات.
          </CardContent></Card>
        ) : (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><PenLine size={18} /> توقيع إقرار الاستلام</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">أقر أنا {order.candidate_name} باستلام ومراجعة بيانات أمر التعيين الموضحة أعلاه.</p>
              <canvas ref={canvasRef} width={600} height={160} onPointerDown={start}
                onPointerMove={draw} onPointerUp={() => { drawing.current = false; }}
                onPointerCancel={() => { drawing.current = false; }}
                className="w-full h-40 touch-none rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/20" />
              <div className="flex justify-between gap-3">
                <Button type="button" variant="outline" onClick={() => {
                  const canvas = canvasRef.current;
                  canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
                  setHasSignature(false);
                }}>مسح التوقيع</Button>
                <Button onClick={acknowledge} disabled={submitting || !hasSignature}>
                  {submitting ? "جاري الحفظ..." : "تسجيل إقرار الاستلام"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
