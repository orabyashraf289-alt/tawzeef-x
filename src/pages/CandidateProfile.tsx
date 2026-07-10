import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ArrowRight, Mail, Phone, MapPin, Calendar, Star, Download, 
  MessageSquare, FileText, Briefcase, GraduationCap, Check, Clock, 
  Circle, CalendarPlus, User, Activity, Hash, Layers, Globe, 
  Copy, ChevronLeft, Sparkles, Eye, StarOff, GitBranch, ClipboardCheck,
  Lock, Shield
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCandidates } from "@/hooks/useJobs";
import { useStageTransitions } from "@/hooks/useStageTransitions";
import { useActiveStages } from "@/hooks/usePipelineStages";
import AIEvaluationCard from "@/components/AIEvaluationCard";
import CandidateScorecardSection from "@/components/CandidateScorecardSection";
import StageActions from "@/components/StageActions";
import { SingleResponseProctoringDialog } from "@/components/question-bank/AssessmentResponsesDialog";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import CandidateChecklistPanel from "@/components/CandidateChecklistPanel";
import { encryptField, decryptField } from "@/lib/security";
import { useI18n } from "@/contexts/I18nContext";


const statusConfig: Record<string, { label: string; bg: string; dot: string }> = {
  "مقبول": { label: "مقبول", bg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400", dot: "bg-emerald-500" },
  "قيد المراجعة": { label: "قيد المراجعة", bg: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400", dot: "bg-amber-500" },
  "مرفوض": { label: "مرفوض", bg: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400", dot: "bg-red-500" },
  "تم إرسال العرض": { label: "تم إرسال العرض", bg: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400", dot: "bg-blue-500" },
  "مكتمل": { label: "تم التوظيف ✅", bg: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400", dot: "bg-violet-500" },
};

const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").slice(0, 2);

const DEFAULT_STAGE_ORDER = ["تقديم الطلب", "مراجعة السيرة", "فحص هاتفي", "مقابلة تقنية", "مقابلة نهائية", "العرض الوظيفي"];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] } }),
};

