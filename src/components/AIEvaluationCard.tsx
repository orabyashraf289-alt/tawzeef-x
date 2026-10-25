import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Brain, Sparkles, TrendingUp, TrendingDown, Loader2, RefreshCw, Copy, Check, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import ATSEvidencePanel from "@/components/ATSEvidencePanel";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { parseCandidateEvaluation, type CandidateEvaluation as AIEvaluation } from "../../supabase/functions/_shared/candidateEvaluation";

interface AIEvaluationCardProps {
  candidateId?: string;
  candidateName?: string;
  existingScore?: number | null;
  existingEvaluation?: string | null;
  jobId?: string | null;
  candidate?: { id: string; name?: string; ai_evaluation?: string | null; job_id?: string | null };
}

const recommendationColors: Record<string, string> = {
  "مناسب جداً": "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  "مناسب جداً (موصى به بلقطة ممتازة)": "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  "مناسب": "bg-blue-500/10 text-blue-600 border-blue-500/30",
  "مناسب (موصى به للمقابلة)": "bg-blue-500/10 text-blue-600 border-blue-500/30",
  "يحتاج تطوير": "bg-amber-500/10 text-amber-600 border-amber-500/30",
  "يحتاج تطوير وفحص فني": "bg-amber-500/10 text-amber-600 border-amber-500/30",
  "غير مناسب": "bg-rose-500/10 text-rose-600 border-rose-500/30",
};

