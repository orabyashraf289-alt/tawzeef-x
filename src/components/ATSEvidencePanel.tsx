import { useEffect, useState } from "react";
import { CheckCircle2, FileSearch, ListChecks, SearchCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CandidateEvaluation, EvaluationEvidence } from "../../supabase/functions/_shared/candidateEvaluation";

type EvidenceFilter = "all" | "review" | "quoted";

export default function ATSEvidencePanel({ evaluation }: { evaluation: CandidateEvaluation }) {
  const [filter, setFilter] = useState<EvidenceFilter>("all");
  useEffect(() => { setFilter("all"); }, [evaluation]);
  const rows = evaluation.requirementEvidence ?? [];
  const verified = evaluation.evidenceVersion === 1;
  const hasQuote = (item: EvaluationEvidence) => verified && item.status === "supported" &&
    Boolean(item.evidence.trim()) && (item.source === "resume" || item.source === "profile");
  const quoted = rows.filter(hasQuote).length;
  const review = rows.length - quoted;
  const omitted = Math.max(0, (evaluation.requirementsTotal ?? rows.length) - rows.length);
  const shown = rows.map((item, index) => ({ item, index })).filter(({ item }) =>
    filter === "all" || (filter === "quoted" ? hasQuote(item) : !hasQuote(item)));

  if (!rows.length) return <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-5 text-center space-y-2">
    <FileSearch className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden="true" />
    <p className="text-sm font-semibold">لا توجد شواهد متطلبات في هذا التقرير</p>
    <p className="text-xs text-muted-foreground leading-relaxed">
      {omitted > 0 ? `يوجد ${omitted} متطلبًا لم يشملها التقرير. راجعها يدويًا أو أعد التقييم.`
        : verified ? "لم تُنشر متطلبات قابلة للمقارنة لهذه الوظيفة. راجع بيانات المرشح يدويًا."
          : "أعد التقييم لعرض شواهد المتطلبات ومصادرها، إن كانت متاحة."}
    </p>
  </div>;

  return <section aria-label="أدلة مطابقة متطلبات الوظيفة" className="rounded-2xl border border-border/70 overflow-hidden">
    <div className="p-4 bg-muted/20 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-bold flex items-center gap-2"><ListChecks className="h-4 w-4 text-emerald-600" aria-hidden="true" />أدلة مطابقة متطلبات الوظيفة</h4>
          <p className="mt-1 text-xs text-muted-foreground">ابدأ بالشواهد، ثم راجع النقاط التي تحتاج توضيحًا.</p>
        </div>
        {verified && <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
          {quoted} من {rows.length} له اقتباس
        </span>}
      </div>
      <dl className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-background border border-border/60 p-3">
          <dt className="text-[11px] text-muted-foreground">له اقتباس متحقق من مصدره</dt>
          <dd className="mt-1 text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">{quoted}</dd>
        </div>
        <div className="rounded-xl bg-background border border-border/60 p-3">
          <dt className="text-[11px] text-muted-foreground">يحتاج مراجعة في التقرير</dt>
          <dd className="mt-1 text-xl font-bold tabular-nums text-amber-700 dark:text-amber-300">{review}</dd>
        </div>
      </dl>
      {omitted > 0 && <p className="rounded-xl bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-800 dark:text-amber-300">
        يعرض التقرير أول {rows.length} من {evaluation.requirementsTotal} متطلبًا. هناك {omitted} متطلبات إضافية لم يشملها التحليل؛ راجعها يدويًا.
      </p>}
      <div role="group" aria-label="تصفية شواهد المتطلبات" className="flex flex-wrap gap-1.5">
        {([
          ["all", `الكل (${rows.length})`], ["review", `يحتاج مراجعة (${review})`], ["quoted", `له اقتباس (${quoted})`],
        ] as const).map(([value, label]) => <Button key={value} type="button" size="sm" variant={filter === value ? "secondary" : "ghost"}
          aria-pressed={filter === value} onClick={() => setFilter(value)} className="rounded-lg text-xs h-9">
          {label}
        </Button>)}
      </div>
    </div>
    <div className="p-3 space-y-2" aria-live="polite" aria-atomic="false">
      {shown.length === 0 && <p className="p-4 text-center text-xs text-muted-foreground">لا توجد متطلبات ضمن هذا العرض.</p>}
      {shown.map(({ item, index }) => {
        const supported = hasQuote(item);
        return <article key={`${index}-${item.requirement}`} className={cn("rounded-xl border p-3 space-y-2 text-xs",
          supported ? "border-border/70 bg-background" : "border-amber-500/20 bg-amber-500/5")}>
          <div className="flex items-start gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-muted text-[11px] font-bold tabular-nums" aria-hidden="true">{index + 1}</span>
            <p className="min-w-0 flex-1 font-semibold break-words leading-6">{item.requirement} · <span className={supported ? "text-emerald-700 dark:text-emerald-300" : "text-amber-800 dark:text-amber-300"}>
              {supported ? "مذكور في المصدر" : "يحتاج تحققًا"}
            </span></p>
            {supported ? <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
              : <SearchCheck className="mt-1 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />}
          </div>
          {item.status === "supported" && item.evidence && <>
            <p className="text-[11px] text-muted-foreground">{!supported ? "دليل مقترح لم يُتحقق من مصدره"
              : item.source === "resume" ? "المصدر: مقتطف السيرة بموافقة المتقدم" : "المصدر: بيانات المرشح المدخلة"}</p>
            <blockquote className="break-words border-s-2 border-emerald-500/30 ps-3 text-foreground/80 leading-relaxed" dir="auto">{item.evidence}</blockquote>
          </>}
          {!supported && <p className="text-muted-foreground leading-relaxed">راجع هذا المتطلب مع المرشح أو مستنداته؛ غياب الدليل لا يعني عدم امتلاك المهارة.</p>}
        </article>;
      })}
    </div>
    <p className="border-t border-border/60 bg-muted/20 p-3 text-[11px] leading-relaxed text-muted-foreground">
      وجود الاقتباس لا يثبت استيفاء المتطلب. راجع سياقه والمستندات قبل اتخاذ قرار.
    </p>
  </section>;
}
