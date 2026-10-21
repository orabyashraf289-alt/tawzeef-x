import { useState } from "react";
import { motion } from "framer-motion";
import {
  Upload,
  FileText,
  FileCheck,
  CheckCircle2,
  Sparkles,
  X,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  FileCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FILE_LIMITS } from "@/lib/fileValidation";

interface ApplyStepCVProps {
  resumeFile: File | null;
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  isAnalyzingAI: boolean;
  aiAnalyzed: boolean;
  onNext: () => void;
  onSkipManual: () => void;
}

export default function ApplyStepCV({
  resumeFile,
  onFileSelect,
  onFileRemove,
  isAnalyzingAI,
  aiAnalyzed,
  onNext,
  onSkipManual,
}: ApplyStepCVProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFileSelect(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Step Header */}
      <div className="space-y-1.5 text-right">
        <div className="flex items-center gap-2">
          <Badge className="bg-primary/10 text-primary border-primary/25 font-bold text-xs">
            الخطوة 1 من 5
          </Badge>
          <span className="text-xs text-muted-foreground">التعبئة التلقائية الذكية</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-foreground">
          ارفع سيرتك الذاتية ودع الذكاء الاصطناعي يكمل النموذج! 🚀
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          سنقوم بقراءة وتحليل بياناتك المهنية والمهارات تلقائياً لتوفير وقتك وجهدك.
        </p>
      </div>

      {/* Upload Drop Zone / Active File Card */}
      {resumeFile ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-6 rounded-3xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-card to-background space-y-4 shadow-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <FileCheck className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm text-foreground truncate">{resumeFile.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30 bg-emerald-500/10 gap-1 font-bold">
                    <CheckCircle2 className="w-3 h-3" />
                    جاهز للإرسال مع الطلب
                  </Badge>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    ({(resumeFile.size / (1024 * 1024)).toFixed(2)} MB)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <label htmlFor="change-resume" className="cursor-pointer text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/30 transition-colors">
                استبدال
                <input type="file" id="change-resume" onChange={handleFileChange} accept={FILE_LIMITS.resume.allowedTypes.join(",")} className="hidden" />
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onFileRemove}
                className="h-8 w-8 p-0 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                title="إلغاء الملف"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* AI Analysis Feedback */}
          {isAnalyzingAI && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-3 text-xs text-emerald-800 dark:text-emerald-200"
            >
              <Sparkles className="w-5 h-5 text-emerald-600 animate-spin shrink-0" />
              <div>
                <p className="font-bold">جاري استخراج المهارات والخبرات بالذكاء الاصطناعي...</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">يتم ملء الحقول تلقائياً لتراجعها في الخطوة القادمة.</p>
              </div>
            </motion.div>
          )}

          {aiAnalyzed && !isAnalyzingAI && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  تمت قراءة السيرة الذاتية. راجع البيانات وأكمل الناقص.
                </span>
                <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                  جاهز للمراجعة
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                انقر على زر "متابعة مراجعة البيانات" للتحقق من تفاصيلك الشخصية والمهنية وتعديل أي معلومة ترغب بها.
              </p>
            </motion.div>
          )}
        </motion.div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all bg-card/60 backdrop-blur-md group cursor-pointer relative overflow-hidden",
            isDragging
              ? "border-primary bg-primary/10 scale-[1.01] shadow-lg shadow-primary/10"
              : "border-border/80 hover:border-primary/60 hover:bg-card/90 hover:shadow-md"
          )}
        >
          <input type="file" id="resume-input" onChange={handleFileChange} accept={FILE_LIMITS.resume.allowedTypes.join(",")} className="hidden" />
          <label htmlFor="resume-input" className="cursor-pointer space-y-4 block">
            <div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 shadow-xs">
              <Upload className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <p className="text-base font-bold text-foreground">
                اسحب وأفلت ملف السيرة الذاتية هنا، أو <span className="text-primary underline font-black">تصفح ملفاتك</span>
              </p>
              <p className="text-xs text-muted-foreground">
                ندعم ملفات PDF و DOC و DOCX حتى {FILE_LIMITS.resume.maxSizeLabel}. يُرفع الملف عند إرسال الطلب.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/60 text-muted-foreground text-[11px] font-medium border border-border/40">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>بياناتك وسيرتك مشفرة ومحمية بخصوصية تامة</span>
            </div>
          </label>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="pt-4 flex items-center justify-between gap-3 border-t border-border/50">
        <Button
          type="button"
          variant="ghost"
          onClick={onSkipManual}
          className="text-xs text-muted-foreground hover:text-foreground font-bold"
        >
          المتابعة بدون سيرة ذاتية (إدخال يدوي)
        </Button>

        <Button
          type="button"
          onClick={onNext}
          disabled={isAnalyzingAI}
          className="h-12 px-8 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm shadow-md gap-2"
        >
          <span>متابعة مراجعة البيانات</span>
          <ArrowLeft className="w-4 h-4 rotate-180 sm:rotate-0" />
        </Button>
      </div>
    </div>
  );
}
