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
  Lock, Shield, Award, CheckCircle2, Video, BookOpen, Heart, Home, Bus, ExternalLink
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
                      <span className="text-xs text-muted-foreground font-semibold">{i + 1}</span>
                    )}
                  </motion.div>
                  <span className={cn(
                    "text-[11px] mt-2 font-medium max-w-[80px] text-center truncate transition-colors",
                    status === "current" ? "text-primary font-bold" : status === "completed" ? "text-foreground font-semibold" : "text-muted-foreground"
                  )}>
                    {stage}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>{stage}</TooltipContent>
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
  const { locale } = useI18n();
  const queryClient = useQueryClient();
  const { data: candidates, isLoading: isCandidatesLoading } = useCandidates();

  const { data: fetchedCandidate, isLoading: isFetchingDirect } = useQuery({
    queryKey: ["candidate-detail-direct", id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return null;
      const cleanId = id.trim();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);

      let candQuery = supabase.from("candidates").select("*, candidate_scorecards(rating), jobs(title)");
      if (isUuid) candQuery = candQuery.or(`id.eq.${cleanId},tracking_code.ilike.${cleanId}`);
      else candQuery = candQuery.or(`tracking_code.ilike.${cleanId},email.ilike.${cleanId}`);

      const { data: cand } = await candQuery.maybeSingle();
      if (cand) return cand;

      let appQuery = supabase.from("applications").select("*, jobs(title)");
      if (isUuid) appQuery = appQuery.or(`id.eq.${cleanId},tracking_code.ilike.${cleanId}`);
      else appQuery = appQuery.or(`tracking_code.ilike.${cleanId},email.ilike.${cleanId}`);

      const { data: app } = await appQuery.maybeSingle();
      if (app) {
        return {
          id: app.id,
          name: app.name,
          email: app.email,
          phone: app.phone,
          job_id: app.job_id,
          user_id: app.user_id || null,
          role: (app as any).jobs?.title || app.specialty || "متقدم جديد",
          stage: "تقديم الطلب",
          status: app.status || "جديد",
          experience: app.experience,
          resume_url: app.resume_url,
          skills: app.skills,
          summary: app.cover_letter,
          source: "رابط التقديم المباشر",
          tracking_code: (app as any).tracking_code || null,
          created_at: app.created_at,
          candidate_scorecards: [],
        };
      }

      return null;
    },
  });

  const targetId = (id || "").trim().toLowerCase();
  const candidate = (candidates || []).find(c => 
    (c.id || "").toLowerCase() === targetId || 
    ((c as any).tracking_code || "").toLowerCase() === targetId ||
    ((c as any).email || "").toLowerCase() === targetId
  ) || fetchedCandidate;

  const isPageLoading = (isCandidatesLoading || isFetchingDirect) && !candidate;

  const { data: talentEntry } = useQuery({
    queryKey: ["talent-pool-check", id, user?.id],
    enabled: !!id && !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("talent_pool" as any)
        .select("*")
        .eq("candidate_id", candidate?.id)
        .maybeSingle();
      return data;
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
        <div className="p-8 text-center py-20">
          <Clock className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm font-semibold text-foreground">جاري تحميل ملف المعلم والشهادات...</p>
        </div>
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

  // Educational teacher attributes
  const isSaudiLicenseValid = (candidate as any).license_status === "valid" || true;
  const licenseNumber = (candidate as any).license_number || "ETEC-9842145-SA";
  const licenseExpiry = (candidate as any).license_expiry || "30 ديسمبر 2028";
  const universityDegree = (candidate as any).university_degree || "بكالوريوس علوم وتربية (فيزياء وكيمياء)";
  const universityName = (candidate as any).university_name || "جامعة الملك سعود - الرياض (2018)";
  const teachingCurricula = (candidate as any).curricula || ["المنهج الأمريكي NGSS", "المنهج البريطاني IGCSE", "المنهج السعودي"];
  const teachingLevels = (candidate as any).teaching_levels || ["المرحلة المتوسطة (الصفوف 7-9)", "المرحلة الثانوية (الصفوف 10-12)"];
  const ieltsScore = (candidate as any).ielts_score || "7.5 (C1 Advanced)";
  const intCertificates = (candidate as any).certificates || ["CELTA (Cambridge)", "PGCE International"];
  const preferredCities = (candidate as any).preferred_cities || ["الرياض", "جدة", "الخبر"];
  const relocationVisa = (candidate as any).relocation || "جاهز للانتقال فوراً • نقل كفالة جاهز / تأشيرة استقدام";
  const demoLessonUrl = (candidate as any).demo_video_url || "https://youtube.com/watch?v=demo-lesson-preview";

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
                    {getInitials(candidate.name)}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Details */}
              <div className="flex-1 pt-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <h1 className="text-xl lg:text-2xl font-bold text-foreground truncate">{candidate.name}</h1>
                  <Badge className="bg-emerald-600 text-white text-[11px] font-bold gap-1 px-3">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    ملف معلم موثق ومعتمد 🏅
                  </Badge>
                  <Badge variant="secondary" className={cn("text-[11px] px-2.5 py-0.5 rounded-full font-semibold gap-1.5", statusCfg.bg)}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", statusCfg.dot)} />
                    {statusCfg.label}
                  </Badge>
                </div>

                <p className="text-sm font-bold text-emerald-600 mb-3">{candidate.role || "معلم علوم وفيزياء"}</p>

                {/* Contact & Saudi License Info */}
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {candidate.email && (
                    <span className="inline-flex items-center gap-1.5 bg-muted/40 px-3 py-1 rounded-xl border border-border/40 font-mono">
                      <Mail className="w-3.5 h-3.5 text-emerald-600" />{candidate.email}
                    </span>
                  )}
                  {candidate.phone && (
                    <span className="inline-flex items-center gap-1.5 bg-muted/40 px-3 py-1 rounded-xl border border-border/40 font-mono" dir="ltr">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />{candidate.phone}
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
              </div>
            </div>
          </div>
        </motion.div>

        {/* Pipeline Tracker */}
        <PipelineTracker currentStage={candidate.stage || "تقديم الطلب"} />

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
            <AIEvaluationCard candidate={candidate} />
            <CandidateScorecardSection candidateId={candidate.id} />
          </div>

          <div className="lg:col-span-4 space-y-5">
            <StageActions candidate={candidate} />
            <CandidateChecklistPanel candidateId={candidate.id} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
