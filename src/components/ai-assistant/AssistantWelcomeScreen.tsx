import { motion } from "framer-motion";
import { Bot, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import AISuggestionChips from "./AISuggestionChips";

const SPECIALIZED_MODULES = [
  ["job_review", "مراجعة الإعلان"],
  ["interview_scorecard", "بطاقة المقابلة"],
  ["screening_checklist", "الفرز الأولي"],
  ["hiring_workflow", "خطة التوظيف"],
  ["candidate_outreach", "مسودات التواصل"],
] as const;

interface AssistantWelcomeScreenProps {
  canManage: boolean;
  onSelectSuggestion: (prompt: string) => void;
  onSelectMode: (mode: string) => void;
}

export default function AssistantWelcomeScreen({
  canManage,
  onSelectSuggestion,
  onSelectMode,
}: AssistantWelcomeScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center text-center my-auto min-h-full py-8 max-w-xl mx-auto px-4"
    >
      <div className="relative mb-3">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-primary via-primary/80 to-purple-600 flex items-center justify-center text-primary-foreground shadow-xl shadow-primary/20 border border-primary/20">
          <Bot className="w-8 h-8" />
        </div>
        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-background animate-pulse" />
      </div>

      <Badge
        variant="outline"
        className="mb-2.5 bg-primary/10 text-primary border-primary/20 px-3 py-0.5 text-[11px] gap-1 font-bold"
      >
        <Sparkles className="w-3 h-3 text-primary animate-pulse" />
        مساعد التوظيف الذكي v2.0
      </Badge>

      <h2 className="text-xl font-extrabold text-foreground mb-1">كيف تود تطوير عملية التوظيف اليوم؟</h2>
      <p className="text-xs text-muted-foreground max-w-md leading-relaxed mb-6 font-medium">
        أنا مستشارك الذكي المتقدم في منصة Tawzeef-X. اختر إحدى المهام أدناه أو اكتب سؤالك لتلقي تقارير وتحليلات فورية.
      </p>

      <AISuggestionChips onSelectSuggestion={onSelectSuggestion} className="w-full" />

      {canManage && (
        <div className="w-full mt-6 text-right">
          <p className="text-xs font-bold text-foreground mb-2">وحدات متخصصة للوظائف</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SPECIALIZED_MODULES.map(([mode, label]) => (
              <Button
                key={mode}
                variant="outline"
                className="text-xs h-auto min-h-10 whitespace-normal"
                onClick={() => onSelectMode(mode)}
              >
                {label}
              </Button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            هذه الوحدات تصنع مسودات للمراجعة؛ لا ترسل رسائل أو تتخذ قرار توظيف.
          </p>
        </div>
      )}
    </motion.div>
  );
}
