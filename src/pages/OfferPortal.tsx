import tawzeefLogo from "@/assets/tawzeef-x-logo.png";
import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  FileText,
  Building2,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  Gift,
  AlertCircle,
  PenLine,
  Eraser,
  Download } from "lucide-react";
import { generateOfferPdf } from "@/lib/offerPdf";
import { toast } from "@/hooks/use-toast";

import sarSymbol from "@/assets/sar-symbol.png";

interface Offer {
  id: string;
  position: string;
  department: string | null;
  salary: number;
  currency: string;
  start_date: string | null;
  offer_type: string;
  benefits: string[] | null;
  additional_terms: string | null;
  status: string;
  expires_at: string | null;
  sent_at: string | null;
  signature_url: string | null;
  company_id?: string | null;
}

const OFFER_TYPE_LABELS: Record<string, string> = {
  "full-time": "دوام كامل",
  "part-time": "دوام جزئي",
  "contract": "عقد مؤقت",
};

export default function OfferPortal() {
  const { token } = useParams<{ token: string }>();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [company, setCompany] = useState<{ name: string; logo_url: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responding, setResponding] = useState(false);
  const [notes, setNotes] = useState("");
  const [showResponse, setShowResponse] = useState(false);
  const [responseType, setResponseType] = useState<"accept" | "reject" | null>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = 160;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "hsl(var(--foreground))";
  };

  useEffect(() => {
    async function fetchOffer() {
      if (!token) {
        setError("رابط غير صالح");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc("get_offer_by_token", { _token: token });

      if (error || !data || (data as any[]).length === 0) {
        setError("لم يتم العثور على العرض");
        setLoading(false);
        return;
      }

      const offerData = Array.isArray(data) ? data[0] : data;

      if (offerData.status === "sent") {
        await supabase.rpc("respond_to_offer", { _token: token, _status: "viewed" });
        offerData.status = "viewed";
      }

      setOffer(offerData);

      if (offerData.company_id) {
        const { data: companyData } = await supabase
          .from("companies")
          .select("name, logo_url")
          .eq("id", offerData.company_id)
          .single();
        if (companyData) {
          setCompany(companyData);
        }
      }
      setLoading(false);
    }

    fetchOffer();
  }, [token]);

  useEffect(() => {
    if (showResponse && responseType === "accept") {
      setTimeout(resizeCanvas, 50);
    }
  }, [showResponse, responseType]);

  const pointFromEvent = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    if ("touches" in e && e.touches.length > 0) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }

    if ("clientX" in e) {
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    return null;
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const point = pointFromEvent(e);
    if (!ctx || !point) return;
    drawingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const point = pointFromEvent(e);
    if (!ctx || !point) return;
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  };

  const endDrawing = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSignatureData(canvas.toDataURL("image/png"));
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setSignatureData(null);
  };

  const handleResponse = async (accept: boolean) => {
    if (!offer || !token) return;

    // Rate limiting: prevent rapid submissions
    if (rateLimited) {
      toast({ title: "يرجى الانتظار", description: "لا يمكنك إرسال أكثر من طلب في وقت قصير", variant: "destructive" });
      return;
    }

    if (accept && !signatureData) {
      toast({ title: "التوقيع مطلوب", description: "يرجى التوقيع قبل قبول العرض.", variant: "destructive" });
      return;
    }

    // Verify token matches the offer (CSRF protection)
    if (offer.status !== "viewed" && offer.status !== "sent") {
      toast({ title: "لا يمكن تعديل هذا العرض", description: "تم الرد على هذا العرض مسبقاً", variant: "destructive" });
      return;
    }

    setResponding(true);
    setRateLimited(true);
    setTimeout(() => setRateLimited(false), 10000); // 10s cooldown

    const newStatus = accept ? "accepted" : "rejected";
    const { error } = await supabase.rpc("respond_to_offer", {
      _token: token,
      _status: newStatus,
      _response_notes: notes || null,
      _signature_url: accept ? signatureData : null,
    });

    if (error) {
      toast({ title: "حدث خطأ", description: error.message, variant: "destructive" });
    } else {
      setOffer({ ...offer, status: newStatus, signature_url: accept ? signatureData : null });
      toast({ title: accept ? "تم قبول العرض وتوثيق التوقيع بنجاح! 🎉" : "تم رفض العرض" });

      if (accept) {
        import("canvas-confetti").then((module) => {
          const confettiFn = module.default || module;
          confettiFn({
            particleCount: 180,
            spread: 90,
            origin: { y: 0.6 }
          });
        });
      }

      // Notify recruiter via email about candidate response
      try {
        // Get the full offer via RPC (secure token-based access)
        const { data: offerArr } = await supabase.rpc("get_offer_by_token", { _token: token });
        const fullOffer = Array.isArray(offerArr) && offerArr.length > 0 ? offerArr[0] : null;

        if (fullOffer?.user_id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", fullOffer.user_id)
            .single();

          const statusLabel = accept ? "قبول" : "رفض";
          const statusColor = accept ? "#10b981" : "#ef4444";
          const statusIcon = accept ? "✅" : "❌";

          // Send notification to recruiter via edge function
          await supabase.functions.invoke("send-email", {
            body: {
              to: "", // will be resolved by edge function using user_id
              subject: `${statusIcon} تم ${statusLabel} العرض الوظيفي - ${offer.position}`,
              html: `
              <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
                <div style="background: ${statusColor}; padding: 30px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 24px;">${statusIcon} تم ${statusLabel} العرض الوظيفي</h1>
                </div>
                <div style="padding: 30px;">
                  <p style="font-size: 16px; color: #374151;">مرحباً${profile?.full_name ? ` ${profile.full_name}` : ''}،</p>
                  <p style="font-size: 16px; color: #374151;">نود إبلاغك بأن المرشح قام بـ<strong>${statusLabel}</strong> العرض الوظيفي للمنصب:</p>
                  <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                    <p style="font-size: 20px; font-weight: bold; color: #374151; margin: 0;">${offer.position}</p>
                  </div>
                  ${notes ? `<div style="background: #f9fafb; border-radius: 8px; padding: 15px; margin: 15px 0;"><p style="font-size: 14px; color: #6b7280; margin: 0;"><strong>ملاحظات المرشح:</strong> ${notes}</p></div>` : ''}
                  <p style="font-size: 14px; color: #6b7280;">يمكنك مراجعة التفاصيل من لوحة التحكم.</p>
                </div>
              </div>`,
              user_id: fullOffer.user_id,
              notify_recruiter: true,
            },
          });
        }
      } catch (emailErr) {
        console.error("Failed to send notification email:", emailErr);
      }
    }

    setResponding(false);
    setShowResponse(false);
  };

  const formatSalary = (salary: number, currency: string) => {
    if (currency === "SAR") return new Intl.NumberFormat("ar-SA").format(salary);
    return new Intl.NumberFormat("ar-SA", { style: "currency", currency }).format(salary);
  };
  const isExpired = offer?.expires_at && new Date(offer.expires_at) < new Date();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-2">{error}</h1>
          <p className="text-muted-foreground">تأكد من صحة الرابط أو تواصل مع صاحب العمل</p>
        </div>
      </div>
    );
  }

  if (!offer) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center flex flex-col items-center justify-center space-y-2">
          <img src={company?.logo_url || tawzeefLogo} alt={company?.name || "Tawzeef-X"} className="w-16 h-16 object-contain rounded-xl shadow-md border border-border/40" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">{company?.name || "Tawzeef-X"}</h1>
            <p className="text-muted-foreground mt-1">خطاب عرض العمل الرسمي المقدم لك</p>
          </div>
        </motion.div>

        {(offer.status === "accepted" || offer.status === "rejected" || offer.status === "withdrawn" || isExpired) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`rounded-xl p-4 text-center ${offer.status === "accepted" ? "bg-primary/10 border border-primary/20" : offer.status === "withdrawn" ? "bg-muted border border-border" : "bg-destructive/10 border border-destructive/20"}`}
          >
            {offer.status === "accepted" ? (
              <>
                <CheckCircle2 className="w-10 h-10 text-primary mx-auto mb-2" />
                <p className="font-bold text-primary">تم قبول العرض</p>
              </>
            ) : offer.status === "rejected" ? (
              <>
                <XCircle className="w-10 h-10 text-destructive mx-auto mb-2" />
                <p className="font-bold text-destructive">تم رفض العرض</p>
              </>
            ) : offer.status === "withdrawn" ? (
              <>
                <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="font-bold text-muted-foreground">تم سحب هذا العرض</p>
                <p className="text-sm text-muted-foreground mt-1">تواصل مع صاحب العمل لمزيد من المعلومات</p>
              </>
            ) : (
              <>
                <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="font-bold text-muted-foreground">انتهت صلاحية العرض</p>
              </>
            )}
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-lg">
          <div className="bg-primary/5 p-6 border-b border-border/50">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground">{offer.position}</h2>
                {offer.department && (
                  <p className="text-muted-foreground flex items-center gap-1 mt-1">
                    <Building2 className="w-4 h-4" />
                    {offer.department}
                  </p>
                )}
              </div>
              <Badge variant="outline" className="text-xs">{OFFER_TYPE_LABELS[offer.offer_type] || offer.offer_type}</Badge>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {(() => {
              // Parse salary breakdown from additional_terms
              const breakdownMatch = offer.additional_terms?.match(/تفصيل الراتب:|Salary Breakdown:/);
              const hasBreakdown = !!breakdownMatch;
              let breakdownItems: { label: string; amount: string }[] = [];

              if (hasBreakdown && offer.additional_terms) {
                const lines = offer.additional_terms.split("\n");
                const startIdx = lines.findIndex(l => l.includes("تفصيل الراتب:") || l.includes("Salary Breakdown:"));
                if (startIdx !== -1) {
                  for (let i = startIdx + 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line || line === "") break;
                    const parts = line.split(":");
                    if (parts.length >= 2) {
                      breakdownItems.push({ label: parts[0].trim(), amount: parts.slice(1).join(":").trim() });
                    }
                  }
                }
              }

              const totalItem = breakdownItems.find(b => b.label === "الإجمالي" || b.label === "Total");
              const detailItems = breakdownItems.filter(b => b.label !== "الإجمالي" && b.label !== "Total");

              if (!hasBreakdown || detailItems.length === 0) {
                return (
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-primary/5">
                    <DollarSign className="w-8 h-8 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">الراتب الشهري</p>
                      <p className="text-2xl font-bold text-foreground flex items-center gap-2">
                        {formatSalary(offer.salary, offer.currency)}
                        {offer.currency === "SAR" && <img src={sarSymbol} alt="SAR" className="w-6 h-6 inline-block" style={{ verticalAlign: "middle" }} />}
                      </p>
                    </div>
                  </div>
                );
              }

              return (
                <div className="rounded-xl border border-primary/20 overflow-hidden">
                  <div className="bg-primary/5 p-4 flex items-center gap-3">
                    <DollarSign className="w-6 h-6 text-primary" />
                    <h3 className="font-bold text-foreground">تفصيل الراتب</h3>
                  </div>
                  <div className="p-4 space-y-3">
                    {detailItems.map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                        <span className="text-sm text-muted-foreground">{item.label}</span>
                        <span className="text-sm font-semibold text-foreground flex items-center gap-1">
                          {item.amount}
                          {offer.currency === "SAR" && !item.amount.includes("SAR") && (
                            <img src={sarSymbol} alt="SAR" className="w-4 h-4 inline-block" style={{ verticalAlign: "middle" }} />
                          )}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-3 border-t-2 border-primary/20">
                      <span className="text-sm font-bold text-primary">الإجمالي</span>
                      <span className="text-xl font-bold text-primary flex items-center gap-2">
                        {formatSalary(offer.salary, offer.currency)}
                        {offer.currency === "SAR" && <img src={sarSymbol} alt="SAR" className="w-5 h-5 inline-block" style={{ verticalAlign: "middle" }} />}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-2 gap-4">
              {offer.start_date && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <Calendar className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">تاريخ البدء</p>
                    <p className="text-sm font-medium">{new Date(offer.start_date).toLocaleDateString("ar-SA")}</p>
                  </div>
                </div>
              )}
              {offer.expires_at && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <Clock className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">صلاحية العرض</p>
                    <p className="text-sm font-medium">{new Date(offer.expires_at).toLocaleDateString("ar-SA")}</p>
                  </div>
                </div>
              )}
            </div>

            {offer.benefits && offer.benefits.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  <Gift className="w-4 h-4 text-primary" />
                  المزايا والفوائد
                </h3>
                <ul className="space-y-2">
                  {offer.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {offer.additional_terms && (
              <div>
                <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  شروط إضافية
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{offer.additional_terms}</p>
              </div>
            )}
          </div>
        </motion.div>

        {(offer.status === "viewed" || offer.status === "sent") && !isExpired && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-xl p-6 border border-border/50">
            {showResponse ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {responseType === "accept" ? "تأكيد قبول العرض مع توقيعك الرقمي" : "أنت على وشك رفض هذا العرض. هل تود توضيح السبب؟"}
                </p>

                {responseType === "accept" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <PenLine className="w-4 h-4 text-primary" />
                        التوقيع الإلكتروني
                      </label>
                      <Button variant="outline" size="sm" onClick={clearSignature}>
                        <Eraser className="w-3.5 h-3.5 ml-1" />
                        مسح
                      </Button>
                    </div>
                    <canvas
                      ref={canvasRef}
                      className="w-full h-40 border border-border rounded-lg bg-card touch-none"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={endDrawing}
                      onMouseLeave={endDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={endDrawing}
                    />
                    <p className="text-xs text-muted-foreground">وقّع داخل المربع (إلزامي عند القبول)</p>
                  </div>
                )}

                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ملاحظات (اختياري)..." rows={3} />

                <div className="flex gap-3">
                  <Button
                    onClick={() => handleResponse(responseType === "accept")}
                    disabled={responding}
                    className={responseType === "accept" ? "" : "bg-destructive hover:bg-destructive/90"}
                  >
                    {responding ? "جاري الإرسال..." : responseType === "accept" ? "تأكيد القبول" : "تأكيد الرفض"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowResponse(false)}>إلغاء</Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-4">
                <Button className="flex-1" onClick={() => { setResponseType("accept"); setShowResponse(true); }}>
                  <CheckCircle2 className="w-4 h-4 ml-1" />
                  قبول العرض
                </Button>
                <Button variant="outline" className="flex-1 border-destructive text-destructive hover:bg-destructive/10" onClick={() => { setResponseType("reject"); setShowResponse(true); }}>
                  <XCircle className="w-4 h-4 ml-1" />
                  رفض العرض
                </Button>
              </div>
            )}
          </motion.div>
        )}

        <div className="flex justify-center">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => generateOfferPdf({
              ...offer,
              company_name: company?.name || undefined,
              company_logo: company?.logo_url || undefined
            })} 
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            تحميل كملف PDF
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">هذا العرض خاص بك وسري. لا تشاركه مع أي شخص آخر.</p>
      </div>
    </div>
  );
}
