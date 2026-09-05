import { useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import AddJobDialog from "@/components/AddJobDialog";
import { useUpdateJob, useJobs, useCandidates } from "@/hooks/useJobs";
import SARSymbol from "@/components/SARSymbol";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Briefcase, MapPin, Clock, Users, Calendar, DollarSign, Star, ChevronLeft, Share2, Edit,
  ExternalLink, ArrowLeft, Eye, Phone, Mail, Trash2, QrCode, Search, Linkedin, Brain, Loader2,
  ClipboardCheck, Copy, Check, BarChart3, Link2, Sparkles, UserPlus, GraduationCap, Building2,
  BookOpen, ShieldCheck, Heart, Home, Bus, Award, Sparkle, Workflow, FileText, Download, Video, RefreshCw, Hash
} from "lucide-react";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { SEO } from "@/components/marketing/SEO";
import ShareJobDialog from "@/components/ShareJobDialog";
import { getApplyUrl, getOgApplyUrl } from "@/lib/getPublicUrl";
import { useScreenPermissions } from "@/hooks/useScreenPermissions";
import { useAssessments } from "@/hooks/useQuestionBank";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { parseJobCustomSpecs } from "@/lib/jobSpecsHelper";
import { Progress } from "@/components/ui/progress";
import { useStageMutations, STAGE_TEMPLATES } from "@/hooks/usePipelineStages";

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function JobDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { activeCompany } = useCompanyContext();
  const { hasActionPermission } = useScreenPermissions();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [shareDialog, setShareDialog] = useState({ open: false, jobId: "", jobTitle: "" });
  const [copiedLink, setCopiedLink] = useState(false);
  const [ranking, setRanking] = useState(false);

  // Queries
  const { data: jobs } = useJobs(activeCompany?.id);
  const { data: allCandidates } = useCandidates(activeCompany?.id);
  const updateJobMutation = useUpdateJob();

  const job = jobs?.find(j => j.id === id);

  // Parse custom specifications from job description
  const { cleanDescription, specs, hasSpecs } = useMemo(() => parseJobCustomSpecs(job), [job]);

  // Semantic search recommendations
  const [recs, setRecs] = useState<any[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [hasSearchedRecs, setHasSearchedRecs] = useState(false);

  const fetchRecommendations = async () => {
    if (!id || !job) return;
    setLoadingRecs(true);
    setRecs([]);
    setHasSearchedRecs(true);
    try {
      const searchQuery = `${job.title} ${cleanDescription || ""} ${(job.requirements || []).join(" ")}`;
      const { data, error } = await supabase.functions.invoke("semantic-search-candidates", {
        body: { query: searchQuery.trim(), limit: 15 },
      });
      if (error) throw error;
      const filtered = (data?.results || []).filter((c: any) => c.job_id !== id);
      setRecs(filtered);
    } catch (e: any) {
      toast({ title: "فشل تحميل التوصيات", description: e.message, variant: "destructive" });
    } finally {
      setLoadingRecs(false);
    }
  };

  // Direct candidate query for this specific job with auto-polling
  const { data: directCandidates, refetch: refetchCandidates, isFetching: isFetchingCandidates } = useQuery({
    queryKey: ["job-candidates", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("candidates")
        .select("*, candidate_scorecards(rating)")
        .eq("job_id", id)
        .order("created_at", { ascending: false });
      if (error) {
        console.warn("Could not fetch direct candidates for job:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!id,
    refetchInterval: 10000,
  });

  const { data: applications, refetch: refetchApplications, isFetching: isFetchingApplications } = useQuery({
    queryKey: ["applications", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("*")
        .eq("job_id", id!)
        .order("created_at", { ascending: false });
      if (error) {
        console.warn("Could not fetch applications for job:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!id,
    refetchInterval: 10000,
  });

  // Get candidates linked to this job (combines direct query, activeCompany query, and raw applications)
  const jobCandidates = useMemo(() => {
    const list: any[] = (directCandidates && directCandidates.length > 0)
      ? [...directCandidates]
      : (allCandidates || []).filter(c => c.job_id === id);

    const candEmails = new Set(list.map(c => (c.email || "").toLowerCase().trim()).filter(Boolean));
    const candPhones = new Set(list.map(c => (c.phone || "").replace(/\D/g, "")).filter(Boolean));

    const extraFromApps = (applications || [])
      .filter(a => {
        const emailMatch = a.email && candEmails.has(a.email.toLowerCase().trim());
        const cleanPhone = (a.phone || "").replace(/\D/g, "");
        const phoneMatch = cleanPhone && candPhones.has(cleanPhone);
        return !emailMatch && !phoneMatch;
      })
      .map(a => ({
        id: a.id,
        name: a.name,
        email: a.email,
        phone: a.phone,
        job_id: a.job_id,
        role: a.specialty || job?.title || "متقدم للشاغر",
        stage: "تقديم الطلب",
        status: a.status || "جديد",
        experience: a.experience || null,
        resume_url: a.resume_url || null,
        skills: a.skills || null,
        summary: a.cover_letter || null,
        source: "رابط التقديم المباشر",
        tracking_code: (a as any).tracking_code || null,
        license_number: (a as any).license_number || null,
        license_expiry: (a as any).license_expiry || null,
        university_degree: (a as any).university_degree || null,
        demo_video_url: (a as any).demo_video_url || null,
        created_at: a.created_at,
        candidate_scorecards: [],
        ai_match_score: (a as any).match_score || null,
      }));

    return [...list, ...extraFromApps];
  }, [directCandidates, allCandidates, id, applications, job?.title]);

  const handleAutoRank = async () => {
    if (!id || jobCandidates.length === 0) return;
    setRanking(true);
    try {
      // Small visual delay
      await new Promise(r => setTimeout(r, 1200));
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } });
      toast({ title: "تم ترتيب المرشحين بالذكاء الاصطناعي بنجاح 🏆" });
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally {
      setRanking(false);
    }
  };

  if (!job) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center py-20">
          <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-10 h-10 text-muted-foreground/40" />
          </div>
          <h2 className="text-xl font-bold mb-2">الوظيفة غير موجودة</h2>
          <p className="text-muted-foreground text-sm mb-6">قد تكون الوظيفة حُذفت أو تم نقلها</p>
          <Link to="/jobs"><Button>العودة للوظائف</Button></Link>
        </div>
      </DashboardLayout>
    );
  }

  // Educational Specs dynamically extracted from user's custom specs or company
  const isTeachingJob = job.title.includes("معلم") || job.title.includes("أستاذ") || job.title.includes("مدرس") || job.department.includes("تعليم") || hasSpecs;
  const schoolName = specs.school_name || (job as any).school_name || (job as any).company?.name || activeCompany?.name || "المؤسسة التعليمية";
  const schoolType = specs.school_type || (job as any).school_type || null;
  const curriculum = specs.curriculum || (job as any).curriculum || null;
  const gradeLevel = specs.grade_level || (job as any).grade_level || null;
  const weeklyClasses = specs.weekly_classes || (job as any).weekly_classes || null;
  const benefitsPackage = specs.benefits_package || (job as any).benefits_package || null;
  const workStartDate = specs.work_start_date || (job as any).work_start_date || null;
  const workingHours = specs.working_hours || (job as any).working_hours || null;
  const classSize = specs.class_size || (job as any).class_size || null;
  const applicationDeadline = specs.application_deadline || (job as any).application_deadline || null;

  return (
    <DashboardLayout>
      <SEO 
        title={`شاغر ${job.title} | ${schoolName}`}
        description={`تفاصيل متطلبات التقديم والخبرة لشاغر ${job.title} في ${schoolName} بالمملكة العربية السعودية.`}
        canonical={`https://www.tawzeefx.com/jobs/${job.id}`}
      />
      <div className="p-6 lg:p-8 space-y-6 text-right" dir="rtl">
        {/* Back link */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
          <Link to="/jobs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mb-4">
            <ChevronLeft className="w-4 h-4 rotate-180" />
            العودة لجميع الوظائف الشاغرة
          </Link>
        </motion.div>

        {/* Main Job Hero Header */}
        <motion.div variants={item} initial="hidden" animate="show"
          className="glass-card border border-border/60 rounded-3xl p-6 relative overflow-hidden shadow-xs">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-emerald-600 to-teal-500" />
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                  <GraduationCap className="w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">{job.title}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[11px] font-bold">
                      🏫 {schoolName}
                    </Badge>
                    <Badge variant={job.status === "نشطة" ? "default" : "secondary"} className="text-[10px]">
                      {job.status}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Quick Info Badges */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {schoolType && (
                  <span className="flex items-center gap-1 bg-muted/40 px-3 py-1 rounded-xl border border-border/40 font-semibold">
                    <Building2 className="w-3.5 h-3.5 text-emerald-600" /> {schoolType}
                  </span>
                )}
                {curriculum && (
                  <span className="flex items-center gap-1 bg-muted/40 px-3 py-1 rounded-xl border border-border/40 font-semibold">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-600" /> {curriculum}
                  </span>
                )}
                <span className="flex items-center gap-1 bg-muted/40 px-3 py-1 rounded-xl border border-border/40 font-semibold">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" /> {job.location}
                </span>
                <span className="flex items-center gap-1 bg-muted/40 px-3 py-1 rounded-xl border border-border/40 font-semibold">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  {job.salary_min && job.salary_max ? `${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()} ر.س` : "راتب محدد بحسب المؤهل"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {hasActionPermission("action.edit_jobs") && (
                <Button variant="outline" size="sm" className="gap-1.5 rounded-xl font-bold" onClick={() => setEditDialogOpen(true)}>
                  <Edit className="w-3.5 h-3.5" />تعديل الشاغر
                </Button>
              )}
              <Button variant="outline" size="sm" className="gap-1.5 rounded-xl font-bold" onClick={() => setShareDialog({ open: true, jobId: job.id, jobTitle: job.title })}>
                <Share2 className="w-3.5 h-3.5" />مشاركة رابط المعلمين
              </Button>
              {hasActionPermission("action.delete_jobs") && (
                <Button variant="outline" size="sm" className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5 rounded-xl font-bold"
                  onClick={async () => {
                    if (!window.confirm(`حذف شاغر "${job.title}"؟`)) return;
                    const { error } = await supabase.from("jobs").delete().eq("id", job.id);
                    if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
                    queryClient.invalidateQueries({ queryKey: ["jobs"] });
                    toast({ title: "تم حذف الشاغر 🗑️" });
                    navigate("/jobs");
                  }}>
                  <Trash2 className="w-3.5 h-3.5" />حذف
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Dedicated Educational Specs Box (Rendered dynamically if custom specs exist or it's an educational job) */}
        {(schoolType || curriculum || gradeLevel || weeklyClasses || benefitsPackage || workStartDate) && (
          <Card className="border-border/60 rounded-3xl p-6 bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-transparent space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-600" />
                بطاقة تفاصيل ومواصفات الشاغر التعليمي والمدرسة:
              </h3>
              <Badge className="bg-emerald-600 text-white text-[10px]">مواصفات دقيقة ومكتملة</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(schoolType || curriculum) && (
                <div className="p-3.5 rounded-2xl bg-card border border-border/60 space-y-1">
                  <span className="text-[10px] text-muted-foreground font-bold block">نوع المدرسة والمنهج</span>
                  <p className="text-xs font-bold text-foreground">
                    {schoolType || "مدرسة معتمدة"} {curriculum ? `• ${curriculum}` : ""}
                  </p>
                </div>
              )}

              {(gradeLevel || weeklyClasses) && (
                <div className="p-3.5 rounded-2xl bg-card border border-border/60 space-y-1">
                  <span className="text-[10px] text-muted-foreground font-bold block">المرحلة ونصاب الحصص</span>
                  <p className="text-xs font-bold text-foreground">
                    {gradeLevel || "المرحلة الدراسية"} {weeklyClasses ? `(${weeklyClasses})` : ""}
                  </p>
                </div>
              )}

              {(workStartDate || workingHours) && (
                <div className="p-3.5 rounded-2xl bg-card border border-border/60 space-y-1">
                  <span className="text-[10px] text-muted-foreground font-bold block">تاريخ بدء العمل والمواعيد</span>
                  <p className="text-xs font-bold text-foreground">{workStartDate || "بداية الفصل القادم"}</p>
                  {workingHours && <p className="text-[10px] text-muted-foreground">{workingHours}</p>}
                </div>
              )}
            </div>

            {benefitsPackage && (
              <div className="p-4 rounded-2xl bg-card border border-border/60 space-y-2">
                <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5" />
                  حزمة المزايا والبدلات المعتمدة للمعلم:
                </span>
                <p className="text-xs text-foreground font-semibold leading-relaxed">{benefitsPackage}</p>
                <div className="flex items-center gap-4 text-[10px] text-muted-foreground pt-1 flex-wrap">
                  {classSize && <span>👥 حجم الفصل: <strong>{classSize}</strong></span>}
                  {applicationDeadline && <span>📅 موعد إغلاق التقديم: <strong>{applicationDeadline}</strong></span>}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Tabs Section */}
        <Tabs defaultValue="candidates" dir="rtl">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <TabsList className="bg-muted/70 backdrop-blur-sm rounded-2xl p-1">
              <TabsTrigger value="candidates" className="gap-1.5 text-xs rounded-xl">
                <Users className="w-3.5 h-3.5" />
                المعلمون المتقدمون ({jobCandidates.length})
              </TabsTrigger>
              <TabsTrigger value="applications" className="gap-1.5 text-xs rounded-xl">
                <FileText className="w-3.5 h-3.5" />
                الطلبات الرقمية ({(applications || []).length})
              </TabsTrigger>
              <TabsTrigger value="details" className="gap-1.5 text-xs rounded-xl">
                <Briefcase className="w-3.5 h-3.5" />
                الوصف ومتطلبات التدريس
              </TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  refetchCandidates();
                  refetchApplications();
                  toast({ title: "تم تحديث قائمة المتقدمين 🔄" });
                }}
                disabled={isFetchingCandidates || isFetchingApplications}
                className="h-9 px-3 gap-1.5 text-xs text-muted-foreground hover:text-foreground rounded-xl"
                title="تحديث القائمة الآن"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", (isFetchingCandidates || isFetchingApplications) && "animate-spin text-primary")} />
                <span>تحديث</span>
              </Button>

              {jobCandidates.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleAutoRank} disabled={ranking} className="gap-2 border-primary/30 text-primary hover:bg-primary/5 rounded-xl text-xs h-9">
                  {ranking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                  {ranking ? "جاري الترتيب..." : "ترتيب المعلمين بالـ AI 🏆"}
                </Button>
              )}
            </div>
          </div>

          <TabsContent value="candidates" className="mt-4 space-y-3">
            {jobCandidates.length === 0 ? (
              <Card className="border-border/40 py-16 text-center rounded-3xl">
                <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground font-semibold">لا يوجد طلبات تقدم للمعلمين حتى الآن على هذا الشاغر.</p>
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 rounded-xl text-xs"
                    onClick={() => setShareDialog({ open: true, jobId: job.id, jobTitle: job.title })}
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    مشاركة رابط التقديم لجلب المتقدمين
                  </Button>
                </div>
              </Card>
            ) : (
              jobCandidates.map((c: any) => {
                const scorecardRating = c.candidate_scorecards?.[0]?.rating || c.ai_match_score;
                return (
                  <div key={c.id} className="p-4 rounded-2xl bg-card border border-border/60 hover:border-border transition-all shadow-xs space-y-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-11 h-11 border border-border shadow-xs">
                          <AvatarFallback className="bg-emerald-500/10 text-emerald-600 font-bold text-xs">
                            {(c.name || "معلم").slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-sm text-foreground">{c.name}</p>
                            {c.tracking_code && (
                              <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0">
                                {c.tracking_code}
                              </Badge>
                            )}
                            {scorecardRating && (
                              <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] gap-1">
                                <Sparkles className="w-2.5 h-2.5" />
                                {scorecardRating}% تطابق
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {c.role || "معلم شاغر"} • {c.experience || "خبرة 3+ سنوات"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px] font-bold text-emerald-600 bg-emerald-50/30 border-emerald-200">
                          مرحلة: {c.stage || "تقديم الطلب"}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs gap-1.5 rounded-xl hover:bg-emerald-500/10 hover:text-emerald-600"
                          onClick={() => navigate(`/candidates?id=${c.id}`)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          عرض الملف
                        </Button>
                      </div>
                    </div>

                    {/* Metadata row */}
                    <div className="flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground pt-2 border-t border-border/40">
                      {c.university_degree && (
                        <span className="inline-flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-md text-foreground/80">
                          <GraduationCap className="w-3 h-3 text-emerald-600" />
                          {c.university_degree}
                        </span>
                      )}
                      {c.license_number && (
                        <span className="inline-flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-md text-foreground/80">
                          <Award className="w-3 h-3 text-amber-600" />
                          رخصة مهنية: {c.license_number}
                        </span>
                      )}
                      {c.email && (
                        <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 hover:text-primary transition-colors">
                          <Mail className="w-3 h-3 text-muted-foreground" />
                          {c.email}
                        </a>
                      )}
                      {c.phone && (
                        <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1 hover:text-primary transition-colors" dir="ltr">
                          <Phone className="w-3 h-3 text-muted-foreground" />
                          {c.phone}
                        </a>
                      )}

                      <div className="mr-auto flex items-center gap-2">
                        {c.resume_url && (
                          <a
                            href={c.resume_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline font-medium text-xs bg-primary/5 px-2 py-0.5 rounded-md"
                          >
                            <Download className="w-3 h-3" />
                            السيرة الذاتية
                          </a>
                        )}
                        {c.demo_video_url && (
                          <a
                            href={c.demo_video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-600 hover:underline font-medium text-xs bg-emerald-500/10 px-2 py-0.5 rounded-md"
                          >
                            <Video className="w-3 h-3" />
                            فيديو الحصة
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="applications" className="mt-4 space-y-3">
            {(!applications || applications.length === 0) ? (
              <Card className="border-border/40 py-16 text-center rounded-3xl">
                <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground font-semibold">لا يوجد طلبات تقديم رقمية مسجلة حتى الآن.</p>
                <p className="text-[11px] text-muted-foreground/70 mt-1">عند قيام أي معلم بالتقديم عبر رابط الوظيفة، ستظهر كامل تفاصيل طلبه هنا فوراً.</p>
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 rounded-xl text-xs"
                    onClick={() => setShareDialog({ open: true, jobId: job.id, jobTitle: job.title })}
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    مشاركة رابط التقديم المباشر
                  </Button>
                </div>
              </Card>
            ) : (
              applications.map((app: any) => (
                <Card key={app.id} className="border-border/60 rounded-2xl p-4 shadow-xs space-y-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-foreground">{app.name}</h4>
                        {app.tracking_code && (
                          <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0 gap-1 flex items-center">
                            <Hash className="w-2.5 h-2.5" />
                            {app.tracking_code}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[10px] font-bold text-emerald-600 bg-emerald-50/40">
                          {app.status || "جديد"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {app.specialty || job.title} • {app.experience || "خبرة غير محددة"} • {new Date(app.created_at).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" })}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {app.resume_url && (
                        <a
                          href={app.resume_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 rounded-xl border-primary/30 text-primary hover:bg-primary/5">
                            <Download className="w-3.5 h-3.5" />
                            السيرة الذاتية (CV)
                          </Button>
                        </a>
                      )}
                      {app.demo_video_url && (
                        <a
                          href={app.demo_video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 rounded-xl border-emerald-500/30 text-emerald-600 hover:bg-emerald-50">
                            <Video className="w-3.5 h-3.5" />
                            فيديو الحصة التجريبية
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs bg-muted/40 p-3 rounded-xl">
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <a href={`mailto:${app.email}`} className="text-foreground hover:text-primary truncate">
                        {app.email || "غير محدد"}
                      </a>
                    </div>
                    <div className="flex items-center gap-1.5" dir="ltr">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <a href={`tel:${app.phone}`} className="text-foreground hover:text-primary truncate">
                        {app.phone || "غير محدد"}
                      </a>
                    </div>
                    {app.university_degree && (
                      <div className="flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="text-foreground truncate">{app.university_degree}</span>
                      </div>
                    )}
                    {app.license_number && (
                      <div className="flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="text-foreground truncate">رخصة: {app.license_number}</span>
                      </div>
                    )}
                  </div>

                  {/* Cover Letter if exists */}
                  {app.cover_letter && (
                    <div className="text-xs bg-muted/20 border border-border/40 p-2.5 rounded-xl text-muted-foreground leading-relaxed">
                      <span className="font-semibold text-foreground block mb-0.5">رسالة التقديم / نبذة:</span>
                      {app.cover_letter}
                    </div>
                  )}
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="details" className="mt-4 space-y-6">
            <Card className="border-border/60 rounded-3xl p-6 space-y-4 shadow-xs">
              <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-emerald-600" />
                الوصف الوظيفي المهني وطبيعة العمل:
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {cleanDescription || job.description || "لا يوجد وصف وظيفي محدد لهذا الشاغر."}
              </p>
            </Card>

            <Card className="border-border/60 rounded-3xl p-6 space-y-4 shadow-xs">
              <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Star className="w-4 h-4 text-emerald-600" />
                المؤهلات والمتطلبات الأساسية للوظيفة:
              </h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                {(job.requirements && job.requirements.length > 0 ? job.requirements : [
                  "مؤهل جامعي مناسب في التخصص المطلوب",
                  "خبرة عملية لا تقل عن سنتين إلى ثلاث سنوات",
                  "إتقان مهارات التواصل والعمل ضمن الفريق",
                ]).map((req, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <ShareJobDialog open={shareDialog.open} onClose={() => setShareDialog({ open: false, jobId: "", jobTitle: "" })} jobTitle={shareDialog.jobTitle} jobId={shareDialog.jobId} />

      <AddJobDialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        submitLabel="حفظ تعديلات الشاغر"
        initialData={job ? {
          title: job.title,
          department: job.department,
          location: job.location,
          type: job.type,
          description: job.description || "",
          requirements: Array.isArray(job.requirements) ? job.requirements.join("\n") : (job.requirements || ""),
          salaryMin: job.salary_min?.toString() || "",
          salaryMax: job.salary_max?.toString() || "",
          experience: job.experience_level || "3-5 سنوات",
          ...specs,
        } : null}
        onAdd={(updatedData) => {
          if (!job) return;
          updateJobMutation.mutate(
            {
              id: job.id,
              title: updatedData.title,
              department: updatedData.department,
              location: updatedData.location,
              type: updatedData.type,
              description: updatedData.description,
              requirements: updatedData.requirements ? updatedData.requirements.split("\n").filter(Boolean) : [],
              salary_min: updatedData.salaryMin ? Number(updatedData.salaryMin) : null,
              salary_max: updatedData.salaryMax ? Number(updatedData.salaryMax) : null,
              experience_level: updatedData.experience,
            },
            {
              onSuccess: () => {
                setEditDialogOpen(false);
                toast({ title: "تم تحديث بيانات الشاغر والمواصفات بنجاح ✅" });
                queryClient.invalidateQueries({ queryKey: ["jobs"] });
              },
              onError: (err: any) => {
                toast({ title: "خطأ في التحديث", description: err.message, variant: "destructive" });
              }
            }
          );
        }}
      />
    </DashboardLayout>
  );
}
