import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, FileCheck, CheckCircle2, X, ArrowLeft, ShieldCheck, AlertCircle, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FILE_LIMITS } from "@/lib/fileValidation";

interface ApplyStepCVProps {
  resumeFile: File | null;
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  isAnalyzingAI: boolean;
  aiAnalyzed: boolean;
  jobRequirements?: string[];
  onNext: () => void;
  onSkipManual: () => void;
}

export default function ApplyStepCV({ resumeFile, onFileSelect, onFileRemove, isAnalyzingAI, aiAnalyzed, jobRequirements = [], onNext, onSkipManual }: ApplyStepCVProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="space-y-2">
        <p className="text-xs font-semibold text-primary">لنبدأ بخبراتك</p>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">قدّم نفسك للفرصة القادمة</h2>
        <p className="text-sm text-muted-foreground leading-7 max-w-xl">أرفق سيرتك الذاتية لنساعدك في تعبئة البيانات المتاحة، ثم راجعها وأكمل طلبك خطوة بخطوة.</p>
      </div>

      <input ref={inputRef} type="file" id={resumeFile ? "change-resume" : "resume-input"} aria-label={resumeFile ? "استبدال السيرة الذاتية" : "اختيار السيرة الذاتية"} onChange={handleFileChange} accept={FILE_LIMITS.resume.allowedTypes.join(",")} className="hidden" />

      {resumeFile ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-primary/25 bg-primary/[0.03] overflow-hidden">
          <div className="p-4 sm:p-5 flex flex-wrap items-center gap-3">
            <div className="w-12 h-14 rounded-xl bg-card border border-border flex items-center justify-center text-primary shrink-0"><FileCheck className="w-6 h-6" /></div>
            <div className="flex-1 min-w-0 basis-40">
              <p className="font-semibold text-sm break-all" dir="auto">{resumeFile.name}</p>
              <p className="text-xs text-muted-foreground mt-1" dir="ltr">{(resumeFile.size / (1024 * 1024)).toFixed(2)} MB</p>
              <p className="text-xs text-primary flex items-center gap-1 mt-1.5"><CheckCircle2 className="w-3.5 h-3.5 shrink-0" />جاهز للإرسال مع الطلب</p>
            </div>
            <div className="flex items-center gap-1">
              <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} className="rounded-xl">استبدال</Button>
              <Button type="button" variant="ghost" size="icon" onClick={onFileRemove} title="إلغاء الملف" aria-label="إلغاء الملف" className="rounded-xl text-muted-foreground hover:text-destructive"><X className="w-4 h-4" /></Button>
            </div>
          </div>
          <div role="status" aria-live="polite" className="border-t border-primary/15 bg-card/60 px-4 sm:px-5 py-4 flex items-start gap-3">
            {isAnalyzingAI ? <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" /> : aiAnalyzed ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> : <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />}
            <div className="space-y-1">
              <p className="text-sm font-semibold">{isAnalyzingAI ? "جاري قراءة السيرة واستخراج البيانات المتاحة..." : aiAnalyzed ? "تمت قراءة السيرة الذاتية. راجع البيانات وأكمل الناقص." : "الملف مرفق؛ أكمل بياناتك يدويًا"}</p>
              <p className="text-xs leading-6 text-muted-foreground">{isAnalyzingAI ? "تجري القراءة على جهازك. لم يُرسل الملف بعد." : aiAnalyzed ? "قد لا تظهر كل المعلومات تلقائيًا. يمكنك تعديلها في الخطوة القادمة." : "لم نتمكن من استخراج نص قابل للقراءة. يمكنك المتابعة، وسيصل الملف لفريق التوظيف عند إرسال الطلب."}</p>
            </div>
          </div>
        </motion.div>
      ) : (
        <div onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(e) => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files?.[0]; if (file) onFileSelect(file); }} className={cn("rounded-2xl border-2 border-dashed px-5 py-8 sm:py-10 text-center transition-colors", isDragging ? "border-primary bg-primary/10" : "border-primary/30 bg-primary/[0.025] hover:bg-primary/5")}>
          <div className="w-16 h-16 rounded-2xl border border-primary/15 bg-card text-primary grid place-items-center mx-auto mb-5 shadow-sm"><Upload className="w-7 h-7" /></div>
          <h3 className="font-bold text-base sm:text-lg">سيرتك الذاتية، بداية طلبك</h3>
          <p className="text-sm text-muted-foreground mt-2 mb-5">اسحب الملف وأفلته هنا، أو اختره من جهازك</p>
          <Button type="button" onClick={() => inputRef.current?.click()} className="h-11 rounded-xl px-7 gap-2 font-semibold"><Upload className="w-4 h-4" />اختيار السيرة الذاتية</Button>
          <p className="text-xs text-muted-foreground leading-6 mt-4">ندعم ملفات PDF و DOC و DOCX حتى {FILE_LIMITS.resume.maxSizeLabel}.</p>
          <p className="text-xs text-muted-foreground leading-6">للمساعدة في تعبئة البيانات، استخدم PDF يحتوي على نص أو ملف DOCX.</p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4 text-xs leading-6">
        <div className="flex items-start gap-2.5"><FileText className="w-4 h-4 text-primary mt-1 shrink-0" /><div><p className="font-semibold text-foreground">قراءة محلية، ومراجعة منك</p><p className="text-muted-foreground">تُقرأ البيانات داخل المتصفح. يُرفع الملف عند إرسال الطلب فقط.</p></div></div>
        <div className="flex items-start gap-2.5"><ShieldCheck className="w-4 h-4 text-primary mt-1 shrink-0" /><div><p className="font-semibold text-foreground">تحليل السيرة بالذكاء الاصطناعي اختياري</p><p className="text-muted-foreground">ستجد موافقة منفصلة في المراجعة النهائية. يمكنك التقديم دونها.</p></div></div>
      </div>

      {jobRequirements.length > 0 && <details className="group rounded-xl border border-border bg-muted/20">
        <summary className="cursor-pointer list-none flex items-center justify-between gap-3 p-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl">ما المتطلبات التي ستراجعها؟<ChevronDown className="w-4 h-4 shrink-0 transition-transform group-open:rotate-180" /></summary>
        <ul className="px-4 pb-4 space-y-2 text-sm text-muted-foreground">{jobRequirements.slice(0, 4).map((requirement, index) => <li key={`${index}-${requirement}`} className="flex gap-2 leading-6"><span className="w-1.5 h-1.5 bg-primary/60 rounded-full mt-2 shrink-0" />{requirement}</li>)}</ul>
        {jobRequirements.length > 4 && <p className="px-4 pb-4 text-xs text-muted-foreground">ستظهر بقية المتطلبات في خطوة المراجعة النهائية.</p>}
      </details>}

      <div className="pt-5 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-border">
        <Button type="button" variant="ghost" onClick={onSkipManual} className="text-xs text-muted-foreground whitespace-normal h-auto min-h-11 px-2">المتابعة بدون سيرة ذاتية (إدخال يدوي)</Button>
        <Button type="button" onClick={onNext} disabled={isAnalyzingAI} className="h-12 px-6 rounded-xl font-semibold text-sm gap-2"><span>متابعة مراجعة البيانات</span><ArrowLeft className="w-4 h-4 shrink-0" /></Button>
      </div>
    </div>
  );
}
