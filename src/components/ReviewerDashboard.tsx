import { useCandidates, useInterviews } from "@/hooks/useJobs";
import { useI18n } from "@/contexts/I18nContext";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, Calendar, Brain, Eye, Star, FileText, ChevronRight, Sparkles } from "lucide-react";
import StatCard from "@/components/StatCard";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useMemo } from "react";
import { AnimatedDashboardBackground } from "@/components/AnimatedBackground";
import { cn } from "@/lib/utils";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function ReviewerDashboard() {
  const { t, locale } = useI18n();
  const { data: candidates } = useCandidates();
  const { data: interviews } = useInterviews();

  const allCandidates = candidates || [];
  const allInterviews = interviews || [];

  const pendingReview = allCandidates.filter(c => c.stage === "مراجعة السيرة" || c.stage === "تقديم الطلب");
  const myInterviews = allInterviews.filter(i => i.status === "مجدولة");

  const aiStats = useMemo(() => {
    const scored = allCandidates.filter(c => c.ai_score != null);
    const avgScore = scored.length > 0 ? Math.round(scored.reduce((sum, c) => sum + (c.ai_score || 0), 0) / scored.length) : 0;
    return { evaluated: scored.length, avgScore, total: allCandidates.length };
  }, [allCandidates]);

  return (
    <>
      <AnimatedDashboardBackground />
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="p-6 lg:p-8 space-y-6 relative"
      >
        <motion.div variants={item}>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">{t("role.reviewer")}</Badge>
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t("dashboard.reviewerPanel")}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t("dashboard.reviewerDesc")}</p>
        </motion.div>

        <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users} title={t("dashboard.pendingReview")} value={pendingReview.length} index={0} />
          <StatCard icon={Calendar} title={t("dashboard.myInterviews")} value={myInterviews.length} index={1} />
          <StatCard icon={Brain} title={t("dashboard.evaluatedByAI")} value={aiStats.evaluated} index={2} />
          <StatCard icon={Star} title={t("dashboard.avgMatch")} value={`${aiStats.avgScore}%`} index={3} />
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Pending Review */}
          <motion.div variants={item} whileHover={{ y: -8, scale: 1.02 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
            <div className="glass-card-premium border-none shadow-md rounded-2xl p-6 h-full relative overflow-hidden group">
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
              <div className="flex items-center justify-between mb-4 relative">
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />{t("dashboard.candidatesPendingReview")}
                </h3>
                <Link to="/candidates" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                  {t("common.viewAll")} <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              {pendingReview.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8 relative">{t("dashboard.noCandidatesPending")}</p>
              ) : (
                <div className="space-y-2 relative">
                  {pendingReview.slice(0, 6).map((c, i) => (
                    <motion.div key={c.id} initial={{ opacity: 0, x: locale === "ar" ? 10 : -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.05 }}>
                      <Link to={`/candidates/${c.id}`} className="flex items-center gap-3 p-2.5 rounded-xl list-hover-highlight transition-all group/item">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-xs font-bold text-white shadow-sm transition-transform group-hover/item:scale-110">
                          {c.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate group-hover/item:text-primary transition-colors">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.role || "—"}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] border-primary/20 text-primary bg-primary/5">{c.stage}</Badge>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* My Interviews */}
          <motion.div variants={item} whileHover={{ y: -8, scale: 1.02 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
            <div className="glass-card-premium border-none shadow-md rounded-2xl p-6 h-full relative overflow-hidden group">
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
              <div className="flex items-center justify-between mb-4 relative">
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />{t("dashboard.myInterviews")}
                </h3>
                <Link to="/interviews" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                  {t("common.viewAll")} <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              {myInterviews.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8 relative">{t("dashboard.noInterviewsScheduled")}</p>
              ) : (
                <div className="space-y-2 relative">
                  {myInterviews.slice(0, 5).map((interview, i) => (
                    <motion.div key={interview.id} initial={{ opacity: 0, x: locale === "ar" ? 10 : -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.05 }}>
                      <div className="flex items-center gap-3 p-2.5 rounded-xl list-hover-highlight cursor-default group/item">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-sm transition-transform group-hover/item:scale-110 shrink-0">
                          <Calendar className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate group-hover/item:text-primary transition-colors">{interview.candidate_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{interview.position}</p>
                        </div>
                        <div className="text-left shrink-0">
                          <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg block">{interview.time?.slice(0, 5)}</span>
                          <span className="text-[10px] text-muted-foreground mt-1 block">{interview.date}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* AI Stats */}
        <motion.div variants={item} whileHover={{ y: -6, scale: 1.01 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
          <div className="glass-card-premium border-none shadow-md rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
            <h3 className="font-bold text-base flex items-center gap-2 mb-4 relative">
              <Brain className="w-4 h-4 text-primary group-hover:animate-pulse" />{t("dashboard.aiEvaluationRate")}
            </h3>
            <div className="flex items-center gap-4 relative">
              <div className="flex-1">
                <Progress value={aiStats.total > 0 ? (aiStats.evaluated / aiStats.total) * 100 : 0} className="h-3 [&>div]:bg-primary" />
              </div>
              <span className="text-sm font-bold text-foreground bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-lg shrink-0">
                {aiStats.evaluated}/{aiStats.total}
              </span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}
