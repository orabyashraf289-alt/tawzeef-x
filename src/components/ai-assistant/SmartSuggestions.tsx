import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Briefcase, Users, TrendingUp, Calendar, Mail, FileText, BarChart3, MessageSquare, Brain, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export interface SmartSuggestion {
  text: string;
  icon: any;
  category: "daily" | "action" | "analysis" | "communication";
  label: string;
}

export const SMART_SUGGESTIONS: SmartSuggestion[] = [
  // Daily / proactive
  { text: "ابدأ يومي - ما الذي يحتاج انتباهي اليوم؟ اعرض الرؤى الاستباقية", icon: Sparkles, category: "daily", label: "ابدأ يومي الاستباقي" },
  { text: "أعطني ملخص الأسبوع وأهم مؤشرات الأداء والتوظيف", icon: TrendingUp, category: "analysis", label: "ملخص الأسبوع الشامل" },
  // Actions
  { text: "أنشئ وظيفة مطور Frontend في الرياض دوام كامل خبرة 3-5 سنوات", icon: Briefcase, category: "action", label: "إنشاء وظيفة جديدة" },
  { text: "ولّد لي وصفاً وظيفياً احترافياً لـ Data Scientist مع متطلبات Python و SQL", icon: FileText, category: "action", label: "توليد وصف وظيفي AI" },
  { text: "ابحث عن المرشحين الموجودين حالياً في مرحلة المقابلة التقنية", icon: Users, category: "action", label: "بحث وتصفية المرشحين" },
  { text: "جدول مقابلة عن بُعد لأحمد يوم الأحد القادم الساعة 10 صباحاً مع رابط Jitsi", icon: Calendar, category: "action", label: "جدولة مقابلة تفاعلية" },
  { text: "ولّد 8 أسئلة مقابلة احترافية مع نموذج الإجابة المتوقع لوظيفة Full-Stack", icon: MessageSquare, category: "action", label: "بنك أسئلة المقابلة" },
  // Analysis
  { text: "اعرض إحصائيات تقرير شاملة عن مسار التوظيف Pipeline", icon: BarChart3, category: "analysis", label: "إحصائيات المسار Pipeline" },
  { text: "قيّم مرشحاً بالذكاء الاصطناعي وأعطني نقاط القوة والضعف", icon: Brain, category: "analysis", label: "تقييم المرشح الذكي" },
  { text: "حلل هذه السيرة الذاتية وقارنها بالوظائف المتاحة بالنظام", icon: FileText, category: "analysis", label: "تحليل ومطابقة السيرة الذاتية" },
  // Communication
  { text: "اكتب وأرسل بريد دعوة للمقابلة بأسلوب جذاب لمرشح", icon: Mail, category: "communication", label: "دعوة مقابلة عبر البريد" },
  { text: "أرسل بريد شكر جماعي رقيق لجميع المرشحين الذين لم يتم قبولهم", icon: Mail, category: "communication", label: "إرسال بريد جماعي للمرشحين" },
];

export const CATEGORY_STYLES: Record<SmartSuggestion["category"], { label: string; color: string; badgeBg: string }> = {
  daily: { label: "🌅 يومي واستباقي", color: "hover:border-amber-500/50 hover:bg-amber-500/5", badgeBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  action: { label: "⚡ إجراء مباشر", color: "hover:border-primary/50 hover:bg-primary/5", badgeBg: "bg-primary/10 text-primary border-primary/20" },
  analysis: { label: "📊 تحليل وتقارير", color: "hover:border-indigo-500/50 hover:bg-indigo-500/5", badgeBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" },
  communication: { label: "✉️ مراسلات وتواصل", color: "hover:border-emerald-500/50 hover:bg-emerald-500/5", badgeBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
};

export default function SmartSuggestions({ onSelect }: { onSelect: (text: string) => void }) {
  const [filter, setFilter] = useState<"all" | SmartSuggestion["category"]>("all");

  const filteredItems = filter === "all" ? SMART_SUGGESTIONS : SMART_SUGGESTIONS.filter(s => s.category === filter);

  return (
    <div className="w-full space-y-3.5 my-2">
      {/* Category Pills Header */}
      <div className="flex items-center justify-between gap-2 border-b border-border/30 pb-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-primary animate-pulse" />
          <h3 className="text-xs font-black text-foreground">مركز الأوامر السريعة واقتراحات الذكاء الاصطناعي</h3>
        </div>

        {/* Filter Pills */}
        <div className="flex bg-muted/30 p-1 rounded-xl border border-border/30 gap-1 text-[11px] font-bold">
          <button
            onClick={() => setFilter("all")}
            className={cn(
              "px-2.5 py-1 rounded-lg transition-all",
              filter === "all" ? "bg-card text-primary shadow-sm font-extrabold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            الكل ({SMART_SUGGESTIONS.length})
          </button>
          <button
            onClick={() => setFilter("daily")}
            className={cn(
              "px-2.5 py-1 rounded-lg transition-all",
              filter === "daily" ? "bg-card text-amber-600 dark:text-amber-400 shadow-sm font-extrabold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            🌅 يومي
          </button>
          <button
            onClick={() => setFilter("action")}
            className={cn(
              "px-2.5 py-1 rounded-lg transition-all",
              filter === "action" ? "bg-card text-primary shadow-sm font-extrabold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            ⚡ إجراءات
          </button>
          <button
            onClick={() => setFilter("analysis")}
            className={cn(
              "px-2.5 py-1 rounded-lg transition-all",
              filter === "analysis" ? "bg-card text-indigo-600 dark:text-indigo-400 shadow-sm font-extrabold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            📊 تحليلات
          </button>
          <button
            onClick={() => setFilter("communication")}
            className={cn(
              "px-2.5 py-1 rounded-lg transition-all",
              filter === "communication" ? "bg-card text-emerald-600 dark:text-emerald-400 shadow-sm font-extrabold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            ✉️ تواصل
          </button>
        </div>
      </div>

      {/* Balanced Executive Prompt Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        <AnimatePresence mode="popLayout">
          {filteredItems.map((s, i) => {
            const Icon = s.icon;
            const catStyle = CATEGORY_STYLES[s.category];
            return (
              <motion.button
                key={s.text}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2, delay: i * 0.02 }}
                onClick={() => onSelect(s.text)}
                className={cn(
                  "text-right p-3.5 rounded-2xl border border-border/40 bg-card/60 hover:bg-card hover:shadow-lg transition-all duration-300 flex flex-col justify-between group relative overflow-hidden backdrop-blur-md",
                  catStyle.color
                )}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-1">
                    <Badge variant="outline" className={cn("text-[9.5px] font-bold px-2 py-0.5 border", catStyle.badgeBg)}>
                      {catStyle.label}
                    </Badge>
                    <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
                  </div>

                  <div className="flex items-start gap-2.5 pt-0.5">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 shrink-0 shadow-sm">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-extrabold text-xs text-foreground group-hover:text-primary transition-colors leading-tight">
                        {s.label}
                      </h4>
                      <p className="text-[11px] text-muted-foreground font-medium leading-relaxed mt-1 line-clamp-2">
                        {s.text}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
