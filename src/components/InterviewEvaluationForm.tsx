import { useState } from "react";
import { Star, MessageSquare, ThumbsUp, ThumbsDown, Minus, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface EvaluationCriteria {
  key: string;
  label: string;
  score: number;
}

const DEFAULT_CRITERIA: EvaluationCriteria[] = [
  { key: "technical", label: "المهارات التقنية", score: 0 },
  { key: "communication", label: "مهارات التواصل", score: 0 },
  { key: "problem_solving", label: "حل المشكلات", score: 0 },
  { key: "culture_fit", label: "التوافق الثقافي", score: 0 },
  { key: "experience", label: "الخبرة المهنية", score: 0 },
];

type Recommendation = "hire" | "no_hire" | "maybe";

interface Props {
  open: boolean;
  onClose: () => void;
  candidateName: string;
  onSubmit: (data: { rating: number; notes: string; recommendation: Recommendation }) => void;
}

export default function InterviewEvaluationForm({ open, onClose, candidateName, onSubmit }: Props) {
  const [criteria, setCriteria] = useState<EvaluationCriteria[]>(DEFAULT_CRITERIA.map(c => ({ ...c })));
  const [notes, setNotes] = useState("");
  const [strengths, setStrengths] = useState("");
  const [weaknesses, setWeaknesses] = useState("");
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);

  const avgScore = criteria.reduce((s, c) => s + c.score, 0) / criteria.length;
  const overallRating = Math.round(avgScore);
  const [aiLoading, setAiLoading] = useState(false);

  const generateAIEvaluation = async () => {
    const hasRated = criteria.some(c => c.score > 0);
    if (!hasRated) {
      alert("يرجى تقييم بعض المعايير أولاً بالنجوم ليتمكن الذكاء الاصطناعي من تحليل الدرجات وصياغة التقييم!");
      return;
    }

    setAiLoading(true);
    try {
      const criteriaScores = criteria.map(c => `${c.label}: ${c.score}/5`).join(", ");
      const prompt = `
أنت خبير تقييم مقابلات توظيف ذكي ومحترف.
أريدك كتابة تقييم شامل للمرشح "${candidateName}" بناءً على الدرجات التي حصل عليها في المقابلة التالية (من 5):
الدرجات الممنوحة: ${criteriaScores}

يرجى صياغة النتيجة بصيغة JSON تحتوي فقط على الحقول التالية:
- strengths: نقاط القوة البارزة بناءً على المعايير المرتفعة (أكثر من جملة باللغة العربية)
- weaknesses: نقاط الضعف أو الجوانب التي تحتاج تحسين بناءً على المعايير المنخفضة (أكثر من جملة باللغة العربية)
- notes: ملاحظات عامة وتلخيص لملف المرشح (باللغة العربية)
- recommendation: التوصية المقترحة إما "hire" أو "maybe" أو "no_hire"

اكتب النتيجة بصيغة JSON نظيفة فقط داخل كود بلوك \`\`\`json.
`;

      const { data, error } = await supabase.functions.invoke("chat", {
        body: {
          messages: [
            {
              role: "system",
              content: "أنت مساعد تقييم خبير. يجب أن تعود النتيجة دائماً بصيغة JSON نظيفة فقط بداخل كود بلوك ```json"
            },
            {
              role: "user",
              content: prompt
            }
          ],
          disable_tools: true
        }
      });

      if (error) throw error;
      const contentText = data?.choices?.[0]?.message?.content || "";
      if (!contentText) throw new Error("لم يتم تلقي استجابة من الذكاء الاصطناعي");

      const match = contentText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const rawJson = match ? match[1] : contentText;
      const parsed = JSON.parse(rawJson);

      if (parsed.strengths) setStrengths(parsed.strengths);
      if (parsed.weaknesses) setWeaknesses(parsed.weaknesses);
      if (parsed.notes) setNotes(parsed.notes);
      if (parsed.recommendation) setRecommendation(parsed.recommendation);

    } catch (e: any) {
      console.error(e);
      alert("عذراً، فشل توليد التقييم الذكي: " + e.message);
    } finally {
      setAiLoading(false);
    }
  };

  const updateScore = (key: string, score: number) => {
    setCriteria(prev => prev.map(c => c.key === key ? { ...c, score } : c));
  };

  const handleSubmit = () => {
    if (!recommendation) return;
    const fullNotes = [
      criteria.map(c => `${c.label}: ${c.score}/5`).join(" | "),
      strengths && `نقاط القوة: ${strengths}`,
      weaknesses && `نقاط الضعف: ${weaknesses}`,
      notes && `ملاحظات: ${notes}`,
      `التوصية: ${recommendation === "hire" ? "توظيف" : recommendation === "no_hire" ? "عدم توظيف" : "مراجعة إضافية"}`,
    ].filter(Boolean).join("\n");

    onSubmit({ rating: overallRating, notes: fullNotes, recommendation });
    // Reset
    setCriteria(DEFAULT_CRITERIA.map(c => ({ ...c })));
    setNotes(""); setStrengths(""); setWeaknesses("");
    setRecommendation(null);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span>تقييم المقابلة — {candidateName}</span>
            <Button
              size="sm"
              variant="outline"
              type="button"
              onClick={generateAIEvaluation}
              disabled={aiLoading}
              className="text-[11px] h-8 gap-1.5 border-primary/30 hover:border-primary text-primary bg-primary/5 hover:bg-primary/10 transition-all font-semibold shrink-0"
            >
              {aiLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-primary" />
              )}
              صياغة تقييم ذكي بالذكاء الاصطناعي ✨
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Criteria Rating */}
          <div className="space-y-3">
            <Label className="text-sm font-bold">معايير التقييم</Label>
            {criteria.map(c => (
              <div key={c.key} className="flex items-center justify-between gap-3 bg-muted/30 rounded-lg p-2.5">
                <span className="text-xs font-medium text-foreground">{c.label}</span>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map(v => (
                    <button key={v} onClick={() => updateScore(c.key, v)}>
                      <Star className={cn("w-5 h-5 transition-all", v <= c.score ? "fill-warning text-warning" : "text-border hover:text-warning/40")} />
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {avgScore > 0 && (
              <div className="text-center text-sm font-bold text-primary">
                المعدل العام: {avgScore.toFixed(1)} / 5
              </div>
            )}
          </div>

          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">نقاط القوة</Label>
              <Textarea value={strengths} onChange={e => setStrengths(e.target.value)}
                placeholder="أبرز نقاط القوة..." rows={2} className="text-xs mt-1" />
            </div>
            <div>
              <Label className="text-xs">نقاط الضعف</Label>
              <Textarea value={weaknesses} onChange={e => setWeaknesses(e.target.value)}
                placeholder="نقاط تحتاج تحسين..." rows={2} className="text-xs mt-1" />
            </div>
          </div>

          {/* General Notes */}
          <div>
            <Label className="text-xs">ملاحظات عامة</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="أي ملاحظات إضافية..." rows={2} className="text-xs mt-1" />
          </div>

          {/* Recommendation */}
          <div>
            <Label className="text-sm font-bold mb-2 block">التوصية النهائية</Label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { key: "hire" as Recommendation, label: "توظيف", icon: ThumbsUp, color: "border-success bg-success/10 text-success" },
                { key: "maybe" as Recommendation, label: "مراجعة إضافية", icon: Minus, color: "border-warning bg-warning/10 text-warning" },
                { key: "no_hire" as Recommendation, label: "عدم توظيف", icon: ThumbsDown, color: "border-destructive bg-destructive/10 text-destructive" },
              ]).map(r => (
                <button key={r.key} onClick={() => setRecommendation(r.key)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-xs",
                    recommendation === r.key ? r.color : "border-border hover:border-primary/30"
                  )}>
                  <r.icon className="w-5 h-5" />
                  <span className="font-medium">{r.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleSubmit} disabled={!recommendation || avgScore === 0}
            className="bg-primary text-primary-foreground hover:bg-primary/90">
            حفظ التقييم
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
