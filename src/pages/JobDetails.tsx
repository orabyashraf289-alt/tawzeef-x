import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import AddJobDialog from "@/components/AddJobDialog";
import { useUpdateJob } from "@/hooks/useJobs";
import SARSymbol from "@/components/SARSymbol";
import DashboardLayout from "@/components/DashboardLayout";
import { Briefcase, MapPin, Clock, Users, Calendar, DollarSign, Star, ChevronLeft, Share2, Edit, ExternalLink, ArrowLeft, Eye, Phone, Mail, Trash2, QrCode, Search, Linkedin, Brain, Loader2, ClipboardCheck, Copy, Check, BarChart3, Link2, Sparkles, UserPlus } from "lucide-react";
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

const statusStyles: Record<string, string> = {
  "مقبول": "bg-success/10 text-success",
  "قيد المراجعة": "bg-warning/10 text-warning",
  "مرفوض": "bg-destructive/10 text-destructive",
  "جديد": "bg-info/10 text-info",
};

const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("");

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
  const updateJobMutation = useUpdateJob();
  const { hasActionPermission } = useScreenPermissions();
  const job = (jobs || []).find(j => j.id === id);

  // Job's linked assessments
  const jobAssessments = assessments.filter(a => a.job_id === id);
  const otherAssessments = assessments.filter(a => !a.job_id && a.is_active);

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

  // Link assessment to job mutation
  const linkAssessment = useMutation({
    mutationFn: async (assessmentId: string) => {
      const { error } = await supabase
        .from("assessments")
        .update({ job_id: id } as any)
        .eq("id", assessmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
      toast({ title: "تم ربط الاختبار بالوظيفة بنجاح ✅" });
    },
  });

  // Unlink assessment from job
  const unlinkAssessment = useMutation({
    mutationFn: async (assessmentId: string) => {
      const { error } = await supabase
        .from("assessments")
        .update({ job_id: null } as any)
        .eq("id", assessmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
      toast({ title: "تم إلغاء ربط الاختبار" });
    },
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

  const { applyTemplate } = useStageMutations();
  const [applyingKsa, setApplyingKsa] = useState(false);
  const handleApplyKsaPath = async () => {
    if (!id) return;
    const tpl = STAGE_TEMPLATES.find(t => t.id === "ksa_full");
    if (!tpl) return;
    const ok = window.confirm(
      "سيتم استبدال مراحل البايبلاين الحالية بمسار التوظيف السعودي الكامل (9 مراحل) ونقل جميع مرشحي هذه الوظيفة إلى المرحلة الأولى. متابعة؟"
    );
    if (!ok) return;
    setApplyingKsa(true);
    try {
      await applyTemplate.mutateAsync(tpl.stages.map((s, i) => ({ ...s, sort_order: i })));
      const firstStageName = tpl.stages[0].name;
      const { error: updErr } = await supabase
        .from("candidates")
        .update({ stage: firstStageName })
        .eq("job_id", id);
      if (updErr) throw updErr;
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline_stages"] });
      toast({
        title: "تم تطبيق مسار التوظيف السعودي الكامل ✅",
        description: `${tpl.stages.length} مراحل • ${jobCandidates.length} مرشح تم نقلهم للمرحلة الأولى`,
      });
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally {
      setApplyingKsa(false);
    }
  };

  // AI Candidates recommendation states & mutations
  const [recs, setRecs] = useState<any[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [recExpandedQuery, setRecExpandedQuery] = useState("");
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
      
      // Filter out candidates already assigned to this job
      const filtered = (data?.results || []).filter((c: any) => c.job_id !== id);
      setRecs(filtered);
      setRecExpandedQuery(data?.query_expansion || "");
    } catch (e: any) {
      toast({ title: "فشل تحميل التوصيات", description: e.message, variant: "destructive" });
    } finally {
      setLoadingRecs(false);
    }
  };

  const assignCandidateMutation = useMutation({
    mutationFn: async ({ candidateId, candidateName }: { candidateId: string; candidateName: string }) => {
      let firstStage = "تقديم الطلب";
      try {
        const { data: stages } = await supabase
          .from("pipeline_stages")
          .select("name")
          .eq("user_id", user?.id)
          .order("sort_order", { ascending: true })
          .limit(1);
        if (stages && stages.length > 0) {
          firstStage = stages[0].name;
        }
      } catch (err) {
        console.error("Error fetching first stage:", err);
      }

      const { error } = await supabase
        .from("candidates")
        .update({ job_id: id, stage: firstStage })
        .eq("id", candidateId);

      if (error) throw error;
      return { candidateId, candidateName };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["job-assessment-responses"] });
      
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });

      toast({
        title: `تم ربط المرشح بنجاح 🎉`,
        description: `تم تعيين ${data.candidateName} للوظيفة بنجاح ونقله للمرحلة الأولى.`,
      });

      setRecs(prev => prev.filter(c => c.id !== data.candidateId));
    },
    onError: (e: any) => {
      toast({ title: "فشل ربط المرشح", description: e.message, variant: "destructive" });
    },
  });

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
            <Briefcase className="w-10 h-10 text-muted-foreground/30" />
          </div>
          <h1 className="text-xl font-bold mb-2">الوظيفة غير موجودة</h1>
          <Link to="/jobs" className="text-primary hover:underline">العودة للوظائف</Link>
        </div>
      </DashboardLayout>
    );
  }

  const formatDate = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "اليوم";
    if (days === 1) return "منذ يوم";
    if (days < 7) return `منذ ${days} أيام`;
    return `منذ ${Math.floor(days / 7)} أسابيع`;
  };

  // Match candidate responses
  const getCandidateAssessmentResult = (candidateEmail: string) => {
    return assessmentResponses.find(r => r.candidate_email === candidateEmail);
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Back + Header */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
          <Link to="/jobs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mb-4">
            <ChevronLeft className="w-4 h-4" />
            العودة للوظائف
          </Link>
        </motion.div>

        <motion.div variants={item} initial="hidden" animate="show"
          className="glass-card rounded-xl p-6 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1.5 gradient-primary" />
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                  <Briefcase className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-display font-bold">{job.title}</h1>
                  <Badge variant={job.status === "نشطة" ? "default" : "secondary"}
                    className={cn("mt-1", job.status === "نشطة" ? "bg-success/10 text-success border-0" : "")}>
                    {job.status}
                  </Badge>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {[
                  { icon: Briefcase, text: job.department },
                  { icon: MapPin, text: job.location },
                  { icon: Clock, text: job.type },
                  ...(job.salary_min && job.salary_max ? [{ icon: DollarSign, text: `${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()} ر.س` }] : []),
                  { icon: Calendar, text: formatDate(job.created_at) },
                ].map((info, i) => (
                  <span key={i} className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-lg">
                    <info.icon className="w-3.5 h-3.5 text-primary/60" />{info.text}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {hasActionPermission("action.edit_jobs") && (
                <Button variant="outline" size="sm" className="gap-1.5"
                  onClick={() => setEditDialogOpen(true)}>
                  <Edit className="w-3.5 h-3.5" />تعديل
                </Button>
              )}
              <Button variant="outline" size="sm" className="gap-1.5"
                onClick={() => setShareDialog({ open: true, jobId: job.id, jobTitle: job.title })}>
                <Share2 className="w-3.5 h-3.5" />مشاركة
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5"
                onClick={() => {
                  const ogUrl = getOgApplyUrl(job.id);
                  const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(ogUrl)}`;
                  const w = window.open(shareUrl, '_blank', 'noopener,noreferrer');
                  if (!w) { navigator.clipboard.writeText(getApplyUrl(job.id)); toast({ title: "تم نسخ الرابط - افتح LinkedIn وشاركه يدوياً 📋" }); }
                }}>
                <Linkedin className="w-3.5 h-3.5" />LinkedIn
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
                onClick={handleApplyKsaPath}
                disabled={applyingKsa}
              >
                {applyingKsa ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Workflow className="w-3.5 h-3.5" />}
                تطبيق مسار التوظيف السعودي الكامل
              </Button>
              {hasActionPermission("action.delete_jobs") && (
                <Button variant="outline" size="sm" className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5"
                  onClick={async () => {
                    if (!window.confirm(`حذف وظيفة "${job.title}"؟`)) return;
                    const { error } = await supabase.from("jobs").delete().eq("id", job.id);
                    if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
                    queryClient.invalidateQueries({ queryKey: ["jobs"] });
                    toast({ title: "تم حذف الوظيفة 🗑️" });
                    navigate("/jobs");
                  }}>
                  <Trash2 className="w-3.5 h-3.5" />حذف
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="candidates" dir="rtl">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <TabsList className="bg-muted/70 backdrop-blur-sm">
              <TabsTrigger value="candidates">المرشحون ({jobCandidates.length})</TabsTrigger>
              <TabsTrigger value="applications">الطلبات ({(applications || []).length})</TabsTrigger>
              <TabsTrigger value="assessments">الاختبارات ({jobAssessments.length})</TabsTrigger>
              <TabsTrigger value="recommendations" className="gap-1 flex items-center">
                توصيات المطابقة <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
              </TabsTrigger>
              <TabsTrigger value="details">تفاصيل الوظيفة</TabsTrigger>
            </TabsList>
            {jobCandidates.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleAutoRank} disabled={ranking} className="gap-2 border-primary/30 text-primary hover:bg-primary/5">
                {ranking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                {ranking ? "جاري الترتيب..." : "ترتيب ذكي بالـ AI 🏆"}
              </Button>
            )}
          </div>

          {/* Candidates in pipeline */}
          <TabsContent value="candidates" className="space-y-3 mt-4">
            {jobCandidates.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-muted-foreground/30" />
                </div>
                <p className="text-muted-foreground font-medium">لا يوجد مرشحون في مسار التوظيف</p>
                <p className="text-sm text-muted-foreground/70 mt-1">سيظهر المرشحون هنا تلقائياً عند تقديم طلباتهم</p>
              </motion.div>
            ) : (
              jobCandidates.map((c, i) => {
                const assessmentResult = c.email ? getCandidateAssessmentResult(c.email) : null;
                return (
                  <motion.div key={c.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="glass-card rounded-xl p-4 hover:shadow-lg transition-all group">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-11 h-11 border-2 border-primary/20">
                          <AvatarFallback className="bg-primary/10 text-primary font-display font-bold text-sm">
                            {getInitials(c.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <Link to={`/candidates/${c.id}`} className="font-display font-bold text-sm hover:text-primary transition-colors">
                            {c.name}
                          </Link>
                          <div className="flex items-center gap-2 mt-0.5">
                            {c.email && <span className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</span>}
                            {c.phone && <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{c.stage || "تقديم الطلب"}</Badge>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusStyles[c.status] || statusStyles["جديد"]}`}>
                          {c.status}
                        </span>
                        {(c as any).ai_score != null && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                            AI: {(c as any).ai_score}%
                          </span>
                        )}
                        {/* Assessment result badge */}
                        {assessmentResult && (
                          <span className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5",
                            assessmentResult.status === "completed"
                              ? assessmentResult.percentage >= 70
                                ? "bg-success/10 text-success"
                                : "bg-destructive/10 text-destructive"
                              : "bg-warning/10 text-warning"
                          )}>
                            <ClipboardCheck className="w-3 h-3" />
                            {assessmentResult.status === "completed" ? `${assessmentResult.percentage}%` : "قيد الإجابة"}
                          </span>
                        )}
                        <Link to={`/candidates/${c.id}`}>
                          <Button size="sm" variant="ghost" className="gap-1 text-xs">
                            <Eye className="w-3.5 h-3.5" />مراجعة
                          </Button>
                        </Link>
                      </div>
                    </div>
                    {c.experience && <p className="text-xs text-muted-foreground mt-2 mr-14">الخبرة: {c.experience}</p>}
                  </motion.div>
                );
              })
            )}
          </TabsContent>

          {/* Raw applications */}
          <TabsContent value="applications" className="space-y-3 mt-4">
            {(applications || []).length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-muted-foreground/30" />
                </div>
                <p className="text-muted-foreground font-medium">لا يوجد طلبات حتى الآن</p>
                <p className="text-sm text-muted-foreground/70 mt-1">شارك رابط الوظيفة لاستقبال الطلبات</p>
              </motion.div>
            ) : (
              (applications || []).map((app, i) => (
                <motion.div key={app.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-lg transition-all group">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-11 h-11 border-2 border-primary/20">
                      <AvatarFallback className="bg-primary/10 text-primary font-display font-bold text-sm">
                        {getInitials(app.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-display font-bold text-sm">{app.name}</h3>
                      <p className="text-xs text-muted-foreground">{app.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusStyles[app.status] || statusStyles["جديد"]}`}>
                      {app.status}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatDate(app.created_at)}</span>
                  </div>
                </motion.div>
              ))
            )}
          </TabsContent>

          {/* ─── Assessments Tab ─── */}
          <TabsContent value="assessments" className="space-y-4 mt-4">
            {/* Linked assessments */}
            {jobAssessments.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-primary" /> الاختبارات المرتبطة
                </h3>
                {jobAssessments.map(a => {
                  const responses = assessmentResponses.filter(r => r.assessment_id === a.id);
                  const completed = responses.filter(r => r.status === "completed");
                  const avgScore = completed.length > 0 ? Math.round(completed.reduce((s, r) => s + (r.percentage || 0), 0) / completed.length) : 0;

                  return (
                    <Card key={a.id} className="border-border/50">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-sm">{a.title}</h4>
                              <Badge variant={a.is_active ? "default" : "secondary"} className="text-[10px]">
                                {a.is_active ? "نشط" : "معطّل"}
                              </Badge>
                            </div>
                            {a.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{a.description}</p>}

                            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{a.duration_minutes} دقيقة</span>
                              <span className="flex items-center gap-1"><Check className="w-3 h-3" />حد النجاح: {a.passing_score}%</span>
                              <span className="flex items-center gap-1"><Users className="w-3 h-3" />{responses.length} إجابة</span>
                              {completed.length > 0 && (
                                <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3" />متوسط: {avgScore}%</span>
                              )}
                            </div>

                            {/* Results summary */}
                            {completed.length > 0 && (
                              <div className="mt-3 space-y-1.5">
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="text-muted-foreground">نسبة النجاح</span>
                                  <span className="font-medium">
                                    {Math.round((completed.filter(r => (r.percentage || 0) >= (a.passing_score || 70)).length / completed.length) * 100)}%
                                  </span>
                                </div>
                                <Progress value={Math.round((completed.filter(r => (r.percentage || 0) >= (a.passing_score || 70)).length / completed.length) * 100)} className="h-1.5" />
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button variant="outline" size="sm" className="gap-1 text-xs"
                              onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/assessment/${a.token}`); toast({ title: "تم نسخ رابط الاختبار ✅" }); }}>
                              <Copy className="w-3 h-3" />نسخ الرابط
                            </Button>
                            <Button variant="outline" size="sm" className="gap-1 text-xs"
                              onClick={() => window.open(`/assessment/${a.token}`, "_blank")}>
                              <ExternalLink className="w-3 h-3" />معاينة
                            </Button>
                            <Button variant="ghost" size="sm" className="text-xs text-destructive"
                              onClick={() => unlinkAssessment.mutate(a.id)}>
                              إلغاء الربط
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <ClipboardCheck className="w-8 h-8 text-muted-foreground/30" />
                </div>
                <p className="text-muted-foreground font-medium">لا يوجد اختبارات مرتبطة</p>
                <p className="text-sm text-muted-foreground/70 mt-1">اربط اختبار بهذه الوظيفة لإرساله تلقائياً للمتقدمين</p>
              </motion.div>
            )}

            {/* Link existing assessment */}
            {otherAssessments.length > 0 && (
              <Card className="border-dashed border-primary/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Link2 className="w-4 h-4 text-primary shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">ربط اختبار موجود</p>
                      <p className="text-xs text-muted-foreground">اختر اختبار من القائمة لربطه بهذه الوظيفة</p>
                    </div>
                    <Select onValueChange={v => { if (v && v !== "none") linkAssessment.mutate(v); }}>
                      <SelectTrigger className="w-48 h-8 text-xs">
                        <SelectValue placeholder="اختر اختبار..." />
                      </SelectTrigger>
                      <SelectContent>
                        {otherAssessments.map(a => (
                          <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            )}

            <Button variant="outline" size="sm" className="gap-1.5"
              onClick={() => navigate("/question-bank")}>
              <ClipboardCheck className="w-3.5 h-3.5" /> الذهاب لبنك الأسئلة لإنشاء اختبار جديد
            </Button>

            {/* Responses table */}
            {assessmentResponses.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" /> نتائج الاختبارات ({assessmentResponses.length})
                </h3>
                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-right p-3 text-xs font-medium text-muted-foreground">المرشح</th>
                        <th className="text-right p-3 text-xs font-medium text-muted-foreground">الاختبار</th>
                        <th className="text-center p-3 text-xs font-medium text-muted-foreground">النتيجة</th>
                        <th className="text-center p-3 text-xs font-medium text-muted-foreground">الحالة</th>
                        <th className="text-right p-3 text-xs font-medium text-muted-foreground">التاريخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assessmentResponses.map(r => {
                        const assessment = jobAssessments.find(a => a.id === r.assessment_id);
                        const passed = r.percentage >= (assessment?.passing_score || 70);
                        return (
                          <tr key={r.id} className="border-t border-border/30 hover:bg-muted/30">
                            <td className="p-3">
                              <div>
                                <p className="font-medium text-xs">{r.candidate_name}</p>
                                <p className="text-[10px] text-muted-foreground">{r.candidate_email}</p>
                              </div>
                            </td>
                            <td className="p-3 text-xs text-muted-foreground">{assessment?.title}</td>
                            <td className="p-3 text-center">
                              {r.status === "completed" ? (
                                <span className={cn("font-bold text-xs", passed ? "text-success" : "text-destructive")}>
                                  {r.percentage}%
                                </span>
                              ) : "-"}
                            </td>
                            <td className="p-3 text-center">
                              <Badge variant={r.status === "completed" ? (passed ? "default" : "destructive") : "secondary"} className="text-[10px]">
                                {r.status === "completed" ? (passed ? "ناجح ✅" : "راسب") : "قيد الإجابة"}
                              </Badge>
                            </td>
                            <td className="p-3 text-xs text-muted-foreground">{formatDate(r.created_at)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-4 mt-4">
            <Card className="border-0 bg-gradient-to-r from-primary/5 to-accent/5 overflow-hidden">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-sm text-foreground">توصيات المطابقة الذكية بالذكاء الاصطناعي 🧠</h3>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        يقوم محرك المطابقة بمسح كامل قاعدة بيانات المرشحين ومقارنتها بمتطلبات المسمى الوظيفي والمهارات والوصف الوظيفي لترشيح أفضل الكفاءات.
                      </p>
                    </div>
                  </div>
                  <Button onClick={fetchRecommendations} disabled={loadingRecs} className="gap-2 shrink-0">
                    {loadingRecs ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    {hasSearchedRecs ? "إعادة فحص ومطابقة قاعدة البيانات" : "البحث والمطابقة في قاعدة البيانات"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {loadingRecs ? (
              <div className="text-center py-20 bg-muted/20 rounded-2xl border border-border/30">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">جاري مسح قاعدة بيانات المرشحين...</p>
                <p className="text-xs text-muted-foreground mt-1">يتم الآن تحليل المهارات والخبرات ومطابقتها دلالياً</p>
              </div>
            ) : hasSearchedRecs && recs.length === 0 ? (
              <Card className="border-border/40 py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  <Users className="w-8 h-8 text-muted-foreground/30" />
                </div>
                <h4 className="font-semibold text-sm mb-1">لا توجد توصيات مطابقة إضافية</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  جميع المرشحين المتوافقين في قاعدة البيانات تم تعيينهم بالفعل لهذه الوظيفة أو لا يوجد تطابق كافٍ.
                </p>
              </Card>
            ) : recs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recs.map((c, idx) => {
                  const scorePercent = Math.round(c._score * 100);
                  const isExcellent = scorePercent >= 80;
                  const isGood = scorePercent >= 60;
                  const scoreColor = isExcellent 
                    ? "text-success border-success/30 bg-success/5" 
                    : isGood 
                      ? "text-warning border-warning/30 bg-warning/5" 
                      : "text-muted-foreground border-border bg-muted/5";

                  return (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="glass-card border border-border/40 rounded-2xl p-5 hover:shadow-lg transition-all group flex flex-col justify-between"
                    >
                      <div>
                        {/* Header: Avatar, Name, Score */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-11 h-11 border border-border/50">
                              <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                                {c.name.split(" ").map((n: any) => n[0]).slice(0, 2).join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <Link to={`/candidates/${c.id}`} target="_blank" className="font-bold text-sm hover:text-primary transition-colors block">
                                {c.name}
                              </Link>
                              <p className="text-xs text-muted-foreground mt-0.5">{c.role || "بدون مسمى وظيفي"}</p>
                            </div>
                          </div>

                          <div className={cn("flex flex-col items-center justify-center w-12 h-12 rounded-xl border text-center shrink-0 font-display font-bold text-sm", scoreColor)}>
                            <span>{scorePercent}%</span>
                            <span className="text-[8px] font-normal leading-none">تطابق</span>
                          </div>
                        </div>

                        {/* Location / Experience badges */}
                        <div className="flex flex-wrap gap-2 mt-4">
                          {c.location && <Badge variant="secondary" className="text-[10px] gap-1"><MapPin className="w-3 h-3 text-muted-foreground" />{c.location}</Badge>}
                          {c.experience && <Badge variant="secondary" className="text-[10px] gap-1"><Clock className="w-3 h-3 text-muted-foreground" />{c.experience}</Badge>}
                        </div>

                        {/* Matched Keywords & Skills */}
                        {c._matched && c._matched.length > 0 && (
                          <div className="mt-4">
                            <p className="text-[10px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                              <Check className="w-3.5 h-3.5 text-success" /> مهارات مطابقة:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {c._matched.map((term: string) => (
                                <Badge key={term} variant="outline" className="text-[9px] px-1.5 py-0.5 border-success/30 text-success bg-success/5">
                                  {term}
                                </Badge>
                              ))}
                              {c.skills?.filter((s: string) => !c._matched.includes(s.toLowerCase())).slice(0, 3).map((s: string) => (
                                <Badge key={s} variant="outline" className="text-[9px] px-1.5 py-0.5 border-border text-muted-foreground">
                                  {s}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 mt-6 pt-4 border-t border-border/50">
                        <Button
                          size="sm"
                          className="flex-1 text-xs gap-1.5 h-9"
                          onClick={() => assignCandidateMutation.mutate({ candidateId: c.id, candidateName: c.name })}
                          disabled={assignCandidateMutation.isPending}
                        >
                          {assignCandidateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                          ربط ووظف بالشركة
                        </Button>
                        <Link to={`/candidates/${c.id}`} target="_blank" className="flex-1">
                          <Button size="sm" variant="outline" className="w-full text-xs gap-1 h-9">
                            <Eye className="w-3.5 h-3.5" /> مراجعة السيرة
                          </Button>
                        </Link>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : null}
          </TabsContent>

          <TabsContent value="details" className="mt-4 space-y-6">
            <motion.div variants={item} initial="hidden" animate="show">
              <Card className="border-0 glass-card">
                <CardHeader><CardTitle className="text-base font-display flex items-center gap-2"><Briefcase className="w-4 h-4 text-primary" />الوصف الوظيفي</CardTitle></CardHeader>
                <CardContent><p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{job.description || "لم يتم إضافة وصف بعد"}</p></CardContent>
              </Card>
            </motion.div>
            {job.requirements && job.requirements.length > 0 && (
              <motion.div variants={item} initial="hidden" animate="show" transition={{ delay: 0.1 }}>
                <Card className="border-0 glass-card">
                  <CardHeader><CardTitle className="text-base font-display flex items-center gap-2"><Star className="w-4 h-4 text-primary" />المتطلبات</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="space-y-2.5">
                      {job.requirements.map((req, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                          {req}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            )}
            <motion.div variants={item} initial="hidden" animate="show" transition={{ delay: 0.2 }}>
              <Card className="border-0 glass-card">
                <CardHeader><CardTitle className="text-base font-display flex items-center gap-2"><ExternalLink className="w-4 h-4 text-primary" />رابط التقديم</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                    <code className="text-xs text-muted-foreground flex-1 truncate">{getApplyUrl(job.id)}</code>
                    <Button size="sm" variant="outline" className="text-xs shrink-0"
                      onClick={() => { navigator.clipboard.writeText(getApplyUrl(job.id)); }}>
                      نسخ
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
      <ShareJobDialog open={shareDialog.open} onClose={() => setShareDialog({ open: false, jobId: "", jobTitle: "" })} jobTitle={shareDialog.jobTitle} jobId={shareDialog.jobId} />
      <AddJobDialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        initialData={{
          title: job.title,
          department: job.department,
          location: job.location,
          type: job.type,
          description: job.description || "",
          requirements: (job.requirements || []).join("\n"),
          salaryMin: job.salary_min?.toString() || "",
          salaryMax: job.salary_max?.toString() || "",
          experience: job.experience_level || "",
        }}
        onAdd={(form) => {
          updateJobMutation.mutate({ id: job.id, ...form }, {
            onSuccess: () => setEditDialogOpen(false),
          });
        }}
      />
    </DashboardLayout>
  );
}
