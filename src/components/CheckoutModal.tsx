import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useCreateUpgradeRequest } from "@/hooks/useSubscription";
import { Sparkles, CheckCircle2, Building2, Send, Clock, Infinity } from "lucide-react";
import { motion } from "framer-motion";
import SARSymbol from "@/components/SARSymbol";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  planName: string;
  planNameAr: string;
  planId: string;
  price: number;
  limit: number;
}

export default function CheckoutModal({
  isOpen,
  onClose,
  planName,
  planNameAr,
  planId,
  price,
  limit,
}: CheckoutModalProps) {
  const createRequest = useCreateUpgradeRequest();
  const [step, setStep] = useState<"form" | "loading" | "success">("form");
  const [notes, setNotes] = useState("");

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep("loading");
    try {
      await createRequest.mutateAsync({
        targetPlanId: planId,
        targetPlanName: planNameAr,
        notes: notes.trim(),
      });
      setStep("success");
      toast({
        title: "تم إرسال طلب ترقية الباقة بنجاح! 🚀",
        description: "سيقوم فريق إدارة Tawzeef-X بمراجعة طلبك وتفعيل الباقة وإصدار الفاتورة.",
      });
    } catch (err: any) {
      console.error(err);
      setStep("form");
      toast({
        title: "تعذر إرسال الطلب",
        description: err.message || "يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setStep("form");
    setNotes("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden bg-card border-border/80" dir="rtl">
        {step === "form" && (
          <div className="p-6 space-y-6">
            <DialogHeader className="text-right">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2">
                <Sparkles className="w-5 h-5" />
              </div>
              <DialogTitle className="text-xl font-bold" style={{ fontFamily: "'Cairo', sans-serif" }}>
                طلب ترقية الباقة إلى <span className="text-primary">{planNameAr}</span>
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground" style={{ fontFamily: "'Cairo', sans-serif" }}>
                أرسل طلب ترقية الباقة إلى إدارة المنصة ليتم التفعيل وتوليد الفاتورة المخصصة لشركتك.
              </DialogDescription>
            </DialogHeader>

            {/* Plan Preview Card */}
            <div className="bg-muted/40 p-4 rounded-xl border border-border/50 space-y-3 text-sm">
              <div className="flex justify-between items-center font-bold">
                <span className="text-muted-foreground">الباقة المختارة:</span>
                <span className="text-primary text-base">{planNameAr}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">تحدِيد الوظائف:</span>
                <span className="font-semibold text-foreground flex items-center gap-1">
                  {limit === -1 ? (
                    <><Infinity className="w-4 h-4 text-primary" /> غير محدود</>
                  ) : (
                    `${limit} منشور توظيف`
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-border/40">
                <span className="text-muted-foreground">السعر التقديري:</span>
                <span className="font-black text-base text-foreground flex items-center gap-1">
                  {price === 0 ? "مجاني" : <>{price} <SARSymbol className="w-3.5 h-3.5" /> / شهرياً</>}
                </span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitRequest} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">ملاحظات أو متطلبات إضافية (اختياري)</Label>
                <Textarea
                  placeholder="مثال: نرغب في إضافة عدد فروع إضافي، أو تحديد تاريخ تفعيل معين..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="text-sm"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <Button type="button" variant="outline" onClick={() => { resetForm(); onClose(); }} className="flex-1">
                  إلغاء
                </Button>
                <Button type="submit" className="flex-[2] font-bold gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Send className="w-4 h-4" />
                  إرسال طلب الترقية
                </Button>
              </div>
            </form>
          </div>
        )}

        {step === "loading" && (
          <div className="p-12 text-center space-y-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-bold text-foreground">جاري إرسال طلب الترقية إلى إدارة Tawzeef-X...</p>
          </div>
        )}

        {step === "success" && (
          <div className="p-8 text-center space-y-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600"
            >
              <CheckCircle2 className="w-10 h-10" />
            </motion.div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-foreground" style={{ fontFamily: "'Cairo', sans-serif" }}>
                تم إرسال الطلب بنجاح! 🚀
              </h3>
              <p className="text-sm text-muted-foreground" style={{ fontFamily: "'Cairo', sans-serif" }}>
                تم تسجيل طلب الترقية إلى باقة <span className="text-primary font-bold">{planNameAr}</span>. سيتم مراجعة الطلب بواسطة إدارة المنصة وتأكيد التفعيل فوراً.
              </p>
            </div>

            <Button
              onClick={() => { resetForm(); onClose(); }}
              className="w-full font-bold bg-primary hover:bg-primary/90"
            >
              تم
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
