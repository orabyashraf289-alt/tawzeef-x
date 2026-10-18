import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Copy,
  Check,
  Printer,
  MessageCircle,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  User,
  Building2,
  Calendar,
  Briefcase,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import confetti from "canvas-confetti";
import tawzeefLogo from "@/assets/tawzeef-x-logo.png";
import { useAuth } from "@/contexts/AuthContext";

export type ApplicantAccountStatus = "preparing" | "invited" | "existing" | "error";

interface ApplySuccessPassProps {
  job: any;
  trackingCode: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  schoolDisplayName: string;
  accountStatus: ApplicantAccountStatus;
  onRetryAccount: () => void;
}

export default function ApplySuccessPass({
  job,
  trackingCode,
  applicantName,
  applicantEmail,
  applicantPhone,
  schoolDisplayName,
  accountStatus,
  onRetryAccount,
}: ApplySuccessPassProps) {
  const [copied, setCopied] = useState(false);
  const { user } = useAuth();
  const signedInAsApplicant = user?.email?.toLowerCase() === applicantEmail.trim().toLowerCase();

  useEffect(() => {
    confetti({
      particleCount: 80,
      spread: 75,
      origin: { y: 0.6 },
    });
  }, []);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(trackingCode);
    setCopied(true);
    toast({ title: "تم نسخ الرقم المرجعي بنجاح ✅" });
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsAppSend = () => {
    const message = `طلب التقديم في منصة Tawzeef-X:\nالوظيفة: ${job?.title || "شاغر وظيفي"}\nالمنشأة: ${schoolDisplayName}\nالرقم المرجعي لتتبع الطلب: ${trackingCode}\nرابط المتابعة: ${window.location.origin}/portal?code=${encodeURIComponent(trackingCode)}`;
    const cleanPhone = applicantPhone.replace(/[^0-9]/g, "");
    window.open(`https://wa.me/${cleanPhone || ""}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handlePrint = () => {
    window.print();
  };

  const portalUrl = `${window.location.origin}/portal?code=${encodeURIComponent(trackingCode)}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background flex items-center justify-center p-4 sm:p-6" dir="rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="max-w-2xl w-full space-y-6 text-center"
      >
        {/* Animated Celebration Icon */}
        <div className="relative mx-auto w-20 h-20">
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
          <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 flex items-center justify-center shadow-xl shadow-emerald-500/25 border border-emerald-400/30">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-1.5">
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-bold gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            تم استلام وتوثيق طلبك بنجاح
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground">
            تهانينا {applicantName}! تم تقديم طلبك 🎉
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
            تم استلام ملفك لوظيفة <strong className="text-foreground">{job?.title}</strong> لدى{" "}
            <strong className="text-foreground">{schoolDisplayName}</strong>، وأصبح ملفك قيد المراجعة الفورية.
          </p>
        </div>

        {/* Digital Boarding Pass / Tracking Card */}
        <div className="bg-card rounded-3xl border border-border/80 shadow-2xl overflow-hidden text-right relative">
          <div className="h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500" />

          {/* Pass Top Banner */}
          <div className="p-6 sm:p-8 bg-gradient-to-b from-muted/30 to-transparent border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src={tawzeefLogo} alt="Tawzeef-X" className="w-10 h-10 object-contain" />
              <div>
                <p className="text-xs text-muted-foreground font-bold">بطاقة تتبع التقديم الرقمية</p>
                <h3 className="text-base font-black text-foreground">{job?.title}</h3>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">{schoolDisplayName}</p>
              </div>
            </div>

            {/* QR Code */}
            <div className="p-2.5 rounded-2xl bg-white border border-border/60 shadow-xs self-center sm:self-auto">
              <QRCodeSVG value={portalUrl} size={74} level="M" />
            </div>
          </div>

          {/* Tracking Code Section */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 block">
                  الرقم المرجعي لتتبع الطلب:
                </span>
                <span className="font-mono text-2xl font-black text-foreground tracking-wider">
                  {trackingCode}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyCode}
                className="h-9 px-3 gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15 font-bold rounded-xl"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "تم النسخ" : "نسخ الكود"}</span>
              </Button>
            </div>

            {/* Account activation is sent to the applicant's verified inbox. */}
            {applicantEmail && (
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 text-right text-xs space-y-2" aria-live="polite">
                <div className="flex items-center justify-between gap-2">
                  <strong className="text-foreground">حسابك في منصة Tawzeef-X</strong>
                  <Badge variant="outline" className="text-[10px]">{accountStatus === "preparing" ? "جارٍ التجهيز" : accountStatus === "invited" ? "دعوة مرسلة" : accountStatus === "existing" ? "حساب موجود" : "بحاجة لإعادة المحاولة"}</Badge>
                </div>
                <p className="text-muted-foreground">البريد المستخدم: <span dir="ltr" className="inline-block font-medium text-foreground">{applicantEmail}</span></p>
                {accountStatus === "preparing" && <p>نجهز لك الوصول إلى ملفك الشخصي.</p>}
                {accountStatus === "invited" && <p>أرسلنا رابط تفعيل الحساب إلى بريدك. افتح الرابط وحدد كلمة مرور خاصة بك، ثم ادخل لتعديل ملفك ومتابعة طلباتك.</p>}
                {accountStatus === "existing" && <p>لديك حساب بهذا البريد. سجل الدخول لعرض طلبك وتحديث ملفك. إذا نسيت كلمة المرور فاستخدم رابط الاستعادة.</p>}
                {accountStatus === "error" && (
                  <div className="space-y-2">
                    <p>تم حفظ طلب الوظيفة، لكن تعذر تجهيز الوصول إلى الحساب الآن. يمكنك إعادة المحاولة.</p>
                    <Button type="button" size="sm" variant="outline" onClick={onRetryAccount}>إعادة تجهيز الحساب</Button>
                  </div>
                )}
                {(accountStatus === "existing" || signedInAsApplicant) && (
                  <Link to={signedInAsApplicant ? "/seeker-dashboard" : "/auth?mode=login"} className="inline-block font-bold text-primary hover:underline">
                    {signedInAsApplicant ? "الانتقال إلى ملفي وطلباتي" : "تسجيل الدخول"}
                  </Link>
                )}
                {accountStatus === "existing" && !signedInAsApplicant && <Link to="/forgot-password" className="block text-primary hover:underline">استعادة كلمة المرور</Link>}
              </div>
            )}

            {/* Next Steps Timeline */}
            <div className="space-y-3 pt-2">
              <h4 className="font-bold text-xs text-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span>مسار ومراحل طلبك القادمة:</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
                  <span className="text-[10px] block font-bold">1. استلام الطلب</span>
                  <span className="font-black text-xs">مكتمل ✓</span>
                </div>
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/25 text-primary">
                  <span className="text-[10px] block font-bold">2. الفرز الذكي</span>
                  <span className="font-black text-xs">جاري الآن ⚡</span>
                </div>
                <div className="p-3 rounded-xl bg-muted/40 border border-border/40 text-muted-foreground">
                  <span className="text-[10px] block font-bold">3. المقابلة</span>
                  <span className="text-xs">المرحلة القادمة</span>
                </div>
                <div className="p-3 rounded-xl bg-muted/40 border border-border/40 text-muted-foreground">
                  <span className="text-[10px] block font-bold">4. العرض الوظيفي</span>
                  <span className="text-xs">المرحلة النهائية</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-border/50">
              <Link to={`/portal?code=${encodeURIComponent(trackingCode)}`} className="w-full">
                <Button className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold gap-2 shadow-sm">
                  <ShieldCheck className="w-4 h-4" />
                  متابعة حالة الطلب في البوابة 🔑
                </Button>
              </Link>

              <Button
                variant="outline"
                onClick={handleWhatsAppSend}
                className="w-full h-11 rounded-xl text-green-600 border-green-500/30 hover:bg-green-500/10 text-xs font-bold gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                إرسال كود التتبع إلى WhatsApp
              </Button>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrint}
                className="h-8 text-muted-foreground hover:text-foreground text-xs font-bold gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                طباعة إيصال التقديم
              </Button>

              <Link to="/" className="text-xs text-primary hover:underline font-bold flex items-center gap-1">
                <span>تصفح وظائف أخرى</span>
                <ChevronLeft className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
