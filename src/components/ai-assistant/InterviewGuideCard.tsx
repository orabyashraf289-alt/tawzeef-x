import { useState } from "react";
import { motion } from "framer-motion";
import { CalendarCheck, Printer, Star, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface InterviewQuestion {
  id: string;
  question: string;
  category: string;
  difficulty: string;
  expectedAnswer: string;
  score: number;
}

export interface InterviewGuideData {
  candidateName: string;
  jobTitle: string;
  experience?: string;
  questions: InterviewQuestion[];
}

export default function InterviewGuideCard({ guide }: { guide: InterviewGuideData }) {
  const [scores, setScores] = useState<Record<string, number>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleScore = (qId: string, val: number) => {
    setScores(prev => ({ ...prev, [qId]: val }));
  };

  const scoredCount = Object.keys(scores).length;
  const averageScore = scoredCount > 0 
    ? (Object.values(scores).reduce((a, b) => a + b, 0) / scoredCount).toFixed(1)
    : "0.0";

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>دليل مقابلة - ${guide.candidateName}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; padding: 40px; color: #333; }
            h1 { text-align: center; color: #1e4a8a; font-size: 26px; border-bottom: 2px solid #1e4a8a; padding-bottom: 12px; margin-bottom: 30px; }
            .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .meta-table td { padding: 12px; border: 1px solid #ddd; font-size: 14px; }
            .meta-label { font-weight: bold; background-color: #f8f9fa; width: 20%; }
            .question-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin-bottom: 25px; page-break-inside: avoid; background-color: #ffffff; }
            .question-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #edf2f7; padding-bottom: 10px; margin-bottom: 12px; font-size: 13px; font-weight: bold; }
            .category { color: #1e4a8a; font-size: 14px; }
            .difficulty { padding: 3px 8px; border-radius: 6px; background: #edf2f7; color: #4a5568; }
            .expected { background: #f7fafc; padding: 15px; border-right: 4px solid #1e4a8a; border-radius: 6px; font-size: 13px; margin: 15px 0; line-height: 1.6; }
            .score-space { margin-top: 20px; border-top: 1px dashed #e2e8f0; padding-top: 15px; display: flex; justify-content: space-between; align-items: center; }
            .notes-line { flex-grow: 1; border-bottom: 1px solid #aaa; margin-left: 20px; height: 20px; }
            .score-box { width: 140px; border: 1.5px solid #1e4a8a; border-radius: 6px; padding: 6px; text-align: center; font-weight: bold; font-size: 14px; }
            @media print {
              body { padding: 0; }
              .question-card { border: 1px solid #cbd5e0; }
            }
          </style>
        </head>
        <body>
          <h1>دليل المقابلة الشخصية والتقييم</h1>
          <table class="meta-table">
            <tr>
              <td class="meta-label">اسم المرشح</td>
              <td>${guide.candidateName}</td>
              <td class="meta-label">الوظيفة المستهدفة</td>
              <td>${guide.jobTitle}</td>
            </tr>
            <tr>
              <td class="meta-label">الخبرة المهنية</td>
              <td>${guide.experience || "غير محدد"}</td>
              <td class="meta-label">تاريخ المقابلة</td>
              <td>${new Date().toLocaleDateString('ar-SA')}</td>
            </tr>
          </table>
          
          ${guide.questions.map((q, idx) => `
            <div class="question-card">
              <div class="question-header">
                <span>السؤال ${idx + 1}: <span class="category">(${q.category})</span></span>
                <span class="difficulty">المستوى: ${q.difficulty}</span>
              </div>
              <p style="font-size: 15px; font-weight: bold; margin: 8px 0; color: #2d3748;">${q.question}</p>
              <div class="expected">
                <strong>الإجابة النموذجية المتوقعة:</strong><br/>
                ${q.expectedAnswer}
              </div>
              <div class="score-space">
                <span style="color: #718096; flex-grow: 1;">الملاحظات: __________________________________________________________________</span>
                <div class="score-box">التقييم: ____ / 5</div>
              </div>
            </div>
          `).join("")}
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="mt-4 p-5 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-background shadow-xl space-y-4 max-w-full overflow-hidden"
    >
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          <CalendarCheck className="w-5 h-5 text-primary animate-pulse" />
          <div>
            <h3 className="font-bold text-sm text-foreground">
              دليل المقابلة المخصص لـ {guide.candidateName}
            </h3>
            <p className="text-[10px] text-muted-foreground">{guide.jobTitle}</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 gap-1.5 text-xs font-bold border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary transition-all"
          onClick={handlePrint}
        >
          <Printer className="w-3.5 h-3.5" />
          طباعة الدليل
        </Button>
      </div>

      <div className="bg-primary/5 rounded-xl p-3 border border-primary/10 flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-muted-foreground block">التقييم الإجمالي للمقابلة</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-primary">{averageScore}</span>
            <span className="text-xs text-muted-foreground">/ 5.0</span>
          </div>
        </div>
        <div className="text-left">
          <span className="text-[9px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
            تم تقييم {scoredCount} من {guide.questions.length} أسئلة
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {guide.questions.map((q, idx) => {
          const isExpanded = expandedId === q.id;
          const score = scores[q.id] || 0;

          return (
            <div 
              key={q.id}
              className="border border-border/50 rounded-xl bg-card/60 hover:bg-card/90 transition-all duration-200 overflow-hidden"
            >
              <div 
                className="p-3.5 flex items-center justify-between cursor-pointer select-none"
                onClick={() => setExpandedId(isExpanded ? null : q.id)}
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-foreground/90 truncate leading-snug">
                      {q.question}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] font-semibold text-primary/80">
                        {q.category}
                      </span>
                      <span className="text-[9px] text-muted-foreground/60">•</span>
                      <span className={cn(
                        "text-[9px] font-bold px-1.5 py-0.2 rounded-full",
                        q.difficulty === "سهل" ? "bg-green-500/10 text-green-700 dark:text-green-400" :
                        q.difficulty === "صعب" ? "bg-red-500/10 text-red-700 dark:text-red-400" :
                        "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                      )}>
                        {q.difficulty}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {score > 0 && (
                    <span className="text-[10px] bg-amber-500/10 text-amber-600 font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                      <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                      {score}
                    </span>
                  )}
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-border/20 space-y-3 bg-muted/10">
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold text-muted-foreground block">الإجابة النموذجية المتوقعة:</span>
                    <p className="text-[10px] text-foreground/80 bg-muted/40 p-2.5 rounded-lg border border-border/30 leading-relaxed">
                      {q.expectedAnswer}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/20">
                    <span className="text-[10px] font-bold text-muted-foreground">تقييم إجابة المرشح:</span>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((val) => (
                        <button
                          key={val}
                          type="button"
                          className={cn(
                            "w-7 h-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center border",
                            score === val 
                              ? "bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-500/20 scale-105" 
                              : "bg-background border-border hover:bg-muted text-muted-foreground"
                          )}
                          onClick={() => handleScore(q.id, val)}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
