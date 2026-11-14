import { motion } from "framer-motion";
import {
  Award,
  Brain,
  CalendarClock,
  CheckCircle2,
  DollarSign,
  Target,
  Timer,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReportHeaderSummaryKpis } from "./reportTypes";

interface ReportKpiGridProps {
  kpis: ReportHeaderSummaryKpis;
  t: (key: string) => string;
}

export function ReportKpiGrid({ kpis, t }: ReportKpiGridProps) {
  const cards = [
    {
      icon: Target,
      title: t("reports.conversionRate"),
      value: `${kpis.conversionRate}%`,
      colorClass: "text-primary",
      bg: "bg-md-primary-container/40 border-primary/20",
    },
    {
      icon: Users,
      title: t("reports.totalCandidates"),
      value: kpis.totalCandidates.toString(),
      colorClass: "text-foreground",
      bg: "bg-md-surface-container border-md-outline-variant",
    },
    {
      icon: Award,
      title: t("reports.hired"),
      value: kpis.hired.toString(),
      colorClass: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      icon: Brain,
      title: t("reports.avgAiScore"),
      value: kpis.avgAiScore,
      colorClass: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20",
    },
    {
      icon: CalendarClock,
      title: t("reports.avgTimeToHire"),
      value: kpis.avgTimeToHire,
      colorClass: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/20",
    },
    {
      icon: DollarSign,
      title: t("reports.hiringCost"),
      value: kpis.totalCostNum,
      colorClass: "text-primary",
      bg: "bg-md-surface-container-low border-md-outline-variant",
    },
    {
      icon: CheckCircle2,
      title: t("reports.offerAcceptRate"),
      value: kpis.offerAcceptanceRate,
      colorClass: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      icon: Timer,
      title: t("reports.avgOfferResponse"),
      value:
        kpis.avgOfferResponseDays != null
          ? `${kpis.avgOfferResponseDays} ${t("reports.day")}`
          : "—",
      colorClass: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="grid grid-cols-2 lg:grid-cols-4 gap-3"
    >
      {cards.map((kpi, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + i * 0.05 }}
          className={cn(
            "relative overflow-hidden p-5 border rounded-md3-2xl transition-all duration-200 hover:scale-[1.02] shadow-xs",
            kpi.bg,
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-md3-md bg-card flex items-center justify-center shadow-xs">
              <kpi.icon className={cn("w-4 h-4 shrink-0", kpi.colorClass)} />
            </div>
            <span className="text-xs text-muted-foreground font-semibold">{kpi.title}</span>
          </div>
          <p className={cn("text-2xl font-black tracking-tight", kpi.colorClass)}>{kpi.value}</p>
        </motion.div>
      ))}
    </motion.div>
  );
}
