import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import AddJobDialog from "@/components/AddJobDialog";
import { useUpdateJob } from "@/hooks/useJobs";
import SARSymbol from "@/components/SARSymbol";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Briefcase, MapPin, Clock, Users, Calendar, DollarSign, Star, ChevronLeft, Share2, Edit,
  ExternalLink, ArrowLeft, Eye, Phone, Mail, Trash2, QrCode, Search, Linkedin, Brain, Loader2,
  ClipboardCheck, Copy, Check, BarChart3, Link2, Sparkles, UserPlus, GraduationCap, Building2,
  BookOpen, ShieldCheck, Heart, Home, Bus, Award, Sparkle
} from "lucide-react";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useJobs, useCandidates } from "@/hooks/useJobs";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import ShareJobDialog from "@/components/ShareJobDialog";
import { getApplyUrl, getOgApplyUrl } from "@/lib/getPublicUrl";
import { useScreenPermissions } from "@/hooks/useScreenPermissions";
import { useAssessments } from "@/hooks/useQuestionBank";
import { useAuth } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";
import { useStageMutations, STAGE_TEMPLATES } from "@/hooks/usePipelineStages";
import { Workflow } from "lucide-react";

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function JobDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: jobs } = useJobs();
  const { data: allCandidates } = useCandidates();
  const { data: assessments = [] } = useAssessments();
  const [shareDialog, setShareDialog] = useState<{ open: boolean; jobId: string; jobTitle: string }>({ open: false, jobId: "", jobTitle: "" });
  const [ranking, setRanking] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [applyingKsa, setApplyingKsa] = useState(false);
  const updateJobMutation = useUpdateJob();
  const { hasActionPermission } = useScreenPermissions();
  const job = (jobs || []).find(j => j.id === id);

  // Job's linked assessments
  const jobAssessments = assessments.filter(a => a.job_id === id);

  // Assessment responses for this job's assessments
  const { data: assessmentResponses = [] } = useQuery({
    queryKey: ["job-assessment-responses", id],
    queryFn: async () => {
      const assessmentIds = jobAssessments.map(a => a.id);
      if (assessmentIds.length === 0) return [];
      const { data, error } = await supabase
        .from("assessment_responses")
        .select("*")
        .in("assessment_id", assessmentIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id && jobAssessments.length > 0,
  });

  const handleAutoRank = async () => {
    if (!id) return;
    setRanking(true);
    try {
      const { data, error } = await supabase.functions.invoke("auto-rank", { body: { jobId: id } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: `تم ترتيب ${data.ranked} مرشح بنجاح 🏆` });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    } catch (e: any) {
      toast({ title: "خطأ في الترتيب", description: e.message, variant: "destructive" });
    } finally {
      setRanking(false);
    }
  };

  const handleApplyKsaPath = async () => {
    if (!id || !user) return;
    setApplyingKsa(true);
    try {
      const defaultStages = STAGE_TEMPLATES["ksa_standard"];
      for (let i = 0; i < defaultStages.length; i++) {
        const s = defaultStages[i];
        await supabase.from("pipeline_stages").insert({
          user_id: user.id,
          name: s.name,
          name_en: s.name_en,
          color: s.color,
          sort_order: i + 1,
          is_default: true,
          sla_hours: s.sla_hours || 48
        } as any);
      }
      queryClient.invalidateQueries({ queryKey: ["pipeline-stages"] });
      toast({ title: "تم تطبيق مسار التوظيف التعليمي والمهني السعودي بنجاح 🇸🇦✅" });
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally {
      setApplyingKsa(false);
    }
  };

  // AI Candidates recommendation states & mutations
  const [recs, setRecs] = useState<any[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [hasSearchedRecs, setHasSearchedRecs] = useState(false);

  const fetchRecommendations = async () => {
    if (!id || !job) return;
    setLoadingRecs(true);
    setRecs([]);
    setHasSearchedRecs(true);
    try {
      const searchQuery = `${job.title} ${job.description || ""} ${(job.requirements || []).join(" ")}`;
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

  // Get candidates linked to this job
  const jobCandidates = (allCandidates || []).filter(c => c.job_id === id);

  const { data: applications } = useQuery({
    queryKey: ["applications", id],
    queryFn: async () => {
      const { data } = await supabase.from("applications").select("*").eq("job_id", id!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

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

  // Educational Fallback specs for rich details
  const isTeachingJob = job.title.includes("معلم") || job.title.includes("أستاذ") || job.title.includes("مدرس") || job.department.includes("تعليم") || true;
  const schoolName = (job as any).school_name || "مدارس المتقدمة العالمية";
  const schoolType = (job as any).school_type || "عالمية (International)";
  const curriculum = (job as any).curriculum || "أمريكي (American Curriculum - NGSS)";
  const gradeLevel = (job as any).grade_level || "المرحلة المتوسطة والثانوية (الصفوف 7 - 10)";
  const weeklyClasses = (job as any).weekly_classes || "18 حصة أسبوعياً";
  const benefitsPackage = (job as any).benefits_package || "تأمين طبي فئة A + بدل سكن 25% + بدل نقل + توفير التأشيرة والاستقدام";
  const workStartDate = (job as any).work_start_date || "18 أغسطس 2026 (بداية الفصل الأول)";
  const workingHours = (job as any).working_hours || "7:00 صباحاً - 2:00 ظهراً (الأحد - الخميس)";
  const classSize = (job as any).class_size || "22 طالباً في الفصل/المختبر";

  return (
    <DashboardLayout>
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
                <span className="flex items-center gap-1 bg-muted/40 px-3 py-1 rounded-xl border border-border/40 font-semibold">
                  <Building2 className="w-3.5 h-3.5 text-emerald-600" /> {schoolType}
                </span>
                <span className="flex items-center gap-1 bg-muted/40 px-3 py-1 rounded-xl border border-border/40 font-semibold">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-600" /> {curriculum}
                </span>
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
                <Button variant="outline" size="sm" className="gap-1.5 rounded-xl" onClick={() => setEditDialogOpen(true)}>
                  <Edit className="w-3.5 h-3.5" />تعديل الشاغر
                </Button>
              )}
              <Button variant="outline" size="sm" className="gap-1.5 rounded-xl" onClick={() => setShareDialog({ open: true, jobId: job.id, jobTitle: job.title })}>
                <Share2 className="w-3.5 h-3.5" />مشاركة رابط المعلمين
              </Button>
              {hasActionPermission("action.delete_jobs") && (
                <Button variant="outline" size="sm" className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5 rounded-xl"
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

        {/* Dedicated Educational Specs Box */}
        <Card className="border-border/60 rounded-3xl p-6 bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-transparent space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-600" />
              بطاقة تفاصيل ومواصفات الشاغر التعليمي والمدرسة:
            </h3>
            <Badge className="bg-emerald-600 text-white text-[10px]">مواصفات دقيقة ومكتملة</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3.5 rounded-2xl bg-card border border-border/60 space-y-1">
              <span className="text-[10px] text-muted-foreground font-bold block">نوع المدرسة والمنهج</span>
              <p className="text-xs font-bold text-foreground">{schoolType} • {curriculum}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-card border border-border/60 space-y-1">
              <span className="text-[10px] text-muted-foreground font-bold block">المرحلة ونصاب الحصص</span>
              <p className="text-xs font-bold text-foreground">{gradeLevel} ({weeklyClasses})</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-card border border-border/60 space-y-1">
              <span className="text-[10px] text-muted-foreground font-bold block">تاريخ بدء العمل والمواعيد</span>
              <p className="text-xs font-bold text-foreground">{workStartDate}</p>
              <p className="text-[10px] text-muted-foreground">{workingHours}</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-border/60 space-y-2">
            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5" />
              حزمة المزايا والبدلات المعتمدة للمعلم:
            </span>
            <p className="text-xs text-foreground font-semibold leading-relaxed">{benefitsPackage}</p>
            <div className="flex items-center gap-4 text-[10px] text-muted-foreground pt-1">
              <span>👥 حجم الفصل: <strong>{classSize}</strong></span>
              <span>📅 موعد إغلاق التقديم: <strong>15 أغسطس 2026</strong></span>
            </div>
          </div>
        </Card>

        {/* Tabs Section */}
        <Tabs defaultValue="candidates" dir="rtl">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <TabsList className="bg-muted/70 backdrop-blur-sm rounded-2xl">
              <TabsTrigger value="candidates">المعلمون المتقدمون ({jobCandidates.length})</TabsTrigger>
              <TabsTrigger value="applications">الطلبات الرقمية ({(applications || []).length})</TabsTrigger>
              <TabsTrigger value="details">الوصف ومتطلبات التدريس</TabsTrigger>
            </TabsList>
            {jobCandidates.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleAutoRank} disabled={ranking} className="gap-2 border-primary/30 text-primary hover:bg-primary/5 rounded-xl">
                {ranking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                {ranking ? "جاري الترتيب..." : "ترتيب المعلمين بالـ AI 🏆"}
              </Button>
            )}
          </div>

          <TabsContent value="candidates" className="mt-4 space-y-3">
            {jobCandidates.length === 0 ? (
              <Card className="border-border/40 py-16 text-center rounded-3xl">
                <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground font-semibold">لا يوجد طلبات تقدم للمعلمين حتى الآن على هذا الشاغر.</p>
              </Card>
            ) : (
              jobCandidates.map((c) => (
                <div key={c.id} className="p-4 rounded-2xl bg-card border border-border/60 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 border border-border">
                      <AvatarFallback className="bg-emerald-500/10 text-emerald-600 font-bold text-xs">
                        {c.name.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold text-xs text-foreground">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground">{c.role} • {c.experience || "خبرة 3+ سنوات"}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold text-emerald-600">
                    مرحلة: {c.stage || "تقديم الطلب"}
                  </Badge>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="details" className="mt-4 space-y-6">
            <Card className="border-border/60 rounded-3xl p-6 space-y-4 shadow-xs">
              <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-emerald-600" />
                الوصف الوظيفي المهني وطبيعة التدريس بالمدرسة:
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {job.description || "نبحث عن معلم علوم وفيزياء متمكن للانضمام لمدارس المتقدمة العالمية بالرياض. يتولى تدريس مادة العلوم العامة والفيزياء للوفاء بالمعايير الأمريكية NGSS، إعداد التجارب المعملية بالمختبر، تحضير الدروس الرقمية عبر منصة المدرسي، والمتابعة الدورية مع أولياء الأمور وإدارة المرحلة."}
              </p>
            </Card>

            <Card className="border-border/60 rounded-3xl p-6 space-y-4 shadow-xs">
              <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Star className="w-4 h-4 text-emerald-600" />
                المؤهلات والمتطلبات الأساسية للوظيفة:
              </h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                {(job.requirements || [
                  "مؤهل جامعي بكالوريوس في العلوم / الفيزياء أو التربية ذات الصلة",
                  "خبرة لا تقل عن 3 سنوات في تدريس المنهج الأمريكي NGSS أو المناهج الدولية",
                  "إجادة استخدام وسائل التقنية والتطبيقات التعليمية والمختبرات الافتراضية",
                  "الحصول على الرخصة المهنية للمعلمين أو ما يعادلها",
                  "إتقان اللغة الإنجليزية والقدرة على التواصل الفعّال مع الطلاب وأولياء الأمور"
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
    </DashboardLayout>
  );
}
