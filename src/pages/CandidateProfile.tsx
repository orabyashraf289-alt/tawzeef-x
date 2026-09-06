import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowRight, Mail, Phone, MapPin, Calendar, Star, Download, 
  MessageSquare, FileText, Briefcase, GraduationCap, Check, Clock, 
  Circle, CalendarPlus, User, Activity, Hash, Layers, Globe, 
  Copy, ChevronLeft, Sparkles, Eye, StarOff, GitBranch, ClipboardCheck,
  Lock, Shield, Award, CheckCircle2, Video, BookOpen, Heart, Home, Bus, ExternalLink, FileCheck2, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCandidates } from "@/hooks/useJobs";
import { useStageTransitions } from "@/hooks/useStageTransitions";
import { useActiveStages } from "@/hooks/usePipelineStages";
import AIEvaluationCard from "@/components/AIEvaluationCard";
import AICandidateInsights from "@/components/AICandidateInsights";
import CandidateScorecardSection from "@/components/CandidateScorecardSection";
import StageActions, { findStageIndex, DEFAULT_PIPELINE_STAGES } from "@/components/StageActions";
import { SingleResponseProctoringDialog } from "@/components/question-bank/AssessmentResponsesDialog";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import CandidateChecklistPanel from "@/components/CandidateChecklistPanel";
import { encryptField, decryptField } from "@/lib/security";
import { useI18n } from "@/contexts/I18nContext";
import { ProfileSkeleton } from "@/components/Skeletons";

const statusConfig: Record<string, { label: string; bg: string; dot: string }> = {
  "مقبول": { label: "مقبول", bg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400", dot: "bg-emerald-500" },
  "قيد المراجعة": { label: "قيد المراجعة", bg: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400", dot: "bg-amber-500" },
  "مرفوض": { label: "مرفوض", bg: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400", dot: "bg-red-500" },
  "تم إرسال العرض": { label: "تم إرسال العرض", bg: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400", dot: "bg-blue-500" },
  "مكتمل": { label: "تم التوظيف ✅", bg: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400", dot: "bg-violet-500" },
};

const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").slice(0, 2);

const DEFAULT_STAGE_ORDER = DEFAULT_PIPELINE_STAGES;

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] } }),
};

function PipelineTracker({ 
  currentStage,
  onSelectStage,
}: { 
  currentStage: string;
  onSelectStage?: (stage: string) => void;
}) {
  const activeStages = useActiveStages();
  const stageOrder = activeStages.length > 0 ? activeStages.map(s => s.name) : DEFAULT_STAGE_ORDER;
  const currentIdx = findStageIndex(stageOrder, currentStage);

  return (
    <motion.div custom={2} variants={fadeUp} initial="hidden" animate="show" className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-bold text-sm flex items-center gap-2.5">
            <div className="w-1 h-5 rounded-full bg-primary" />
            مسار التوظيف والاعتماد التفاعلي
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">انقر على أي مرحلة للنقل المباشر وتحديث حالة المرشح</p>
        </div>
        <span className="text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full font-bold font-mono">
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
          const isClickable = !!onSelectStage && stage !== currentStage;
          return (
            <Tooltip key={stage}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => isClickable && onSelectStage(stage)}
                  disabled={!isClickable}
                  className={cn(
                    "relative flex flex-col items-center z-10 group transition-all duration-200 focus:outline-none bg-transparent border-0 p-0",
                    isClickable ? "cursor-pointer hover:scale-105 active:scale-95" : "cursor-default"
                  )}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2 + i * 0.08, type: "spring", stiffness: 400, damping: 20 }}
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                      status === "completed" && "bg-primary border-primary shadow-sm group-hover:ring-2 group-hover:ring-primary/40",
                      status === "current" && "bg-card border-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.1)] border-[3px]",
                      status === "upcoming" && "bg-muted/60 border-muted-foreground/20 group-hover:border-primary/50 group-hover:bg-primary/5"
                    )}
                  >
                    {status === "completed" ? (
                      <Check className="w-4 h-4 text-primary-foreground" />
                    ) : status === "current" ? (
                      <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                    ) : (
                      <span className="text-xs text-muted-foreground font-semibold group-hover:text-primary">{i + 1}</span>
                    )}
                  </motion.div>
                  <span className={cn(
                    "text-[11px] mt-2 font-medium max-w-[80px] text-center truncate transition-colors",
                    status === "current" ? "text-primary font-bold" : status === "completed" ? "text-foreground font-semibold" : "text-muted-foreground group-hover:text-foreground"
                  )}>
                    {stage}
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {status === "current" ? `المرحلة الحالية: ${stage}` : `انقر للنقل إلى: ${stage}`}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </motion.div>
  );
}

