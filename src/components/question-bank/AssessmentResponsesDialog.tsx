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
import { Brain, Eye, ArrowLeft, Send, ThumbsUp, Lightbulb, CheckCircle, Loader2, Edit2, Save, ShieldAlert, Activity, ClipboardCheck, AlertTriangle } from "lucide-react";
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
  const [showProctoring, setShowProctoring] = useState(false);
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

          {/* Proctoring & Integrity Panel */}
          {(() => {
            if (!selected) return null;
            
            const rawLog = (selected as any).tab_switch_log;
            const proctoringLog = rawLog 
              ? (typeof rawLog === "string" ? JSON.parse(rawLog) : rawLog)
              : null;
            
            const proctoringData = proctoringLog || ((selected as any).tab_switches > 0 ? {
              cheat_score: Math.min(100, (selected as any).tab_switches * 15),
              cheat_level: (selected as any).tab_switches >= 5 ? "high" : (selected as any).tab_switches >= 3 ? "medium" : "low",
              counters: {
                visibility: (selected as any).tab_switches,
                blur: (selected as any).tab_switches,
                copy: 0,
                cut: 0,
                paste: 0,
                contextmenu: 0,
                fullscreenExit: 0
              },
              events: [
                { time: selected.started_at, type: "visibility_hidden" }
              ]
            } : null);

            if (!proctoringData) return null;

            const score = proctoringData.cheat_score || 0;
            const level = proctoringData.cheat_level || "safe";
            const counters = proctoringData.counters || {};
            const events = proctoringData.events || [];

            const getEventLabel = (type: string) => {
              switch (type) {
                case "visibility_hidden": return "تصغير المتصفح / مغادرة علامة التبويب";
                case "visibility_visible": return "العودة لعلامة تبويب الاختبار";
                case "blur": return "الخروج من نافذة الاختبار (فقدان التركيز)";
                case "focus": return "التركيز على نافذة الاختبار";
                case "copy": return "محاولة نسخ نص السؤال (تم الحظر)";
                case "cut": return "محاولة قص نص السؤال (تم الحظر)";
                case "paste": return "محاولة لصق نص في الإجابة (تم الحظر)";
                case "contextmenu": return "محاولة النقر بزر الفأرة الأيمن (تم الحظر)";
                case "fullscreen_exit":
                case "fullscreenExit": return "مغادرة وضع ملء الشاشة الكاملة";
                default: return `حدث غير معروف: ${type}`;
              }
            };

            const getLevelBadge = (lvl: string) => {
              switch (lvl) {
                case "high": return <Badge className="bg-red-500 hover:bg-red-600 text-white font-bold">مستوى خطورة عالٍ 🚨</Badge>;
                case "medium": return <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-bold">مستوى خطورة متوسط ⚠️</Badge>;
                case "low": return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold">مستوى خطورة منخفض 🔍</Badge>;
                default: return <Badge className="bg-green-500 hover:bg-green-600 text-white font-bold">نزاهة ممتازة (آمن) ✅</Badge>;
              }
            };

            const getScoreColor = (sc: number) => {
              if (sc >= 70) return "bg-red-500";
              if (sc >= 40) return "bg-amber-500";
              if (sc >= 15) return "bg-yellow-500";
              return "bg-green-500";
            };

            return (
              <Card className="border border-destructive/20 bg-destructive/5 overflow-hidden">
                <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-destructive animate-pulse" />
                    <div>
                      <CardTitle className="text-sm font-bold text-destructive">
                        تقرير حماية النزاهة والمراقبة الأمنية (Proctoring Report)
                      </CardTitle>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        رصد تفصيلي لسلوك المرشح ومحاولات الخروج عن قواعد الاختبار
                      </p>
                    </div>
                  </div>
                  <div>
                    {getLevelBadge(level)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-muted-foreground">مؤشر خطورة الغش العام:</span>
                      <span className={cn(
                        "font-bold",
                        score >= 70 ? "text-red-600" : score >= 40 ? "text-amber-600" : score >= 15 ? "text-yellow-600" : "text-green-600"
                      )}>{score} / 100</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden flex">
                      <div className={cn("h-full transition-all duration-500", getScoreColor(score))} style={{ width: `${score}%` }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                    <div className="bg-background border rounded-lg p-2 flex flex-col justify-center">
                      <span className="font-mono text-base font-black text-destructive">{counters.visibility || 0}</span>
                      <span className="text-[9px] text-muted-foreground">مغادرة التبويب</span>
                    </div>
                    <div className="bg-background border rounded-lg p-2 flex flex-col justify-center">
                      <span className="font-mono text-base font-black text-amber-600">{counters.copy || 0}</span>
                      <span className="text-[9px] text-muted-foreground">محاولات النسخ</span>
                    </div>
                    <div className="bg-background border rounded-lg p-2 flex flex-col justify-center">
                      <span className="font-mono text-base font-black text-amber-600">{counters.paste || 0}</span>
                      <span className="text-[9px] text-muted-foreground">محاولات اللصق</span>
                    </div>
                    <div className="bg-background border rounded-lg p-2 flex flex-col justify-center">
                      <span className="font-mono text-base font-black text-purple-600">{counters.contextmenu || 0}</span>
                      <span className="text-[9px] text-muted-foreground">كليك يمين</span>
                    </div>
                    <div className="bg-background border rounded-lg p-2 flex flex-col justify-center col-span-2 sm:col-span-1">
                      <span className="font-mono text-base font-black text-blue-600">{counters.fullscreenExit || 0}</span>
                      <span className="text-[9px] text-muted-foreground">خروج من ملء الشاشة</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowProctoring(!showProctoring)}
                      className="text-xs gap-1 hover:bg-destructive/10 text-destructive font-bold h-8 px-0"
                    >
                      <Activity className="h-3.5 w-3.5" />
                      {showProctoring ? "إخفاء الخط الزمني التفصيلي" : "عرض سجل الأحداث والخط الزمني للمراقبة"}
                    </Button>
                    
                    {showProctoring && (
                      <div className="bg-background border border-border/60 rounded-lg p-3 max-h-[180px] overflow-y-auto space-y-2.5">
                        {events.length === 0 ? (
                          <p className="text-[10px] text-muted-foreground text-center py-2">لا توجد أحداث مسجلة</p>
                        ) : (
                          events.map((ev: any, i: number) => (
                            <div key={i} className="flex gap-2 items-start text-[10px] border-b border-border/20 pb-2 last:border-0 last:pb-0">
                              <span className="font-mono text-muted-foreground shrink-0 mt-0.5">
                                {new Date(ev.time).toLocaleTimeString('ar-SA')}
                              </span>
                              <span className="text-foreground font-medium">
                                {getEventLabel(ev.type)}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })()}

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

interface SingleProps {
  responseId: string;
  open: boolean;
  onClose: () => void;
}

export function SingleResponseProctoringDialog({ responseId, open, onClose }: SingleProps) {
  const { t } = useI18n();
  const [showProctoring, setShowProctoring] = useState(false);
  const [questions, setQuestions] = useState<Record<string, { question_text: string; points: number; question_type: string }>>({});
  const [editingAnswers, setEditingAnswers] = useState<AnswerEntry[] | null>(null);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  const { data: response, isLoading } = useQuery({
    queryKey: ["proctoring-single-response", responseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_responses")
        .select("*, assessments(title, passing_score, duration_minutes)")
        .eq("id", responseId)
        .single();
      if (error) throw error;

      // Load question bank detail mapping
      const answers = (data.answers || []) as AnswerEntry[];
      const qIds = answers.map(a => a.question_id).filter(Boolean);
      if (qIds.length > 0) {
        const { data: qData } = await supabase
          .from("question_bank")
          .select("id, question_text, points, question_type")
          .in("id", qIds);
        if (qData) {
          const map: Record<string, any> = {};
          qData.forEach(q => { map[q.id] = q; });
          setQuestions(map);
        }
      }
      setEditingAnswers(answers.map(a => ({ ...a })));
      return data;
    },
    enabled: open && !!responseId,
  });

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

  const saveEvaluation = async () => {
    if (!response || !editingAnswers) return;
    setSaving(true);
    try {
      const totalEarned = editingAnswers.reduce((sum, a) => sum + (a.points_earned || 0), 0);
      const pct = Math.round((totalEarned / response.max_score) * 100);

      const { error } = await supabase
        .from("assessment_responses")
        .update({
          answers: editingAnswers,
          total_score: totalEarned,
          percentage: pct
        } as any)
        .eq("id", response.id);

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

  const getEventLabel = (type: string) => {
    switch (type) {
      case "visibility_hidden": return "تصغير المتصفح / مغادرة علامة التبويب";
      case "visibility_visible": return "العودة لعلامة تبويب الاختبار";
      case "blur": return "الخروج من نافذة الاختبار (فقدان التركيز)";
      case "focus": return "التركيز على نافذة الاختبار";
      case "copy": return "محاولة نسخ نص السؤال (تم الحظر)";
      case "cut": return "محاولة قص نص السؤال (تم الحظر)";
      case "paste": return "محاولة لصق نص في الإجابة (تم الحظر)";
      case "contextmenu": return "محاولة النقر بزر الفأرة الأيمن (تم الحظر)";
      case "fullscreen_exit":
      case "fullscreenExit": return "مغادرة وضع ملء الشاشة الكاملة";
      default: return `حدث غير معروف: ${type}`;
    }
  };

  const getLevelBadge = (lvl: string) => {
    switch (lvl) {
      case "high": return <Badge className="bg-red-500 hover:bg-red-600 text-white font-bold">مستوى خطورة عالٍ 🚨</Badge>;
      case "medium": return <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-bold">مستوى خطورة متوسط ⚠️</Badge>;
      case "low": return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold">مستوى خطورة منخفض 🔍</Badge>;
      default: return <Badge className="bg-green-500 hover:bg-green-600 text-white font-bold">نزاهة ممتازة (آمن) ✅</Badge>;
    }
  };

  const getScoreColor = (sc: number) => {
    if (sc >= 70) return "bg-red-500";
    if (sc >= 40) return "bg-amber-500";
    if (sc >= 15) return "bg-yellow-500";
    return "bg-green-500";
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
            {/* Proctoring & Integrity Panel */}
            {(() => {
              const rawLog = response.tab_switch_log;
              const proctoringLog = rawLog 
                ? (typeof rawLog === "string" ? JSON.parse(rawLog) : rawLog)
                : null;
              
              const proctoringData = proctoringLog || (response.tab_switches > 0 ? {
                cheat_score: Math.min(100, response.tab_switches * 15),
                cheat_level: response.tab_switches >= 5 ? "high" : response.tab_switches >= 3 ? "medium" : "low",
                counters: {
                  visibility: response.tab_switches,
                  blur: response.tab_switches,
                  copy: 0,
                  cut: 0,
                  paste: 0,
                  contextmenu: 0,
                  fullscreenExit: 0
                },
                events: [
                  { time: response.started_at, type: "visibility_hidden" }
                ]
              } : null);

              if (!proctoringData) return null;

              const score = proctoringData.cheat_score || 0;
              const level = proctoringData.cheat_level || "safe";
              const counters = proctoringData.counters || {};
              const events = proctoringData.events || [];

              return (
                <Card className="border border-destructive/20 bg-destructive/5 overflow-hidden">
                  <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-5 w-5 text-destructive animate-pulse" />
                      <div>
                        <CardTitle className="text-sm font-bold text-destructive">
                          تقرير حماية النزاهة والمراقبة الأمنية (Proctoring Report)
                        </CardTitle>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          رصد تفصيلي لسلوك المرشح ومحاولات الخروج عن قواعد الاختبار
                        </p>
                      </div>
                    </div>
                    <div>
                      {getLevelBadge(level)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-muted-foreground">مؤشر خطورة الغش العام:</span>
                        <span className={cn(
                          "font-bold",
                          score >= 70 ? "text-red-600" : score >= 40 ? "text-amber-600" : score >= 15 ? "text-yellow-600" : "text-green-600"
                        )}>{score} / 100</span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden flex">
                        <div className={cn("h-full transition-all duration-500", getScoreColor(score))} style={{ width: `${score}%` }} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                      <div className="bg-background border rounded-lg p-2 flex flex-col justify-center">
                        <span className="font-mono text-base font-black text-destructive">{counters.visibility || 0}</span>
                        <span className="text-[9px] text-muted-foreground">مغادرة التبويب</span>
                      </div>
                      <div className="bg-background border rounded-lg p-2 flex flex-col justify-center">
                        <span className="font-mono text-base font-black text-amber-600">{counters.copy || 0}</span>
                        <span className="text-[9px] text-muted-foreground">محاولات النسخ</span>
                      </div>
                      <div className="bg-background border rounded-lg p-2 flex flex-col justify-center">
                        <span className="font-mono text-base font-black text-amber-600">{counters.paste || 0}</span>
                        <span className="text-[9px] text-muted-foreground">محاولات اللصق</span>
                      </div>
                      <div className="bg-background border rounded-lg p-2 flex flex-col justify-center">
                        <span className="font-mono text-base font-black text-purple-600">{counters.contextmenu || 0}</span>
                        <span className="text-[9px] text-muted-foreground">كليك يمين</span>
                      </div>
                      <div className="bg-background border rounded-lg p-2 flex flex-col justify-center col-span-2 sm:col-span-1">
                        <span className="font-mono text-base font-black text-blue-600">{counters.fullscreenExit || 0}</span>
                        <span className="text-[9px] text-muted-foreground">خروج من ملء الشاشة</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setShowProctoring(!showProctoring)}
                        className="text-xs gap-1 hover:bg-destructive/10 text-destructive font-bold h-8 px-0"
                      >
                        <Activity className="h-3.5 w-3.5" />
                        {showProctoring ? "إخفاء الخط الزمني التفصيلي" : "عرض سجل الأحداث والخط الزمني للمراقبة"}
                      </Button>
                      
                      {showProctoring && (
                        <div className="bg-background border border-border/60 rounded-lg p-3 max-h-[180px] overflow-y-auto space-y-2.5">
                          {events.length === 0 ? (
                            <p className="text-[10px] text-muted-foreground text-center py-2">لا توجد أحداث مسجلة</p>
                          ) : (
                            events.map((ev: any, i: number) => (
                              <div key={i} className="flex gap-2 items-start text-[10px] border-b border-border/20 pb-2 last:border-0 last:pb-0">
                                <span className="font-mono text-muted-foreground shrink-0 mt-0.5">
                                  {new Date(ev.time).toLocaleTimeString('ar-SA')}
                                </span>
                                <span className="text-foreground font-medium">
                                  {getEventLabel(ev.type)}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

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
                        <span className="text-[10px] text-muted-foreground">السؤال {idx + 1} ({q?.question_type === "mcq" ? "اختيار من متعدد" : "سؤال مقالي"})</span>
                        <p className="text-sm font-semibold text-foreground mt-0.5">{q?.question_text || "جاري تحميل نص السؤال..."}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 bg-background border px-3 py-1 rounded-lg">
                        <span className="text-xs text-muted-foreground">الدرجة:</span>
                        <input
                          type="number"
                          value={ans.points_earned}
                          onChange={(e) => handleScoreChange(idx, Number(e.target.value))}
                          className="w-10 text-center font-bold text-sm bg-muted/40 rounded focus:outline-none"
                        />
                        <span className="text-xs text-muted-foreground">/ {q?.points || 10}</span>
                      </div>
                    </div>

                    <div className="bg-background border/50 rounded-lg p-2.5 space-y-1">
                      <span className="text-[10px] text-muted-foreground">إجابة المرشح:</span>
                      <p className="text-xs text-foreground font-medium">{ans.answer || "لم يتم توفير إجابة"}</p>
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
              <Button size="sm" onClick={saveEvaluation} disabled={saving} className="gap-1">
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
