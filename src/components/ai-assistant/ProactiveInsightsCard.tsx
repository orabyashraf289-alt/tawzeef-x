import { motion } from "framer-motion";
import { AlertCircle, Calendar, Briefcase, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export interface ProactiveInsights {
  stuck_candidates: { name: string; stage: string; days_stuck: number }[];
  upcoming_interviews: { id: string; candidate_name: string; date: string; time: string }[];
  jobs_no_applicants: { id: string; title: string; days_open: number }[];
  pending_offers: { id: string; position: string; status: string }[];
  summary: {
    stuck_count: number;
    upcoming_count: number;
    empty_jobs_count: number;
    pending_offers_count: number;
  };
}

export default function ProactiveInsightsCard({ insights }: { insights: ProactiveInsights }) {
  const navigate = useNavigate();
  const items = [
    {
      icon: AlertCircle,
      label: "مرشحون عالقون",
      count: insights.summary.stuck_count,
      color: "text-orange-600 bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800",
      onClick: () => navigate("/candidates"),
      detail: insights.stuck_candidates.slice(0, 3).map((c) => `• ${c.name} (${c.stage}) — ${c.days_stuck} يوم`),
    },
    {
      icon: Calendar,
      label: "مقابلات قادمة",
      count: insights.summary.upcoming_count,
      color: "text-purple-600 bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800",
      onClick: () => navigate("/interviews"),
      detail: insights.upcoming_interviews.slice(0, 3).map((i) => `• ${i.candidate_name} — ${i.date} ${i.time}`),
    },
    {
      icon: Briefcase,
      label: "وظائف بدون متقدمين",
      count: insights.summary.empty_jobs_count,
      color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
      onClick: () => navigate("/jobs"),
      detail: insights.jobs_no_applicants.slice(0, 3).map((j) => `• ${j.title} — مفتوحة منذ ${j.days_open} يوم`),
    },
    {
      icon: Mail,
      label: "عروض بانتظار رد",
      count: insights.summary.pending_offers_count,
      color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800",
      onClick: () => navigate("/offers"),
      detail: insights.pending_offers.slice(0, 3).map((o) => `• ${o.position} — ${o.status}`),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mt-3 space-y-2"
    >
      <div className="grid grid-cols-2 gap-2">
        {items.map((item, idx) => {
          const Icon = item.icon;
          return (
            <motion.button
              key={item.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={item.onClick}
              className={`text-right p-3 rounded-xl border ${item.color} hover:scale-[1.02] transition-transform group`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <Icon className="w-4 h-4" />
                <span className="text-xl font-black">{item.count}</span>
              </div>
              <p className="text-[11px] font-bold mb-1.5">{item.label}</p>
              {item.detail.length > 0 && (
                <ul className="space-y-0.5 text-[10px] opacity-80">
                  {item.detail.map((d, i) => (
                    <li key={i} className="truncate">{d}</li>
                  ))}
                </ul>
              )}
              <div className="flex items-center gap-1 text-[10px] mt-2 opacity-60 group-hover:opacity-100">
                <span>عرض الكل</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
