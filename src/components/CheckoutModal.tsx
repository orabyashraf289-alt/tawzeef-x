import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useUpgradeSubscription } from "@/hooks/useSubscription";
import { CreditCard, ShieldCheck, KeyRound, Loader2, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  const upgradeSub = useUpgradeSubscription();
  const [step, setStep] = useState<"form" | "otp" | "loading" | "success">("form");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardType, setCardType] = useState<"unknown" | "visa" | "mastercard" | "mada">("unknown");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpTimer, setOtpTimer] = useState(60);

  // Card type detection based on prefixes
  useEffect(() => {
    const cleanNum = cardNumber.replace(/\s/g, "");
    if (!cleanNum) {
      setCardType("unknown");
      return;
    }
    // Simple detection rules
    if (cleanNum.startsWith("4")) {
      setCardType("visa");
    } else if (/^(51|52|53|54|55|222|272)/.test(cleanNum)) {
      setCardType("mastercard");
    } else if (/^(588|601|636|968)/.test(cleanNum)) {
      setCardType("mada");
    } else {
      setCardType("unknown");
    }
  }, [cardNumber]);

  // OTP Countdown timer
  useEffect(() => {
    if (step !== "otp") return;
    const interval = setInterval(() => {
      setOtpTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  // Card input format helpers
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 16) val = val.slice(0, 16);
    // Add spaces every 4 digits
    const formatted = val.replace(/(\d{4})(?=\d)/g, "$1 ");
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 4) val = val.slice(0, 4);
    if (val.length > 2) {
      val = val.slice(0, 2) + "/" + val.slice(2);
    }
    setExpiry(val);
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 3);
    setCvv(val);
  };

  const handlePaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cardNumber.replace(/\s/g, "").length !== 16) {
      toast({ title: "رقم البطاقة غير مكتمل", variant: "destructive" });
      return;
    }
    if (expiry.length !== 5) {
      toast({ title: "تاريخ انتهاء الصلاحية غير صحيح", variant: "destructive" });
      return;
    }
    if (cvv.length !== 3) {
      toast({ title: "رمز التحقق (CVV) غير مكتمل", variant: "destructive" });
      return;
    }
    if (!cardName.trim()) {
      toast({ title: "يرجى كتابة اسم صاحب البطاقة", variant: "destructive" });
      return;
    }

    // Go to OTP
    setStep("otp");
    setOtpTimer(60);
    toast({ title: "تم إرسال رمز التحقق لجوالك 📱", description: "أدخل الرمز التجريبي 1234 للمتابعة" });
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode !== "1234") {
      toast({ title: "رمز التحقق غير صحيح", description: "استخدم الرمز التجريبي 1234 للموافقة على العملية", variant: "destructive" });
      return;
    }

    setStep("loading");
    try {
      await upgradeSub.mutateAsync({ planId, limit });
      setStep("success");
      toast({ title: "تمت ترقية باقة اشتراكك بنجاح! 🎉" });
    } catch (err: any) {
      console.error(err);
      setStep("form");
      toast({ title: "فشلت عملية الترقية", description: err.message, variant: "destructive" });
    }
  };

  const resetForm = () => {
    setStep("form");
    setCardNumber("");
    setExpiry("");
    setCvv("");
    setCardName("");
    setOtpCode("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[460px] p-0 overflow-hidden bg-card border-border/80" dir="rtl">
        {/* Step 1: Form & Premium Card Preview */}
        {step === "form" && (
          <div className="p-6 space-y-6">
            <DialogHeader className="text-right">
              <DialogTitle className="text-xl font-bold flex items-center gap-2" style={{ fontFamily: "'Cairo', sans-serif" }}>
                <CreditCard className="w-5 h-5 text-primary animate-pulse" />
                الدفع والترقية
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground" style={{ fontFamily: "'Cairo', sans-serif" }}>
                أنت تقوم بترقية حساب شركتك إلى باقة <span className="text-primary font-bold">{planNameAr}</span> بمبلغ <span className="text-foreground font-black">{price} SAR</span> شهرياً.
              </DialogDescription>
            </DialogHeader>

            {/* Credit Card Graphic Preview */}
            <div className="relative h-48 w-full bg-gradient-to-tr from-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-lg overflow-hidden border border-slate-800">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent)] pointer-events-none" />
              
              <div className="flex justify-between items-start mb-6">
                <div className="w-10 h-7 bg-amber-500/20 rounded-md border border-amber-500/30 flex items-center justify-center">
                  <div className="w-6 h-4 bg-amber-400/40 rounded-sm" /> {/* Chip */}
                </div>
                {/* Card Brand Badge */}
                <div className="font-bold text-lg tracking-wider italic">
                  {cardType === "visa" && <span className="text-blue-400 font-extrabold text-xl">VISA</span>}
                  {cardType === "mastercard" && <span className="text-orange-400 font-extrabold text-xl">Mastercard</span>}
                  {cardType === "mada" && <span className="text-emerald-400 font-extrabold text-xl">مدى mada</span>}
                  {cardType === "unknown" && <span className="text-slate-400 text-xs font-semibold">CARD</span>}
                </div>
              </div>

              {/* Card Number display */}
              <div className="text-lg font-mono tracking-[0.2em] mb-4 text-slate-200">
                {cardNumber || "•••• •••• •••• ••••"}
              </div>

              <div className="flex justify-between items-end text-xs">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase mb-0.5">اسم صاحب البطاقة</div>
                  <div className="font-semibold tracking-wide truncate max-w-[200px]">
                    {cardName.toUpperCase() || "NAME SURNAME"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-500 uppercase mb-0.5">صلاحية البطاقة</div>
                  <div className="font-semibold font-mono">
                    {expiry || "MM/YY"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-500 uppercase mb-0.5">رمز CVV</div>
                  <div className="font-semibold font-mono">
                    {focusedField === "cvv" ? cvv : "•••"}
                  </div>
                </div>
              </div>
            </div>

            {/* Input Form */}
            <form onSubmit={handlePaySubmit} className="space-y-4 text-right">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">رقم البطاقة الائتمانية</Label>
                <div className="relative">
                  <Input
                    required
                    placeholder="0000 0000 0000 0000"
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    onFocus={() => setFocusedField("cardNumber")}
                    className="text-left font-mono tracking-wider text-base"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">تاريخ الانتهاء</Label>
                  <Input
                    required
                    placeholder="MM/YY"
                    value={expiry}
                    onChange={handleExpiryChange}
                    onFocus={() => setFocusedField("expiry")}
                    className="text-center font-mono"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">رمز التحقق (CVV)</Label>
                  <Input
                    required
                    type="password"
                    placeholder="•••"
                    value={cvv}
                    onChange={handleCvvChange}
                    onFocus={() => setFocusedField("cvv")}
                    onBlur={() => setFocusedField(null)}
                    className="text-center font-mono"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">اسم صاحب البطاقة كما هو مكتوب عليها</Label>
                <Input
                  required
                  placeholder="مثال: AHMAD AL-OTAIBI"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  onFocus={() => setFocusedField("cardName")}
                  className="tracking-wider uppercase"
                />
              </div>

              <div className="pt-2">
                <Button type="submit" className="w-full h-11 text-base font-bold gap-2">
                  <ShieldCheck className="w-5 h-5" />
                  دفع وأمان بنكي ثلاثي الأبعاد
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Step 2: 3D Secure / OTP Simulation */}
        {step === "otp" && (
          <div className="p-6 space-y-6">
            <DialogHeader className="text-center">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto text-blue-600 mb-2">
                <KeyRound className="w-6 h-6 animate-pulse" />
              </div>
              <DialogTitle className="text-lg font-bold" style={{ fontFamily: "'Cairo', sans-serif" }}>
                التحقق الأمني ثلاثي الأبعاد (3D Secure)
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground" style={{ fontFamily: "'Cairo', sans-serif" }}>
                الرجاء إدخال رمز الأمان المرسل إلى رقم هاتفك المسجل لدى البنك المصدر للبطاقة.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleOtpVerify} className="space-y-6 text-center">
              <div className="max-w-[200px] mx-auto space-y-2">
                <Input
                  required
                  placeholder="••••"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  className="text-center text-2xl font-bold tracking-[1.5em] h-12 font-mono"
                  dir="ltr"
                  autoFocus
                />
                <span className="text-[11px] text-muted-foreground font-semibold">أدخل الرمز التجريبي: 1234</span>
              </div>

              <div className="text-sm text-muted-foreground">
                {otpTimer > 0 ? (
                  <span>إعادة إرسال الرمز خلال {otpTimer} ثانية</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setOtpTimer(60); toast({ title: "تم إعادة إرسال رمز الأمان 📲" }); }}
                    className="text-primary font-bold hover:underline"
                  >
                    إعادة إرسال رمز التحقق
                  </button>
                )}
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setStep("form")} className="flex-1">
                  تعديل البطاقة
                </Button>
                <Button type="submit" className="flex-1 font-bold">
                  تأكيد الدفع والخصم
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Step 3: Loading animation */}
        {step === "loading" && (
          <div className="p-12 text-center space-y-6">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
            <div>
              <h3 className="font-bold text-lg" style={{ fontFamily: "'Cairo', sans-serif" }}>جاري تأكيد المعاملة المالية...</h3>
              <p className="text-sm text-muted-foreground mt-1">يرجى عدم إغلاق هذه الصفحة أو تحديث المتصفح</p>
            </div>
          </div>
        )}

        {/* Step 4: Success Splash & Confetti particles animation */}
        {step === "success" && (
          <div className="relative p-8 text-center space-y-6 overflow-hidden">
            {/* Custom Confetti Elements (Pure CSS) */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(20)].map((_, index) => {
                const colors = ["bg-red-400", "bg-yellow-400", "bg-green-400", "bg-blue-400", "bg-pink-400", "bg-purple-400"];
                const colorClass = colors[index % colors.length];
                const delay = (index * 0.1).toFixed(2);
                const left = (5 + Math.random() * 90).toFixed(0);
                return (
                  <div
                    key={index}
                    className={`absolute w-2 h-4 ${colorClass} opacity-80 rounded-full animate-bounce`}
                    style={{
                      left: `${left}%`,
                      top: `-20px`,
                      animationDelay: `${delay}s`,
                      animationDuration: `${1.5 + Math.random() * 2}s`,
                      transform: `rotate(${Math.random() * 360}deg)`,
                      animationIterationCount: "infinite"
                    }}
                  />
                );
              })}
            </div>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600"
            >
              <CheckCircle2 className="w-12 h-12" />
            </motion.div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black text-foreground" style={{ fontFamily: "'Cairo', sans-serif" }}>
                مبارك! تم تفعيل اشتراكك 🎉
              </h3>
              <p className="text-sm text-muted-foreground" style={{ fontFamily: "'Cairo', sans-serif" }}>
                تمت ترقية باقة حساب شركتك بنجاح إلى الباقة الـ <span className="text-primary font-bold">{planNameAr}</span>.
              </p>
            </div>

            {/* Benefit details */}
            <div className="bg-muted/40 p-4 rounded-xl text-right text-xs space-y-2 border border-border/40 max-w-sm mx-auto">
              <div className="flex justify-between items-center text-foreground font-semibold">
                <span>الباقة الجديدة:</span>
                <span className="text-primary">{planNameAr}</span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>حد منشورات التوظيف:</span>
                <span className="font-bold text-foreground">
                  {limit === -1 ? "غير محدود" : `${limit} وظائف`}
                </span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>حالة الدفع:</span>
                <span className="text-emerald-600 font-bold">تم الدفع بنجاح ✅</span>
              </div>
            </div>

            <Button
              onClick={() => { resetForm(); onClose(); }}
              className="w-full h-11 font-bold bg-primary hover:bg-primary/90"
              style={{ fontFamily: "'Cairo', sans-serif" }}
            >
              الذهاب إلى لوحة التحكم
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
