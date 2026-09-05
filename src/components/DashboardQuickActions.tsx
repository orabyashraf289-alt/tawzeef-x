import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  Briefcase,
  Calendar,
  FileCheck2,
  Award,
  Archive,
  FileSpreadsheet,
  Zap,
  Users,
  Building2,
  Sparkles,
  ArrowUpRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/contexts/I18nContext";
import { cn } from "@/lib/utils";

interface DashboardQuickActionsProps {
  onOpenAddJob?: () => void;
  className?: string;
}

export default function DashboardQuickActions({
  onOpenAddJob,
  className = "",
}: DashboardQuickActionsProps) {
  const { locale, dir } = useI18n();
  const navigate = useNavigate();

  const actions = [
    {
      id: "add-job",
      title: locale === "en" ? "Post Job" : "نشر وظيفة جديدة",
      subtitle: locale === "en" ? "Create recruitment spec" : "صياغة شاغر بالذكاء الاصطناعي",
      icon: Plus,
      color: "from-emerald-600 to-teal-600 text-white",
      bgHover: "hover:border-emerald-500/50 hover:bg-emerald-500/5",
      badge: locale === "en" ? "Fast" : "فوري ⚡",
      onClick: () => {
        if (onOpenAddJob) onOpenAddJob();
        else navigate("/jobs?action=create");
      },
    },
    {
      id: "schedule-interview",
      title: locale === "en" ? "Schedule Interview" : "جدولة مقابلة",
      subtitle: locale === "en" ? "Online room or on-site" : "قاعة افتراضية أو حضورية",
      icon: Calendar,
      color: "from-purple-600 to-indigo-600 text-white",
      bgHover: "hover:border-purple-500/50 hover:bg-purple-500/5",
      badge: locale === "en" ? "Video" : "فيديو 🎥",
      onClick: () => navigate("/interviews"),
    },
    {
      id: "create-offer",
      title: locale === "en" ? "Issue Digital Offer" : "إصدار عرض وظيفي",
      subtitle: locale === "en" ? "Electronic signature" : "توقيع وتوثيق رقمي",
      icon: Award,
      color: "from-blue-600 to-cyan-600 text-white",
      bgHover: "hover:border-blue-500/50 hover:bg-blue-500/5",
      badge: locale === "en" ? "e-Sign" : "رقمي ✍️",
      onClick: () => navigate("/offers"),
    },
    {
      id: "converted-order",
      title: locale === "en" ? "Onboarding Order" : "أمر تعيين ومباشرة",
      subtitle: locale === "en" ? "Branch & transfer order" : "ربط الفروع والمسوغات",
      icon: FileCheck2,
      color: "from-amber-600 to-orange-600 text-white",
      bgHover: "hover:border-amber-500/50 hover:bg-amber-500/5",
      badge: locale === "en" ? "Gov" : "قوى 🇸🇦",
      onClick: () => navigate("/converted-orders"),
    },
    {
      id: "resume-archive",
      title: locale === "en" ? "Resume Archive" : "أرشيف السير الذاتية",
      subtitle: locale === "en" ? "AI Semantic search" : "بحث ذكي بالمطابقة",
      icon: Archive,
      color: "from-indigo-600 to-violet-600 text-white",
      bgHover: "hover:border-indigo-500/50 hover:bg-indigo-500/5",
      badge: locale === "en" ? "AI" : "AI 🧠",
      onClick: () => navigate("/resume-archive"),
    },
    {
      id: "reports",
      title: locale === "en" ? "Executive Reports" : "التقارير التنفيذية",
      subtitle: locale === "en" ? "KPIs & PDF Export" : "مؤشرات الأداء وتحميل PDF",
      icon: FileSpreadsheet,
      color: "from-rose-600 to-pink-600 text-white",
      bgHover: "hover:border-rose-500/50 hover:bg-rose-500/5",
      badge: locale === "en" ? "PDF" : "PDF 📊",
      onClick: () => navigate("/reports"),
    },
  ];

  return (
    <div className={cn("space-y-2.5", className)} dir={dir}>
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-black text-foreground tracking-tight">
            {locale === "en" ? "Executive Quick Launchpad" : "شريط العمليات والإجراءات السريعة"}
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground font-semibold">
          {locale === "en" ? "Direct Execution" : "إطلاق فوري للعمليات بنقرة واحدة"}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {actions.map((act, i) => {
          const Icon = act.icon;
          return (
            <motion.button
              key={act.id}
              type="button"
              onClick={act.onClick}
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "p-3 rounded-2xl border border-border/70 bg-card/80 backdrop-blur-sm text-right transition-all flex flex-col justify-between group shadow-xs hover:shadow-md",
                act.bgHover
              )}
            >
              <div className="flex items-center justify-between gap-1 mb-2">
                <div className={cn("w-8 h-8 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-xs", act.color)}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-muted/60 text-muted-foreground border border-border/40">
                  {act.badge}
                </span>
              </div>

              <div>
                <p className="text-xs font-black text-foreground group-hover:text-primary transition-colors truncate">
                  {act.title}
                </p>
                <p className="text-[9px] text-muted-foreground truncate mt-0.5">
                  {act.subtitle}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
