import { useState } from "react";
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
import { Brain, Eye, ArrowLeft, Send, ThumbsUp, Lightbulb, CheckCircle, Loader2, Edit2, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  assessmentId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

interface AnswerEntry {
  question_id: string;
  answer: string;
  is_correct: boolean;
  points_earned: number;
  ai_evaluated?: boolean;
  ai_feedback?: string;
  ai_strengths?: string;
  ai_improvements?: string;
}

export default function AssessmentResponsesDialog({ assessmentId, open, onOpenChange }: Props) {
  const { t } = useI18n();
  const { data: responses = [], isLoading } = useAssessmentResponses(assessmentId);
  const [selectedResponse, setSelectedResponse] = useState<string | null>(null);
  const [editingAnswers, setEditingAnswers] = useState<AnswerEntry[] | null>(null);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [questions, setQuestions] = useState<Record<string, { question_text: string; points: number; question_type: string }>>({});
  const qc = useQueryClient();

  const selected = responses.find(r => r.id === selectedResponse);

  const loadDetails = async (responseId: string) => {
    const response = responses.find(r => r.id === responseId);
    if (!response) return;

    const answers = (response.answers || []) as AnswerEntry[];
    const qIds = answers.map(a => a.question_id).filter(Boolean);

    if (qIds.length > 0) {
      const { data } = await supabase
        .from("question_bank")
        .select("id, question_text, points, question_type")
        .in("id", qIds);
      if (data) {
        const map: Record<string, any> = {};
        data.forEach(q => { map[q.id] = q; });
        setQuestions(map);
      }
    }

    setEditingAnswers(answers.map(a => ({ ...a })));
    setSelectedResponse(responseId);
  };

  const handleScoreChange = (index: number, newScore: number) => {
    if (!editingAnswers) return;
    const updated = [...editingAnswers];
    const q = questions[updated[index].question_id];
    updated[index].points_earned = Math.min(Math.max(0, newScore), q?.points || 100);
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

    const totalScore = editingAnswers.reduce((sum, a) => sum + (a.points_earned || 0), 0);
    const maxScore = editingAnswers.reduce((sum, a) => {
      const q = questions[a.question_id];
      return sum + (q?.points || 0);
    }, 0);
    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

    await supabase.from("assessment_responses").update({
      answers: editingAnswers,
      total_score: totalScore,
      max_score: maxScore,
      percentage,
    } as any).eq("id", selected.id);

    qc.invalidateQueries({ queryKey: ["assessment-responses"] });
    toast({ title: t("qbank.review.saved") });
    setSaving(false);
  };

  const sendResults = async () => {
    if (!selected || !editingAnswers) return;
    setSending(true);

    try {
      // Save first
      await saveChanges();

      const totalScore = editingAnswers.reduce((sum, a) => sum + (a.points_earned || 0), 0);
      const maxScore = editingAnswers.reduce((sum, a) => sum + (questions[a.question_id]?.points || 0), 0);
      const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

      const { error } = await supabase.functions.invoke("send-assessment-results", {
        body: {
          candidate_name: selected.candidate_name,
          candidate_email: selected.candidate_email,
          assessment_id: assessmentId,
          total_score: totalScore,
          max_score: maxScore,
          percentage,
          answers: editingAnswers.map(a => ({
            question_text: questions[a.question_id]?.question_text || "",
            points_earned: a.points_earned,
            max_points: questions[a.question_id]?.points || 0,
            ai_feedback: a.ai_feedback,
            ai_strengths: a.ai_strengths,
            ai_improvements: a.ai_improvements,
            ai_evaluated: a.ai_evaluated,
          })),
        },
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
                {editingAnswers.reduce((s, a) => s + (questions[a.question_id]?.points || 0), 0)}
              </div>
              <div className="text-xs text-muted-foreground">{t("qbank.score")}</div>
            </div>
            <Separator orientation="vertical" className="h-10" />
            <div className="text-center">
              <div className="text-2xl font-bold">
                {(() => {
                  const max = editingAnswers.reduce((s, a) => s + (questions[a.question_id]?.points || 0), 0);
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
            {(selected as any).tab_switches > 0 && (
              <>
                <Separator orientation="vertical" className="h-10" />
                <div className="text-center">
                  <div className="text-xl font-bold text-destructive">{(selected as any).tab_switches}</div>
                  <div className="text-[10px] text-destructive/80">⚠️ مغادرات</div>
                </div>
              </>
            )}
          </div>

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
                      <p className="text-sm whitespace-pre-wrap">{answer.answer || "-"}</p>
                    </div>

                    {/* Score editor */}
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium">{t("qbank.score")}:</label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min={0}
                          max={q.points}
                          value={answer.points_earned}
                          onChange={e => handleScoreChange(idx, Number(e.target.value))}
                          className="w-20 h-8"
                        />
                        <span className="text-sm text-muted-foreground">/ {q.points}</span>
                      </div>
                      {!isAI && (
                        <Badge variant={answer.is_correct ? "default" : "destructive"} className="text-xs">
                          {answer.is_correct ? t("qbank.correct") : t("qbank.review.incorrect")}
                        </Badge>
                      )}
                    </div>

                    {/* AI feedback editor (only for AI-evaluated) */}
                    {isAI && (
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
            <Button variant="outline" onClick={saveChanges} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t("qbank.review.saveOnly")}
            </Button>
            <Button onClick={sendResults} disabled={sending} className="gap-2">
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

        {isLoading ? (
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
                <TableHead>{t("qbank.status")}</TableHead>
                <TableHead>{t("qbank.date")}</TableHead>
                <TableHead>{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {responses.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.candidate_name}</TableCell>
                  <TableCell>{r.candidate_email}</TableCell>
                  <TableCell>
                    <Badge variant={r.percentage >= 70 ? "default" : "destructive"}>
                      {r.total_score}/{r.max_score} ({r.percentage}%)
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.status === "completed" ? "default" : "secondary"}>
                      {r.status === "completed" ? t("qbank.completed") : t("qbank.inProgress")}
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
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
