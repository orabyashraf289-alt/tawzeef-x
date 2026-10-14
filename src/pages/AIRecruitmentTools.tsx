import { useState } from "react";
import { ClipboardCheck, FileSearch, Loader2, Sparkles } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/contexts/I18nContext";
import { supabase } from "@/integrations/supabase/client";

type Mode = "job_review" | "interview_scorecard";
type Review = { mode: "job_review"; strengths: string[]; issues: { finding: string; suggestion: string }[]; revisedDraft: string };
type Scorecard = { mode: "interview_scorecard"; criteria: { name: string; evidence: string; ratingGuide: string }[]; interviewerNotes: string[] };
type Result = Review | Scorecard;

export default function AIRecruitmentTools() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const [mode, setMode] = useState<Mode>("job_review");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const canSubmit = title.trim().length > 0 && title.trim().length <= 150 && description.trim().length >= 40 && description.trim().length <= 6000;

  async function generate() {
    if (!canSubmit || loading) return;
    setLoading(true);
    setResult(null);
    setError("");
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("recruitment-ai-tools", {
        body: { mode, title: title.trim(), description: description.trim(), language: ar ? "ar" : "en" },
      });
      if (invokeError || data?.error || data?.mode !== mode) throw new Error(data?.error || invokeError?.message || "Invalid response");
      setResult(data as Result);
    } catch {
      setError(ar ? "تعذر إنشاء النتيجة الآن. تحقق من اتصالك وحاول مجددًا." : "Could not generate a result. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function changeMode(next: Mode) {
    if (loading) return;
    setMode(next);
    setResult(null);
    setError("");
  }

  return (
    <DashboardLayout>
      <main className="max-w-6xl mx-auto p-4 sm:p-8 space-y-6" dir={ar ? "rtl" : "ltr"}>
        <div>
          <div className="flex items-center gap-2 text-primary text-sm font-bold mb-2"><Sparkles className="h-4 w-4" />{ar ? "وحدات الذكاء الاصطناعي" : "AI modules"}</div>
          <h1 className="text-2xl sm:text-3xl font-black">{ar ? "أدوات التوظيف الذكية" : "Recruitment AI tools"}</h1>
          <p className="text-muted-foreground mt-2">{ar ? "راجع إعلانك، أو حضّر بطاقة تقييم موحدة للمقابلة. كل نتيجة مسودة تحتاج مراجعتك قبل الاستخدام." : "Review a job ad or prepare a consistent interview scorecard. Review every draft before use."}</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3" role="group" aria-label={ar ? "اختر الوحدة" : "Choose a tool"}>
          {([
            { id: "job_review" as const, icon: FileSearch, name: ar ? "مراجع جودة الإعلان" : "Job ad review", detail: ar ? "وضوح المتطلبات وصياغة شاملة مع اقتراحات محددة" : "Clarity and inclusive wording with concrete suggestions" },
            { id: "interview_scorecard" as const, icon: ClipboardCheck, name: ar ? "بطاقة تقييم المقابلة" : "Interview scorecard", detail: ar ? "معايير مرتبطة بالوظيفة وأدلة قابلة للملاحظة" : "Job-related criteria and observable evidence" },
          ]).map((tool) => (
            <button key={tool.id} type="button" disabled={loading} aria-pressed={mode === tool.id} onClick={() => changeMode(tool.id)} className={`text-start rounded-xl border p-5 transition-colors ${mode === tool.id ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/50"}`}>
              <tool.icon className="w-6 h-6 text-primary mb-3" />
              <span className="block font-bold">{tool.name}</span>
              <span className="block text-sm text-muted-foreground mt-1">{tool.detail}</span>
            </button>
          ))}
        </div>

        <section className="rounded-xl border bg-card p-5 sm:p-6 space-y-4" aria-label={ar ? "تفاصيل الوظيفة" : "Job details"}>
          <div>
            <label htmlFor="ai-job-title" className="block font-semibold mb-2">{ar ? "المسمى الوظيفي" : "Job title"}</label>
            <Input id="ai-job-title" value={title} maxLength={150} onChange={(event) => setTitle(event.target.value)} placeholder={ar ? "مثال: أخصائي موارد بشرية" : "Example: HR specialist"} />
          </div>
          <div>
            <label htmlFor="ai-job-description" className="block font-semibold mb-2">{ar ? "وصف الوظيفة والمتطلبات" : "Job description and requirements"}</label>
            <Textarea id="ai-job-description" value={description} maxLength={6000} rows={9} onChange={(event) => setDescription(event.target.value)} placeholder={ar ? "اكتب الوصف والمتطلبات الحالية هنا (40 حرفًا على الأقل)" : "Paste the current description and requirements (at least 40 characters)"} />
            <p className="text-xs text-muted-foreground mt-2">{description.length}/6000 · {ar ? "لا تضع بيانات مرشحين أو معلومات شخصية في الوصف." : "Do not include candidate or personal data."}</p>
          </div>
          <Button onClick={generate} disabled={!canSubmit || loading} className="gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? (ar ? "جارٍ التحليل…" : "Generating…") : (ar ? "إنشاء المسودة" : "Generate draft")}
          </Button>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </section>

        {result && <section className="rounded-xl border bg-card p-5 sm:p-6 space-y-5" aria-live="polite">
          <h2 className="text-xl font-bold">{ar ? "النتيجة للمراجعة" : "Draft for review"}</h2>
          {result.mode === "job_review" ? <>
            {result.strengths.length > 0 && <div><h3 className="font-bold mb-2">{ar ? "نقاط القوة" : "Strengths"}</h3><ul className="list-disc list-inside space-y-1 text-sm">{result.strengths.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}
            {result.issues.length > 0 && <div><h3 className="font-bold mb-2">{ar ? "تحسينات مقترحة" : "Suggested improvements"}</h3><div className="grid gap-3">{result.issues.map((item, index) => <div key={index} className="rounded-lg border p-3"><p className="font-semibold">{item.finding}</p><p className="text-sm text-muted-foreground mt-1">{item.suggestion}</p></div>)}</div></div>}
            {result.revisedDraft && <div><h3 className="font-bold mb-2">{ar ? "صياغة مقترحة" : "Suggested wording"}</h3><p className="whitespace-pre-wrap rounded-lg bg-muted/50 p-4 text-sm leading-relaxed">{result.revisedDraft}</p></div>}
          </> : <>
            <div className="grid gap-3">{result.criteria.map((item, index) => <div key={index} className="rounded-lg border p-4 space-y-2"><h3 className="font-bold">{index + 1}. {item.name}</h3><p className="text-sm"><span className="font-semibold">{ar ? "الدليل:" : "Evidence:"} </span>{item.evidence}</p><p className="text-sm"><span className="font-semibold">{ar ? "دليل التقدير (1–5):" : "Rating guide (1–5):"} </span>{item.ratingGuide}</p></div>)}</div>
            {result.interviewerNotes.length > 0 && <div><h3 className="font-bold mb-2">{ar ? "إرشادات للمحاور" : "Interviewer notes"}</h3><ul className="list-disc list-inside space-y-1 text-sm">{result.interviewerNotes.map((note, index) => <li key={index}>{note}</li>)}</ul></div>}
          </>}
          <p className="text-xs text-muted-foreground border-t pt-4">{ar ? "المخرجات مساعدات تحريرية فقط، وليست تقييمًا لمرشح أو قرار توظيف. لا تُحفظ تلقائيًا في النظام." : "These are editable aids, not a candidate assessment or hiring decision. Results are not saved automatically."}</p>
        </section>}
      </main>
    </DashboardLayout>
  );
}
