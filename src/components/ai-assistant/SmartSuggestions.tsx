import { motion } from "framer-motion";
import { Sparkles, Briefcase, Users, TrendingUp, Calendar, Mail, FileText, BarChart3, MessageSquare, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SmartSuggestion {
  text: string;
  icon: any;
  category: "daily" | "action" | "analysis" | "communication";
  label: string;
}

export const SMART_SUGGESTIONS: SmartSuggestion[] = [
  // Daily / proactive
  { text: "ابدأ يومي - ما الذي يحتاج انتباهي اليوم؟", icon: Sparkles, category: "daily", label: "ابدأ يومي" },
  { text: "أعطني ملخص الأسبوع وأهم المؤشرات", icon: TrendingUp, category: "analysis", label: "ملخص الأسبوع" },
  // Actions
  { text: "أنشئ وظيفة مطور Frontend في الرياض دوام كامل خبرة 3-5 سنوات", icon: Briefcase, category: "action", label: "إنشاء وظيفة" },
  { text: "ولّد لي وصفاً وظيفياً احترافياً لـ Data Scientist مع متطلبات Python و SQL", icon: FileText, category: "action", label: "وصف وظيفي AI" },
  { text: "ابحث عن المرشحين في مرحلة المقابلة التقنية", icon: Users, category: "action", label: "بحث المرشحين" },
  { text: "جدول مقابلة عن بُعد لأحمد يوم الأحد القادم الساعة 10 صباحاً", icon: Calendar, category: "action", label: "جدولة مقابلة" },
  { text: "ولّد 8 أسئلة مقابلة احترافية لوظيفة مطور Full-Stack", icon: MessageSquare, category: "action", label: "أسئلة مقابلة" },
  // Analysis
  { text: "اعرض إحصائيات شاملة عن مسار التوظيف", icon: BarChart3, category: "analysis", label: "إحصائيات Pipeline" },
  { text: "قيّم مرشحاً اسمه أحمد بالذكاء الاصطناعي", icon: Brain, category: "analysis", label: "تقييم AI" },
  { text: "حلل هذه السيرة الذاتية وقارنها بالوظائف المتاحة", icon: FileText, category: "analysis", label: "تحليل سيرة" },
  // Communication
  { text: "اكتب وأرسل بريد دعوة لمقابلة لمرشح اسمه أحمد", icon: Mail, category: "communication", label: "بريد دعوة" },
  { text: "أرسل بريد شكر لجميع المرشحين الذين تم رفضهم", icon: Mail, category: "communication", label: "بريد جماعي" },
];

export const CATEGORY_STYLES: Record<SmartSuggestion["category"], { label: string; color: string }> = {
  daily: { label: "🌅 يومي", color: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300" },
  action: { label: "⚡ إجراء", color: "bg-primary/5 border-primary/20 text-primary" },
  analysis: { label: "📊 تحليل", color: "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300" },
  communication: { label: "✉️ تواصل", color: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300" },
};

export default function SmartSuggestions({ onSelect }: { onSelect: (text: string) => void }) {
  const categories: SmartSuggestion["category"][] = ["daily", "action", "analysis", "communication"];

  return (
    <div className="space-y-3">
      {categories.map((cat) => {
        const items = SMART_SUGGESTIONS.filter((s) => s.category === cat);
        const style = CATEGORY_STYLES[cat];
        return (
          <div key={cat} className="space-y-1.5">
            <p className="text-[10px] font-bold text-muted-foreground px-1">{style.label}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {items.map((s, i) => {
                const Icon = s.icon;
                return (
                  <motion.button
                    key={s.text}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => onSelect(s.text)}
                    className={cn(
                      "text-right p-2.5 rounded-xl border text-xs transition-all hover:scale-[1.02] hover:shadow-md group",
                      style.color
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <Icon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[11px]">{s.label}</p>
                        <p className="text-[10px] opacity-70 leading-tight mt-0.5 line-clamp-2">{s.text}</p>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
