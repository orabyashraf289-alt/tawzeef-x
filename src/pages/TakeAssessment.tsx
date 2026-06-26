import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/contexts/I18nContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, CheckCircle, AlertCircle, Brain, ThumbsUp, Lightbulb, Loader2, AlertTriangle, ArrowUp, ArrowDown, ShieldAlert, EyeOff, Copy as CopyIcon, Scissors, ClipboardPaste, Maximize, Minimize, MousePointerClick } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AssessmentData {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  passing_score: number;
  is_randomized: boolean;
}

interface QuestionData {
  id: string;
  question_text: string;
  question_type: string;
  code_language: string | null;
  correct_answer: string | null;
  points: number;
  options: { id: string; option_text: string; sort_order: number }[];
}

interface AIEvaluation {
  question_index: number;
  score: number;
  feedback: string;
  strengths?: string;
  improvements?: string;
}

export default function TakeAssessment() {
  const { token } = useParams<{ token: string }>();
  const { t, locale } = useI18n();
  const [assessment, setAssessment] = useState<AssessmentData | null>(null);
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"info" | "test" | "evaluating" | "done">("info");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [responseId, setResponseId] = useState("");
  const [result, setResult] = useState<{ score: number; max: number; percentage: number; passed: boolean } | null>(null);
  const [aiEvaluations, setAiEvaluations] = useState<AIEvaluation[]>([]);
  const [tabSwitches, setTabSwitches] = useState(0);
  const tabSwitchLogRef = useRef<{ time: string; type: string }[]>([]);
  const [cheatEvents, setCheatEvents] = useState<{
    visibility: number;
    blur: number;
    focus: number;
    copy: number;
    cut: number;
    paste: number;
    contextmenu: number;
    fullscreenExit: number;
  }>({ visibility: 0, blur: 0, focus: 0, copy: 0, cut: 0, paste: 0, contextmenu: 0, fullscreenExit: 0 });
  const [orderAnswers, setOrderAnswers] = useState<Record<string, string[]>>({});
  const [matchAnswers, setMatchAnswers] = useState<Record<string, Record<string, string>>>({});

  // Compute cheat risk score (0-100) using weighted events
  const cheatScore = (() => {
    const w = cheatEvents.visibility * 15
      + cheatEvents.blur * 10
      + cheatEvents.copy * 8
      + cheatEvents.cut * 10
      + cheatEvents.paste * 12
      + cheatEvents.contextmenu * 5
      + cheatEvents.fullscreenExit * 12;
    return Math.min(100, w);
  })();
  const cheatLevel: "safe" | "low" | "medium" | "high" =
    cheatScore >= 70 ? "high" : cheatScore >= 40 ? "medium" : cheatScore >= 15 ? "low" : "safe";

  const logEvent = useCallback((type: string, extra?: Record<string, any>) => {
    tabSwitchLogRef.current.push({ time: new Date().toISOString(), type, ...(extra || {}) } as any);
  }, []);

  // Anti-cheat: track tab/window switches + warn before unload
  useEffect(() => {
    if (step !== "test") return;
    const handleVisibility = () => {
      if (document.hidden) {
        setTabSwitches(prev => prev + 1);
        setCheatEvents(p => ({ ...p, visibility: p.visibility + 1 }));
        logEvent("visibility_hidden");
        toast({ title: locale === "ar" ? "⚠️ لا تغادر صفحة الاختبار!" : "⚠️ Don't leave the test page!", variant: "destructive" });
      } else {
        logEvent("visibility_visible");
      }
    };
    const handleBlur = () => {
      setTabSwitches(prev => prev + 1);
      setCheatEvents(p => ({ ...p, blur: p.blur + 1 }));
      logEvent("window_blur");
    };
    const handleFocus = () => {
      setCheatEvents(p => ({ ...p, focus: p.focus + 1 }));
      logEvent("window_focus");
    };
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      setCheatEvents(p => ({ ...p, contextmenu: p.contextmenu + 1 }));
      logEvent("contextmenu");
    };
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      setCheatEvents(p => ({ ...p, copy: p.copy + 1 }));
      logEvent("copy");
      toast({ title: locale === "ar" ? "النسخ غير مسموح" : "Copy is disabled", variant: "destructive" });
    };
    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      setCheatEvents(p => ({ ...p, cut: p.cut + 1 }));
      logEvent("cut");
    };
    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      setCheatEvents(p => ({ ...p, paste: p.paste + 1 }));
      logEvent("paste");
      toast({ title: locale === "ar" ? "اللصق غير مسموح" : "Paste is disabled", variant: "destructive" });
    };
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setCheatEvents(p => ({ ...p, fullscreenExit: p.fullscreenExit + 1 }));
        logEvent("fullscreen_exit");
      } else {
        logEvent("fullscreen_enter");
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("cut", handleCut);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("cut", handleCut);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [step, locale, logEvent]);

  // Note: auto-save removed for security — answers are now submitted only at the end via RPC.

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data, error: rpcErr } = await supabase.rpc("get_assessment_for_candidate", { _token: token } as any);
      if (rpcErr || !data || (data as any).error) {
        setError(t("qbank.assessmentNotFound"));
        setLoading(false);
        return;
      }
      const payload = data as any;
      setAssessment(payload.assessment as AssessmentData);
      let ordered = ((payload.questions || []) as QuestionData[]).map((q: any) => ({
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        code_language: q.code_language,
        correct_answer: null,
        points: q.points,
        options: q.options || [],
      })) as QuestionData[];
      if ((payload.assessment as any).is_randomized) ordered = ordered.sort(() => Math.random() - 0.5);
      setQuestions(ordered);
      setLoading(false);
    })();
  }, [token]);

  // Timer
  useEffect(() => {
    if (step !== "test" || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(interval); handleSubmit(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step, timeLeft]);

  const startTest = async () => {
    if (!name.trim() || !email.trim() || !assessment || !token) return;
    const { data, error } = await supabase.rpc("start_assessment_response", {
      _token: token, _name: name, _email: email,
    } as any);
    if (error || !data) { toast({ title: "Error", variant: "destructive" }); return; }
    setResponseId(data as any);
    setTimeLeft(assessment.duration_minutes * 60);
    setStep("test");
  };

  const handleSubmit = async () => {
    if (!assessment) return;
    setStep("evaluating");

    const answersPayload = questions.map(q => ({ question_id: q.id, answer: answers[q.id] || "" }));

    const { data: subData, error: subErr } = await supabase.rpc("submit_assessment_response", {
      _response_id: responseId,
      _answers: answersPayload as any,
      _tab_switches: tabSwitches,
      _tab_switch_log: {
        events: tabSwitchLogRef.current,
        counters: cheatEvents,
        cheat_score: cheatScore,
        cheat_level: cheatLevel,
      } as any,
    } as any);

    if (subErr || !subData) {
      toast({ title: "Error submitting", variant: "destructive" });
      setStep("test");
      return;
    }

    const sd = subData as any;
    let totalScore: number = sd.total_score || 0;
    const maxScore: number = sd.max_score || 0;
    let percentage: number = sd.percentage || 0;

    const openAnswers = (sd.open_answers || []) as any[];
    if (openAnswers.length > 0) {
      try {
        const aiInput = openAnswers.map((o, i) => ({
          question_text: o.question_text,
          question_type: o.question_type,
          answer: o.answer,
          correct_answer: o.correct_answer,
          code_language: o.code_language,
          points: o.points,
          index: i,
        }));
        const { data: aiData, error: aiError } = await supabase.functions.invoke("evaluate-assessment-answers", {
          body: { answers: aiInput },
        });
        if (!aiError && aiData?.evaluations) {
          const evaluations = aiData.evaluations as AIEvaluation[];
          const evalsForRpc = evaluations.map((ev: any) => ({
            question_id: openAnswers[ev.question_index]?.question_id,
            score: Math.min(ev.score, openAnswers[ev.question_index]?.points || 0),
            feedback: ev.feedback,
            strengths: ev.strengths,
            improvements: ev.improvements,
          })).filter((e: any) => e.question_id);

          const { data: appliedData } = await supabase.rpc("apply_ai_evaluations", {
            _response_id: responseId,
            _evaluations: evalsForRpc as any,
          } as any);
          if (appliedData) {
            totalScore = (appliedData as any).total_score ?? totalScore;
            percentage = (appliedData as any).percentage ?? percentage;
          }
          setAiEvaluations(evaluations);
        }
      } catch (err) {
        console.error("AI evaluation error:", err);
      }
    }

    const passed = percentage >= (assessment.passing_score || 70);
    setResult({ score: totalScore, max: maxScore, percentage, passed });
    setStep("done");
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  if (loading) return <div className="flex items-center justify-center min-h-screen"><p className="text-muted-foreground">{t("common.loading")}</p></div>;
  if (error) return <div className="flex items-center justify-center min-h-screen"><Card className="max-w-md"><CardContent className="p-8 text-center"><AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" /><p>{error}</p></CardContent></Card></div>;
  if (!assessment) return null;

  if (step === "info") {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 bg-background" dir={locale === "ar" ? "rtl" : "ltr"}>
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{assessment.title}</CardTitle>
            {assessment.description && <p className="text-muted-foreground mt-2">{assessment.description}</p>}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {assessment.duration_minutes} {t("qbank.minutes")}</span>
              <span>{questions.length} {t("qbank.questionsCount")}</span>
              <span>{t("qbank.passingScore")}: {assessment.passing_score}%</span>
            </div>
            <div className="flex justify-center">
              <Badge variant="secondary" className="gap-1">
                <Brain className="h-3.5 w-3.5" />
                {t("qbank.aiEvaluated")}
              </Badge>
            </div>
            <div className="space-y-3 pt-4">
              <div>
                <Label>{t("qbank.yourName")}</Label>
                <Input value={name} onChange={e => setName(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>{t("qbank.yourEmail")}</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1" />
              </div>
            </div>
            <Button className="w-full mt-4" size="lg" onClick={startTest} disabled={!name.trim() || !email.trim()}>
              {t("qbank.startTest")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Evaluating step
  if (step === "evaluating") {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 bg-background" dir={locale === "ar" ? "rtl" : "ltr"}>
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8 space-y-6">
            <div className="relative mx-auto w-20 h-20">
              <Brain className="h-12 w-12 text-primary mx-auto absolute inset-0 m-auto" />
              <Loader2 className="h-20 w-20 text-primary/30 animate-spin absolute inset-0" />
            </div>
            <h2 className="text-xl font-bold text-foreground">{t("qbank.aiEvaluating")}</h2>
            <p className="text-muted-foreground">{t("qbank.aiEvaluatingDesc")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "done" && result) {
    // Map AI evaluations by original question index for display
    const aiMap: Record<number, AIEvaluation> = {};
    aiEvaluations.forEach(ev => {
      // ev.question_index is relative to openAnswersForAI, we need to find original
      // We stored them in order, so reconstruct
      const openIndices = questions.map((q, i) => (q.question_type === "open_ended" || q.question_type === "code") ? i : -1).filter(i => i >= 0);
      if (openIndices[ev.question_index] !== undefined) {
        aiMap[openIndices[ev.question_index]] = ev;
      }
    });

    return (
      <div className="flex items-center justify-center min-h-screen p-4 bg-background" dir={locale === "ar" ? "rtl" : "ltr"}>
        <div className="w-full max-w-2xl space-y-4">
          <Card className="text-center">
            <CardContent className="p-8 space-y-4">
              <CheckCircle className={`h-16 w-16 mx-auto ${result.passed ? "text-green-500" : "text-destructive"}`} />
              <h2 className="text-2xl font-bold">{result.passed ? t("qbank.passed") : t("qbank.failed")}</h2>
              <div className="text-4xl font-bold text-primary">{result.percentage}%</div>
              <p className="text-muted-foreground">{result.score}/{result.max} {t("qbank.points")}</p>
              <Progress value={result.percentage} className="h-3" />
            </CardContent>
          </Card>

          {/* AI Feedback Section */}
          {aiEvaluations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Brain className="h-5 w-5 text-primary" />
                  {t("qbank.aiFeedback")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(aiMap).map(([idx, ev]) => {
                  const q = questions[Number(idx)];
                  if (!q) return null;
                  return (
                    <div key={idx} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <p className="font-medium text-sm text-foreground">{q.question_text}</p>
                        <Badge variant={ev.score >= q.points * 0.7 ? "default" : "destructive"} className="shrink-0 ms-2">
                          {ev.score}/{q.points}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{ev.feedback}</p>
                      {ev.strengths && (
                        <div className="flex items-start gap-2 text-sm bg-green-500/10 text-green-700 dark:text-green-400 rounded-md p-2">
                          <ThumbsUp className="h-4 w-4 mt-0.5 shrink-0" />
                          <span>{ev.strengths}</span>
                        </div>
                      )}
                      {ev.improvements && (
                        <div className="flex items-start gap-2 text-sm bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-md p-2">
                          <Lightbulb className="h-4 w-4 mt-0.5 shrink-0" />
                          <span>{ev.improvements}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // Test step
  const q = questions[currentQ];
  if (!q) return null;
  const progress = ((currentQ + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-background p-4" dir={locale === "ar" ? "rtl" : "ltr"}>
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">{assessment.title}</h2>
          <Badge variant={timeLeft < 60 ? "destructive" : "secondary"} className="text-base px-3 py-1">
            <Clock className="h-4 w-4 me-1" /> {formatTime(timeLeft)}
          </Badge>
          {tabSwitches > 0 && (
            <Badge variant="destructive" className="text-xs px-2 py-1 gap-1">
              <AlertTriangle className="h-3 w-3" />
              {tabSwitches} {locale === "ar" ? "مغادرة" : "switches"}
            </Badge>
          )}
        </div>
        <Progress value={progress} className="h-2" />
        <p className="text-sm text-muted-foreground">{t("qbank.questionOf").replace("{n}", String(currentQ + 1)).replace("{total}", String(questions.length))}</p>

        {/* Cheat Indicators Panel */}
        <Card className={`border ${
          cheatLevel === "high" ? "border-destructive/60 bg-destructive/5" :
          cheatLevel === "medium" ? "border-amber-500/60 bg-amber-500/5" :
          cheatLevel === "low" ? "border-yellow-500/40 bg-yellow-500/5" :
          "border-border/50"
        }`}>
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <ShieldAlert className={`h-4 w-4 ${
                  cheatLevel === "high" ? "text-destructive" :
                  cheatLevel === "medium" ? "text-amber-500" :
                  cheatLevel === "low" ? "text-yellow-500" :
                  "text-muted-foreground"
                }`} />
                <span className="text-sm font-medium">
                  {locale === "ar" ? "مؤشرات الغش" : "Cheating Indicators"}
                </span>
                <Badge variant={
                  cheatLevel === "high" ? "destructive" :
                  cheatLevel === "safe" ? "secondary" : "outline"
                } className="text-xs">
                  {locale === "ar"
                    ? (cheatLevel === "high" ? "مرتفع" : cheatLevel === "medium" ? "متوسط" : cheatLevel === "low" ? "منخفض" : "آمن")
                    : cheatLevel}
                  {" · "}{cheatScore}
                </Badge>
              </div>
            </div>
            <Progress value={cheatScore} className="h-1.5" />
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-xs">
              <div className="flex items-center gap-1 text-muted-foreground" title={locale === "ar" ? "تبديل التبويب" : "Tab switch"}>
                <EyeOff className="h-3 w-3" /> <span className="font-semibold text-foreground">{cheatEvents.visibility}</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground" title={locale === "ar" ? "خروج التركيز" : "Window blur"}>
                <Minimize className="h-3 w-3" /> <span className="font-semibold text-foreground">{cheatEvents.blur}</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground" title="Copy">
                <CopyIcon className="h-3 w-3" /> <span className="font-semibold text-foreground">{cheatEvents.copy}</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground" title="Cut">
                <Scissors className="h-3 w-3" /> <span className="font-semibold text-foreground">{cheatEvents.cut}</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground" title="Paste">
                <ClipboardPaste className="h-3 w-3" /> <span className="font-semibold text-foreground">{cheatEvents.paste}</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground" title={locale === "ar" ? "قائمة سياق" : "Right-click"}>
                <MousePointerClick className="h-3 w-3" /> <span className="font-semibold text-foreground">{cheatEvents.contextmenu}</span>
              </div>
            </div>
            {cheatLevel === "high" && (
              <p className="text-xs text-destructive font-medium">
                {locale === "ar"
                  ? "⚠️ تم رصد سلوك مشبوه — سيتم إبلاغ المُقيّم بهذه الأحداث."
                  : "⚠️ Suspicious behavior detected — these events will be reported to the reviewer."}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start justify-between">
              <p className="text-lg font-medium leading-relaxed">{q.question_text}</p>
              <div className="flex items-center gap-2 shrink-0 ms-2">
                {(q.question_type === "open_ended" || q.question_type === "code") && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Brain className="h-3 w-3" /> AI
                  </Badge>
                )}
                <Badge variant="outline">{q.points} pts</Badge>
              </div>
            </div>

            {q.question_type === "multiple_choice" && (
              <RadioGroup value={answers[q.id] || ""} onValueChange={v => setAnswers({ ...answers, [q.id]: v })}>
                {q.options.map((opt, i) => (
                  <div key={opt.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors ${answers[q.id] === opt.id ? "border-primary bg-primary/5" : ""}`}>
                    <RadioGroupItem value={opt.id} id={opt.id} />
                    <Label htmlFor={opt.id} className="flex-1 cursor-pointer">
                      <span className="font-medium me-2">{String.fromCharCode(65 + i)}.</span>
                      {opt.option_text}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {q.question_type === "true_false" && (
              <RadioGroup value={answers[q.id] || ""} onValueChange={v => setAnswers({ ...answers, [q.id]: v })}>
                {[{ v: "true", l: t("qbank.true") }, { v: "false", l: t("qbank.false") }].map(item => (
                  <div key={item.v} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 ${answers[q.id] === item.v ? "border-primary bg-primary/5" : ""}`}>
                    <RadioGroupItem value={item.v} id={item.v} />
                    <Label htmlFor={item.v} className="flex-1 cursor-pointer">{item.l}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {(q.question_type === "open_ended" || q.question_type === "code") && (
              <div>
                {q.code_language && <Badge variant="outline" className="mb-2">{q.code_language}</Badge>}
                <Textarea
                  value={answers[q.id] || ""}
                  onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
                  rows={q.question_type === "code" ? 8 : 4}
                  className={q.question_type === "code" ? "font-mono text-sm" : ""}
                  placeholder={q.question_type === "code" ? t("qbank.writeCode") : t("qbank.writeAnswer")}
                />
              </div>
            )}

            {q.question_type === "matching" && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{locale === "ar" ? "طابق كل عنصر من العمود الأيسر مع العمود الأيمن:" : "Match each item on the left with one on the right:"}</p>
                {q.options.map((opt, i) => {
                  const [leftItem] = (opt.option_text || "").split("||");
                  const rightItems = q.options.map(o => (o.option_text || "").split("||")[1] || "").filter(Boolean);
                  const currentMatch = matchAnswers[q.id]?.[opt.id] || "";
                  return (
                    <div key={opt.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 border border-border/40">
                      <span className="text-sm font-medium flex-1">{leftItem}</span>
                      <span className="text-muted-foreground">↔</span>
                      <select
                        value={currentMatch}
                        onChange={e => {
                          setMatchAnswers(prev => ({
                            ...prev,
                            [q.id]: { ...(prev[q.id] || {}), [opt.id]: e.target.value }
                          }));
                          // Store as JSON string in answers
                          const updated = { ...(matchAnswers[q.id] || {}), [opt.id]: e.target.value };
                          setAnswers(prev => ({ ...prev, [q.id]: JSON.stringify(updated) }));
                        }}
                        className="flex-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                      >
                        <option value="">{locale === "ar" ? "اختر..." : "Select..."}</option>
                        {rightItems.map((r, ri) => (
                          <option key={ri} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            )}

            {q.question_type === "ordering" && (() => {
              const items = orderAnswers[q.id] || q.options.map(o => o.option_text).sort(() => Math.random() - 0.5);
              if (!orderAnswers[q.id]) {
                // Initialize shuffled order
                setTimeout(() => {
                  setOrderAnswers(prev => ({ ...prev, [q.id]: items }));
                  setAnswers(prev => ({ ...prev, [q.id]: JSON.stringify(items) }));
                }, 0);
              }
              const moveItem = (fromIdx: number, toIdx: number) => {
                const newItems = [...items];
                const [moved] = newItems.splice(fromIdx, 1);
                newItems.splice(toIdx, 0, moved);
                setOrderAnswers(prev => ({ ...prev, [q.id]: newItems }));
                setAnswers(prev => ({ ...prev, [q.id]: JSON.stringify(newItems) }));
              };
              return (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{locale === "ar" ? "رتّب العناصر بالترتيب الصحيح:" : "Arrange items in the correct order:"}</p>
                  {items.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border/40">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                      <span className="flex-1 text-sm font-medium">{item}</span>
                      <div className="flex flex-col gap-0.5">
                        <Button size="icon" variant="ghost" className="h-6 w-6" disabled={i === 0} onClick={() => moveItem(i, i - 1)}>
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" disabled={i === items.length - 1} onClick={() => moveItem(i, i + 1)}>
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setCurrentQ(Math.max(0, currentQ - 1))} disabled={currentQ === 0}>
            {t("qbank.previous")}
          </Button>
          {currentQ < questions.length - 1 ? (
            <Button onClick={() => setCurrentQ(currentQ + 1)}>{t("qbank.next")}</Button>
          ) : (
            <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700">{t("qbank.submit")}</Button>
          )}
        </div>
      </div>
    </div>
  );
}
