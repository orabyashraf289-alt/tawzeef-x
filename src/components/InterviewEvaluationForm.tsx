import { useState } from "react";
import { Star, MessageSquare, ThumbsUp, ThumbsDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

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
          <DialogTitle className="text-lg">تقييم المقابلة — {candidateName}</DialogTitle>
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
