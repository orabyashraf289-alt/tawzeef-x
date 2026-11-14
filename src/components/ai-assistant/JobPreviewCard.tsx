import { motion } from "framer-motion";
import { Briefcase, Check, ExternalLink, Pencil, Sparkles, Trash2, XCircle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getApplyUrl } from "@/lib/getPublicUrl";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { extractJobFromMessage } from "./assistantHelpers";
import type { JobCreatedSummary, JobData, JobPreviewState } from "./assistantTypes";

interface JobPreviewCardProps {
  content: string;
  jobPreview?: JobPreviewState;
  jobCreated?: JobCreatedSummary;
  onConfirmJob: () => void;
  onOpenEditJob: (jobData: JobData) => void;
  onRejectJob: () => void;
  onDeleteJob: () => void;
  onOpenQr: (jobId: string, jobTitle: string) => void;
  onNavigateJob: (jobId: string) => void;
  onPrefillEditPrompt: (jobTitle: string) => void;
}

export default function JobPreviewCard({
  content,
  jobPreview,
  jobCreated,
  onConfirmJob,
  onOpenEditJob,
  onRejectJob,
  onDeleteJob,
  onOpenQr,
  onNavigateJob,
  onPrefillEditPrompt,
}: JobPreviewCardProps) {
  const extractedJob = extractJobFromMessage(content);
  const previewData = jobPreview?.data ?? extractedJob;

  return (
    <>
      {(jobPreview || extractedJob) && !jobCreated && previewData && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, type: "spring" }}
          className={cn(
            "mt-3 p-4 rounded-2xl border space-y-3 shadow-md transition-all",
            jobPreview?.status === "confirmed"
              ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
              : jobPreview?.status === "rejected"
                ? "bg-red-500/5 border-red-500/25 text-red-700 dark:text-red-300 opacity-60"
                : "bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-card border-2 border-emerald-500/40 text-foreground"
          )}
        >
          <div className="flex items-center justify-between text-xs font-bold">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 animate-bounce" />
              <span
                className={
                  jobPreview?.status === "confirmed"
                    ? "text-emerald-800 dark:text-emerald-300"
                    : jobPreview?.status === "rejected"
                      ? "text-red-800 dark:text-red-300"
                      : "text-emerald-800 dark:text-emerald-300 font-black"
                }
              >
                {jobPreview?.status === "confirmed"
                  ? "✅ تم إضافة الوظيفة في النظام"
                  : jobPreview?.status === "rejected"
                    ? "❌ تم إلغاء الإضافة"
                    : "✨ تمت مراجعة وصياغة الشاغر - إضافة فوري للنظام:"}
              </span>
            </div>
            {(!jobPreview || jobPreview.status === "pending") && (
              <Badge className="bg-emerald-600 text-white font-extrabold text-[10px]">جاهز للنشر 🚀</Badge>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[11px] font-semibold bg-card/60 p-2.5 rounded-xl border border-border/40">
            <div>
              <span className="text-muted-foreground">المسمى:</span>{" "}
              <span className="font-bold text-foreground/90">{previewData.title}</span>
            </div>
            <div>
              <span className="text-muted-foreground">القسم:</span>{" "}
              <span className="font-bold text-foreground/90">{previewData.department}</span>
            </div>
            <div>
              <span className="text-muted-foreground">الموقع:</span>{" "}
              <span className="font-bold text-foreground/90">{previewData.location}</span>
            </div>
            <div>
              <span className="text-muted-foreground">النوع:</span>{" "}
              <span className="font-bold text-foreground/90">{previewData.type}</span>
            </div>
          </div>
          {(!jobPreview || jobPreview.status === "pending") && (
            <div className="flex flex-wrap sm:flex-nowrap gap-2">
              <Button
                size="sm"
                className="flex-1 text-xs h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md transition-transform hover:scale-[1.01]"
                onClick={onConfirmJob}
              >
                <Check className="w-4 h-4" />
                إضافة ونشر الشاغر في النظام الآن 🚀
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-9 gap-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50 font-bold rounded-xl px-3"
                onClick={() => onOpenEditJob(previewData)}
              >
                <Pencil className="w-3.5 h-3.5" />
                تعديل قبل النشر
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-9 gap-1 text-red-600 border-red-200 hover:bg-red-50 font-bold rounded-xl px-3"
                onClick={onRejectJob}
              >
                <XCircle className="w-3.5 h-3.5" />
                إلغاء
              </Button>
            </div>
          )}
        </motion.div>
      )}

      {jobCreated && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, type: "spring" }}
          className="mt-3 p-4 rounded-xl bg-card/20 border border-border/20 shadow-md glass-card-premium flex flex-col items-center gap-3"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-primary">
            <Briefcase className="w-4 h-4" />
            <span>{jobCreated.title}</span>
          </div>
          <div className="bg-white p-3 rounded-xl shadow-sm">
            <QRCodeSVG value={getApplyUrl(jobCreated.id)} size={130} level="H" bgColor="#ffffff" fgColor="#1e4a8a" />
          </div>
          <p className="text-[10px] text-muted-foreground text-center font-semibold">
            امسح الرمز أو شارك الرابط لاستقبال الطلبات
          </p>
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs h-8 font-bold"
              onClick={() => {
                navigator.clipboard.writeText(getApplyUrl(jobCreated.id));
                toast({ title: "تم نسخ الرابط ✅" });
              }}
            >
              نسخ الرابط
            </Button>
            <Button
              size="sm"
              className="flex-1 text-xs h-8 font-bold"
              onClick={() => onOpenQr(jobCreated.id, jobCreated.title)}
            >
              تحميل QR
            </Button>
          </div>
          <div className="flex gap-2 w-full border-t border-border/20 pt-3">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs h-8 gap-1 font-bold"
              onClick={() => onNavigateJob(jobCreated.id)}
            >
              <ExternalLink className="w-3 h-3" />
              التفاصيل
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs h-8 gap-1 text-primary border-primary/30 hover:bg-primary/5 font-bold"
              onClick={() => onPrefillEditPrompt(jobCreated.title)}
            >
              <Pencil className="w-3 h-3" />
              تعديل
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 gap-1 text-destructive border-destructive/30 hover:bg-destructive/5 px-3 font-bold"
              onClick={onDeleteJob}
            >
              <Trash2 className="w-3 h-3" />
              حذف
            </Button>
          </div>
        </motion.div>
      )}
    </>
  );
}