function getScoreColor(score: number) {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-blue-600 dark:text-blue-400";
  if (score >= 40) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

function getProgressColor(score: number) {
  if (score >= 80) return "[&>div]:bg-emerald-500";
  if (score >= 60) return "[&>div]:bg-blue-500";
  if (score >= 40) return "[&>div]:bg-amber-500";
  return "[&>div]:bg-rose-500";
}

export default function AIEvaluationCard(props: AIEvaluationCardProps) {
  const candidate = props.candidate;
  const candidateId = props.candidateId || candidate?.id || "";
  const candidateName = props.candidateName || candidate?.name || "مرشح";
  const existingEvaluation = props.existingEvaluation ?? candidate?.ai_evaluation ?? null;
  const jobId = props.jobId ?? candidate?.job_id ?? null;

  // Changing the candidate or job unmounts any pending request and its local report.
  return <EvaluationReport key={`${candidateId}:${jobId}`} candidateId={candidateId} candidateName={candidateName}
    existingEvaluation={existingEvaluation} jobId={jobId} />;
}

function readStoredEvaluation(value: string | null | undefined): AIEvaluation | null {
  try { return value ? parseCandidateEvaluation(JSON.parse(value)) : null; } catch { return null; }
}

function EvaluationReport({ candidateId, candidateName, existingEvaluation, jobId }: AIEvaluationCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [evaluation, setEvaluation] = useState(() => readStoredEvaluation(existingEvaluation));
  const requestVersion = useRef(0);
  const running = useRef(false);
  const queryClient = useQueryClient();

  useEffect(() => { setEvaluation(readStoredEvaluation(existingEvaluation)); }, [existingEvaluation]);
  useEffect(() => () => { requestVersion.current++; }, []);

  const runEvaluation = async () => {
    if (running.current || !candidateId) return;
    running.current = true;
    const request = ++requestVersion.current;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("evaluate-candidate", {
        body: { candidateId, jobId },
      });
      if (request !== requestVersion.current) return;
      if (error) {
        if (error instanceof FunctionsHttpError) {
          const responseBody = await error.context.json().catch(() => null);
          if (typeof responseBody?.error === "string") throw new Error(responseBody.error);
        }
        throw error;
      }
      const report = parseCandidateEvaluation(data);
      if (!report) throw new Error("تعذر قراءة تقرير التقييم، حاول لاحقاً");

      setEvaluation(report);

      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["candidate-detail-direct", candidateId] });
      queryClient.invalidateQueries({ queryKey: ["candidate", candidateId] });
      toast({
        title: `تم التقييم الذكي للمرشح ${candidateName} ✅`,
        description: `مؤشر المطابقة الإرشادي: ${report.score}%. راجع أدلة المتطلبات قبل تحديث حالة المرشح.`,
      });
    } catch (error) {
      if (request === requestVersion.current) toast({ title: "خطأ في التقييم",
        description: error instanceof Error ? error.message : "تعذر إعداد التقرير، حاول لاحقاً", variant: "destructive" });
    } finally {
      if (request === requestVersion.current) {
        running.current = false;
        setIsLoading(false);
      }
    }
  };

  const copyQuestion = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    toast({ title: "تم نسخ سؤال المقابلة 📋" });
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  if (!evaluation) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-5 border border-border/80 shadow-xs space-y-4" dir="rtl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-extrabold text-sm flex items-center gap-2 text-foreground">
            <Brain className="w-4 h-4 text-emerald-500" />
            تقرير مطابقة ATS
          </h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          مقارنة بيانات المرشح بمتطلبات الوظيفة؛ يُستخدم نص السيرة فقط إذا وافق المتقدم وتمكنت المنصة من قراءته.
        </p>
        <Button onClick={runEvaluation} disabled={isLoading || !candidateId}
          className="w-full gap-2 rounded-xl h-11 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20">
          {isLoading ? (
            <><Loader2 className="w-4 h-4 animate-spin" />جاري إعداد تقرير المطابقة...</>
          ) : (
            <><Sparkles className="w-4 h-4" />تشغيل تحليل ATS</>
          )}
        </Button>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-5 space-y-5 border border-border/80 shadow-xs" dir="rtl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-extrabold text-sm flex items-center gap-2 text-foreground">
            <Brain className="w-4.5 h-4.5 text-emerald-500" />
            تقرير مطابقة ATS
          </h3>
          <Button variant="ghost" size="sm" onClick={runEvaluation} disabled={isLoading} className="gap-1.5 text-xs font-bold rounded-xl h-9">
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 text-emerald-500" />}
            إعادة التقييم
          </Button>
        </div>

        {/* Total Score Header */}
        <p className="text-xs text-muted-foreground">
          {evaluation.cvAnalyzed === true ? "شمل التقييم مقتطفًا من السيرة بموافقة المتقدم."
            : evaluation.cvAnalyzed === false ? "اعتمد التقييم على البيانات المهنية المدخلة دون نص السيرة."
            : "لم يُسجل مصدر البيانات لهذا التقييم السابق."}
        </p>
        {evaluation.evaluatedAt && <p className="text-[11px] text-muted-foreground">
          تاريخ التقييم: <time dateTime={evaluation.evaluatedAt}>{new Date(evaluation.evaluatedAt).toLocaleString("ar-EG")}</time>
        </p>}
        {evaluation.evidenceVersion !== 1 && <p role="status" className="text-xs text-amber-800 dark:text-amber-300 bg-amber-500/10 p-3 rounded-xl">
          هذا تقييم سابق دون تحقق من مصادر الأدلة. أعد التقييم لعرض التقرير الحالي.
        </p>}
        <div className="text-center py-3 px-6 bg-muted/30 rounded-2xl border border-border/60">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.1 }}
            className={cn("text-4xl font-black tabular-nums", getScoreColor(evaluation.score))}>
            {evaluation.score}%
          </motion.div>
          <p className="text-xs font-bold text-muted-foreground mt-1">مؤشر إرشادي، القرار لمسؤول التوظيف</p>
          <Progress aria-label="مؤشر المطابقة الإرشادي" value={evaluation.score} className={cn("h-2.5 mt-2.5", getProgressColor(evaluation.score))} />
        </div>

        {/* Multi-Dimensional Scores Grid */}
        {(evaluation.skillsMatchScore != null || evaluation.experienceMatchScore != null) && (
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-2.5 rounded-xl bg-card border border-border/60 text-center">
              <span className="text-[10px] font-bold text-muted-foreground">مطابقة المهارات</span>
              <div className="text-base font-extrabold text-foreground mt-0.5">{evaluation.skillsMatchScore != null ? `${evaluation.skillsMatchScore}%` : "غير متاح"}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-card border border-border/60 text-center">
              <span className="text-[10px] font-bold text-muted-foreground">مطابقة الخبرة</span>
              <div className="text-base font-extrabold text-foreground mt-0.5">{evaluation.experienceMatchScore != null ? `${evaluation.experienceMatchScore}%` : "غير متاح"}</div>
            </div>
            {evaluation.educationMatchScore != null && <div className="p-2.5 rounded-xl bg-card border border-border/60 text-center">
              <span className="text-[10px] font-bold text-muted-foreground">المؤهل العلمي</span>
              <div className="text-base font-extrabold text-foreground mt-0.5">{evaluation.educationMatchScore}%</div>
            </div>}
          </div>
        )}

        {/* Recommendation */}
        <div className="text-center">
          <Badge variant="outline" className={cn("px-3 py-1 text-xs font-bold rounded-xl border",
            recommendationColors[evaluation.recommendation] || "bg-muted text-muted-foreground border-border")}>
            {evaluation.recommendation}
          </Badge>
        </div>

        {/* Summary */}
        <p className="text-xs text-foreground leading-relaxed bg-card p-3 rounded-xl border border-border/60">
          {evaluation.summary}
        </p>

        <ATSEvidencePanel evaluation={evaluation} />

        {/* Strengths */}
        <div>
          <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />أهم نقاط القوة البارزة
          </h4>
          <ul className="space-y-1.5">
            {evaluation.strengths.map((s, i) => (
              <motion.li key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="text-xs text-muted-foreground flex items-start gap-2 bg-emerald-500/5 p-2 rounded-xl border border-emerald-500/10">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                {s}
              </motion.li>
            ))}
          </ul>
        </div>

        {/* Weaknesses */}
        <div>
          <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-2">
            <TrendingDown className="w-3.5 h-3.5 text-amber-500" />نقاط تحتاج إلى استيضاح
          </h4>
          <ul className="space-y-1.5">
            {evaluation.weaknesses.map((w, i) => (
              <motion.li key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="text-xs text-muted-foreground flex items-start gap-2 bg-amber-500/5 p-2 rounded-xl border border-amber-500/10">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                {w}
              </motion.li>
            ))}
          </ul>
        </div>

        {/* Tailored AI Interview Questions */}
        {evaluation.tailoredInterviewQuestions && evaluation.tailoredInterviewQuestions.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border/60">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />أسئلة المقابلة لهذا المرشح
            </h4>
            <div className="space-y-2">
              {evaluation.tailoredInterviewQuestions.map((q, i) => (
                <div key={i} className="p-2.5 rounded-xl bg-indigo-500/5 border border-indigo-500/15 flex items-center justify-between gap-2">
                  <p className="text-xs text-foreground font-medium leading-relaxed">{q}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyQuestion(q, i)}
                    className="h-7 px-2 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 shrink-0 gap-1 rounded-lg hover:bg-indigo-500/10"
                  >
                    {copiedIdx === i ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    {copiedIdx === i ? "تم النسخ" : "نسخ"}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
