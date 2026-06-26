import { useState } from "react";
import { useCreateQuestion, QuestionOption } from "@/hooks/useQuestionBank";
import { useJobs } from "@/hooks/useJobs";
import { useI18n } from "@/contexts/I18nContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export default function AddQuestionDialog({ open, onOpenChange }: Props) {
  const { t, locale } = useI18n();
  const { data: jobs = [] } = useJobs();
  const createMutation = useCreateQuestion();

  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState<string>("multiple_choice");
  const [difficulty, setDifficulty] = useState<string>("medium");
  const [jobId, setJobId] = useState<string>("");
  const [points, setPoints] = useState(1);
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [explanation, setExplanation] = useState("");
  const [codeLanguage, setCodeLanguage] = useState("");
  const [options, setOptions] = useState<QuestionOption[]>([
    { option_text: "", is_correct: true, sort_order: 0 },
    { option_text: "", is_correct: false, sort_order: 1 },
  ]);

  const reset = () => {
    setQuestionText(""); setQuestionType("multiple_choice"); setDifficulty("medium");
    setJobId(""); setPoints(1); setCorrectAnswer(""); setExplanation(""); setCodeLanguage("");
    setOptions([{ option_text: "", is_correct: true, sort_order: 0 }, { option_text: "", is_correct: false, sort_order: 1 }]);
  };

  const handleSubmit = () => {
    if (!questionText.trim()) return;
    createMutation.mutate({
      question: {
        question_text: questionText,
        question_type: questionType as any,
        difficulty: difficulty as any,
        job_id: jobId && jobId !== "none" ? jobId : null,
        points,
        correct_answer: questionType === "true_false" ? correctAnswer : (questionType === "open_ended" || questionType === "code" ? correctAnswer : null),
        explanation: explanation || null,
        code_language: questionType === "code" ? codeLanguage : null,
        category: "",
        time_limit_seconds: null,
        is_active: true,
      },
      options: (questionType === "multiple_choice" || questionType === "matching" || questionType === "ordering") ? options.filter(o => o.option_text.trim()) : undefined,
    }, {
      onSuccess: () => { reset(); onOpenChange(false); }
    });
  };

  const addOption = () => setOptions([...options, { option_text: "", is_correct: false, sort_order: options.length }]);
  const removeOption = (i: number) => setOptions(options.filter((_, idx) => idx !== i));
  const updateOption = (i: number, field: string, value: any) => {
    const updated = [...options];
    (updated[i] as any)[field] = value;
    if (field === "is_correct" && value) {
      updated.forEach((o, idx) => { if (idx !== i) o.is_correct = false; });
    }
    setOptions(updated);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("qbank.addQuestion")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>{t("qbank.questionText")}</Label>
            <Textarea value={questionText} onChange={e => setQuestionText(e.target.value)} rows={3} className="mt-1" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("qbank.type")}</Label>
              <Select value={questionType} onValueChange={setQuestionType}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="multiple_choice">{locale === "ar" ? "اختيار متعدد" : "Multiple Choice"}</SelectItem>
                  <SelectItem value="open_ended">{locale === "ar" ? "سؤال مفتوح" : "Open Ended"}</SelectItem>
                  <SelectItem value="code">{locale === "ar" ? "كود" : "Code"}</SelectItem>
                  <SelectItem value="true_false">{locale === "ar" ? "صح/خطأ" : "True/False"}</SelectItem>
                  <SelectItem value="matching">{locale === "ar" ? "مطابقة" : "Matching"}</SelectItem>
                  <SelectItem value="ordering">{locale === "ar" ? "ترتيب" : "Ordering"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("qbank.difficulty")}</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">{locale === "ar" ? "سهل" : "Easy"}</SelectItem>
                  <SelectItem value="medium">{locale === "ar" ? "متوسط" : "Medium"}</SelectItem>
                  <SelectItem value="hard">{locale === "ar" ? "صعب" : "Hard"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("qbank.linkedJob")}</Label>
              <Select value={jobId || "none"} onValueChange={setJobId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder={t("qbank.noJob")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("qbank.noJob")}</SelectItem>
                  {jobs.map(j => <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("qbank.points")}</Label>
              <Input type="number" min={1} value={points} onChange={e => setPoints(Number(e.target.value))} className="mt-1" />
            </div>
          </div>

          {questionType === "code" && (
            <div>
              <Label>{t("qbank.codeLanguage")}</Label>
              <Input value={codeLanguage} onChange={e => setCodeLanguage(e.target.value)} placeholder="JavaScript, Python..." className="mt-1" />
            </div>
          )}

          {questionType === "multiple_choice" && (
            <div className="space-y-3">
              <Label>{t("qbank.options")}</Label>
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <Input value={opt.option_text} onChange={e => updateOption(i, "option_text", e.target.value)} placeholder={`${t("qbank.option")} ${i + 1}`} className="flex-1" />
                  <div className="flex items-center gap-1">
                    <Switch checked={opt.is_correct} onCheckedChange={v => updateOption(i, "is_correct", v)} />
                    <span className="text-xs text-muted-foreground">{t("qbank.correct")}</span>
                  </div>
                  {options.length > 2 && (
                    <Button variant="ghost" size="icon" onClick={() => removeOption(i)} className="text-destructive shrink-0">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
              {options.length < 6 && (
                <Button variant="outline" size="sm" onClick={addOption} className="gap-1">
                  <Plus className="h-3 w-3" /> {t("qbank.addOption")}
                </Button>
              )}
            </div>
          )}

          {questionType === "matching" && (
            <div className="space-y-3">
              <Label>{locale === "ar" ? "أزواج المطابقة (العمود الأيسر = السؤال، الأيمن = الإجابة)" : "Matching pairs (Left = Question, Right = Answer)"}</Label>
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">{i + 1}</span>
                  <Input
                    value={opt.option_text.split("||")[0] || ""}
                    onChange={e => updateOption(i, "option_text", `${e.target.value}||${opt.option_text.split("||")[1] || ""}`)}
                    placeholder={locale === "ar" ? `العنصر ${i + 1}` : `Item ${i + 1}`}
                    className="flex-1"
                  />
                  <span className="text-muted-foreground">↔</span>
                  <Input
                    value={opt.option_text.split("||")[1] || ""}
                    onChange={e => updateOption(i, "option_text", `${opt.option_text.split("||")[0] || ""}||${e.target.value}`)}
                    placeholder={locale === "ar" ? `المطابق ${i + 1}` : `Match ${i + 1}`}
                    className="flex-1"
                  />
                  {options.length > 2 && (
                    <Button variant="ghost" size="icon" onClick={() => removeOption(i)} className="text-destructive shrink-0">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
              {options.length < 8 && (
                <Button variant="outline" size="sm" onClick={addOption} className="gap-1">
                  <Plus className="h-3 w-3" /> {locale === "ar" ? "إضافة زوج" : "Add Pair"}
                </Button>
              )}
            </div>
          )}

          {questionType === "ordering" && (
            <div className="space-y-3">
              <Label>{locale === "ar" ? "العناصر بالترتيب الصحيح (من الأعلى للأسفل)" : "Items in correct order (top to bottom)"}</Label>
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                  <Input value={opt.option_text} onChange={e => updateOption(i, "option_text", e.target.value)} placeholder={`${locale === "ar" ? "العنصر" : "Item"} ${i + 1}`} className="flex-1" />
                  {options.length > 2 && (
                    <Button variant="ghost" size="icon" onClick={() => removeOption(i)} className="text-destructive shrink-0">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
              {options.length < 8 && (
                <Button variant="outline" size="sm" onClick={addOption} className="gap-1">
                  <Plus className="h-3 w-3" /> {locale === "ar" ? "إضافة عنصر" : "Add Item"}
                </Button>
              )}
            </div>
          )}

          {questionType === "true_false" && (
            <div>
              <Label>{t("qbank.correctAnswer")}</Label>
              <Select value={correctAnswer} onValueChange={setCorrectAnswer}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">{t("qbank.true")}</SelectItem>
                  <SelectItem value="false">{t("qbank.false")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {(questionType === "open_ended" || questionType === "code") && (
            <div>
              <Label>{t("qbank.sampleAnswer")}</Label>
              <Textarea value={correctAnswer} onChange={e => setCorrectAnswer(e.target.value)} rows={3} className="mt-1" />
            </div>
          )}

          <div>
            <Label>{t("qbank.explanation")}</Label>
            <Textarea value={explanation} onChange={e => setExplanation(e.target.value)} rows={2} className="mt-1" placeholder={t("qbank.explanationPlaceholder")} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleSubmit} disabled={!questionText.trim() || createMutation.isPending}>
              {createMutation.isPending ? t("common.loading") : t("qbank.addQuestion")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
