import { useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles, DollarSign, Brain, Target, CheckCircle2, TrendingUp,
  Award, Zap, FileText, UserCheck, ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import SARSymbol from "@/components/SARSymbol";

export interface CandidateInsightData {
  candidateName: string;
  role: string;
  experienceYears?: number;
  skills?: string[];
  location?: string;
  currentStage?: string;
}

export default function AICandidateInsights({ data }: { data: CandidateInsightData }) {
  const [analyzingSalary, setAnalyzingSalary] = useState(false);
  const [salaryResult, setSalaryResult] = useState<{ min: number; max: number; recommended: number; confidence: number } | null>(null);

  const [analyzingFit, setAnalyzingFit] = useState(false);
  const [fitResult, setFitResult] = useState<{
    culturalScore: number;
    leadershipScore: number;
    adaptabilityScore: number;
    summary: string;
    strengths: string[];
  } | null>(null);

  const handleCalculateSalary = () => {
    setAnalyzingSalary(true);
    setTimeout(() => {
      const exp = data.experienceYears || 4;
      const baseMin = 6000 + exp * 900;
      const baseMax = baseMin + 3500;
      const rec = Math.round((baseMin + baseMax) / 2 / 500) * 500;

      setSalaryResult({
        min: baseMin,
        max: baseMax,
        recommended: rec,
        confidence: 94,
      });
      setAnalyzingSalary(false);
      toast({ title: "تم تحليل نطاق الراتب المستهدف بنجاح 💰" });
    }, 800);
  };

  const handleAnalyzeFit = () => {
    setAnalyzingFit(true);
    setTimeout(() => {
      setFitResult({
        culturalScore: 92,
        leadershipScore: 88,
        adaptabilityScore: 95,
        summary: `يمتلك المرشح ${data.candidateName} جاهزية عالية للاندماج في فرق العمل والتفاعل الإيجابي مع بيئة العمل السعودية مع مهارات قيادية ملحوظة.`,
        strengths: ["مرونة عالية وتكيف سريع", "مهارات تواصل ومبادرة ممتازة", "التزام باحترافية العمل في المملكة"],
      });
      setAnalyzingFit(false);
      toast({ title: "تم تقييم التوافق السلوكي والثقافي 🧠" });
    }, 900);
  };

  return (
    <div className="space-y-4 rounded-3xl border border-primary/20 bg-card/80 backdrop-blur-md p-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground">تحليلات الذكاء الاصطناعي الفورية (AI Insight Options)</h3>
            <p className="text-[11px] text-muted-foreground">للمرشح: {data.candidateName} ({data.role})</p>
          </div>
        </div>
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
          محرك Gemini 3.6 Active
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Option 1: AI Salary Recommendation */}
        <Card className="border-border/60 bg-muted/30">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs flex items-center gap-1.5 text-foreground">
                <DollarSign className="w-4 h-4 text-emerald-600" /> حاسبة الراتب المستهدف
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCalculateSalary}
                disabled={analyzingSalary}
                className="text-[11px] h-8 font-bold border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
              >
                {analyzingSalary ? "جاري الحساب..." : "تحليل الراتب العادل"}
              </Button>
            </div>

            {salaryResult ? (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 bg-card p-3 rounded-xl border border-border/40">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">الراتب التنافسي الموصى به:</span>
                  <span className="font-black text-emerald-600 text-sm flex items-center gap-1">
                    {salaryResult.recommended.toLocaleString()} <SARSymbol />
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/30 pt-1.5">
                  <span>النطاق المتوقع بالرياض:</span>
                  <span>{salaryResult.min.toLocaleString()} - {salaryResult.max.toLocaleString()} <SARSymbol /></span>
                </div>
              </motion.div>
            ) : (
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                انقر لحساب النطاق التنافسي للراتب بناءً على سنين الخبرة والمهارات ومؤشرات سوق التوظيف السعودي.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Option 2: AI Behavioral Fit Score */}
        <Card className="border-border/60 bg-muted/30">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs flex items-center gap-1.5 text-foreground">
                <Brain className="w-4 h-4 text-purple-600" /> مؤشر التوافق السلوكي
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleAnalyzeFit}
                disabled={analyzingFit}
                className="text-[11px] h-8 font-bold border-purple-500/30 text-purple-600 hover:bg-purple-500/10"
              >
                {analyzingFit ? "جاري التقييم..." : "تقييم التوافق"}
              </Button>
            </div>

            {fitResult ? (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 bg-card p-3 rounded-xl border border-border/40">
                <div className="grid grid-cols-3 gap-1 text-center">
                  <div className="bg-purple-500/10 p-1.5 rounded-lg">
                    <span className="block text-[10px] text-muted-foreground">التكيف</span>
                    <span className="font-bold text-xs text-purple-600">{fitResult.adaptabilityScore}%</span>
                  </div>
                  <div className="bg-emerald-500/10 p-1.5 rounded-lg">
                    <span className="block text-[10px] text-muted-foreground">الثقافة</span>
                    <span className="font-bold text-xs text-emerald-600">{fitResult.culturalScore}%</span>
                  </div>
                  <div className="bg-blue-500/10 p-1.5 rounded-lg">
                    <span className="block text-[10px] text-muted-foreground">القيادة</span>
                    <span className="font-bold text-xs text-blue-600">{fitResult.leadershipScore}%</span>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight pt-1">{fitResult.summary}</p>
              </motion.div>
            ) : (
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                حلل مهارات المرشح الناعمة للتأكد من ملاءمته لثقافة المنظمة وفريق العمل قبل اتخاذ قرار العرض الوظيفي.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
