import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import AssessmentActivityLog from "./AssessmentActivityLog";
import { useScreenPermissions } from "@/hooks/useScreenPermissions";
import { readAssessmentAnswers, displayAssessmentAnswer, type ReviewQuestion, type AnswerEntry } from "@/lib/assessmentResponseData";
import { useState, useEffect } from "react";
import { useAssessmentResponses } from "@/hooks/useQuestionBank";
import { useI18n } from "@/contexts/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { Brain, Eye, ArrowLeft, Send, ThumbsUp, Lightbulb, Loader2, Edit2, Save, ClipboardCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";

async function loadReviewQuestions(responseId: string): Promise<Record<string, ReviewQuestion>> {
  const { data, error } = await (supabase.rpc as any)("get_assessment_review_questions", { _response_id: responseId });
  if (error) throw error;
  return Object.fromEntries((data as ReviewQuestion[] || []).map(question => [question.id, question]));
}

interface Props {
  assessmentId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export default function AssessmentResponsesDialog({ assessmentId, open, onOpenChange }: Props) {
  const { t } = useI18n();
  const { hasHiringPermission } = useScreenPermissions();
  const { data: responses = [], isLoading, isError, refetch } = useAssessmentResponses(assessmentId);
  const [selectedResponse, setSelectedResponse] = useState<string | null>(null);
  const [editingAnswers, setEditingAnswers] = useState<AnswerEntry[] | null>(null);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [questions, setQuestions] = useState<Record<string, ReviewQuestion>>({});
  const qc = useQueryClient();

  const selected = responses.find(r => r.id === selectedResponse);

  const loadDetails = async (responseId: string) => {
    const response = responses.find(r => r.id === responseId);
    if (!response) return;

    const answers = readAssessmentAnswers(response.answers);
    try { setQuestions(await loadReviewQuestions(responseId)); }
    catch { toast({ title: "تعذّر تحميل تفاصيل المحاولة المحفوظة", variant: "destructive" }); return; }

    setEditingAnswers(answers.map(a => ({ ...a })));
    setSelectedResponse(responseId);
  };

  const handleScoreChange = (index: number, newScore: number) => {
    if (!editingAnswers) return;
    const updated = [...editingAnswers];
    const q = questions[updated[index].question_id];
    updated[index].points_earned = Math.min(Math.max(0, newScore), updated[index].max_points ?? q?.points ?? 0);
    setEditingAnswers(updated);
  };

  const handleFeedbackChange = (index: number, field: "ai_feedback" | "ai_strengths" | "ai_improvements", value: string) => {
    if (!editingAnswers) return;
    const updated = [...editingAnswers];
    updated[index][field] = value;
    setEditingAnswers(updated);
  };

  const saveChanges = async () => {
    if (!editingAnswers || !selected) return;
    setSaving(true);

    try {
      const { data, error } = await (supabase.rpc as any)("review_assessment_response", {
        _response_id: selected.id,
        _evaluations: editingAnswers.map(a => ({ question_id: a.question_id, score: a.points_earned, feedback: a.ai_feedback || "", strengths: a.ai_strengths || "", improvements: a.ai_improvements || "" })),
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["assessment-responses"] });
      qc.invalidateQueries({ queryKey: ["all-assessment-responses"] });
      toast({ title: t("qbank.review.saved") });
      return data;
    } catch (error) {
      toast({ title: "تعذّر حفظ المراجعة", variant: "destructive" });
      throw error;
    } finally { setSaving(false); }
  };

  const sendResults = async () => {
    if (!selected || !editingAnswers) return;
    setSending(true);

    try {
      // Save first
      const saved = await saveChanges();
      if (!saved) throw new Error("Review not saved");

      const { error } = await supabase.functions.invoke("send-assessment-results", {
        body: { response_id: selected.id },
      });

      if (error) throw error;
      toast({ title: t("qbank.review.sent") });
    } catch {
      toast({ title: t("qbank.review.sendError"), variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  // Detail view
  if (selectedResponse && selected && editingAnswers) {
    return (
      <Dialog open={open} onOpenChange={(o) => { if (!o) { setSelectedResponse(null); setEditingAnswers(null); } onOpenChange(o); }}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => { setSelectedResponse(null); setEditingAnswers(null); }}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <DialogTitle className="flex-1">{t("qbank.review.title")} - {selected.candidate_name}</DialogTitle>
            </div>
          </DialogHeader>

          {/* Summary */}
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {editingAnswers.reduce((s, a) => s + (a.points_earned || 0), 0)}/
                {editingAnswers.reduce((s, a) => s + (a.max_points ?? questions[a.question_id]?.points ?? 0), 0)}
              </div>
              <div className="text-xs text-muted-foreground">{t("qbank.score")}</div>
            </div>
            <Separator orientation="vertical" className="h-10" />
            <div className="text-center">
              <div className="text-2xl font-bold">
                {(() => {
                  const max = editingAnswers.reduce((s, a) => s + (a.max_points ?? questions[a.question_id]?.points ?? 0), 0);
                  const total = editingAnswers.reduce((s, a) => s + (a.points_earned || 0), 0);
                  return max > 0 ? Math.round((total / max) * 100) : 0;
                })()}%
              </div>
              <div className="text-xs text-muted-foreground">{t("qbank.review.percentage")}</div>
            </div>
            <Separator orientation="vertical" className="h-10" />
            <div className="text-sm text-muted-foreground">
              <div>{selected.candidate_email}</div>
              <div>{format(new Date(selected.started_at), "yyyy/MM/dd HH:mm")}</div>
            </div>
            {selected.tab_switches > 0 && (
              <>
                <Separator orientation="vertical" className="h-10" />
                <div className="text-center">
                  <div className="text-xl font-bold text-destructive">{selected.tab_switches}</div>
                  <div className="text-[10px] text-destructive/80">⚠️ مغادرات</div>
                </div>
              </>
            )}
          </div>

          <AssessmentActivityLog log={selected.tab_switch_log} tabSwitches={selected.tab_switches} />

          {/* Answers */}
          <div className="space-y-4">
            {editingAnswers.map((answer, idx) => {
              const q = questions[answer.question_id];
              if (!q) return null;
              const isAI = answer.ai_evaluated;

              return (
                <Card key={idx} className="border">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <span className="bg-muted text-muted-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs">{idx + 1}</span>
                        {q.question_text}
                      </CardTitle>
                      <div className="flex items-center gap-2 shrink-0">
                        {isAI && (
                          <Badge variant="outline" className="gap-1 text-xs">
                            <Brain className="h-3 w-3" /> AI
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Candidate answer */}
                    <div className="bg-muted/30 rounded-md p-3">
                      <div className="text-xs text-muted-foreground mb-1">{t("qbank.review.candidateAnswer")}</div>
                      <p className="text-sm whitespace-pre-wrap">{displayAssessmentAnswer(answer.answer, q)}</p>
                    </div>

                    {/* Score editor */}
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium">{t("qbank.score")}:</label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min={0}
                          max={answer.max_points ?? q.points}
                          value={answer.points_earned}
                          onChange={e => handleScoreChange(idx, Number(e.target.value))}
                          className="w-20 h-8"
                        />
                        <span className="text-sm text-muted-foreground">/ {answer.max_points ?? q.points}</span>
                      </div>
                      {!isAI && !answer.requires_review && (
                        <Badge variant={answer.is_correct ? "default" : "destructive"} className="text-xs">
                          {answer.is_correct ? t("qbank.correct") : t("qbank.review.incorrect")}
                        </Badge>
                      )}
                    </div>

                    {answer.requires_review && <Badge variant="secondary">بانتظار المراجعة</Badge>}
                    {(isAI || ["open_ended", "code"].includes(q.question_type)) && (
                      <div className="space-y-2 border-t pt-3">
                        <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                          <Edit2 className="h-3.5 w-3.5" /> {t("qbank.review.editFeedback")}
                        </div>
                        <Textarea
                          value={answer.ai_feedback || ""}
                          onChange={e => handleFeedbackChange(idx, "ai_feedback", e.target.value)}
                          placeholder={t("qbank.review.feedbackPlaceholder")}
                          rows={2}
                          className="text-sm"
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div>
                            <div className="flex items-center gap-1 text-xs text-green-600 mb-1">
                              <ThumbsUp className="h-3 w-3" /> {t("qbank.review.strengths")}
                            </div>
                            <Textarea
                              value={answer.ai_strengths || ""}
                              onChange={e => handleFeedbackChange(idx, "ai_strengths", e.target.value)}
                              rows={2}
                              className="text-sm"
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-1 text-xs text-amber-600 mb-1">
                              <Lightbulb className="h-3 w-3" /> {t("qbank.review.improvements")}
                            </div>
                            <Textarea
                              value={answer.ai_improvements || ""}
                              onChange={e => handleFeedbackChange(idx, "ai_improvements", e.target.value)}
                              rows={2}
                              className="text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Action buttons */}
          <div className="flex justify-between items-center pt-4 border-t sticky bottom-0 bg-background pb-2">
            <Button variant="outline" onClick={() => { void saveChanges().catch(() => {}); }} disabled={saving || !hasHiringPermission("assessment_responses", "edit")} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t("qbank.review.saveOnly")}
            </Button>
            <Button onClick={sendResults} disabled={sending || saving || !hasHiringPermission("assessment_responses", "edit")} className="gap-2">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {t("qbank.review.approveAndSend")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // List view
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("qbank.responses")}</DialogTitle>
        </DialogHeader>

        {isError ? (<div role="alert" className="p-4">تعذّر تحميل النتائج. <Button onClick={() => refetch()}>إعادة المحاولة</Button></div>) : isLoading ? (
          <div className="text-center py-8 text-muted-foreground">{t("common.loading")}</div>
        ) : responses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">{t("qbank.noResponses")}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("qbank.candidateName")}</TableHead>
                <TableHead>{t("qbank.email")}</TableHead>
                <TableHead>{t("qbank.score")}</TableHead>
                <TableHead>نشاط الجلسة</TableHead>
                <TableHead>{t("qbank.status")}</TableHead>
                <TableHead>{t("qbank.date")}</TableHead>
                <TableHead>{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {responses.map(r => {
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.candidate_name}</TableCell>
                    <TableCell>{r.candidate_email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {r.status === "completed" ? `${r.total_score}/${r.max_score} (${r.percentage}%)` : r.status === "pending_review" ? "بانتظار اكتمال التصحيح" : "لم يُسلّم بعد"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">{r.tab_switches ? `${r.tab_switches} مغادرات مسجلة` : "لا توجد مغادرات مسجلة"}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.status === "completed" ? "default" : "secondary"}>
                        {r.status === "completed" ? t("qbank.completed") : r.status === "pending_review" ? "بانتظار التصحيح" : t("qbank.inProgress")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(r.started_at), "yyyy/MM/dd HH:mm")}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="gap-1" onClick={() => loadDetails(r.id)}>
                        <Eye className="h-4 w-4" /> {t("qbank.review.view")}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface SingleProps {
  responseId: string;
  open: boolean;
  onClose: () => void;
}

export function SingleResponseProctoringDialog({ responseId, open, onClose }: SingleProps) {
  const { t } = useI18n();
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const { hasHiringPermission } = useScreenPermissions();
  const [editingAnswers, setEditingAnswers] = useState<AnswerEntry[] | null>(null);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  const { data: response, isLoading } = useQuery({
    queryKey: ["proctoring-single-response", user?.id, activeCompanyId, responseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_responses")
        .select("*, assessments(title, passing_score, duration_minutes)")
        .eq("id", responseId)
        .single();
      if (error) throw error;

      return { ...data, reviewQuestions: await loadReviewQuestions(responseId) };
    },
    enabled: open && !!responseId && !!user && !!activeCompanyId,
  });

  const questions = response?.reviewQuestions || {};
  useEffect(() => { setEditingAnswers(response ? readAssessmentAnswers(response.answers) : null); }, [response, open]);

  const handleScoreChange = (index: number, newScore: number) => {
    if (!editingAnswers) return;
    const updated = [...editingAnswers];
    const q = questions[updated[index].question_id];
    updated[index].points_earned = Math.min(Math.max(0, newScore), updated[index].max_points ?? q?.points ?? 0);
    setEditingAnswers(updated);
  };

  const handleFeedbackChange = (index: number, field: "ai_feedback" | "ai_strengths" | "ai_improvements", value: string) => {
    if (!editingAnswers) return;
    const updated = [...editingAnswers];
    updated[index][field] = value;
    setEditingAnswers(updated);
  };

  const saveEvaluation = async () => {
    if (!response || !editingAnswers) return;
    setSaving(true);
    try {
      const { error } = await (supabase.rpc as any)("review_assessment_response", {
        _response_id: response.id,
        _evaluations: editingAnswers.map(a => ({ question_id: a.question_id, score: a.points_earned, feedback: a.ai_feedback || "", strengths: a.ai_strengths || "", improvements: a.ai_improvements || "" })),
      });

      if (error) throw error;
      toast({ title: t("qbank.review.saved") || "تم حفظ التقييم بنجاح ✅" });
      qc.invalidateQueries({ queryKey: ["candidate-assessment-results"] });
      onClose();
    } catch (e: any) {
      toast({ title: "خطأ في الحفظ", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };


  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader className="flex flex-row items-center justify-between border-b pb-3 mb-4">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-primary" />
            تقييم إجابات المرشح: {response?.candidate_name}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !response ? (
          <p className="text-center py-6 text-sm text-muted-foreground">حدث خطأ في تحميل تفاصيل الإجابة</p>
        ) : (
          <div className="space-y-5">
            <AssessmentActivityLog log={response.tab_switch_log} tabSwitches={response.tab_switches} />

            {/* Answer details list */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-muted-foreground border-b pb-1.5 flex items-center gap-1.5">
                <ClipboardCheck className="w-4 h-4 text-primary" />
                تفاصيل الإجابات والدرجات
              </h4>
              {editingAnswers?.map((ans, idx) => {
                const q = questions[ans.question_id];
                return (
                  <div key={idx} className="bg-muted/20 border rounded-xl p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] text-muted-foreground">السؤال {idx + 1} ({q?.question_type === "multiple_choice" ? "اختيار من متعدد" : "سؤال مقالي"})</span>
                        <p className="text-sm font-semibold text-foreground mt-0.5">{q?.question_text || "جاري تحميل نص السؤال..."}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 bg-background border px-3 py-1 rounded-lg">
                        <span className="text-xs text-muted-foreground">الدرجة:</span>
                        <input
                          type="number"
                          min={0}
                          max={ans.max_points ?? q?.points ?? 0}
                          value={ans.points_earned}
                          onChange={(e) => handleScoreChange(idx, Number(e.target.value))}
                          className="w-10 text-center font-bold text-sm bg-muted/40 rounded focus:outline-none"
                        />
                        <span className="text-xs text-muted-foreground">/ {ans.max_points ?? q?.points ?? 0}</span>
                      </div>
                    </div>

                    <div className="bg-background border/50 rounded-lg p-2.5 space-y-1">
                      <span className="text-[10px] text-muted-foreground">إجابة المرشح:</span>
                      <p className="text-xs text-foreground font-medium">{displayAssessmentAnswer(ans.answer, q)}</p>
                    </div>

                    {/* AI Feedback inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      <div className="space-y-1">
                        <span className="text-[10px] text-green-600 font-bold flex items-center gap-1"><ThumbsUp className="w-3 h-3" /> نقاط القوة في الإجابة:</span>
                        <Input
                          value={ans.ai_strengths || ""}
                          onChange={(e) => handleFeedbackChange(idx, "ai_strengths", e.target.value)}
                          className="h-8 text-xs"
                          placeholder="تغذية راجعة لنقاط القوة"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1"><Lightbulb className="w-3 h-3" /> نقاط بحاجة للتطوير:</span>
                        <Input
                          value={ans.ai_improvements || ""}
                          onChange={(e) => handleFeedbackChange(idx, "ai_improvements", e.target.value)}
                          className="h-8 text-xs"
                          placeholder="نقاط التطوير المقترحة"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 justify-end border-t pt-3.5">
              <Button size="sm" onClick={saveEvaluation} disabled={saving || !hasHiringPermission("assessment_responses", "edit")} className="gap-1">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                حفظ التقييم والملاحظات
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                إلغاء
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