function PipelineTracker({ currentStage }: { currentStage: string }) {
  const activeStages = useActiveStages();
  const stageOrder = activeStages.length > 0 ? activeStages.map(s => s.name) : DEFAULT_STAGE_ORDER;
  const currentIdx = stageOrder.indexOf(currentStage);

  return (
    <motion.div custom={2} variants={fadeUp} initial="hidden" animate="show" className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-sm flex items-center gap-2.5">
          <div className="w-1 h-5 rounded-full bg-primary" />
          مراحل التوظيف
        </h3>
        <span className="text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full">
          {Math.max(0, currentIdx + 1)} / {stageOrder.length}
        </span>
      </div>
      <div className="flex items-center justify-between relative px-2">
        <div className="absolute top-5 right-4 left-4 h-[3px] bg-muted rounded-full" />
        <motion.div
          className="absolute top-5 right-4 h-[3px] bg-primary rounded-full"
          initial={{ width: 0 }}
          animate={{ width: currentIdx >= 0 ? `${(currentIdx / (stageOrder.length - 1)) * 100}%` : "0%" }}
          transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{ maxWidth: "calc(100% - 32px)" }}
        />
        {stageOrder.map((stage, i) => {
          const status = i < currentIdx ? "completed" : i === currentIdx ? "current" : "upcoming";
          return (
            <Tooltip key={stage}>
              <TooltipTrigger asChild>
                <div className="relative flex flex-col items-center z-10 group cursor-default">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2 + i * 0.08, type: "spring", stiffness: 400, damping: 20 }}
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                      status === "completed" && "bg-primary border-primary shadow-sm",
                      status === "current" && "bg-card border-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.1)] border-[3px]",
                      status === "upcoming" && "bg-muted/60 border-muted-foreground/20"
                    )}
                  >
                    {status === "completed" ? (
                      <Check className="w-4 h-4 text-primary-foreground" />
                    ) : status === "current" ? (
                      <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                    ) : (
                      <Circle className="w-3 h-3 text-muted-foreground/30" />
                    )}
                  </motion.div>
                  <span className={cn(
                    "text-[10px] mt-2 text-center max-w-[68px] leading-tight transition-colors",
                    status === "current" ? "text-primary font-bold" :
                    status === "completed" ? "text-foreground/80 font-medium" : "text-muted-foreground/50"
                  )}>
                    {stage}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {status === "completed" ? "✅ مكتملة" : status === "current" ? "⏳ المرحلة الحالية" : "قادمة"}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ─── Stage History Timeline ─── */
function StageHistoryTimeline({ candidateId }: { candidateId: string }) {
  const { data: transitions = [], isLoading } = useStageTransitions(candidateId);

  if (isLoading) return <div className="h-20 bg-muted/30 rounded-xl animate-pulse" />;
  if (transitions.length === 0) return null;

  return (
    <motion.div custom={7} variants={fadeUp} initial="hidden" animate="show" className="bg-card rounded-2xl border border-border/50 p-5 shadow-sm">
      <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
        <GitBranch className="w-4 h-4 text-primary" />
        سجل الانتقالات
        <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-normal">{transitions.length}</span>
      </h3>
      <div className="relative mr-3">
        <div className="absolute right-0 top-2 bottom-2 w-0.5 bg-border/50 rounded-full" />
        <div className="space-y-4">
          {transitions.map((t) => {
            const date = new Date(t.created_at);
            const timeStr = date.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
            const dateStr = date.toLocaleDateString("ar-SA", { month: "short", day: "numeric" });
            return (
              <div key={t.id} className="flex items-start gap-3 relative">
                <div className="relative z-10 w-3 h-3 mt-1.5 rounded-full bg-primary border-2 border-card shadow-sm shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {t.from_stage && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">{t.from_stage}</Badge>
                    )}
                    <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                    <Badge className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">{t.to_stage}</Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                    <Clock className="w-2.5 h-2.5" />
                    <span>{dateStr} {timeStr}</span>
                    {t.moved_by_name && <span>• {t.moved_by_name}</span>}
                  </div>
                  {t.notes && <p className="text-[11px] text-muted-foreground mt-1 bg-muted/30 rounded px-2 py-1">{t.notes}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Candidate Assessment Results ─── */
function CandidateAssessmentResults({ candidateEmail, jobId }: { candidateEmail: string | null; jobId: string | null }) {
  const [proctoringResponseId, setProctoringResponseId] = useState<string | null>(null);
  
  const { data: responses = [], isLoading } = useQuery({
    queryKey: ["candidate-assessment-results", candidateEmail],
    queryFn: async () => {
      if (!candidateEmail) return [];
      const { data, error } = await supabase
        .from("assessment_responses")
        .select("*, assessments(title, passing_score, duration_minutes)")
        .eq("candidate_email", candidateEmail)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!candidateEmail,
  });

  if (isLoading || responses.length === 0) return null;

  return (
    <motion.div custom={6.5} variants={fadeUp} initial="hidden" animate="show" className="bg-card rounded-2xl border border-border/50 p-5 shadow-sm">
      <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
        <ClipboardCheck className="w-4 h-4 text-primary" />
        نتائج الاختبارات
        <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-normal">{responses.length}</span>
      </h3>
      <div className="space-y-3">
        {responses.map((r: any) => {
          const assessment = r.assessments;
          const passed = r.percentage >= (assessment?.passing_score || 70);
          const parsedLog = r.tab_switch_log
            ? (typeof r.tab_switch_log === "string" ? JSON.parse(r.tab_switch_log) : r.tab_switch_log)
            : null;
          const integrityScore = r.integrity_score ?? parsedLog?.cheat_score;

          return (
            <div key={r.id} className="bg-muted/30 rounded-xl p-3.5 border border-border/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{assessment?.title || "اختبار"}</span>
                <Badge variant={r.status === "completed" ? (passed ? "default" : "destructive") : "secondary"} className="text-[10px]">
                  {r.status === "completed" ? (passed ? "ناجح ✅" : "راسب") : "قيد الإجابة"}
                </Badge>
              </div>
              {r.status === "completed" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">النتيجة: {r.total_score}/{r.max_score}</span>
                    <span className={cn("font-bold", passed ? "text-success" : "text-destructive")}>{r.percentage}%</span>
                  </div>
                  <Progress value={r.percentage} className="h-1.5" />
                  
                  {/* Proctoring & Integrity Details */}
                  <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-border/10">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="text-muted-foreground">درجة النزاهة:</span>
                      {integrityScore != null ? (
                        <span className={cn(
                          "font-bold",
                          integrityScore >= 80 ? "text-green-600 dark:text-green-400" :
                          integrityScore >= 60 ? "text-amber-600 dark:text-amber-400" :
                          "text-red-600 dark:text-red-400"
                        )}>
                          {integrityScore}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 text-[10px] px-2 text-primary hover:text-primary hover:bg-primary/5 gap-1 font-bold"
                      onClick={() => setProctoringResponseId(r.id)}
                    >
                      <Shield className="w-3 h-3" />
                      سجل المراقبة والنزاهة
                    </Button>
                  </div>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground mt-2">
                {new Date(r.created_at).toLocaleDateString("ar-SA")}
              </p>
            </div>
          );
        })}
      </div>

      {proctoringResponseId && (
        <SingleResponseProctoringDialog
          responseId={proctoringResponseId}
          open={!!proctoringResponseId}
          onClose={() => setProctoringResponseId(null)}
        />
      )}
    </motion.div>
  );
}

function InfoRow({ icon: Icon, label, value, copyable }: { icon: any; label: string; value: string; copyable?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-muted/40 transition-colors group">
      <div className="flex items-center gap-2.5">
        <Icon className="w-3.5 h-3.5 text-muted-foreground/60" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-semibold text-foreground">{value}</span>
        {copyable && value !== "-" && (
          <button
            onClick={() => { navigator.clipboard.writeText(value); toast({ title: "تم النسخ ✅" }); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Copy className="w-3 h-3 text-muted-foreground hover:text-primary" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function CandidateProfile() {
  const { id } = useParams();
  const { locale } = useI18n();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: candidates } = useCandidates();
  const candidate = (candidates || []).find(c => c.id === id);

  // Fetch E2E encryption status of recruiter's company
  const { data: companyData } = useQuery({
    queryKey: ["current-company-e2e", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data: member } = await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!member?.company_id) return null;
      
      const { data: company } = await supabase
        .from("companies")
        .select("id, e2e_encryption")
        .eq("id", member.company_id)
        .maybeSingle();
      return company;
    },
    enabled: !!user,
  });

  const [decryptedSalary, setDecryptedSalary] = useState<string>("");
  const [decryptedNotes, setDecryptedNotes] = useState<string>("");
  const [isDecrypting, setIsDecrypting] = useState<boolean>(true);
  const [isEditingE2E, setIsEditingE2E] = useState<boolean>(false);

  useEffect(() => {
    if (candidate && companyData) {
      const decrypt = async () => {
        setIsDecrypting(true);
        const salary = await decryptField((candidate as any).expected_salary || "", companyData.id);
        const notes = await decryptField((candidate as any).notes || "", companyData.id);
        setDecryptedSalary(salary);
        setDecryptedNotes(notes);
        setIsDecrypting(false);
      };
      decrypt();
    } else if (candidate) {
      setDecryptedSalary((candidate as any).expected_salary || "");
      setDecryptedNotes((candidate as any).notes || "");
      setIsDecrypting(false);
    }
  }, [candidate, companyData]);

  const saveE2EFields = async () => {
    if (!candidate || !companyData) return;
    setIsDecrypting(true);
    let finalSalary = decryptedSalary;
    let finalNotes = decryptedNotes;

    if (companyData.e2e_encryption) {
      finalSalary = await encryptField(decryptedSalary, companyData.id);
      finalNotes = await encryptField(decryptedNotes, companyData.id);
    }

    const { error } = await supabase
      .from("candidates")
      .update({
        expected_salary: finalSalary,
        notes: finalNotes
      } as any)
      .eq("id", candidate.id);

    if (error) {
      toast({ title: "خطأ في الحفظ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم حفظ البيانات بنجاح ✅" });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      setIsEditingE2E(false);
    }
    setIsDecrypting(false);
  };

  // Check if candidate is in talent pool
  const { data: talentEntry } = useQuery({
    queryKey: ["talent-pool-check", id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("talent_pool")
        .select("id")
        .eq("user_id", user!.id)
        .eq("candidate_id", id!)
        .maybeSingle();
      return data;
    },
    enabled: !!user && !!id,
  });

  const toggleTalentPool = useMutation({
    mutationFn: async () => {
      if (talentEntry) {
        await supabase.from("talent_pool").delete().eq("id", talentEntry.id);
      } else {
        await supabase.from("talent_pool").insert({ user_id: user!.id, candidate_id: id! });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["talent-pool"] });
      queryClient.invalidateQueries({ queryKey: ["talent-pool-check", id] });
      toast({ title: talentEntry ? "تم الإزالة من قاعدة المواهب" : "تمت الإضافة لقاعدة المواهب ⭐" });
    },
  });

  if (!candidate) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-4">
            <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto">
              <User className="w-8 h-8 text-muted-foreground/30" />
            </div>
            <h1 className="text-lg font-bold text-foreground">المرشح غير موجود</h1>
            <Link to="/candidates" className="text-sm text-primary hover:underline">العودة للمرشحين</Link>
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  const daysAgo = Math.floor((Date.now() - new Date(candidate.created_at).getTime()) / (1000 * 60 * 60 * 24));
  const statusCfg = statusConfig[candidate.status] || { label: candidate.status, bg: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" };

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-8 space-y-5 max-w-[1400px]">
        {/* Back */}
        <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show">
          <Link to="/candidates" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group">
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            العودة للمرشحين
          </Link>
        </motion.div>

        {/* Hero Header */}
        <motion.div custom={1} variants={fadeUp} initial="hidden" animate="show" className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-sm">
          {/* Banner */}
          <div className="h-20 lg:h-24 bg-gradient-to-l from-primary via-primary/90 to-primary/70 relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.08]" style={{
              backgroundImage: "radial-gradient(circle at 25% 60%, white 1px, transparent 1px), radial-gradient(circle at 75% 40%, white 1px, transparent 1px)",
              backgroundSize: "48px 48px"
            }} />
          </div>

          {/* Profile Info */}
          <div className="px-5 lg:px-8 pb-6">
            <div className="flex flex-col lg:flex-row gap-5">
              {/* Avatar */}
              <motion.div whileHover={{ scale: 1.04 }} className="shrink-0 -mt-10">
                <Avatar className="w-20 h-20 border-[4px] border-card shadow-xl ring-2 ring-border/30">
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 via-primary/10 to-accent/10 text-primary font-bold text-xl">
                    {getInitials(candidate.name)}
                  </AvatarFallback>
                </Avatar>
              </motion.div>

              {/* Details */}
              <div className="flex-1 pt-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 mb-1.5">
                  <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-foreground truncate">{candidate.name}</h1>
                  <Badge variant="secondary" className={cn("text-[11px] px-2.5 py-0.5 rounded-full font-semibold gap-1.5 w-fit", statusCfg.bg)}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", statusCfg.dot)} />
                    {statusCfg.label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{candidate.role || "لم يتم تحديد الوظيفة"}</p>

                {/* Contact chips */}
                <div className="flex flex-wrap gap-1.5">
                  {candidate.email && (
                    <a href={`mailto:${candidate.email}`} className="inline-flex items-center gap-1.5 bg-muted/50 hover:bg-muted text-xs text-muted-foreground px-2.5 py-1.5 rounded-lg transition-colors">
                      <Mail className="w-3 h-3 text-primary/60" />{candidate.email}
                    </a>
                  )}
                  {candidate.phone && (
                    <a href={`tel:${candidate.phone}`} className="inline-flex items-center gap-1.5 bg-muted/50 hover:bg-muted text-xs text-muted-foreground px-2.5 py-1.5 rounded-lg transition-colors" dir="ltr">
                      <Phone className="w-3 h-3 text-primary/60" />{candidate.phone}
                    </a>
                  )}
                  <span className="inline-flex items-center gap-1.5 bg-muted/50 text-xs text-muted-foreground px-2.5 py-1.5 rounded-lg">
                    <Calendar className="w-3 h-3 text-primary/60" />
                    {daysAgo === 0 ? "تقدّم اليوم" : `منذ ${daysAgo} يوم`}
                  </span>
                </div>

                {/* Stars */}
                <div className="flex items-center gap-0.5 mt-2.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={cn("w-3.5 h-3.5", i < (candidate.rating || 0) ? "fill-amber-400 text-amber-400" : "text-border")} />
                  ))}
                  {(candidate.rating || 0) > 0 && <span className="text-[11px] text-muted-foreground mr-1.5">{candidate.rating}/5</span>}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-row lg:flex-col gap-2 shrink-0 lg:min-w-[170px] pt-2">
                {(candidate as any).tracking_code && (
                  <>
                    <Button variant="outline" size="sm" className="gap-1.5 rounded-xl text-xs h-9" onClick={() => {
                      const url = `${window.location.origin}/book/${(candidate as any).tracking_code}`;
                      navigator.clipboard.writeText(url);
                      toast({ title: "تم نسخ رابط حجز المقابلة ✅" });
                    }}>
                      <CalendarPlus className="w-3.5 h-3.5" />نسخ رابط الحجز
                    </Button>
                    {candidate.email && (
                      <Button variant="outline" size="sm" className="gap-1.5 rounded-xl text-xs h-9" asChild>
                        <a href={`mailto:${candidate.email}?subject=حجز موعد المقابلة&body=مرحباً ${candidate.name}،%0A%0Aيسعدنا إعلامك بأنه تم اختيارك للمرحلة التالية.%0Aيمكنك حجز موعد المقابلة عبر الرابط التالي:%0A%0A${window.location.origin}/book/${(candidate as any).tracking_code}%0A%0Aبالتوفيق!`}>
                          <Mail className="w-3.5 h-3.5" />إرسال رابط بالبريد
                        </a>
                      </Button>
                    )}
                  </>
                )}
                {(candidate as any).resume_url ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 rounded-xl text-xs h-9"
                    onClick={async () => {
                      const { getSignedResumeUrl } = await import("@/lib/resumeStorage");
                      const signed = await getSignedResumeUrl((candidate as any).resume_url);
                      window.open(signed, "_blank", "noopener,noreferrer");
                    }}
                  >
                    <Download className="w-3.5 h-3.5" />تحميل السيرة
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" className="gap-1.5 rounded-xl text-xs h-9 opacity-40" disabled>
                    <Download className="w-3.5 h-3.5" />لا توجد سيرة
                  </Button>
                )}
                <Button
                  variant={talentEntry ? "default" : "outline"}
                  size="sm"
                  className={cn("gap-1.5 rounded-xl text-xs h-9", talentEntry ? "bg-warning/10 text-warning border-warning/30 hover:bg-warning/20" : "")}
                  onClick={() => toggleTalentPool.mutate()}
                  disabled={toggleTalentPool.isPending}
                >
                  {talentEntry ? <StarOff className="w-3.5 h-3.5" /> : <Star className="w-3.5 h-3.5" />}
                  {talentEntry ? "إزالة من المواهب" : "حفظ في المواهب"}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Pipeline */}
        <PipelineTracker currentStage={candidate.stage || "تقديم الطلب"} />

        {/* Main Content Grid - reversed for RTL: stage actions on right (first in DOM), content on left */}
        <div className="grid lg:grid-cols-12 gap-5">
          {/* Right sidebar — Stage Actions + Quick Info */}
          <div className="lg:col-span-4 xl:col-span-4 space-y-5 order-first lg:order-last">
            <motion.div custom={3} variants={fadeUp} initial="hidden" animate="show">
              <StageActions
                candidateId={candidate.id}
                candidateName={candidate.name}
                candidateEmail={candidate.email}
                currentStage={candidate.stage || "تقديم الطلب"}
                status={candidate.status}
                jobId={candidate.job_id}
                candidateRole={candidate.role}
              />
            </motion.div>

            {/* Quick Info Card */}
            <motion.div custom={4} variants={fadeUp} initial="hidden" animate="show" className="bg-card rounded-2xl border border-border/50 p-5 shadow-sm">
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                معلومات سريعة
              </h3>
              <div className="space-y-0.5">
                <InfoRow icon={Hash} label="رمز التتبع" value={(candidate as any).tracking_code || "-"} copyable />
                <InfoRow icon={Activity} label="الخبرة" value={candidate.experience || "-"} />
                <InfoRow icon={Globe} label="المصدر" value={candidate.source || "-"} />
                <InfoRow icon={Layers} label="المرحلة" value={candidate.stage || "-"} />
                <InfoRow icon={Calendar} label="تاريخ الإضافة" value={new Date(candidate.created_at).toLocaleDateString("ar-SA")} />
              </div>
            </motion.div>

            {/* E2E Encrypted Fields Card */}
            <motion.div custom={4.5} variants={fadeUp} initial="hidden" animate="show" className="bg-card rounded-2xl border border-border/50 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary" />
                  {locale === "en" ? "Encrypted Fields (E2E)" : "البيانات المشفرة (E2E)"}
                </h3>
                {companyData && (
                  <Badge variant="outline" className={cn(
                    "text-[10px]",
                    companyData.e2e_encryption 
                      ? "border-green-500/30 text-green-600 bg-green-50/50 dark:bg-green-500/10" 
                      : "border-muted-foreground/30 text-muted-foreground bg-muted/20"
                  )}>
                    {companyData.e2e_encryption 
                      ? (locale === "en" ? "AES-GCM Secure" : "مشفر بـ AES") 
                      : (locale === "en" ? "Plain text" : "تخزين عادي")}
                  </Badge>
                )}
              </div>

              {isDecrypting ? (
                <div className="flex items-center justify-center py-6 text-xs text-muted-foreground gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  {locale === "en" ? "Decrypting fields..." : "جاري معالجة البيانات..."}
                </div>
              ) : (
                <div className="space-y-3">
                  {!isEditingE2E ? (
                    <>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          {locale === "en" ? "Expected Salary" : "الراتب المتوقع"}
                        </Label>
                        <p className="text-sm font-semibold text-foreground bg-muted/20 p-2 rounded-lg border border-border/30">
                          {decryptedSalary || "—"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          {locale === "en" ? "Private Notes" : "الملاحظات الخاصة"}
                        </Label>
                        <p className="text-sm text-muted-foreground bg-muted/20 p-2 rounded-lg border border-border/30 whitespace-pre-wrap leading-relaxed">
                          {decryptedNotes || "—"}
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full text-xs gap-1.5"
                        onClick={() => setIsEditingE2E(true)}
                      >
                        {locale === "en" ? "Edit Sensitive Info" : "تعديل البيانات الحساسة"}
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          {locale === "en" ? "Expected Salary" : "الراتب المتوقع"}
                        </Label>
                        <Input
                          value={decryptedSalary}
                          onChange={e => setDecryptedSalary(e.target.value)}
                          placeholder={locale === "en" ? "e.g. 15,000 SAR" : "مثال: 15,000 ريال"}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          {locale === "en" ? "Private Notes" : "الملاحظات الخاصة"}
                        </Label>
                        <Textarea
                          value={decryptedNotes}
                          onChange={e => setDecryptedNotes(e.target.value)}
                          placeholder={locale === "en" ? "Enter private notes about this candidate..." : "أدخل ملاحظات خاصة حول هذا المرشح..."}
                          rows={3}
                          className="text-sm"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          className="flex-1 text-xs"
                          onClick={saveE2EFields}
                        >
                          {locale === "en" ? "Save" : "حفظ"}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 text-xs"
                          onClick={async () => {
                            if (candidate && companyData) {
                              const salary = await decryptField((candidate as any).expected_salary || "", companyData.id);
                              const notes = await decryptField((candidate as any).notes || "", companyData.id);
                              setDecryptedSalary(salary);
                              setDecryptedNotes(notes);
                            }
                            setIsEditingE2E(false);
                          }}
                        >
                          {locale === "en" ? "Cancel" : "إلغاء"}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          </div>

          {/* Left content — Details + AI */}
          <div className="lg:col-span-8 xl:col-span-8 space-y-5 order-last lg:order-first">
            {/* Experience card - always show */}
            <motion.div custom={3} variants={fadeUp} initial="hidden" animate="show" className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
              <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-border/50">
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center">
                      <Activity className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground">الخبرة</span>
                  </div>
                  <p className="text-lg font-bold text-foreground">{candidate.experience || "غير محدد"}</p>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-accent/8 flex items-center justify-center">
                      <GraduationCap className="w-4 h-4 text-accent" />
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground">التعليم</span>
                  </div>
                  <p className="text-lg font-bold text-foreground">{candidate.education || "غير محدد"}</p>
                </div>
              </div>
            </motion.div>

            {/* Summary */}
            {candidate.summary && (
              <motion.div custom={4} variants={fadeUp} initial="hidden" animate="show" className="bg-card rounded-2xl border border-border/50 p-5 shadow-sm">
                <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  الملخص
                </h3>
                <p className="text-sm text-muted-foreground leading-7">{candidate.summary}</p>
              </motion.div>
            )}

            {/* Skills */}
            {(() => {
              const skillsArray = Array.isArray(candidate.skills)
                ? candidate.skills
                : typeof candidate.skills === "string"
                  ? (candidate.skills as string).split(",").map(s => s.trim()).filter(Boolean)
                  : [];
              if (skillsArray.length === 0) return null;
              return (
                <motion.div custom={5} variants={fadeUp} initial="hidden" animate="show" className="bg-card rounded-2xl border border-border/50 p-5 shadow-sm">
                  <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    المهارات
                    <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-normal">{skillsArray.length}</span>
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {skillsArray.map((skill, i) => (
                      <motion.span
                        key={skill}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 + i * 0.03 }}
                        className="px-3 py-1.5 rounded-lg bg-primary/[0.06] text-primary text-xs font-medium border border-primary/10 hover:border-primary/25 hover:bg-primary/[0.1] transition-all cursor-default"
                      >
                        {skill}
                      </motion.span>
                    ))}
                  </div>
                </motion.div>
              );
            })()}

            {/* AI Evaluation */}
            <motion.div custom={6} variants={fadeUp} initial="hidden" animate="show">
              <AIEvaluationCard
                candidateId={candidate.id}
                candidateName={candidate.name}
                existingScore={(candidate as any).ai_score}
                existingEvaluation={(candidate as any).ai_evaluation}
                jobId={candidate.job_id}
              />
            </motion.div>

            {/* Candidate Scorecard Rating */}
            <motion.div custom={6.2} variants={fadeUp} initial="hidden" animate="show">
              <CandidateScorecardSection candidateId={candidate.id} />
            </motion.div>

            {/* Assessment Results */}
            <CandidateAssessmentResults candidateEmail={candidate.email} jobId={candidate.job_id} />

            {/* Stage History Timeline */}
            <StageHistoryTimeline candidateId={candidate.id} />

            {/* Onboarding / Deployment Checklists */}
            <CandidateChecklistPanel candidateId={candidate.id} companyId={(candidate as any).company_id} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
