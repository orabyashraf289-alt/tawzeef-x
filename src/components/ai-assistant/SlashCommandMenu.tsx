import { Briefcase, Users, Calendar, FileText, BarChart3, Search, Mail } from "lucide-react";
import { motion } from "framer-motion";

export interface SlashCommand {
  trigger: string;
  label: string;
  description: string;
  prompt: string;
  icon: any;
  autoSend?: boolean;
}

// `autoSend: true` means the command will be executed immediately by the AI tool layer
// instead of just pre-filling the input.
export const SLASH_COMMANDS: SlashCommand[] = [
  { trigger: "/job", label: "إنشاء وظيفة", description: "أنشئ وظيفة جديدة بسرعة", prompt: "أنشئ وظيفة ", icon: Briefcase, autoSend: false },
  { trigger: "/move", label: "نقل مرشح", description: "نقل مرشح بين المراحل (ينفذ مباشرة)", prompt: "انقل المرشح ", icon: Users, autoSend: false },
  { trigger: "/interview", label: "جدولة مقابلة", description: "جدول مقابلة (ينفذ مباشرة)", prompt: "جدول مقابلة لـ ", icon: Calendar, autoSend: false },
  { trigger: "/offer", label: "إنشاء عرض", description: "أنشئ عرض وظيفي (ينفذ مباشرة)", prompt: "أنشئ عرض وظيفي لـ ", icon: FileText, autoSend: false },
  { trigger: "/stats", label: "الإحصائيات", description: "تنفيذ فوري", prompt: "اعرض إحصائيات التوظيف الحالية", icon: BarChart3, autoSend: true },
  { trigger: "/search", label: "بحث ذكي", description: "ابحث بـ AI في المرشحين", prompt: "ابحث عن مرشح ", icon: Search, autoSend: false },
  { trigger: "/email", label: "إرسال بريد", description: "أرسل بريد لمرشح", prompt: "أرسل بريد إلى ", icon: Mail, autoSend: false },
];

interface Props {
  query: string;
  onSelect: (cmd: SlashCommand) => void;
}

export default function SlashCommandMenu({ query, onSelect }: Props) {
  if (!query.startsWith("/")) return null;
  const q = query.slice(1).toLowerCase();
  const filtered = SLASH_COMMANDS.filter(
    (c) => c.trigger.toLowerCase().includes(query.toLowerCase()) || c.label.includes(q)
  );
  if (filtered.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute bottom-full mb-2 right-0 left-0 mx-3 max-w-4xl md:mx-auto bg-card border border-border rounded-xl shadow-lg overflow-hidden z-30"
    >
      <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground bg-muted/40 border-b border-border/50">
        أوامر سريعة • اضغط Enter للاختيار
      </div>
      <div className="max-h-[280px] overflow-y-auto py-1">
        {filtered.map((cmd) => (
          <button
            key={cmd.trigger}
            type="button"
            onClick={() => onSelect(cmd)}
            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-primary/5 transition-colors text-right"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <cmd.icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{cmd.label}</span>
                <kbd className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{cmd.trigger}</kbd>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">{cmd.description}</p>
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
