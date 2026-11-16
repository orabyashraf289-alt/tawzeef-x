import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles,
  Award,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Brain,
  Star,
  ThumbsUp,
  MessageSquare,
  TrendingUp,
  FileText,
  User,
  Briefcase,
  Calendar,
} from "lucide-react";
import { printWithFonts } from "@/lib/documentFonts";
import { parseInterviewEvaluation, ParsedInterviewEvaluation } from "@/lib/interviewAI";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interview: {
    id: string;
    candidate_name: string;
    position: string;
    date: string;
    time?: string | null;
    rating?: number | null;
    notes?: string | null;
    interviewer?: string | null;
  } | null;
  onMoveToOffer?: (interview: any) => void;
}

export default function AIInterviewReportDialog({ open, onOpenChange, interview, onMoveToOffer }: Props) {
  if (!interview) return null;

  const evaluation: ParsedInterviewEvaluation = parseInterviewEvaluation(interview.notes, interview.rating);

  const getRecBadgeClass = (rec: string) => {
    switch (rec) {
      case "strong_hire":
        return "bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:text-emerald-400 dark:border-emerald-600";
      case "hire":
        return "bg-green-500/10 text-green-700 border-green-300 dark:text-green-400 dark:border-green-600";
      case "maybe":
        return "bg-amber-500/10 text-amber-700 border-amber-300 dark:text-amber-400 dark:border-amber-600";
      case "no_hire":
      default:
        return "bg-red-500/10 text-red-700 border-red-300 dark:text-red-400 dark:border-red-600";
    }
  };

  const handlePrint = () => {
    const printWin = window.open("", "_blank", "width=850,height=1000");
    if (!printWin) return;

    const reportHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8"/>
        <title>تقرير تقييم المقابلة — ${interview.candidate_name}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 40px; color: #0f172a; background: #fff; line-height: 1.6; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #008c76; padding-bottom: 16px; margin-bottom: 24px; }
          .title { font-size: 24px; font-weight: 900; color: #0f172a; margin: 0; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: bold; background: #ecfdf5; color: #008c76; border: 1px solid #a7f3d0; }
          .section { margin-bottom: 20px; background: #f8fafc; padding: 18px; border-radius: 12px; border: 1px solid #e2e8f0; }
          .section-title { font-size: 15px; font-weight: bold; color: #0f172a; margin-top: 0; margin-bottom: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th, td { text-align: right; padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
          th { background: #f1f5f9; color: #475569; }
          .score-total { font-size: 32px; font-weight: 900; color: #008c76; }
          @media print { body { padding: 15px; } .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">تقرير تقييم المقابلة الشخصية</h1>
            <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">منصة Tawzeef-X — قسم التوظيف والاستقطاب الذكي</p>
          </div>
          <div style="text-align: left;">
            <span class="badge">توثيق رسمي معتمد</span>
            <p style="font-size: 12px; color: #94a3b8; margin: 6px 0 0 0;">التاريخ: ${new Date().toLocaleDateString("ar-SA")}</p>
          </div>
        </div>

        <div class="section" style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <p style="margin: 0; font-size: 13px; color: #64748b;">اسم المرشح:</p>
            <h2 style="margin: 4px 0; font-size: 18px;">${interview.candidate_name}</h2>
            <p style="margin: 0; font-size: 13px; color: #64748b;">الوظيفة: <strong>${interview.position}</strong></p>
          </div>
          <div style="text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #64748b;">النتيجة الكلية</p>
            <div class="score-total">${evaluation.scorePercent}%</div>
            <span class="badge">${evaluation.recommendationLabel}</span>
          </div>
        </div>

        ${
          evaluation.summary
            ? `
        <div class="section">
          <h3 class="section-title">📝 الملخص التنفيذي</h3>
          <p style="font-size: 13px; white-space: pre-wrap; margin: 0;">${evaluation.summary}</p>
        </div>`
            : ""
        }

        ${
          evaluation.criteria.length > 0
            ? `
        <div class="section">
          <h3 class="section-title">📊 تفاصيل المعايير التقييمية</h3>
          <table>
            <thead>
              <tr>
                <th>المعيار</th>
                <th>الدرجة</th>
                <th>التقييم</th>
              </tr>
            </thead>
            <tbody>
              ${evaluation.criteria
                .map(
                  (c) => `
                <tr>
                  <td>${c.label}</td>
                  <td>${c.score} / ${c.maxScore}</td>
                  <td>${"★".repeat(c.score)}${"☆".repeat(c.maxScore - c.score)}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>`
            : ""
        }

        ${
          evaluation.strengths.length > 0
            ? `
        <div class="section">
          <h3 class="section-title" style="color: #008c76;">✨ نقاط القوة المكتشفة</h3>
          <ul style="font-size: 13px; margin: 0; padding-right: 20px;">
            ${evaluation.strengths.map((s) => `<li>${s}</li>`).join("")}
          </ul>
        </div>`
            : ""
        }

        ${
          evaluation.weaknesses.length > 0
            ? `
        <div class="section">
          <h3 class="section-title" style="color: #dc2626;">⚠️ نقاط وفرص التحسين</h3>
          <ul style="font-size: 13px; margin: 0; padding-right: 20px;">
            ${evaluation.weaknesses.map((w) => `<li>${w}</li>`).join("")}
          </ul>
        </div>`
            : ""
        }

        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; font-size: 12px; color: #64748b;">
          <div>المحاور: ${interview.interviewer || "لجنة التوظيف"}</div>
          <div>توقيع الاعتماد: __________________</div>
        </div>
      </body>
      </html>
    `;

    printWin.document.write(reportHtml);
    printWin.document.close();
    void printWithFonts(printWin);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-black">
                  تقرير تقييم المقابلة الذكي — {interview.candidate_name}
                </DialogTitle>
                <p className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Briefcase className="w-3 h-3" />
                    {interview.position}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {interview.date} {interview.time || ""}
                  </span>
                </p>
              </div>
            </div>
            <Badge variant="outline" className={cn("text-xs font-bold px-3 py-1", getRecBadgeClass(evaluation.recommendation))}>
              {evaluation.recommendationLabel}
            </Badge>
          </div>
        </DialogHeader>

        {/* Top Summary Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-2">
          <div className="p-3.5 rounded-xl bg-primary/[0.04] border border-primary/20 text-center flex flex-col justify-center items-center">
            <span className="text-[11px] text-muted-foreground font-medium">النتيجة الإجمالية</span>
            <div className="text-3xl font-black text-primary mt-0.5">{evaluation.scorePercent}%</div>
            <div className="flex items-center gap-0.5 text-amber-500 mt-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={cn("w-3.5 h-3.5", s <= evaluation.starRating ? "fill-amber-400 text-amber-400" : "text-slate-300")}
                />
              ))}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-card border border-border/70 md:col-span-2 flex flex-col justify-center">
            <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-primary" />
              نوع التقييم ومصدر البيانات:
            </span>
            <p className="text-xs font-bold text-foreground mt-1">
              {evaluation.evaluatorType === "ai"
                ? "تحليل ذكي متقدم للنص المنطوق ومحاور المقابلة عبر Gemini AI"
                : evaluation.evaluatorType === "human_scorecard"
                ? "بطاقة تقييم لحظية منظمة معتمدة من المقابل"
                : "تقييم المقابلة العام"}
            </p>
            {interview.interviewer && (
              <p className="text-[11px] text-muted-foreground mt-1">
                المسؤول عن المقابلة: <strong className="text-foreground">{interview.interviewer}</strong>
              </p>
            )}
          </div>
        </div>

        {/* Criteria Breakdown */}
        {evaluation.criteria.length > 0 && (
          <div className="p-4 rounded-xl bg-card border border-border/70 space-y-3">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Award className="w-4 h-4 text-primary" />
              تفاصيل المعايير التقييمية:
            </h4>
            <div className="space-y-2.5">
              {evaluation.criteria.map((crit) => (
                <div key={crit.key} className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-medium">{crit.label}</span>
                    <span className="font-bold text-foreground">
                      {crit.score} / {crit.maxScore}
                    </span>
                  </div>
                  <Progress value={(crit.score / crit.maxScore) * 100} className="h-1.5" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Strengths & Weaknesses */}
        {(evaluation.strengths.length > 0 || evaluation.weaknesses.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {evaluation.strengths.length > 0 && (
              <div className="p-3.5 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/20 space-y-2">
                <h5 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  أبرز نقاط القوة:
                </h5>
                <ul className="text-xs text-muted-foreground space-y-1 pr-4 list-disc">
                  {evaluation.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {evaluation.weaknesses.length > 0 && (
              <div className="p-3.5 rounded-xl bg-rose-500/[0.04] border border-rose-500/20 space-y-2">
                <h5 className="text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  جوانب وفرص التحسين:
                </h5>
                <ul className="text-xs text-muted-foreground space-y-1 pr-4 list-disc">
                  {evaluation.weaknesses.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Executive Summary */}
        {evaluation.summary && (
          <div className="p-3.5 rounded-xl bg-muted/30 border border-border/70 space-y-1.5">
            <h5 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-primary" />
              الملخص والملاحظات:
            </h5>
            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {evaluation.summary}
            </p>
          </div>
        )}

        {/* Communication Notes */}
        {evaluation.communication && (
          <div className="p-3 rounded-lg bg-primary/[0.02] border border-primary/10 text-xs text-muted-foreground">
            <strong className="text-foreground">مهارات التواصل: </strong>
            {evaluation.communication}
          </div>
        )}

        <DialogFooter className="flex items-center justify-between gap-2 pt-3 border-t">
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 text-xs">
            <Printer className="w-3.5 h-3.5" />
            طباعة / تصدير التقرير
          </Button>

          <div className="flex items-center gap-2">
            {onMoveToOffer && evaluation.recommendation !== "no_hire" && (
              <Button
                size="sm"
                className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => {
                  onOpenChange(false);
                  onMoveToOffer(interview);
                }}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                إصدار عرض وظيفي
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
              إغلاق
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