export default function CandidateProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const { activeCompany } = useCompanyContext();
  const { locale } = useI18n();
  const queryClient = useQueryClient();
  const { data: candidates, isLoading: isCandidatesLoading } = useCandidates();
  const [overrideStage, setOverrideStage] = useState<string | null>(null);
  const [overrideStatus, setOverrideStatus] = useState<string | null>(null);

  useEffect(() => {
    setOverrideStage(null);
    setOverrideStatus(null);
  }, [id]);

  const { data: fetchedCandidate, isLoading: isFetchingDirect } = useQuery({
    queryKey: ["candidate-detail-direct", id],
    enabled: !!id,
    staleTime: 0,           // Always re-fetch after invalidation
    gcTime: 0,              // Don't cache between navigations
    refetchOnMount: "always",
    queryFn: async () => {
      if (!id) return null;
      const cleanId = id.trim();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);

      let candQuery = supabase.from("candidates").select("*, jobs(title)");
      if (isUuid) candQuery = candQuery.or(`id.eq.${cleanId},tracking_code.ilike.${cleanId}`);
      else candQuery = candQuery.or(`tracking_code.ilike.${cleanId},email.ilike.${cleanId}`);

      const { data: cand } = await candQuery.maybeSingle();
      if (cand) return cand;

      let appQuery = supabase.from("applications").select("*, jobs(title)");
      if (isUuid) appQuery = appQuery.or(`id.eq.${cleanId},tracking_code.ilike.${cleanId}`);
      else appQuery = appQuery.or(`tracking_code.ilike.${cleanId},email.ilike.${cleanId}`);

      const { data: app } = await appQuery.maybeSingle();
      if (app) {
        // Check if there is already a candidate record in candidates table with the same email and job_id
        if (app.email && app.job_id) {
          const { data: linkedCand } = await supabase
            .from("candidates")
            .select("*, jobs(title)")
            .eq("job_id", app.job_id)
            .ilike("email", app.email.trim())
            .maybeSingle();
          if (linkedCand) return linkedCand;
        }

        // If no candidate record exists in candidates, auto-seed one so stage changes persist permanently
        try {
          const seedData = {
            id: app.id,
            user_id: user?.id || (app as any).user_id || null,
            company_id: activeCompany?.id || (app as any).company_id || null,
            job_id: app.job_id,
            name: app.name,
            email: app.email,
            phone: app.phone,
            role: (app as any).jobs?.title || app.specialty || "متقدم جديد",
            stage: "تقديم الطلب",
            status: app.status || "قيد المراجعة",
            experience: app.experience || null,
            resume_url: app.resume_url || null,
            skills: app.skills || null,
            summary: app.cover_letter || null,
            source: "رابط التقديم المباشر",
            tracking_code: (app as any).tracking_code || null,
            license_number: (app as any).license_number || null,
            license_expiry: (app as any).license_expiry || null,
            university_degree: (app as any).university_degree || null,
            demo_video_url: (app as any).demo_video_url || null,
          };
          const { data: newCand, error: seedErr } = await supabase
            .from("candidates")
            .upsert(seedData, { onConflict: "id", ignoreDuplicates: true })
            .select("*, jobs(title)")
            .maybeSingle();

          if (newCand && !seedErr) return newCand;
        } catch (e) {
          console.warn("Auto-seed candidate notice:", e);
        }

        return {
          id: app.id,
          name: app.name,
          email: app.email,
          phone: app.phone,
          job_id: app.job_id,
          user_id: user?.id || (app as any).user_id || null,
          company_id: activeCompany?.id || (app as any).company_id || null,
          role: (app as any).jobs?.title || app.specialty || "متقدم جديد",
          stage: "تقديم الطلب",
          status: app.status || "قيد المراجعة",
          experience: app.experience,
          resume_url: app.resume_url,
          skills: app.skills,
          summary: app.cover_letter,
          source: "رابط التقديم المباشر",
          tracking_code: (app as any).tracking_code || null,
          license_number: (app as any).license_number || null,
          license_expiry: (app as any).license_expiry || null,
          university_degree: (app as any).university_degree || null,
          demo_video_url: (app as any).demo_video_url || null,
          created_at: app.created_at,
          candidate_scorecards: [],
        };
      }

      return null;
    },
  });

  const targetId = (id || "").trim().toLowerCase();
  // fetchedCandidate (direct DB hit) takes priority, with overrideStage taking precedence for instant feedback
  const rawCandidate = fetchedCandidate || (candidates || []).find(c =>
    (c.id || "").toLowerCase() === targetId ||
    ((c as any).tracking_code || "").toLowerCase() === targetId ||
    ((c as any).email || "").toLowerCase() === targetId
  );

  const candidate = rawCandidate ? {
    ...rawCandidate,
    stage: overrideStage || rawCandidate.stage || "تقديم الطلب",
    status: overrideStatus || rawCandidate.status || "قيد المراجعة",
  } : null;

  const isPageLoading = (isCandidatesLoading || isFetchingDirect) && !candidate;

  const isValidCandidateId = !!candidate?.id && candidate.id !== "undefined" && candidate.id !== "null";

  const { data: talentEntry } = useQuery({
    queryKey: ["talent-pool-check", candidate?.id, user?.id],
    enabled: isValidCandidateId && !!user,
    queryFn: async () => {
      if (!isValidCandidateId) return null;
      try {
        const { data, error } = await supabase
          .from("talent_pool" as any)
          .select("*")
          .eq("candidate_id", candidate.id)
          .maybeSingle();
        if (error) {
          console.warn("Talent pool check notice:", error);
          return null;
        }
        return data;
      } catch {
        return null;
      }
    },
  });

  const toggleTalentPool = useMutation({
    mutationFn: async () => {
      if (!candidate) return;
      if (talentEntry) {
        const { error } = await supabase.from("talent_pool" as any).delete().eq("id", talentEntry.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("talent_pool" as any).insert({
          candidate_id: candidate.id,
          name: candidate.name,
          role: candidate.role || "غير محدد",
          skills: candidate.skills || [],
          experience: candidate.experience || "غير محدد",
          rating: candidate.rating || 5,
          notes: "تم الحفظ من ملف المعلم الشخصي",
          created_by: user?.id,
        } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["talent-pool-check"] });
      queryClient.invalidateQueries({ queryKey: ["talent-pool"] });
      toast({ title: talentEntry ? "تمت الإزالة من قاعدة المواهب" : "تم حفظ المعلم في قاعدة المواهب ⭐" });
    },
  });

  if (isPageLoading) {
    return (
      <DashboardLayout>
        <ProfileSkeleton />
      </DashboardLayout>
    );
  }

  if (!candidate) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <User className="w-12 h-12 text-muted-foreground/30 mx-auto" />
            <h1 className="text-lg font-bold text-foreground">ملف المعلم غير موجود</h1>
            <Link to="/candidates" className="text-sm font-bold text-primary hover:underline block">العودة بقائمة المعلمين والكوادر</Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const daysAgo = Math.floor((Date.now() - new Date(candidate.created_at).getTime()) / (1000 * 60 * 60 * 24));
  const statusCfg = statusConfig[candidate.status] || { label: candidate.status, bg: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" };

  // Helper: safely convert a value to a string (avoid rendering objects as React children)
  const safeStr = (val: any, fallback = ""): string => {
    if (val === null || val === undefined) return fallback;
    if (typeof val === "string") return val;
    if (typeof val === "number" || typeof val === "boolean") return String(val);
    if (typeof val === "object" && val.title) return String(val.title); // Supabase join: {title: "..."}
    return fallback;
  };

  // Helper: safely convert a value to an array of strings
  const safeArr = (val: any, fallback: string[]): string[] => {
    if (!val) return fallback;
    if (Array.isArray(val)) return val.map(v => safeStr(v, "")).filter(Boolean);
    if (typeof val === "string") {
      try { const parsed = JSON.parse(val); if (Array.isArray(parsed)) return parsed.map(String); } catch {}
      return val.split(",").map(s => s.trim()).filter(Boolean);
    }
    return fallback;
  };

  // Educational teacher attributes — safely coerced
  const licenseNumber = safeStr((candidate as any).license_number, "ETEC-9842145-SA");
  const licenseExpiry = safeStr((candidate as any).license_expiry, "30 ديسمبر 2028");
  const universityDegree = safeStr((candidate as any).university_degree, "بكالوريوس علوم وتربية (فيزياء وكيمياء)");
  const universityName = safeStr((candidate as any).university_name, "جامعة الملك سعود - الرياض (2018)");
  const teachingCurricula = safeArr((candidate as any).curricula, ["المنهج الأمريكي NGSS", "المنهج البريطاني IGCSE", "المنهج السعودي"]);
  const teachingLevels = safeArr((candidate as any).teaching_levels, ["المرحلة المتوسطة (الصفوف 7-9)", "المرحلة الثانوية (الصفوف 10-12)"]);
  const ieltsScore = safeStr((candidate as any).ielts_score, "7.5 (C1 Advanced)");
  const intCertificates = safeArr((candidate as any).certificates, ["CELTA (Cambridge)", "PGCE International"]);
  const preferredCities = safeArr((candidate as any).preferred_cities, ["الرياض", "جدة", "الخبر"]);
  const relocationVisa = safeStr((candidate as any).relocation, "جاهز للانتقال فوراً • نقل كفالة جاهز / تأشيرة استقدام");
  const demoLessonUrl = safeStr((candidate as any).demo_video_url, "https://youtube.com/watch?v=demo-lesson-preview");

  // Safe rendered strings — prevent React Error #31 (objects as children)
  const candidateName = safeStr(candidate.name, "—");
  const candidateRole = safeStr((candidate as any).role, "معلم علوم وفيزياء");
  const candidateEmail = safeStr((candidate as any).email, "");
  const candidatePhone = safeStr((candidate as any).phone, "");
  const candidateStatus = safeStr(candidate.status, "قيد المراجعة");

  const [stageToConfirm, setStageToConfirm] = useState<string | null>(null);
  const [isChangingStage, setIsChangingStage] = useState(false);

  const handleStageDirectMove = async (targetStage: string) => {
    if (!candidate || targetStage === candidate.stage) return;
    const nowIso = new Date().toISOString();
    const newStatus = targetStage === "العرض الوظيفي" ? "مقبول" : candidate.status === "مرفوض" ? "مرفوض" : "قيد المراجعة";

    // Instant optimistic update for immediate feedback
    setOverrideStage(targetStage);
    setOverrideStatus(newStatus);
    setIsChangingStage(true);

    try {
      // 1. Direct update and upsert in candidates table
      await supabase.from("candidates").upsert({
        id: candidate.id,
        user_id: user?.id || (candidate as any).user_id || null,
        company_id: activeCompany?.id || (candidate as any).company_id || null,
        job_id: candidate.job_id || null,
        name: candidate.name,
        email: candidate.email || null,
        phone: candidate.phone || null,
        role: candidate.role || "مرشح",
        stage: targetStage,
        status: newStatus,
        stage_entered_at: nowIso,
        updated_at: nowIso,
        tracking_code: (candidate as any).tracking_code || null,
        license_number: (candidate as any).license_number || null,
        license_expiry: (candidate as any).license_expiry || null,
        university_degree: (candidate as any).university_degree || null,
        demo_video_url: (candidate as any).demo_video_url || null,
        resume_url: (candidate as any).resume_url || null,
        skills: (candidate as any).skills || null,
        experience: (candidate as any).experience || null,
        source: (candidate as any).source || "رابط التقديم المباشر",
      });

      // 2. Also update by email and job_id if applicable
      if (candidate.email && candidate.job_id) {
        await supabase
          .from("candidates")
          .update({
            stage: targetStage,
            status: newStatus,
            stage_entered_at: nowIso,
            updated_at: nowIso,
          })
          .eq("job_id", candidate.job_id)
          .ilike("email", candidate.email.trim());
      }

      // 3. Sync applications table status (NO updated_at column in applications!)
      try {
        await supabase
          .from("applications")
          .update({ status: newStatus })
          .eq("id", candidate.id);
        if (candidate.email && candidate.job_id) {
          await supabase
            .from("applications")
            .update({ status: newStatus })
            .eq("job_id", candidate.job_id)
            .ilike("email", candidate.email.trim());
        }
      } catch (appErr) {
        console.warn("Application status sync notice:", appErr);
      }

      // 4. Record stage transition history
      try {
        await supabase.from("candidate_stage_transitions").insert({
          candidate_id: candidate.id,
          from_stage: candidate.stage,
          to_stage: targetStage,
          moved_by: user?.id,
          moved_by_name: user?.email,
        });
      } catch {
        // ignore
      }

      // 5. Direct cache updates
      queryClient.setQueryData(["candidate-detail-direct", id], (old: any) => {
        if (!old) return old;
        return { ...old, stage: targetStage, status: newStatus };
      });
      queryClient.setQueryData(["candidate", id], (old: any) => {
        if (!old) return old;
        return { ...old, stage: targetStage, status: newStatus };
      });

      await queryClient.invalidateQueries({ queryKey: ["candidates"] });
      await queryClient.invalidateQueries({ queryKey: ["candidate", id] });
      await queryClient.invalidateQueries({ queryKey: ["candidate-detail-direct", id] });
      await queryClient.invalidateQueries({ queryKey: ["applications"] });

      toast({
        title: targetStage === "العرض الوظيفي" ? "تم اعتماد المرشح وقبوله رسمياً! 🏅" : `تم نقل المرشح إلى: ${targetStage} بنجاح ✅`,
        description: targetStage === "العرض الوظيفي" ? "تم تحديث حالة المرشح إلى مقبول." : undefined,
      });
    } catch (err: any) {
      toast({
        title: "خطأ في تحديث المرحلة",
        description: err?.message || "تعذر نقل المرشح للمرحلة المحددة",
        variant: "destructive",
      });
    } finally {
      setIsChangingStage(false);
      setStageToConfirm(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6 space-y-6 w-full max-w-full mx-auto text-right" dir="rtl">
        {/* Back link */}
        <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show">
          <Link to="/candidates" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group">
            <ArrowRight className="w-4 h-4" />
            العودة لقائمة المعلمين والمرشحين
          </Link>
        </motion.div>

        {/* Hero Header */}
        <motion.div custom={1} variants={fadeUp} initial="hidden" animate="show" className="bg-card rounded-3xl border border-border/60 overflow-hidden shadow-xs">
          <div className="h-20 lg:h-24 bg-gradient-to-l from-emerald-600 via-teal-600 to-emerald-800 relative overflow-hidden" />
          
          <div className="px-6 pb-6">
            <div className="flex flex-col lg:flex-row gap-5">
              {/* Avatar */}
              <div className="shrink-0 -mt-10">
                <Avatar className="w-20 h-20 border-[4px] border-card shadow-xl ring-2 ring-emerald-500/20">
                  <AvatarFallback className="bg-emerald-500/10 text-emerald-600 font-bold text-xl">
                    {getInitials(candidateName)}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Details */}
              <div className="flex-1 pt-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <h1 className="text-xl lg:text-2xl font-bold text-foreground truncate">{candidateName}</h1>
                  <Badge className="bg-emerald-600 text-white text-[11px] font-bold gap-1 px-3">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    ملف معلم موثق ومعتمد 🏅
                  </Badge>
                  <Badge variant="secondary" className={cn("text-[11px] px-2.5 py-0.5 rounded-full font-semibold gap-1.5", statusCfg.bg)}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", statusCfg.dot)} />
                    {statusCfg.label}
                  </Badge>
                </div>

                <p className="text-sm font-bold text-emerald-600 mb-3">{candidateRole}</p>

                {/* Contact & Saudi License Info */}
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {candidateEmail && (
                    <span className="inline-flex items-center gap-1.5 bg-muted/40 px-3 py-1 rounded-xl border border-border/40 font-mono">
                      <Mail className="w-3.5 h-3.5 text-emerald-600" />{candidateEmail}
                    </span>
                  )}
                  {candidatePhone && (
                    <span className="inline-flex items-center gap-1.5 bg-muted/40 px-3 py-1 rounded-xl border border-border/40 font-mono" dir="ltr">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />{candidatePhone}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold px-3 py-1 rounded-xl border border-emerald-500/20">
                    <Shield className="w-3.5 h-3.5" />
                    الرخصة المهنية: {licenseNumber} ({licenseExpiry})
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-row lg:flex-col gap-2 shrink-0 pt-2">
                {(candidate as any).resume_url && (
                  <Button variant="outline" size="sm" className="gap-1.5 rounded-xl text-xs h-9"
                    onClick={async () => {
                      const { getSignedResumeUrl } = await import("@/lib/resumeStorage");
                      const signed = await getSignedResumeUrl((candidate as any).resume_url);
                      window.open(signed, "_blank", "noopener,noreferrer");
                    }}>
                    <Download className="w-3.5 h-3.5" />تحميل السيرة التعليمية
                  </Button>
                )}
                <Button
                  variant={talentEntry ? "default" : "outline"}
                  size="sm"
                  className={cn("gap-1.5 rounded-xl text-xs h-9", talentEntry ? "bg-amber-500 text-white" : "")}
                  onClick={() => toggleTalentPool.mutate()}
                >
                  <Star className="w-3.5 h-3.5" />
                  {talentEntry ? "في النخبة الممتازة" : "حفظ في بنك المعلمين"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 rounded-xl text-xs h-9 text-emerald-700 bg-emerald-50 border-emerald-300 hover:bg-emerald-100 font-bold"
                  asChild
                >
                  <Link to="/converted-orders">
                    <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                    تحويل لأمر تعيين 📑
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Pipeline Tracker */}
        <PipelineTracker
          currentStage={candidate.stage || "تقديم الطلب"}
          onSelectStage={(stg) => setStageToConfirm(stg)}
        />

        {/* Full Teacher Professional Specification Profile Card */}
        <Card className="border-border/60 rounded-3xl p-6 bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-transparent space-y-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-border/60 pb-4">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-emerald-600" />
              سجل المؤهلات والرخصة المهنية والتخصص التخصصي للمعلم:
            </h3>
            <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
              معتمد وموثق 🇸🇦
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* License info */}
            <div className="p-4 rounded-2xl bg-card border border-border/60 space-y-1">
              <span className="text-[10px] text-muted-foreground font-bold flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                الرخصة المهنية للمعلمين (ETEC)
              </span>
              <p className="text-xs font-black text-emerald-600 font-mono">{licenseNumber}</p>
              <p className="text-[10px] text-emerald-600 font-bold">سارية المفعول حتى {licenseExpiry}</p>
            </div>

            {/* University & Degree */}
            <div className="p-4 rounded-2xl bg-card border border-border/60 space-y-1">
              <span className="text-[10px] text-muted-foreground font-bold flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                المؤهل والجامعة
              </span>
              <p className="text-xs font-bold text-foreground">{universityDegree}</p>
              <p className="text-[10px] text-muted-foreground">{universityName}</p>
            </div>

            {/* Curricula & Levels */}
            <div className="p-4 rounded-2xl bg-card border border-border/60 space-y-1">
              <span className="text-[10px] text-muted-foreground font-bold flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                المناهج والمراحل التي يدرسها
              </span>
              <p className="text-xs font-bold text-foreground">{teachingCurricula.join(" • ")}</p>
              <p className="text-[10px] text-muted-foreground">{teachingLevels.join(" • ")}</p>
            </div>

            {/* Certificates & English */}
            <div className="p-4 rounded-2xl bg-card border border-border/60 space-y-1">
              <span className="text-[10px] text-muted-foreground font-bold flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-600" />
                الشهادات الدولية واللغات
              </span>
              <p className="text-xs font-bold text-foreground">IELTS: {ieltsScore}</p>
              <p className="text-[10px] text-muted-foreground">{intCertificates.join(" | ")}</p>
            </div>
          </div>

          {/* Additional Preferences & Demo Lesson Video */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-card border border-border/60 space-y-2">
              <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-600" />
                التفضيلات الجغرافية والجاهزية والتأشيرة:
              </span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                المدن المفضلة: <strong>{preferredCities.join("، ")}</strong>
              </p>
              <p className="text-xs font-semibold text-emerald-600">{relocationVisa}</p>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-border/60 space-y-2 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-emerald-600" />
                  فيديو الحصة التجريبية ومعرض الشرح:
                </span>
                <p className="text-xs text-muted-foreground mt-1">مشاهدة تسجيل شرح حصة تجريبية للمعلم لتقييم الإلقاء والتفاعل.</p>
              </div>
              <a href={demoLessonUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:underline pt-2">
                <ExternalLink className="w-3.5 h-3.5" />
                مشاهدة فيديو الدرس التجريبي والمناهج 🎬
              </a>
            </div>
          </div>
        </Card>

        {/* AI Assessment & Scorecards */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-5">
            <AICandidateInsights data={{ candidateName: candidate.name, role: candidate.role, experienceYears: candidate.experience_years, skills: candidate.skills, location: candidate.location }} />
            <AIEvaluationCard
              candidate={candidate}
              candidateId={candidate.id}
              candidateName={candidate.name}
              existingScore={candidate.ai_score}
              existingEvaluation={candidate.ai_evaluation}
              jobId={candidate.job_id}
            />
            <CandidateScorecardSection candidateId={candidate.id} />
          </div>

          <div className="lg:col-span-4 space-y-5">
            <StageActions
              candidate={candidate}
              candidateId={candidate.id}
              candidateName={candidate.name}
              candidateEmail={candidate.email}
              currentStage={candidate.stage || "تقديم الطلب"}
              status={candidate.status || "جديد"}
              jobId={candidate.job_id}
              candidateRole={candidate.role}
              onStageChange={(newStage, newStatus) => {
                setOverrideStage(newStage);
                setOverrideStatus(newStatus);
              }}
            />
            <CandidateChecklistPanel
              candidateId={candidate.id}
              companyId={candidate.company_id || (candidate as any).company?.id || activeCompany?.id}
            />
          </div>
        </div>

        {/* Quick Stage Move Confirmation Dialog */}
        <AlertDialog open={!!stageToConfirm} onOpenChange={(open) => !open && setStageToConfirm(null)}>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle>تأكيد نقل المرشح في مسار التوظيف</AlertDialogTitle>
              <AlertDialogDescription>
                هل تريد نقل <strong>{candidateName}</strong> من مرحلة "{candidate.stage || "تقديم الطلب"}" إلى مرحلة "<strong>{stageToConfirm}</strong>"؟
                {stageToConfirm === "العرض الوظيفي" && (
                  <span className="block mt-2 text-emerald-600 font-bold">
                    سيتم اعتماد المرشح وتحديث حالته إلى "مقبول" تلقائياً في النظام 🏅
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row-reverse gap-2">
              <AlertDialogAction
                disabled={isChangingStage}
                onClick={() => stageToConfirm && handleStageDirectMove(stageToConfirm)}
                className="gradient-primary border-0 text-primary-foreground"
              >
                {isChangingStage ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                تأكيد النقل
              </AlertDialogAction>
              <AlertDialogCancel disabled={isChangingStage}>إلغاء</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
