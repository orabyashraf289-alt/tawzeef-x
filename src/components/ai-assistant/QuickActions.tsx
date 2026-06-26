import { motion } from "framer-motion";
import { Sparkles, Zap, BarChart3, Calendar } from "lucide-react";

interface QuickActionsProps {
  onSelect: (text: string) => void;
}

const actions = [
  { icon: Sparkles, label: "ابدأ يومي", prompt: "ما الذي يحتاج انتباهي اليوم؟ اعرض الرؤى الاستباقية", color: "hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25 bg-amber-500/5" },
  { icon: BarChart3, label: "إحصائيات سريعة", prompt: "اعرض إحصائيات التوظيف العامة", color: "hover:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25 bg-indigo-500/5" },
  { icon: Calendar, label: "مقابلات قادمة", prompt: "ما هي المقابلات المجدولة هذا الأسبوع؟", color: "hover:bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25 bg-purple-500/5" },
  { icon: Zap, label: "وظائف نشطة", prompt: "اعرض الوظائف النشطة حالياً", color: "hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 bg-emerald-500/5" },
];

export default function QuickActions({ onSelect }: QuickActionsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      {actions.map((a, i) => {
        const Icon = a.icon;
        return (
          <motion.button
            key={a.label}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => onSelect(a.prompt)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-bold shadow-sm hover:shadow-md hover:scale-[1.03] transition-all duration-300 backdrop-blur-md ${a.color}`}
          >
            <Icon className="w-3 h-3" />
            <span>{a.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
