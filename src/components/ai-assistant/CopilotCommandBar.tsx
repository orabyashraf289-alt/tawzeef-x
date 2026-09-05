import { motion } from "framer-motion";
import {
  Briefcase,
  CalendarCheck,
  ArrowRightLeft,
  Filter,
  MessageCircle,
  Zap,
  Sparkles,
} from "lucide-react";
import type { CopilotActionType } from "@/types/copilotActions";

interface CopilotCommandBarProps {
  onLaunch: (type: CopilotActionType) => void;
  disabled?: boolean;
}

const commands = [
  {
    type: "create_job" as CopilotActionType,
    label: "طرح شاغر فوري",
    icon: Briefcase,
    color: "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/15",
  },
  {
    type: "schedule_interview" as CopilotActionType,
    label: "جدولة مقابلة فيديو",
    icon: CalendarCheck,
    color: "border-indigo-500/30 text-indigo-600 dark:text-indigo-400 bg-indigo-500/5 hover:bg-indigo-500/15",
  },
  {
    type: "move_candidate" as CopilotActionType,
    label: "نقل مرحلة مرشح",
    icon: ArrowRightLeft,
    color: "border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/5 hover:bg-blue-500/15",
  },
  {
    type: "filter_candidates" as CopilotActionType,
    label: "فرز ومطابقة المواهب",
    icon: Filter,
    color: "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5 hover:bg-amber-500/15",
  },
  {
    type: "whatsapp_dispatch" as CopilotActionType,
    label: "تواصل واتساب",
    icon: MessageCircle,
    color: "border-green-500/30 text-green-600 dark:text-green-400 bg-green-500/5 hover:bg-green-500/15",
  },
];

export default function CopilotCommandBar({ onLaunch, disabled }: CopilotCommandBarProps) {
  return (
    <div className="py-1 px-1 flex items-center gap-2 overflow-x-auto scrollbar-hide select-none" dir="rtl">
      {/* Live Copilot Badge */}
      <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-extrabold shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        <Zap className="w-3 h-3" />
        <span>الوكيل التنفيذي</span>
      </div>

      {/* Action Chips */}
      {commands.map((cmd, idx) => {
        const Icon = cmd.icon;
        return (
          <motion.button
            key={cmd.type}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.04 }}
            type="button"
            disabled={disabled}
            onClick={() => onLaunch(cmd.type)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold shadow-2xs transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] ${cmd.color}`}
          >
            <Icon className="w-3 h-3" />
            <span>{cmd.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
