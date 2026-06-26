import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Copy, Check, Brain } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface AIQuestion {
  question: string;
  category: string;
  difficulty: string;
  tip: string;
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  behavioral: { label: "سلوكي", color: "bg-info/10 text-info border-info/20" },
  technical: { label: "تقني", color: "bg-primary/10 text-primary border-primary/20" },
  problem_solving: { label: "حل مشكلات", color: "bg-warning/10 text-warning border-warning/20" },
  cultural_fit: { label: "ملاءمة ثقافية", color: "bg-success/10 text-success border-success/20" },
};

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "سهل",
  medium: "متوسط",
  hard: "صعب",
};

interface Props {
  position: string;
  candidateName?: string;
  jobDescription?: string;
  jobRequirements?: string[];
  candidateSkills?: string[];
  candidateExperience?: string;
}

export default function AIInterviewQuestions({ position, candidateName, jobDescription, jobRequirements, candidateSkills, candidateExperience }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<AIQuestion[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const generate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-interview-questions", {
        body: {
          jobTitle: position,
          jobDescription,
          jobRequirements,
          candidateName,
          candidateSkills,
          candidateExperience,
          count: 6,
        },
      });
      if (error) throw error;
      setQuestions(data?.questions || []);
      if (!data?.questions?.length) {
        toast({ title: "لم يتم توليد أسئلة", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    if (questions.length === 0) generate();
  };

  const copyQuestion = (q: string, idx: number) => {
    navigator.clipboard.writeText(q);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const copyAll = () => {
    const text = questions.map((q, i) => `${i + 1}. ${q.question}`).join("\n\n");
    navigator.clipboard.writeText(text);
    toast({ title: "تم نسخ جميع الأسئلة ✅" });
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpen} className="gap-1.5">
        <Sparkles className="w-3.5 h-3.5" />
        أسئلة ذكية
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              أسئلة مقابلة مخصصة — {position}
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">جاري توليد الأسئلة بالذكاء الاصطناعي...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {questions.length > 0 && (
                <div className="flex justify-between items-center">
                  <p className="text-xs text-muted-foreground">{questions.length} أسئلة مخصصة</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={copyAll} className="gap-1.5 text-xs">
                      <Copy className="w-3 h-3" /> نسخ الكل
                    </Button>
                    <Button variant="outline" size="sm" onClick={generate} className="gap-1.5 text-xs">
                      <Sparkles className="w-3 h-3" /> إعادة توليد
                    </Button>
                  </div>
                </div>
              )}

              <AnimatePresence>
                {questions.map((q, i) => {
                  const cat = CATEGORY_LABELS[q.category] || CATEGORY_LABELS.behavioral;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-card rounded-xl border border-border/50 p-4 space-y-2 group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-medium text-foreground leading-relaxed flex-1">{q.question}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => copyQuestion(q.question, i)}
                        >
                          {copiedIdx === i ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`text-[10px] ${cat.color}`}>{cat.label}</Badge>
                        <Badge variant="outline" className="text-[10px]">{DIFFICULTY_LABELS[q.difficulty] || q.difficulty}</Badge>
                      </div>
                      {q.tip && (
                        <p className="text-[11px] text-muted-foreground bg-muted/30 rounded-lg px-3 py-1.5">
                          💡 {q.tip}
                        </p>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
