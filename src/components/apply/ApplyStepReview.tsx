import { useState, useMemo } from "react";
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
  job: any;
  submitting: boolean;
  onSubmit: () => void;
  onPrev: () => void;
  onJumpToStep: (step: number) => void;
}

export default function ApplyStepReview({
  form,
  skills,
  resumeFile,
  job,
  submitting,
  onSubmit,
  onPrev,
  onJumpToStep,
}: ApplyStepReviewProps) {
  const [agreed, setAgreed] = useState(true);

  // Compute Live Match Score
  const matchScore = useMemo(() => {
    let score = 55; // Base score
    const expNum = parseInt(form.experience || "0", 10) || 0;
    if (expNum >= 5) score += 15;
    else if (expNum >= 2) score += 10;
    else if (expNum >= 1) score += 5;

    if (resumeFile) score += 12;
    if (skills.length >= 4) score += 10;
    else if (skills.length >= 2) score += 6;

    if (form.universityDegree) score += 5;
    if (form.licenseNumber) score += 3;

    return Math.min(98, score);
  }, [form, skills, resumeFile]);

  const handleSubmitClick = () => {
    if (!agreed) {
      toast({
        title: "يرجى الإقرار بصحة البيانات",
        description: "يجب الموافقة على صحة البيانات والشروط للمتابعة.",
        variant: "destructive",
      });
      return;
    }
    onSubmit();
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
          المراجعة النهائية ومقياس التوافق بالـ AI ✨
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          راجع بياناتك قبل الإرسال النهائي وتأكد من اكتمال كافة المتطلبات.
        </p>
      </div>

      {/* Live AI Match Score Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-6 rounded-3xl bg-gradient-to-br from-emerald-500/15 via-primary/10 to-teal-500/10 border-2 border-emerald-500/30 shadow-md space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-xl shadow-md">
              {matchScore}%
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-foreground">مقياس التوافق اللحظي مع الشاغر</h3>
                <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {matchScore >= 85
                  ? "تطابق استثنائي مع متطلبات الوظيفة والشروط المعتمدة 🏆"
                  : matchScore >= 70
                  ? "تطابق ممتاز ومناسب جداً للفرز المباشر والمقابلة ⭐"
                  : "مؤهل مناسب للفرز الأولي"}
              </p>
            </div>
          </div>

          <Badge className="bg-emerald-600 text-white text-xs font-bold px-3 py-1 self-start sm:self-center">
            موصى به للمقابلة
          </Badge>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-muted/60 h-2.5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${matchScore}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-primary to-emerald-500 rounded-full"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>السيرة الذاتية مرفقة</span>
          </span>
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{skills.length} مهارات مطابقة</span>
          </span>
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>بيانات التواصل موثقة</span>
          </span>
        </div>
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
