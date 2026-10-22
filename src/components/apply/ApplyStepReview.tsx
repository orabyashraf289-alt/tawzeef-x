import { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Sparkles,
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Award,
  Clock,
  DollarSign,
  FileCheck,
  Edit2,
  ShieldCheck,
  ArrowRight,
  Send,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import SARSymbol from "@/components/SARSymbol";
import type { ApplicationEvidence } from "@/lib/applicationEvidence";

interface ApplyStepReviewProps {
  form: {
    name: string;
    email: string;
    phone: string;
    location: string;
    currentTitle: string;
    experience: string;
    linkedinUrl: string;
    portfolioUrl: string;
    universityDegree: string;
    major: string;
    universityName: string;
    gradYear: string;
    licenseNumber: string;
    licenseExpiry: string;
    noticePeriod: string;
    expectedSalary: string;
    workMode: string;
    coverLetter: string;
    demoVideoUrl: string;
  };
  skills: string[];
  resumeFile: File | null;
  resumeReadable: boolean;
  evidence: ApplicationEvidence;
  job: any;
  submitting: boolean;
  onSubmit: (aiConsent: boolean) => void;
  onPrev: () => void;
  onJumpToStep: (step: number) => void;
}

export default function ApplyStepReview({
  form,
  skills,
  resumeFile,
  resumeReadable,
  evidence,
  job,
  submitting,
  onSubmit,
  onPrev,
  onJumpToStep,
}: ApplyStepReviewProps) {
  const [agreed, setAgreed] = useState(false);
  const [aiConsent, setAiConsent] = useState(false);

  const handleSubmitClick = () => {
    if (!agreed) {
      toast({
        title: "يرجى الإقرار بصحة البيانات",
        description: "يجب الموافقة على صحة البيانات والشروط للمتابعة.",
        variant: "destructive",
      });
      return;
    }
    onSubmit(aiConsent && resumeReadable);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="space-y-1.5 text-right">
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold text-xs">
            الخطوة 5 من 5 (النهائية)
          </Badge>
          <span className="text-xs text-muted-foreground">المراجعة والاعتماد</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-foreground">
          راجع طلبك ومتطلبات الوظيفة
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          راجع بياناتك قبل الإرسال النهائي وتأكد من اكتمال كافة المتطلبات.
        </p>
      </div>

      {/* Evidence-based ATS preview; the hiring team makes the final decision. */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-5 rounded-3xl bg-card border border-border shadow-sm space-y-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> مراجعة المتطلبات بنظام ATS
            </h3>
            <p className="text-xs text-muted-foreground mt-1">مقارنة إرشادية بين إعلان الوظيفة وما كتبته أو ظهر في نص سيرتك. القرار النهائي لفريق التوظيف.</p>
          </div>
          {evidence.total > 0 && <Badge variant="outline" className="shrink-0">
            {evidence.confirmed} من {evidence.total} مذكور
          </Badge>}
        </div>
        {!evidence.total ? <p className="text-xs text-muted-foreground rounded-xl bg-muted/50 p-3">لم تُنشر متطلبات قابلة للمقارنة لهذا الشاغر. يمكنك إرسال طلبك ليُراجع يدويًا.</p> :
          <div className="max-h-56 overflow-y-auto space-y-2">
            {evidence.requirements.map((item, index) => <div key={`${index}-${item.requirement}`} className="flex items-start gap-2 rounded-xl bg-muted/40 p-2.5 text-xs">
              {item.source === "unconfirmed" ? <Clock className="w-4 h-4 text-amber-600 shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
              <span className="flex-1">{item.requirement}</span>
              <span className="text-muted-foreground shrink-0">{item.source === "resume" ? "في السيرة" : item.source === "form" ? "في النموذج" : "يحتاج توضيحًا"}</span>
            </div>)}
          </div>}
        {resumeFile && !evidence.resumeReadable && <p className="text-xs text-amber-800 rounded-xl bg-amber-50 p-3">الملف مرفق، لكن لم نتمكن من قراءة نص كافٍ منه. راجع بياناتك المكتوبة؛ سيطّلع فريق التوظيف على الملف.</p>}
        {evidence.discrepancies.map(note => <p key={note} className="text-xs text-amber-800 rounded-xl bg-amber-50 p-3">{note}</p>)}
      </motion.div>

      {/* Review Summary Grid */}
      <div className="space-y-4">
        {/* Card 1: Personal & Contact */}
        <div className="bg-card/70 backdrop-blur-md rounded-2xl border border-border/70 p-5 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <h4 className="font-bold text-xs text-foreground flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-primary" />
              <span>البيانات الشخصية والمهنية:</span>
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onJumpToStep(2)}
              className="h-7 text-[11px] text-primary gap-1 font-bold hover:bg-primary/10 px-2"
            >
              <Edit2 className="w-3 h-3" />
              تعديل
            </Button>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground text-[11px] block">الاسم:</span>
              <span className="font-bold text-foreground">{form.name || "-"}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-[11px] block">البريد:</span>
              <span className="font-bold text-foreground font-mono" dir="ltr">{form.email || "-"}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-[11px] block">الجوال:</span>
              <span className="font-bold text-foreground font-mono" dir="ltr">{form.phone || "-"}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-[11px] block">المدينة:</span>
              <span className="font-bold text-foreground">{form.location || "غير محدد"}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-[11px] block">المسمى الحالي:</span>
              <span className="font-bold text-foreground">{form.currentTitle || "غير محدد"}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-[11px] block">الخبرة:</span>
              <span className="font-bold text-foreground">{form.experience || "غير محدد"}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Skills & Education */}
        <div className="bg-card/70 backdrop-blur-md rounded-2xl border border-border/70 p-5 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <h4 className="font-bold text-xs text-foreground flex items-center gap-2">
              <GraduationCap className="w-3.5 h-3.5 text-emerald-500" />
              <span>المهارات والمؤهلات الأكاديمية:</span>
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onJumpToStep(3)}
              className="h-7 text-[11px] text-primary gap-1 font-bold hover:bg-primary/10 px-2"
            >
              <Edit2 className="w-3 h-3" />
              تعديل
            </Button>
          </div>

          <div className="space-y-2.5 text-xs">
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {skills.map((s, idx) => (
                  <Badge key={idx} variant="secondary" className="text-[10px] font-bold">
                    {s}
                  </Badge>
                ))}
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-2 text-xs pt-1">
              <div>
                <span className="text-muted-foreground text-[11px] block">المؤهل الدراسي:</span>
                <span className="font-bold text-foreground">{form.universityDegree} {form.major ? `- ${form.major}` : ""}</span>
              </div>
              {form.licenseNumber && (
                <div>
                  <span className="text-muted-foreground text-[11px] block">الترخيص المهني:</span>
                  <span className="font-bold text-foreground font-mono" dir="ltr">{form.licenseNumber}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card 3: Preferences & Pitch */}
        <div className="bg-card/70 backdrop-blur-md rounded-2xl border border-border/70 p-5 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <h4 className="font-bold text-xs text-foreground flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              <span>التفضيلات ونبذة التقديم:</span>
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onJumpToStep(4)}
              className="h-7 text-[11px] text-primary gap-1 font-bold hover:bg-primary/10 px-2"
            >
              <Edit2 className="w-3 h-3" />
              تعديل
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground text-[11px] block">فترة الإشعار:</span>
              <span className="font-bold text-foreground">{form.noticePeriod || "متاح فوراً"}</span>
            </div>
            {form.expectedSalary && (
              <div>
                <span className="text-muted-foreground text-[11px] block">الراتب المتوقع:</span>
                <span className="font-bold text-foreground font-mono">{form.expectedSalary} ريال/شهر</span>
              </div>
            )}
          </div>

          {form.coverLetter && (
            <div className="pt-2 border-t border-border/30">
              <span className="text-muted-foreground text-[11px] block mb-1">خطاب التقديم:</span>
              <p className="text-muted-foreground text-xs leading-relaxed bg-muted/30 p-2.5 rounded-xl border border-border/40 line-clamp-3">
                {form.coverLetter}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Declaration Checkbox */}
      <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex items-start gap-3">
        <Checkbox
          id="ai-resume-consent"
          checked={aiConsent && resumeReadable}
          disabled={!resumeReadable || submitting}
          onCheckedChange={(checked) => setAiConsent(checked === true)}
          className="mt-0.5"
        />
        <label htmlFor="ai-resume-consent" className="text-xs text-foreground leading-relaxed cursor-pointer select-none">
          <span className="font-bold">اختياري: تحليل السيرة بالذكاء الاصطناعي</span>
          <span className="block mt-1">أوافق على حفظ مقتطف من نص سيرتي المهنية بعد إزالة بيانات الاتصال الواضحة، وإرساله مع بياناتي المهنية ومتطلبات الوظيفة إلى Google Gemini عندما يطلب مسؤول التوظيف التقييم. قد تبقى بيانات شخصية أخرى في نص السيرة. التقييم إرشادي ويُراجع بشريًا، ويمكنني التقديم دون هذه الموافقة.</span>
          {!resumeReadable && <span className="block mt-1 text-muted-foreground">يتاح هذا الخيار عند إرفاق سيرة يمكن قراءة نصها.</span>}
        </label>
      </div>
      <div className="p-4 rounded-2xl bg-card border border-border/60 flex items-start gap-3">
        <Checkbox
          id="agree-terms"
          checked={agreed}
          onCheckedChange={(checked) => setAgreed(!!checked)}
          className="mt-0.5"
        />
        <label htmlFor="agree-terms" className="text-xs text-foreground font-medium leading-relaxed cursor-pointer select-none">
          أقر بصحة ودقة كافة المعلومات والبيانات والوثائق المدخلة في هذا الطلب، وأوافق على معالجتها من قبل فريق التوظيف في Tawzeef-X لأغراض الفرز والمقابلة.
        </label>
      </div>

      {/* Navigation & Final Submit Button */}
      <div className="pt-4 flex items-center justify-between gap-3 border-t border-border/50">
        <Button
          type="button"
          variant="outline"
          onClick={onPrev}
          disabled={submitting}
          className="h-11 px-6 rounded-2xl text-xs font-bold gap-2"
        >
          <ArrowRight className="w-4 h-4 rotate-180 sm:rotate-0" />
          <span>السابق</span>
        </Button>

        <Button
          type="button"
          onClick={handleSubmitClick}
          disabled={submitting}
          className="h-14 px-10 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-sm shadow-xl shadow-emerald-600/20 gap-2.5 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>جاري إرسال واعتماد الطلب...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>إرسال طلب التقديم واعتماد الترشيح 🚀</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
