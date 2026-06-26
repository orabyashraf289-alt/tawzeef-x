import { useState, useMemo } from "react";
import { useCreateQuestion } from "@/hooks/useQuestionBank";
import { useJobs } from "@/hooks/useJobs";
import { useI18n } from "@/contexts/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { TEMPLATES } from "./QuestionTemplates";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Loader2, Check, X, Terminal, BrainCircuit, BarChart } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface GeneratedQuestion {
  question_text: string;
  question_type: "multiple_choice" | "open_ended" | "code" | "true_false";
  difficulty: "easy" | "medium" | "hard";
  correct_answer?: string;
  explanation?: string;
  code_language?: string;
  points: number;
  options?: { option_text: string; is_correct: boolean }[];
  _selected?: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export default function AIGenerateDialog({ open, onOpenChange }: Props) {
  const { t, locale } = useI18n();
  const { data: jobs = [] } = useJobs();
  const createMutation = useCreateQuestion();

  const [jobId, setJobId] = useState("");
  const [count, setCount] = useState(5);
  const [types, setTypes] = useState<string[]>(["multiple_choice", "true_false", "open_ended"]);
  const [promptGuideline, setPromptGuideline] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedQuestion[]>([]);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const selectedJob = jobs.find(j => j.id === jobId);

  const toggleType = (type: string) => {
    setTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };

  const typeOptions = [
    { value: "multiple_choice", label: locale === "ar" ? "اختيار متعدد" : "Multiple Choice" },
    { value: "true_false", label: locale === "ar" ? "صح/خطأ" : "True/False" },
    { value: "open_ended", label: locale === "ar" ? "مفتوح" : "Open Ended" },
    { value: "code", label: locale === "ar" ? "كود" : "Code" },
  ];

  const handleGenerate = async () => {
    if (!jobId || types.length === 0) return;
    setGenerating(true);
    setGenerated([]);
    setCurrentStep(0);

    // Simulate steps for generator feedback
    const timer1 = setTimeout(() => setCurrentStep(1), 1500);
    const timer2 = setTimeout(() => setCurrentStep(2), 3500);
    const timer3 = setTimeout(() => setCurrentStep(3), 5500);

    try {
      const { data, error } = await supabase.functions.invoke("generate-assessment-questions", {
        body: {
          job_title: selectedJob?.title,
          job_description: selectedJob?.description,
          requirements: selectedJob?.requirements,
          count,
          types,
          language: locale,
          guidelines: promptGuideline || undefined,
        },
      });

      if (error) throw error;
      if (data?.questions) {
        setGenerated(data.questions.map((q: any) => ({ ...q, _selected: true })));
      } else {
        throw new Error("No questions generated");
      }
    } catch (err: any) {
      console.warn("Edge function invocation failed, falling back to local template questions:", err);
      
      try {
        const jobTitleLower = (selectedJob?.title || "").toLowerCase();
        let categoryId = "programming"; // default
        
        if (
          jobTitleLower.includes("تسويق") || 
          jobTitleLower.includes("marketing") || 
          jobTitleLower.includes("مبيعات") || 
          jobTitleLower.includes("sales") ||
          jobTitleLower.includes("سوشيال") ||
          jobTitleLower.includes("social")
        ) {
          categoryId = "marketing";
        } else if (
          jobTitleLower.includes("إدار") || 
          jobTitleLower.includes("manage") || 
          jobTitleLower.includes("قياد") || 
          jobTitleLower.includes("lead") ||
          jobTitleLower.includes("رئيس") ||
          jobTitleLower.includes("director")
        ) {
          categoryId = "management";
        } else if (
          jobTitleLower.includes("مالي") || 
          jobTitleLower.includes("محاسب") || 
          jobTitleLower.includes("account") || 
          jobTitleLower.includes("financ") ||
          jobTitleLower.includes("بنك") ||
          jobTitleLower.includes("banking")
        ) {
          categoryId = "accounting";
        }

        const matchedCategory = TEMPLATES.find(c => c.id === categoryId) || TEMPLATES[0];
        
        // Filter questions by requested types
        const candidates = matchedCategory.questions.filter(q => types.includes(q.question_type));
        
        // Fallback to all questions if none match the exact types requested
        const finalCandidates = candidates.length > 0 ? candidates : matchedCategory.questions;
        
        // Shuffle and take requested count
        const shuffled = [...finalCandidates].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, count).map(q => ({
          question_text: q.question_text,
          question_type: q.question_type,
          difficulty: q.difficulty,
          correct_answer: q.correct_answer || undefined,
          points: q.points,
          code_language: q.code_language,
          options: q.options ? q.options.map(o => ({ option_text: o.option_text, is_correct: o.is_correct })) : undefined,
          _selected: true
        }));

        if (selected.length > 0) {
          setGenerated(selected);
          toast({ 
            title: locale === "ar" ? "تم توليد الأسئلة بنجاح (معاينة محلية)" : "Questions generated successfully (Local Preview)",
            description: locale === "ar" ? "تم استخدام الأسئلة النموذجية نظراً لعدم إعداد مفتاح الذكاء الاصطناعي." : "Default template questions were used because the AI key is not configured."
          });
        } else {
          toast({ title: t("qbank.ai.error"), variant: "destructive" });
        }
      } catch (fallbackErr) {
        console.error("Local fallback failed too:", fallbackErr);
        toast({ title: t("qbank.ai.error"), variant: "destructive" });
      }
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      setGenerating(false);
    }
  };

  const toggleQuestion = (i: number) => {
    setGenerated(prev => prev.map((q, idx) => idx === i ? { ...q, _selected: !q._selected } : q));
  };

  const handleSave = async () => {
    const selected = generated.filter(q => q._selected);
    if (selected.length === 0) return;
    setSaving(true);

    try {
      for (const q of selected) {
        await createMutation.mutateAsync({
          question: {
            question_text: q.question_text,
            question_type: q.question_type,
            difficulty: q.difficulty,
            job_id: jobId || null,
            points: q.points || 1,
            correct_answer: q.correct_answer || null,
            explanation: q.explanation || null,
            code_language: q.code_language || null,
            category: "",
            time_limit_seconds: null,
            is_active: true,
          },
          options: q.question_type === "multiple_choice" && q.options
            ? q.options.map((o, i) => ({ option_text: o.option_text, is_correct: o.is_correct, sort_order: i }))
            : undefined,
        });
      }
      toast({ title: `${t("qbank.ai.saved")} (${selected.length})` });
      setGenerated([]);
      setPromptGuideline("");
      onOpenChange(false);
    } catch {
      toast({ title: t("qbank.ai.saveError"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const diffLabels: Record<string, string> = locale === "ar"
    ? { easy: "سهل", medium: "متوسط", hard: "صعب" }
    : { easy: "Easy", medium: "Medium", hard: "Hard" };

  const diffColors: Record<string, string> = {
    easy: "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20",
    medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
    hard: "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20",
  };

  const selectedCount = generated.filter(q => q._selected).length;

  // Compute breakdown ratios for previewing
  const previewStats = useMemo(() => {
    if (generated.length === 0) return null;
    const easy = generated.filter(q => q.difficulty === "easy").length;
    const medium = generated.filter(q => q.difficulty === "medium").length;
    const hard = generated.filter(q => q.difficulty === "hard").length;
    return { easy, medium, hard };
  }, [generated]);

  const generationSteps = [
    locale === "ar" ? "تحليل متطلبات الوصف الوظيفي..." : "Analyzing job description requirements...",
    locale === "ar" ? "تخطيط محاور الأسئلة ونوعية التقييم..." : "Mapping questions blueprint & difficulty...",
    locale === "ar" ? "توليد خيارات الإجابة وصياغة الأكواد..." : "Generating MCQ answers and code templates...",
    locale === "ar" ? "تنسيق مخرجات الذكاء الاصطناعي النهائية..." : "Formatting final AI outputs...",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-card/95 backdrop-blur-xl border border-border/40 rounded-2xl shadow-2xl p-6">
        <DialogHeader className="border-b border-border/40 pb-4">
          <DialogTitle className="flex items-center gap-2.5 text-lg font-black text-foreground">
            <div className="p-1.5 bg-primary/10 rounded-lg text-primary border border-primary/20">
              <BrainCircuit className="h-5 w-5 animate-pulse" />
            </div>
            <span>{t("qbank.ai.title")}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-3">
          
          {/* Config Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="linkedJob" className="text-xs font-bold text-foreground/80">{t("qbank.linkedJob")} *</Label>
              <Select value={jobId} onValueChange={setJobId}>
                <SelectTrigger id="linkedJob" className="mt-1 rounded-xl bg-muted/40 border-border/80 text-xs h-11 focus:ring-1 focus:ring-primary">
                  <SelectValue placeholder={t("qbank.ai.selectJob")} />
                </SelectTrigger>
                <SelectContent className="bg-card/95 backdrop-blur-xl border-border/60 rounded-xl">
                  {jobs.map(j => <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="count" className="text-xs font-bold text-foreground/80">{t("qbank.ai.count")}</Label>
              <Input id="count" type="number" min={1} max={20} value={count} onChange={e => setCount(Number(e.target.value))} className="mt-1 rounded-xl bg-muted/40 border-border/80 text-xs h-11 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary/50" />
            </div>
          </div>

          {/* Guidelines Prompt input */}
          <div className="space-y-2">
            <Label htmlFor="guidelines" className="text-xs font-bold text-foreground/80">{locale === "ar" ? "توجيهات إضافية للذكاء الاصطناعي (اختياري)" : "Additional Guidelines for AI (Optional)"}</Label>
            <Input
              id="guidelines"
              value={promptGuideline}
              onChange={e => setPromptGuideline(e.target.value)}
              placeholder={locale === "ar" ? "مثال: ركز على مكتبات React Hooks أو أسئلة سيناريوهات أمان قواعد البيانات..." : "e.g. Focus on React Hooks or database security scenario questions..."}
              className="rounded-xl bg-muted/40 border-border/80 text-xs h-11 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary/50"
            />
          </div>

          {/* Types Selection */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-foreground/80">{t("qbank.ai.questionTypes")}</Label>
            <div className="flex flex-wrap gap-2 pt-1">
              {typeOptions.map(to => {
                const isActive = types.includes(to.value);
                return (
                  <Badge
                    key={to.value}
                    variant={isActive ? "default" : "outline"}
                    className={`cursor-pointer transition-all duration-200 text-xs py-1.5 px-3 rounded-xl border ${
                      isActive 
                        ? "bg-primary text-primary-foreground border-primary/20 shadow-md shadow-primary/5 font-bold" 
                        : "border-border/80 hover:bg-muted/40 bg-card/60 text-muted-foreground"
                    }`}
                    onClick={() => toggleType(to.value)}
                  >
                    {isActive && <Check className="h-3.5 w-3.5 me-1 stroke-[3]" />}
                    {to.label}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Generate Button */}
          <Button onClick={handleGenerate} disabled={!jobId || types.length === 0 || generating} className="w-full h-11 rounded-xl gap-2 font-bold shadow-lg shadow-primary/10 bg-primary hover:bg-primary/95 text-white transition-all hover:scale-[1.01]">
            {generating ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Sparkles className="h-4.5 w-4.5" />}
            {generating ? t("qbank.ai.generating") : t("qbank.ai.generate")}
          </Button>

          {/* Steps Loader when generating */}
          <AnimatePresence>
            {generating && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-4.5"
              >
                <div className="relative w-11 h-11 flex items-center justify-center shrink-0">
                  <div className="absolute inset-0 rounded-full border-4 border-primary/10 border-t-primary animate-spin" />
                  <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-primary">{locale === "ar" ? "جاري توليد الأسئلة..." : "Generating questions..."}</p>
                  <p className="text-[10px] text-muted-foreground truncate mt-1 animate-pulse font-medium">{generationSteps[currentStep]}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Generated Questions Preview List */}
          {generated.length > 0 && (
            <div className="space-y-4 pt-2 border-t border-border/40">
              
              {/* Distribution Stats Row */}
              {previewStats && (
                <div className="flex items-center justify-between text-xs bg-muted/40 p-3 rounded-xl border border-border/50">
                  <span className="font-bold text-muted-foreground flex items-center gap-1.5">
                    <BarChart className="w-4 h-4 text-primary" />
                    <span>{locale === "ar" ? "تحليل صعوبة الأسئلة المولدة:" : "Generated Difficulty Distribution:"}</span>
                  </span>
                  <div className="flex gap-2 font-bold">
                    <span className="text-green-600 dark:text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-lg">{diffLabels.easy}: {previewStats.easy}</span>
                    <span className="text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg">{diffLabels.medium}: {previewStats.medium}</span>
                    <span className="text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-lg">{diffLabels.hard}: {previewStats.hard}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground/80">{t("qbank.ai.generatedQuestions")} ({selectedCount}/{generated.length})</Label>
              </div>

              <ScrollArea className="h-[250px] border border-border/40 rounded-xl p-3 bg-muted/20">
                <div className="space-y-3">
                  {generated.map((q, i) => (
                    <div
                      key={i}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-300 ${
                        q._selected 
                          ? "bg-primary/10 border-primary/20 shadow-md shadow-primary/5 font-bold" 
                          : "opacity-60 border-transparent hover:bg-muted/30"
                      }`}
                      onClick={() => toggleQuestion(i)}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox checked={q._selected} className="mt-1 h-4.5 w-4.5 rounded-md border-primary/30" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-foreground/90 leading-relaxed">{q.question_text}</p>
                          <div className="flex gap-1.5 mt-2 flex-wrap">
                            <Badge variant="outline" className="text-[10px] font-bold bg-muted/40 border-border/60">
                              {typeOptions.find(to => to.value === q.question_type)?.label}
                            </Badge>
                            <Badge className={`text-[10px] font-bold border-0 ${diffColors[q.difficulty]}`}>
                              {diffLabels[q.difficulty]}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px] font-bold bg-secondary/80">{q.points} pts</Badge>
                          </div>
                          {q.options && q.options.length > 0 && (
                            <div className="mt-2.5 space-y-1 pl-2.5">
                              {q.options.map((o, j) => (
                                <p key={j} className={`text-[11px] ${o.is_correct ? "text-green-600 dark:text-green-400 font-bold" : "text-muted-foreground font-medium"}`}>
                                  {String.fromCharCode(65 + j)}. {o.option_text} {o.is_correct && "✓"}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="flex justify-end gap-2.5 pt-1">
                <Button variant="outline" onClick={() => setGenerated([])} className="rounded-xl text-xs font-bold border-border/80 hover:bg-muted bg-transparent h-10">
                  {t("common.cancel")}
                </Button>
                <Button onClick={handleSave} disabled={selectedCount === 0 || saving} className="rounded-xl h-10 text-xs font-bold shadow-lg shadow-primary/10 bg-primary hover:bg-primary/95 text-white border-none flex items-center gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 stroke-[3]" />}
                  <span>{t("qbank.ai.saveSelected")} ({selectedCount})</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
