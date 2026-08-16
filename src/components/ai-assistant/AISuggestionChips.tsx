import { motion } from "framer-motion";
import { Sparkles, Briefcase, Search, Users, Calendar, BarChart3, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AISuggestionChipsProps {
  onSelectSuggestion: (prompt: string) => void;
  className?: string;
}

const DEFAULT_SUGGESTIONS = [
  {
    icon: Briefcase,
    title: "إنشاء وظيفة جديدة",
    prompt: "أريد إنشاء وظيفة جديدة لمطور React بخبرة 3 سنوات في الرياض براتب 12000 ريال",
    color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  },
  {
    icon: Search,
    title: "ترشيح أفضل الأشكال",
    prompt: "من هما أفضل 3 مرشحين لوظيفة مصمم واجهات بناءً على نتائج المقابلات والتقييم؟",
    color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
  },
  {
    icon: Calendar,
    title: "جدولة مقابلة تقنية",
    prompt: "أريد جدولة مقابلة تقنية مع المرشح أحمد علي يوم الغد الساعة 3 عصراً",
    color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  },
  {
    icon: BarChart3,
    title: "ملخص أداء التوظيف",
    prompt: "أعطني تحليلاً شاملاً لأداء عملية التوظيف للشهر الحالي ونسبة القبول لكل مرحلة",
    color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  },
];

export default function AISuggestionChips({
  onSelectSuggestion,
  className,
}: AISuggestionChipsProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium px-1">
        <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
        <span>اقتراحات سريعة للبدء:</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {DEFAULT_SUGGESTIONS.map((item, idx) => {
          const Icon = item.icon;
          return (
            <motion.button
              key={idx}
              whileHover={{ scale: 1.01, y: -1 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onSelectSuggestion(item.prompt)}
              className="flex items-start gap-2.5 p-2.5 rounded-xl border border-border/50 bg-card hover:bg-muted/30 text-right transition-all group cursor-pointer shadow-2xs"
            >
              <div className={cn("p-1.5 rounded-lg shrink-0 border", item.color)}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors block truncate">
                  {item.title}
                </span>
                <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                  {item.prompt}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
