import { motion } from "framer-motion";
import { Sparkles, Zap, BarChart3, Calendar } from "lucide-react";

interface QuickActionsProps {
  onSelect: (text: string) => void;
}

const actions = [
  { icon: Sparkles, label: "ابدأ يومي", prompt: "ما الذي يحتاج انتباهي اليوم؟ اعرض الرؤى الاستباقية", color: "from-amber-500 to-orange-500" },
  { icon: BarChart3, label: "إحصائيات سريعة", prompt: "اعرض إحصائيات التوظيف العامة", color: "from-indigo-500 to-blue-500" },
  { icon: Calendar, label: "مقابلات قادمة", prompt: "ما هي المقابلات المجدولة هذا الأسبوع؟", color: "from-purple-500 to-pink-500" },
  { icon: Zap, label: "وظائف نشطة", prompt: "اعرض الوظائف النشطة حالياً", color: "from-emerald-500 to-teal-500" },
];

export default function QuickActions({ onSelect }: QuickActionsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {actions.map((a, i) => {
        const Icon = a.icon;
        return (
          <motion.button
            key={a.label}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => onSelect(a.prompt)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r ${a.color} text-white text-[11px] font-bold shadow-sm hover:shadow-md hover:scale-105 transition-all`}
          >
            <Icon className="w-3 h-3" />
            <span>{a.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
