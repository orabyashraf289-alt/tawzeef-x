import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/contexts/I18nContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle,
  Clock,
  Loader2,
} from "lucide-react";

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  points: number;
  code_language?: string;
  options: { id: string; option_text: string }[];
  matching_choices: string[];
}
interface Assessment {
  title: string;
  description?: string;
  duration_minutes: number;
  passing_score: number;
  question_count: number;
}
interface Result {
  status: string;
  total_score: number;
  max_score: number;
  percentage: number;
  passed: boolean;
  timed_out: boolean;
}
interface Attempt {
  response_id: string;
  access_token: string;
  expires_at: string;
  server_time: string;
  questions: Question[];
  answers: { question_id: string; answer: string }[];
  revision: number;
  status: string;
}
const rpc = (name: string, args: Record<string, unknown>) =>
  (supabase.rpc as any)(name, args);

export default function TakeAssessment() {
  const { token } = useParams<{ token: string }>();
  const { locale } = useI18n();
  const ar = locale === "ar";
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [code, setCode] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">(
    "saved",
  );
  const deadline = useRef(0);
  const revision = useRef(0);
  const submitLock = useRef(false);
  const autoSubmitted = useRef(false);
  const events = useRef<{ time: string; type: string }[]>([]);
  const finishRef = useRef<() => void>(() => {});
  const question = attempt?.questions[questionIndex];

  useEffect(() => {
    let current = true;
    setLoading(true);
    rpc("get_assessment_for_candidate", { _token: token }).then(
      ({ data, error: loadError }: any) => {
        if (!current) return;
        if (loadError || !data?.assessment) {
          setError(
            ar
              ? "الاختبار غير متاح. راجع رابط الدعوة."
              : "Assessment unavailable. Check your invitation.",
          );
        } else setAssessment(data.assessment);
        setLoading(false);
      },
    );
    return () => {
      current = false;
    };
  }, [token, ar]);

  const payload = () =>
    (attempt?.questions || []).map((q) => ({
      question_id: q.id,
      answer: answers[q.id] || "",
    }));
  const capability = () => ({
    _response_id: attempt!.response_id,
    _access_token: attempt!.access_token,
  });

  const grade = async (current: Attempt, submitted: Result) => {
    if (submitted.status !== "pending_review") return submitted;
    try {
      const { data, error: gradingError } = await supabase.functions.invoke(
        "evaluate-assessment-answers",
        {
          body: {
            responseId: current.response_id,
            accessToken: current.access_token,
          },
        },
      );
      return !gradingError && data?.status ? data as Result : submitted;
    } catch {
      return submitted;
    }
  };

  const finish = async () => {
    if (!attempt || submitLock.current) return;
    submitLock.current = true;
    setBusy(true);
    setError("");
    try {
      const { data, error: submitError } = await rpc(
        "finish_assessment_attempt",
        {
          ...capability(),
          _answers: payload(),
          _tab_switches: events.current.length,
          _tab_switch_log: {
            events: events.current,
            counters: {},
            review_note:
              "Signals require human review; not proof of misconduct.",
          },
        },
      );
      if (submitError || !data) throw submitError || new Error("No result");
      setResult(data);
      setResult(await grade(attempt, data));
    } catch {
      setError(
        ar
          ? "تعذّر تأكيد التسليم. أعد المحاولة؛ الإجابات المحفوظة قبل انتهاء الوقت محفوظة."
          : "Could not confirm submission. Retry; answers saved before the deadline are retained.",
      );
    } finally {
      submitLock.current = false;
      setBusy(false);
    }
  };
  finishRef.current = () => {
    void finish();
  };

  useEffect(() => {
    if (!attempt || result) return;
    const tick = () => {
      const seconds = Math.max(
        0,
        Math.ceil((deadline.current - Date.now()) / 1000),
      );
      setRemaining(seconds);
      if (seconds === 0 && !submitLock.current && !autoSubmitted.current) {
        autoSubmitted.current = true;
        finishRef.current();
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [attempt, result]);

  useEffect(() => {
    if (!attempt || result || busy || Date.now() >= deadline.current) return;
    setSaveState("saving");
    const requestRevision = ++revision.current;
    const timer = setTimeout(async () => {
      try {
        const { data, error: saveError } = await rpc(
          "save_assessment_attempt",
          { ...capability(), _answers: payload(), _revision: requestRevision },
        );
        if (requestRevision === revision.current) {
          setSaveState(saveError || !data?.saved ? "error" : "saved");
        }
      } catch {
        if (requestRevision === revision.current) setSaveState("error");
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [answers, attempt, result, busy]);

  useEffect(() => {
    if (!attempt || result) return;
    const visibility = () => {
      if (document.hidden && events.current.length < 200) {
        events.current.push({
          time: new Date().toISOString(),
          type: "visibility_hidden",
        });
      }
    };
    const unload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("beforeunload", unload);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("beforeunload", unload);
    };
  }, [attempt, result]);

  const start = async () => {
    setBusy(true);
    setError("");
    try {
      const { data, error: startError } = await rpc(
        "begin_assessment_attempt",
        { _token: token, _tracking_code: code.trim() },
      );
      if (startError || !data?.response_id) {
        throw startError || new Error("Unavailable");
      }
      const current = data as Attempt;
      deadline.current = Date.now() + new Date(current.expires_at).getTime() -
        new Date(current.server_time).getTime();
      revision.current = current.revision;
      const initial = Object.fromEntries(
        current.answers.map((a) => [a.question_id, a.answer]),
      );
      current.questions.forEach((q) => {
        if (q.question_type === "ordering" && !initial[q.id]) {
          initial[q.id] = JSON.stringify(q.options.map((o) => o.option_text));
        }
      });
      if (current.status !== "in_progress") {
        const { data: existing, error: resultError } = await rpc(
          "finish_assessment_attempt",
          {
            _response_id: current.response_id,
            _access_token: current.access_token,
            _answers: [],
          },
        );
        if (resultError || !existing) {
          throw resultError || new Error("Result unavailable");
        }
        setResult(existing);
      }
      setAnswers(initial);
      setAttempt(current);
    } catch {
      setError(
        ar
          ? "تعذّر بدء الاختبار. استخدم رمز تتبع طلبك لنفس الشركة والوظيفة، أو تواصل مع مسؤول التوظيف."
          : "Unable to start. Use the tracking code for this company and vacancy, or contact the recruiter.",
      );
    } finally {
      setBusy(false);
    }
  };
  const setAnswer = (value: string) => {
    if (question && remaining > 0) {
      setAnswers((previous) => ({ ...previous, [question.id]: value }));
    }
  };
  const parseAnswer = (fallback: any) => {
    try {
      return JSON.parse(answers[question!.id] || "");
    } catch {
      return fallback;
    }
  };

  return (
    <main
      className="min-h-screen bg-background p-4 sm:p-8"
      dir={ar ? "rtl" : "ltr"}
    >
      <div className="mx-auto max-w-2xl space-y-4">
        {loading && (
          <p className="py-12 text-center">
            {ar ? "جارٍ تحميل الاختبار…" : "Loading assessment…"}
          </p>
        )}
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-destructive flex gap-2"
          >
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error}
          </div>
        )}
        {attempt && !result && remaining <= 0 && error && (
          <Button disabled={busy} onClick={finish}>
            {ar ? "إعادة محاولة التسليم" : "Retry submission"}
          </Button>
        )}
        {assessment && !attempt && (
          <Card>
            <CardHeader>
              <CardTitle>{assessment.title}</CardTitle>
              <p className="text-muted-foreground">{assessment.description}</p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap gap-3 text-sm">
                <Badge variant="secondary">
                  {assessment.duration_minutes} {ar ? "دقيقة" : "minutes"}
                </Badge>
                <Badge variant="outline">
                  {assessment.question_count} {ar ? "سؤال" : "questions"}
                </Badge>
                <Badge variant="outline">
                  {ar ? "حد الاجتياز" : "Pass mark"}: {assessment.passing_score}%
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {ar
                  ? "أدخل رمز التتبع الخاص بطلبك. تبدأ المدة عند فتح الأسئلة، ويمكنك متابعة نفس المحاولة دون إعادة الوقت. تُحفظ الإجابات تلقائيًا؛ عند انتهاء المدة تُقيّم آخر إجابات وصلت إلى النظام."
                  : "Enter your application tracking code. Time starts when questions open. Resuming does not reset the timer. Answers autosave; only answers received before the deadline count."}
              </p>
              <Label htmlFor="tracking-code">
                {ar ? "رمز تتبع الطلب" : "Application tracking code"}
              </Label>
              <Input
                id="tracking-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="TX-…"
                dir="ltr"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                {ar
                  ? "تُسجّل مغادرة صفحة الاختبار للمراجعة البشرية. قد تُصحح الإجابات المفتوحة بمساعدة الذكاء الاصطناعي ويظل القرار لفريق التوظيف."
                  : "Leaving the page is recorded for human review. Open answers may use AI-assisted grading; the hiring team makes the final decision."}
              </p>
              <Button
                className="w-full"
                disabled={busy || !code.trim()}
                onClick={start}
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                {ar
                  ? "بدء الاختبار أو متابعة المحاولة"
                  : "Start or resume assessment"}
              </Button>
            </CardContent>
          </Card>
        )}
        {result && (
          <Card>
            <CardContent className="p-8 text-center space-y-4">
              <CheckCircle className="mx-auto h-12 w-12 text-primary" />
              <h1 className="text-xl font-bold">
                {result.status === "pending_review"
                  ? (ar
                    ? "تم التسليم — بانتظار التصحيح"
                    : "Submitted — awaiting review")
                  : result.passed
                  ? (ar ? "اجتزت الاختبار" : "Assessment passed")
                  : (ar ? "اكتمل التصحيح" : "Assessment graded")}
              </h1>
              {result.status === "completed"
                ? (
                  <>
                    <p className="text-4xl font-bold">{result.percentage}%</p>
                    <p>{result.total_score} / {result.max_score}</p>
                  </>
                )
                : (
                  <p className="text-muted-foreground">
                    {ar
                      ? "إجاباتك محفوظة. لن تظهر نتيجة نهائية قبل اكتمال تصحيح الأسئلة المفتوحة."
                      : "Your answers are saved. A final result is shown after open-answer review is complete."}
                  </p>
                )}
              {result.timed_out && (
                <p className="text-sm text-muted-foreground">
                  {ar
                    ? "انتهى الوقت؛ استُخدمت الإجابات المحفوظة قبل الموعد النهائي."
                    : "Time expired; answers saved before the deadline were used."}
                </p>
              )}
              {result.status === "pending_review" && (
                <Button variant="outline" disabled={busy} onClick={finish}>
                  {ar ? "تحديث حالة التصحيح" : "Refresh grading status"}
                </Button>
              )}
            </CardContent>
          </Card>
        )}
        {attempt && !result && question && (
          <>
            <div className="flex items-center justify-between gap-3">
              <h1 className="font-bold">{assessment?.title}</h1>
              <Badge variant={remaining < 60 ? "destructive" : "secondary"}>
                <Clock className="h-4 w-4 me-1" />
                {Math.floor(remaining / 60).toString().padStart(
                  2,
                  "0",
                )}:{(remaining % 60).toString().padStart(2, "0")}
              </Badge>
            </div>
            <Progress
              value={(questionIndex + 1) / attempt.questions.length * 100}
            />
            <p className="text-sm text-muted-foreground">
              {questionIndex + 1} / {attempt.questions.length}
            </p>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg leading-relaxed">
                  {question.question_text}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {question.points} {ar ? "نقطة" : "points"}{" "}
                  {question.code_language}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <fieldset
                  disabled={busy || remaining <= 0}
                  className="space-y-3"
                >
                  {question.question_type === "multiple_choice" &&
                    question.options.map((o) => (
                      <label
                        key={o.id}
                        className="flex gap-3 rounded-lg border p-3 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name={question.id}
                          checked={answers[question.id] === o.id}
                          onChange={() => setAnswer(o.id)}
                        />
                        {o.option_text}
                      </label>
                    ))}
                  {question.question_type === "true_false" &&
                    ["true", "false"].map((v) => (
                      <label
                        key={v}
                        className="flex gap-3 rounded-lg border p-3 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name={question.id}
                          checked={answers[question.id] === v}
                          onChange={() => setAnswer(v)}
                        />
                        {v === "true"
                          ? (ar ? "صحيح" : "True")
                          : (ar ? "خطأ" : "False")}
                      </label>
                    ))}
                  {["open_ended", "code"].includes(question.question_type) && (
                    <Textarea
                      aria-label={ar ? "الإجابة" : "Answer"}
                      value={answers[question.id] || ""}
                      onChange={(e) => setAnswer(e.target.value)}
                      maxLength={20000}
                      rows={9}
                      dir={question.question_type === "code"
                        ? "ltr"
                        : undefined}
                      className={question.question_type === "code"
                        ? "font-mono"
                        : ""}
                    />
                  )}
                  {question.question_type === "matching" &&
                    question.options.map((o) => (
                      <label key={o.id} className="flex items-center gap-3">
                        <span className="flex-1">{o.option_text}</span>
                        <select
                          aria-label={o.option_text}
                          className="flex-1 rounded-md border bg-background p-2"
                          value={parseAnswer({})[o.id] || ""}
                          onChange={(e) =>
                            setAnswer(
                              JSON.stringify({
                                ...parseAnswer({}),
                                [o.id]: e.target.value,
                              }),
                            )}
                        >
                          <option value="">{ar ? "اختر…" : "Choose…"}</option>
                          {question.matching_choices.map((v, i) => (
                            <option key={i} value={v}>{v}</option>
                          ))}
                        </select>
                      </label>
                    ))}
                  {question.question_type === "ordering" &&
                    (parseAnswer([]) as string[]).map((v, i, items) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 rounded-lg border p-3"
                      >
                        <span className="flex-1">{v}</span>
                        {[-1, 1].map((delta) => (
                          <Button
                            key={delta}
                            type="button"
                            variant="outline"
                            size="icon"
                            aria-label={delta < 0 ? "Move up" : "Move down"}
                            disabled={i + delta < 0 ||
                              i + delta >= items.length}
                            onClick={() => {
                              const next = [...items];
                              [next[i], next[i + delta]] = [
                                next[i + delta],
                                next[i],
                              ];
                              setAnswer(JSON.stringify(next));
                            }}
                          >
                            {delta < 0
                              ? <ArrowUp className="h-4 w-4" />
                              : <ArrowDown className="h-4 w-4" />}
                          </Button>
                        ))}
                      </div>
                    ))}
                </fieldset>
              </CardContent>
            </Card>
            <p
              role="status"
              className={`text-xs ${
                saveState === "error"
                  ? "text-destructive"
                  : "text-muted-foreground"
              }`}
            >
              {saveState === "saved"
                ? (ar ? "الإجابات محفوظة" : "Answers saved")
                : saveState === "saving"
                ? (ar ? "جارٍ حفظ الإجابات…" : "Saving answers…")
                : (ar
                  ? "تعذّر الحفظ التلقائي. تحقق من الاتصال قبل انتهاء الوقت."
                  : "Autosave failed. Check your connection before time expires.")}
            </p>
            <div className="flex justify-between">
              <Button
                variant="outline"
                disabled={busy || questionIndex === 0}
                onClick={() => setQuestionIndex((i) => i - 1)}
              >
                {ar ? "السابق" : "Previous"}
              </Button>
              {questionIndex < attempt.questions.length - 1
                ? (
                  <Button
                    disabled={busy || remaining <= 0}
                    onClick={() => setQuestionIndex((i) => i + 1)}
                  >
                    {ar ? "التالي" : "Next"}
                  </Button>
                )
                : (
                  <Button disabled={busy} onClick={finish}>
                    {busy && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                    {ar ? "تسليم الاختبار" : "Submit assessment"}
                  </Button>
                )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
