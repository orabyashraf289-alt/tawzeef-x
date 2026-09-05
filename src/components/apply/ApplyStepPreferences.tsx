import { useState } from "react";
import {
  Clock,
  DollarSign,
  FileText,
  Video,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Send,
  Wand2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import SARSymbol from "@/components/SARSymbol";

interface ApplyStepPreferencesProps {
  form: {
    noticePeriod: string;
    expectedSalary: string;
    workMode: string;
    coverLetter: string;
    demoVideoUrl: string;
    name: string;
    experience: string;
    currentTitle: string;
  };
  onChange: (field: string, value: string) => void;
  isEducational?: boolean;
  onNext: () => void;
  onPrev: () => void;
}

const NOTICE_PERIODS = [
  "متاح للبدء فوراً",
  "أسبوعان (14 يوم)",
  "شهر واحد (30 يوم)",
  "شهران (60 يوم)",
  "أكثر من شهرين",
];

const WORK_MODES = [
  "حضوري في مقر العمل",
  "هجين (حضوري + عن بعد)",
  "عن بعد بالكامل (Remote)",
];

export default function ApplyStepPreferences({
  form,
  onChange,
  isEducational = false,
  onNext,
  onPrev,
}: ApplyStepPreferencesProps) {
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const handleGenerateAIPitch = () => {
    setIsGeneratingAI(true);
    setTimeout(() => {
      const title = form.currentTitle || "المجال المطلوب";
      const exp = form.experience ? `${form.experience} سنوات من الخبرة` : "خبرة عملية متميزة";
      const pitch = `يسعدني التقدم لهذا الشاغر الوظيفي المتميز. بصفتي متخصصاً في ${title} مع ${exp}، أمتلك سجلاً حافلاً في تحقيق نتائج نوعية، وتطوير بيئات العمل، وحل المشكلات المعقدة. يسعدني تسخير مهاراتي وخبراتي للمساهمة في نجاح وتطور المؤسسة والوصول لأهدافها الاستراتيجية.`;
      onChange("coverLetter", pitch);
      setIsGeneratingAI(false);
    }, 600);
  };

  const inputClass = "h-11 rounded-xl border-border/70 bg-card/90 focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 text-xs sm:text-sm font-medium transition-all shadow-2xs";

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="space-y-1.5 text-right">
        <div className="flex items-center gap-2">
          <Badge className="bg-primary/10 text-primary border-primary/25 font-bold text-xs">
            الخطوة 4 من 5
          </Badge>
          <span className="text-xs text-muted-foreground">التفضيلات والرسالة التعريفية</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-foreground">
          شروط وتفضيلات العمل ونبذة عنك 💼
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          شاركنا تطلعاتك وفترة جاهزيتك ورسالتك التقديمية للوظيفة.
        </p>
      </div>

      <div className="bg-card/70 backdrop-blur-md rounded-3xl border border-border/70 p-6 space-y-5 shadow-xs">
        {/* Availability / Notice Period */}
        <div className="space-y-2">
          <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span>فترة الإشعار / تاريخ التفرغ للعمل:</span>
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {NOTICE_PERIODS.map(period => (
              <button
                key={period}
                type="button"
                onClick={() => onChange("noticePeriod", period)}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                  form.noticePeriod === period
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-background text-muted-foreground border-border/60 hover:border-primary/50 hover:bg-primary/5"
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>

        {/* Expected Salary & Work Mode */}
        <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-border/40">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <SARSymbol className="w-3.5 h-3.5 text-emerald-500" />
              <span>الراتب الشهري المتوقع (ريال سعودي):</span>
            </Label>
            <Input
              dir="ltr"
              type="number"
              value={form.expectedSalary}
              onChange={e => onChange("expectedSalary", e.target.value)}
              placeholder="مثال: 12000"
              className={cn(inputClass, "text-left font-mono")}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">طريقة العمل المفضلة:</Label>
            <div className="grid grid-cols-1 gap-1.5">
              {WORK_MODES.map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onChange("workMode", mode)}
                  className={`px-3 py-2 rounded-xl border text-[11px] font-bold transition-all text-right ${
                    form.workMode === mode
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-background text-muted-foreground border-border/60 hover:bg-muted"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cover Letter / Pitch */}
        <div className="space-y-2 pt-2 border-t border-border/40">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-primary" />
              <span>خطاب التقديم / نبذة تعريفية (Cover Letter):</span>
            </Label>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGenerateAIPitch}
              disabled={isGeneratingAI}
              className="h-7 text-[11px] font-bold gap-1 text-primary border-primary/30 hover:bg-primary/10 rounded-lg"
            >
              <Wand2 className="w-3 h-3 text-primary animate-pulse" />
              <span>صياغة بالذكاء الاصطناعي ✨</span>
            </Button>
          </div>

          <Textarea
            value={form.coverLetter}
            onChange={e => onChange("coverLetter", e.target.value)}
            rows={4}
            placeholder="اكتب نبذة مختصرة عن شغفك، أبرز إنجازاتك المهنية، ولماذا ترى نفسك المرشح المثالي لهذه الوظيفة..."
            className="rounded-2xl border-border/70 bg-card/90 resize-none text-xs sm:text-sm leading-relaxed focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-2xs"
          />
        </div>

        {/* Optional Demo Video URL */}
        <div className="space-y-1.5 pt-2 border-t border-border/40">
          <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Video className="w-3.5 h-3.5 text-indigo-500" />
            <span>
              {isEducational
                ? "رابط فيديو الحصة التجريبية (Demo Lesson Video URL - اختياري):"
                : "رابط فيديو تقديمي / Pitch Video / معرض أعمال مرئي (اختياري):"}
            </span>
          </Label>
          <Input
            dir="ltr"
            value={form.demoVideoUrl}
            onChange={e => onChange("demoVideoUrl", e.target.value)}
            placeholder="https://youtube.com/watch?v=... أو Loom أو Google Drive"
            className={cn(inputClass, "font-mono text-left")}
          />
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="pt-4 flex items-center justify-between gap-3 border-t border-border/50">
        <Button
          type="button"
          variant="outline"
          onClick={onPrev}
          className="h-11 px-6 rounded-2xl text-xs font-bold gap-2"
        >
          <ArrowRight className="w-4 h-4 rotate-180 sm:rotate-0" />
          <span>السابق</span>
        </Button>

        <Button
          type="button"
          onClick={onNext}
          className="h-12 px-8 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm shadow-md gap-2"
        >
          <span>متابعة: المراجعة الذكية ومقياس التوافق</span>
          <ArrowLeft className="w-4 h-4 rotate-180 sm:rotate-0" />
        </Button>
      </div>
    </div>
  );
}
