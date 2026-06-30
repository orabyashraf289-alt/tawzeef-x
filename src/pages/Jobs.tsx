import { useState, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Briefcase, MapPin, Clock, Plus, Search, TrendingUp, LayoutGrid, List, QrCode, Archive, RotateCcw, Filter, X, Copy, Pencil, Trash2, Share2, Crown, Linkedin, Calendar, UserCheck, Workflow, Loader2 } from "lucide-react";
import { useStageMutations, STAGE_TEMPLATES } from "@/hooks/usePipelineStages";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AddJobDialog from "@/components/AddJobDialog";
import ShareJobDialog from "@/components/ShareJobDialog";
import JobPreviewDialog, { type JobPreviewData } from "@/components/JobPreviewDialog";
import { useJobs, useAddJob, useCandidates } from "@/hooks/useJobs";
import { useProgressiveRender } from "@/hooks/useProgressiveRender";
import { Users as UsersIcon } from "lucide-react";
import SARSymbol from "@/components/SARSymbol";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { getApplyUrl, getOgApplyUrl } from "@/lib/getPublicUrl";
import { useCanPostJob } from "@/hooks/useSubscription";
import { stagger, fadeUp, cardHover } from "@/lib/motion";
import { useI18n } from "@/contexts/I18nContext";
import { useScreenPermissions } from "@/hooks/useScreenPermissions";
import { downloadJobQR, generateAndStoreJobQR } from "@/lib/qrCodeService";
import { useAuth } from "@/contexts/AuthContext";

const container = stagger(0.05);
const item = fadeUp;

const JOB_TEMPLATES = [
  { title: "مطور واجهات أمامية", department: "الهندسة", type: "دوام كامل", description: "تطوير واجهات المستخدم باستخدام React وTypeScript مع التركيز على الأداء وتجربة المستخدم.", requirements: "خبرة في React/Next.js\nTypeScript\nTailwind CSS\nGit" },
  { title: "مصمم تجربة مستخدم", department: "التصميم", type: "دوام كامل", description: "تصميم تجارب مستخدم متميزة للمنتجات الرقمية مع التركيز على سهولة الاستخدام.", requirements: "Figma/Sketch\nتصميم واجهات\nأبحاث المستخدمين\nPrototyping" },
  { title: "محلل بيانات", department: "البيانات", type: "دوام كامل", description: "تحليل البيانات واستخراج رؤى قابلة للتنفيذ لدعم القرارات الاستراتيجية.", requirements: "Python/SQL\nPower BI/Tableau\nتحليل إحصائي\nExcel متقدم" },
  { title: "مدير مشاريع", department: "الإدارة", type: "دوام كامل", description: "إدارة المشاريع التقنية وضمان التسليم في الوقت المحدد وبالجودة المطلوبة.", requirements: "PMP/Agile\nإدارة الفرق\nJira/Asana\nتواصل فعال" },
];

export default function Jobs() {
  const { t, locale, dir } = useI18n();
  const { user } = useAuth();
  const { data: jobs, isLoading } = useJobs();
  const addJobMutation = useAddJob();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { canPost, remaining, used, limit } = useCanPostJob();
  const { hasActionPermission } = useScreenPermissions();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showArchived, setShowArchived] = useState(false);
  const [shareDialog, setShareDialog] = useState<{ open: boolean; jobTitle: string; jobId: string; isNew: boolean }>({ open: false, jobTitle: "", jobId: "", isNew: false });
  const [templateForm, setTemplateForm] = useState<any>(null);
  const [previewData, setPreviewData] = useState<JobPreviewData | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [ksaApplyingFor, setKsaApplyingFor] = useState<string | null>(null);
  const { applyTemplate } = useStageMutations();

  const handleApplyKsaForJob = async (jobId: string, jobTitle: string) => {
    const tpl = STAGE_TEMPLATES.find(s => s.id === "ksa_full");
    if (!tpl) return;
    if (!window.confirm(`سيتم تطبيق مسار التوظيف السعودي الكامل (9 مراحل) ونقل كل مرشحي "${jobTitle}" إلى المرحلة الأولى. متابعة؟`)) return;
    setKsaApplyingFor(jobId);
    try {
      await applyTemplate.mutateAsync(tpl.stages.map((s, i) => ({ ...s, sort_order: i })));
      const firstStage = tpl.stages[0].name;
      const { error } = await supabase.from("candidates").update({ stage: firstStage }).eq("job_id", jobId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline_stages"] });
      toast({ title: "تم تطبيق المسار السعودي ✅", description: `${tpl.stages.length} مراحل تم إنشاؤها` });
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally {
      setKsaApplyingFor(null);
    }
  };

  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);

  const handleSelectJob = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedJobs(prev => [...prev, id]);
    } else {
      setSelectedJobs(prev => prev.filter(item => item !== id));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedJobs(filteredJobs.map(j => j.id));
    } else {
      setSelectedJobs([]);
    }
  };

  const handleBatchArchive = async (restore = false) => {
    if (selectedJobs.length === 0) return;
    const actionText = restore ? "استعادة" : "أرشفة";
    if (!window.confirm(`هل أنت متأكد من ${restore ? "استعادة" : "أرشفة"} ${selectedJobs.length} وظيفة محددة؟`)) return;
    
    const newStatus = restore ? "نشطة" : "مؤرشفة";
    try {
      const { error } = await supabase.from("jobs").update({ status: newStatus }).in("id", selectedJobs);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      setSelectedJobs([]);
      toast({ title: `تمت عملية ال${actionText} بنجاح ✅`, description: `تم تحديث حالة ${selectedJobs.length} وظيفة.` });
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    }
  };

  const handleBatchDelete = async () => {
    if (selectedJobs.length === 0) return;
    if (!window.confirm(`تحذير: هل أنت متأكد من حذف ${selectedJobs.length} وظيفة محددة نهائياً؟`)) return;

    try {
      const { error } = await supabase.from("jobs").delete().in("id", selectedJobs);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      setSelectedJobs([]);
      toast({ title: "تم الحذف بنجاح ✅", description: "تم إزالة الوظائف المحددة نهائياً." });
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    }
  };

  const handleBatchApplyKsa = async () => {
    if (selectedJobs.length === 0) return;
    const tpl = STAGE_TEMPLATES.find(s => s.id === "ksa_full");
    if (!tpl) return;
    if (!window.confirm(`سيتم تطبيق مسار التوظيف السعودي الكامل ونقل مرشحي ${selectedJobs.length} وظيفة إلى المرحلة الأولى. متابعة؟`)) return;

    try {
      await applyTemplate.mutateAsync(tpl.stages.map((s, i) => ({ ...s, sort_order: i })));
      const firstStage = tpl.stages[0].name;
      const { error } = await supabase.from("candidates").update({ stage: firstStage }).in("job_id", selectedJobs);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline_stages"] });
      setSelectedJobs([]);
      toast({ title: "تم تطبيق المسار السعودي بنجاح ✅", description: "تم تحديث كافة المرشحين للوظائف المحددة." });
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    }
  };


  const { data: candidatesData } = useCandidates();
  const allJobs = jobs || [];
  const allCandidates = candidatesData || [];

  const departments = useMemo(() => [...new Set(allJobs.map(j => j.department))], [allJobs]);
  const jobTypes = useMemo(() => [...new Set(allJobs.map(j => j.type))], [allJobs]);

  // Per-job stats
  const jobStats = useMemo(() => {
    const stats: Record<string, { applicants: number; interviewed: number; hired: number }> = {};
    allJobs.forEach(j => { stats[j.id] = { applicants: 0, interviewed: 0, hired: 0 }; });
    allCandidates.forEach(c => {
      if (c.job_id && stats[c.job_id]) {
        stats[c.job_id].applicants++;
        if (["مقابلة تقنية", "مقابلة نهائية", "العرض الوظيفي"].includes(c.stage || "")) stats[c.job_id].interviewed++;
        if (c.status === "مقبول" || c.status === "مكتمل") stats[c.job_id].hired++;
      }
    });
    return stats;
  }, [allJobs, allCandidates]);

  const filteredJobs = useMemo(() => {
    return allJobs.filter(j => {
      const q = search.trim();
      const matchSearch = !q || j.title.includes(q) || j.department.includes(q) || j.location.includes(q);
      const matchStatus = statusFilter === "all" || j.status === statusFilter;
      const matchDept = departmentFilter === "all" || j.department === departmentFilter;
      const matchType = typeFilter === "all" || j.type === typeFilter;
      const matchArchive = showArchived ? j.status === "مؤرشفة" : j.status !== "مؤرشفة";
      return matchSearch && matchStatus && matchDept && matchType && matchArchive;
    });
  }, [allJobs, search, statusFilter, departmentFilter, typeFilter, showArchived]);

  // Progressive rendering — heavy job cards stay snappy at 100+ openings.
  const visibleJobs = useProgressiveRender(filteredJobs, { initial: 24, batch: 24, threshold: 50 });

  // Step 1: form submit -> open preview (don't post yet)
  const handleAddJob = (form: JobPreviewData) => {
    if (!canPost) {
      toast({ title: t("jobs.exceededLimit"), description: t("jobs.exceededLimitDesc"), variant: "destructive" });
      return;
    }
    setPreviewData(form);
    setDialogOpen(false);
    setPreviewOpen(true);
  };

  // Step 2: confirm from preview -> actually publish (using possibly-edited data from preview)
  const handleConfirmPublish = (finalData: JobPreviewData) => {
    addJobMutation.mutate(finalData, {
      onSuccess: async (data) => {
        await supabase.rpc("increment_job_posts_used" as any, { _user_id: (await supabase.auth.getUser()).data.user?.id });
        queryClient.invalidateQueries({ queryKey: ["my-subscription"] });
        setPreviewOpen(false);
        setPreviewData(null);
        setTemplateForm(null);
        setShareDialog({ open: true, jobTitle: data.title, jobId: data.id, isNew: true });
      },
    });
  };

  // Back from preview to edit
  const handleEditFromPreview = () => {
    if (previewData) setTemplateForm(previewData);
    setPreviewOpen(false);
    setDialogOpen(true);
  };

  const handleArchive = async (jobId: string, restore = false) => {
    const newStatus = restore ? "نشطة" : "مؤرشفة";
    const { error } = await supabase.from("jobs").update({ status: newStatus }).eq("id", jobId);
    if (error) {
      toast({ title: t("common.error", "خطأ"), description: error.message, variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast({ title: restore ? t("jobs.restored_toast") : t("jobs.archived_toast") });
    }
  };

  const handleDelete = async (jobId: string, jobTitle: string) => {
    const confirmed = window.confirm(`${t("jobs.deleteConfirm")} "${jobTitle}"?`);
    if (!confirmed) return;
    const { error } = await supabase.from("jobs").delete().eq("id", jobId);
    if (error) {
      toast({ title: t("common.error", "خطأ"), description: error.message, variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast({ title: t("jobs.deleted_toast") });
    }
  };

  const handleShare = async (jobId: string, jobTitle: string) => {
    const url = getApplyUrl(jobId);
    if (navigator.share) {
      await navigator.share({ title: jobTitle, text: `${t("jobs.applyFor")} ${jobTitle}`, url });
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: t("jobs.shareLinkCopied") });
    }
  };

  const handleQuickQR = async (job: any) => {
    try {
      toast({ title: "جاري تحضير الباركود..." });
      // If no stored QR yet, generate + store it for future
      if (!job.qr_code_url && user) {
        generateAndStoreJobQR({ jobId: job.id, jobTitle: job.title, userId: user.id })
          .then(() => queryClient.invalidateQueries({ queryKey: ["jobs"] }))
          .catch(() => {});
      }
      await downloadJobQR(job.id, job.title);
      toast({ title: "تم تحميل QR ✅" });
    } catch (e: any) {
      toast({ title: "خطأ في توليد QR", description: e.message, variant: "destructive" });
    }
  };

  const handleDuplicate = (job: any) => {
    setTemplateForm({
      title: job.title + " (نسخة)",
      department: job.department,
      location: job.location,
      type: job.type,
      description: job.description || "",
      requirements: (job.requirements || []).join("\n"),
      salaryMin: job.salary_min?.toString() || "",
      salaryMax: job.salary_max?.toString() || "",
      experience: job.experience_level || "",
    });
    setDialogOpen(true);
  };

  const handleUseTemplate = (template: typeof JOB_TEMPLATES[0]) => {
    setTemplateForm({
      title: template.title,
      department: template.department,
      location: "",
      type: template.type,
      description: template.description,
      requirements: template.requirements,
      salaryMin: "",
      salaryMax: "",
      experience: "",
    });
    setTemplateDialogOpen(false);
    setDialogOpen(true);
  };

  const formatDate = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return t("jobs.today");
    if (days === 1) return t("jobs.yesterday");
    if (days < 7) return `${days} ${t("jobs.daysAgo")}`;
    if (days < 30) return `${Math.floor(days / 7)} ${t("jobs.weeksAgo")}`;
    return `${Math.floor(days / 30)} ${t("jobs.monthsAgo")}`;
  };

  const activeCount = allJobs.filter(j => j.status === "نشطة").length;
  const closedCount = allJobs.filter(j => j.status === "مغلقة").length;
  const archivedCount = allJobs.filter(j => j.status === "مؤرشفة").length;
  const hasActiveFilters = departmentFilter !== "all" || typeFilter !== "all";

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-8 space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("jobs.title")}</h1>
            <p className="text-muted-foreground text-sm mt-1">{t("jobs.subtitle")}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setTemplateDialogOpen(true)} className="gap-1.5">
              <Copy className="w-4 h-4" />
              {t("jobs.templates")}
            </Button>
            <Button data-tour="add-job-btn" onClick={() => { setTemplateForm(null); setDialogOpen(true); }} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm">
              <Plus className="w-4 h-4 ml-2" />
              {t("jobs.addJob")}
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: t("jobs.totalJobs"), value: allJobs.filter(j => j.status !== "مؤرشفة").length, color: "text-foreground", bg: "bg-muted/50" },
            { label: t("jobs.activeJobs"), value: activeCount, color: "text-success", bg: "bg-success/10" },
            { label: t("jobs.closedJobs"), value: closedCount, color: "text-muted-foreground", bg: "bg-muted/30" },
            { label: t("jobs.archived"), value: archivedCount, color: "text-warning", bg: "bg-warning/10" },
          ].map((stat, i) => (
            <div key={i} className={`${stat.bg} rounded-xl p-4 border border-border/50`}>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Toolbar */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
          className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)}
                placeholder={t("jobs.searchPlaceholder")}
                className="pr-10 bg-card border-border" />
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <div className="flex bg-muted/50 rounded-lg p-0.5 border border-border/50">
                {["all", "نشطة", "مغلقة"].map(s => (
                  <button key={s} onClick={() => { setStatusFilter(s); setShowArchived(false); }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      statusFilter === s && !showArchived ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}>
                    {s === "all" ? t("common.all") : s === "نشطة" ? t("jobs.active") : t("jobs.closed")}
                  </button>
                ))}
              </div>
              <button onClick={() => { setShowArchived(!showArchived); setStatusFilter("all"); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                  showArchived ? "bg-warning/10 text-warning border-warning/30" : "bg-muted/50 text-muted-foreground border-border/50 hover:text-foreground"
                }`}>
                <Archive className="w-3.5 h-3.5" />
                {t("jobs.showArchived")} {archivedCount > 0 && `(${archivedCount})`}
              </button>
              <div className="flex bg-muted/50 rounded-lg p-0.5 border border-border/50">
                <button onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-md transition-all ${viewMode === "grid" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}>
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}>
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-2 items-center flex-wrap">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue placeholder={t("jobs.department")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("jobs.allDepts")}</SelectItem>
                {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue placeholder={t("jobs.type")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("jobs.allTypes")}</SelectItem>
                {jobTypes.map(t2 => <SelectItem key={t2} value={t2}>{t2}</SelectItem>)}
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <button onClick={() => { setDepartmentFilter("all"); setTypeFilter("all"); }}
                className="flex items-center gap-1 text-xs text-destructive hover:underline">
                <X className="w-3 h-3" /> {t("jobs.clearFilters")}
              </button>
            )}
          </div>
        </motion.div>

        {/* Content */}
        {isLoading ? (
          <div className={viewMode === "grid" ? "grid md:grid-cols-2 xl:grid-cols-3 gap-4" : "space-y-3"}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-card rounded-xl p-5 border border-border/50 animate-pulse">
                <div className="h-4 bg-muted rounded w-1/4 mb-4" />
                <div className="h-5 bg-muted rounded w-2/3 mb-3" />
                <div className="space-y-2"><div className="h-3 bg-muted rounded w-1/2" /><div className="h-3 bg-muted rounded w-1/3" /></div>
              </div>
            ))}
          </div>
        ) : filteredJobs.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20 bg-card rounded-2xl border border-border/50">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              {showArchived ? <Archive className="w-8 h-8 text-primary/50" /> : <Briefcase className="w-8 h-8 text-primary/50" />}
            </div>
            <p className="text-foreground font-semibold mb-1">
              {showArchived ? t("jobs.noArchivedJobs") : t("jobs.noJobs")}
            </p>
            <p className="text-sm text-muted-foreground mb-5">
              {showArchived ? t("jobs.archivedJobsHere") : t("jobs.noJobsDesc")}
            </p>
            {!showArchived && (
              <Button onClick={() => setDialogOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="w-4 h-4 ml-2" />{t("jobs.addJob")}
              </Button>
            )}
          </motion.div>
        ) : viewMode === "grid" ? (
          <motion.div variants={container} initial="hidden" animate="show"
            className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence>
              {visibleJobs.map((job) => (
                <motion.div key={job.id} variants={item} layout whileHover={{ y: -3, transition: { duration: 0.2 } }}>
                  <div className={`bg-card rounded-xl border border-border/50 p-5 hover:shadow-md hover:border-primary/20 transition-all duration-200 group relative ${job.status === "مؤرشفة" ? "opacity-70" : ""}`}>
                    <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-xl bg-gradient-to-l from-primary/60 to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedJobs.includes(job.id)}
                          onChange={(e) => handleSelectJob(job.id, e.target.checked)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 text-primary border-border rounded focus:ring-primary cursor-pointer"
                        />
                        <Badge variant="outline"
                          className={`text-xs ${
                            job.status === "نشطة" ? "bg-success/10 text-success border-success/20" :
                            job.status === "مؤرشفة" ? "bg-warning/10 text-warning border-warning/20" :
                            "bg-muted text-muted-foreground border-border"
                          }`}>
                          {job.status}
                        </Badge>
                      </div>
                      <span className="text-[11px] text-muted-foreground">{formatDate(job.created_at)}</span>
                    </div>

                    <Link to={`/jobs/${job.id}`}
                      className="font-bold text-[15px] text-foreground block mb-3 group-hover:text-primary transition-colors leading-relaxed">
                      {job.title}
                    </Link>

                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2"><Briefcase className="w-3.5 h-3.5 text-primary/50" /><span>{job.department}</span></div>
                      <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-primary/50" /><span>{job.location}</span></div>
                      <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-primary/50" /><span>{job.type}</span></div>
                      {job.salary_min && job.salary_max && (
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-3.5 h-3.5 text-primary/50" />
                          <span className="flex items-center gap-1">{job.salary_min.toLocaleString()} - {job.salary_max.toLocaleString()} <SARSymbol className="w-4 h-4 inline-block" /></span>
                        </div>
                      )}
                    </div>

                    {/* Per-job stats */}
                    {jobStats[job.id] && (
                      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/30">
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><UsersIcon className="w-3 h-3" />{jobStats[job.id].applicants} {t("jobs.applicants", "متقدم")}</span>
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><Calendar className="w-3 h-3" />{jobStats[job.id].interviewed} {t("jobs.interviewed", "مقابلة")}</span>
                        <span className="flex items-center gap-1 text-[11px] text-success"><UserCheck className="w-3 h-3" />{jobStats[job.id].hired} {t("jobs.hiredCount", "تم توظيفه")}</span>
                      </div>
                    )}

                    <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
                      <Link to={`/jobs/${job.id}`} className="text-xs text-primary font-medium hover:underline">{t("jobs.viewDetails")} ←</Link>
                      <div className="flex items-center gap-1">
                        {hasActionPermission("action.edit_jobs") && (
                        <button onClick={(e) => { e.stopPropagation(); navigate(`/jobs/${job.id}`); setDialogOpen(true); handleDuplicate(job); }}
                          className="text-muted-foreground hover:text-primary p-1.5 rounded-lg hover:bg-primary/5 transition-colors" title={t("jobs.editJob")}>
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); const ogUrl = getOgApplyUrl(job.id); const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(ogUrl)}`; const w = window.open(shareUrl, '_blank', 'noopener,noreferrer'); if (!w) { navigator.clipboard.writeText(getApplyUrl(job.id)); toast({ title: t("jobs.copyLinkManual") }); } }}
                          className="text-muted-foreground hover:text-[#0A66C2] p-1.5 rounded-lg hover:bg-[#0A66C2]/5 transition-colors" title={t("jobs.shareToLinkedIn")}>
                          <Linkedin className="w-3.5 h-3.5" />
                        </button>
                        <button data-tour="share-job-btn" onClick={(e) => { e.stopPropagation(); setShareDialog({ open: true, jobTitle: job.title, jobId: job.id, isNew: false }); }}
                          className="text-muted-foreground hover:text-primary p-1.5 rounded-lg hover:bg-primary/5 transition-colors" title={t("jobs.share")}>
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleQuickQR(job); }}
                          className="text-muted-foreground hover:text-primary p-1.5 rounded-lg hover:bg-primary/5 transition-colors" title="تحميل QR">
                          <QrCode className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDuplicate(job); }}
                          className="text-muted-foreground hover:text-primary p-1.5 rounded-lg hover:bg-primary/5 transition-colors" title={t("jobs.duplicate")}>
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleApplyKsaForJob(job.id, job.title); }}
                          disabled={ksaApplyingFor === job.id}
                          className="text-muted-foreground hover:text-primary p-1.5 rounded-lg hover:bg-primary/5 transition-colors disabled:opacity-50" title="تطبيق مسار التوظيف السعودي">
                          {ksaApplyingFor === job.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Workflow className="w-3.5 h-3.5" />}
                        </button>
                        {job.status === "مؤرشفة" ? (
                          <button onClick={(e) => { e.stopPropagation(); handleArchive(job.id, true); }}
                            className="text-muted-foreground hover:text-success p-1.5 rounded-lg hover:bg-success/5 transition-colors" title={t("jobs.restore")}>
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>

                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); handleArchive(job.id); }}
                            className="text-muted-foreground hover:text-warning p-1.5 rounded-lg hover:bg-warning/5 transition-colors" title={t("jobs.archive")}>
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {hasActionPermission("action.delete_jobs") && (
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(job.id, job.title); }}
                          className="text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-destructive/5 transition-colors" title={t("jobs.deleteJob")}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {visibleJobs.length < filteredJobs.length && (
              <div className="col-span-full flex items-center justify-center py-6 text-xs text-muted-foreground gap-2">
                <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                {t("common.loadingMore", `جاري تحميل ${filteredJobs.length - visibleJobs.length} وظيفة إضافية…`)}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div variants={container} initial="hidden" animate="show" className="space-y-2">
            <div className="hidden sm:grid grid-cols-12 gap-4 px-5 py-2.5 text-xs font-medium text-muted-foreground bg-muted/30 rounded-lg border border-border/30">
              <span className="col-span-3 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedJobs.length === filteredJobs.length && filteredJobs.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-4 h-4 text-primary border-border rounded focus:ring-primary cursor-pointer"
                />
                <span>{t("jobs.title", "الوظيفة")}</span>
              </span>
              <span className="col-span-2">{t("jobs.department")}</span>
              <span className="col-span-2">{t("jobs.location")}</span>
              <span className="col-span-1">{t("jobs.type")}</span>
              <span className="col-span-1">{t("jobs.status")}</span>
              <span className="col-span-3 text-center">{t("common.actions")}</span>
            </div>
            <AnimatePresence>
              {visibleJobs.map((job) => (
                <motion.div key={job.id} variants={item} layout
                  className={`bg-card rounded-xl border border-border/50 hover:border-primary/20 hover:shadow-sm transition-all ${job.status === "مؤرشفة" ? "opacity-70" : ""}`}>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 items-center px-5 py-4">
                    <div className="sm:col-span-3 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedJobs.includes(job.id)}
                        onChange={(e) => handleSelectJob(job.id, e.target.checked)}
                        className="w-4 h-4 text-primary border-border rounded focus:ring-primary cursor-pointer"
                      />
                      <div>
                        <Link to={`/jobs/${job.id}`} className="font-semibold text-sm text-foreground hover:text-primary transition-colors">{job.title}</Link>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatDate(job.created_at)}</p>
                      </div>
                    </div>
                    <div className="sm:col-span-2 text-sm text-muted-foreground">{job.department}</div>
                    <div className="sm:col-span-2 text-sm text-muted-foreground">{job.location}</div>
                    <div className="sm:col-span-1 text-xs text-muted-foreground">{job.type}</div>
                    <div className="sm:col-span-1">
                      <Badge variant="outline" className={`text-[10px] ${
                        job.status === "نشطة" ? "bg-success/10 text-success border-success/20" :
                        job.status === "مؤرشفة" ? "bg-warning/10 text-warning border-warning/20" :
                        "bg-muted text-muted-foreground"
                      }`}>{job.status}</Badge>
                    </div>
                    <div className="sm:col-span-3 flex items-center justify-center gap-1.5">
                      <Link to={`/jobs/${job.id}`}><Button variant="ghost" size="sm" className="text-xs h-8">{t("jobs.viewDetails")}</Button></Link>
                      <button onClick={() => setShareDialog({ open: true, jobTitle: job.title, jobId: job.id, isNew: false })} className="text-muted-foreground hover:text-primary p-1.5 rounded-lg hover:bg-primary/5 transition-colors" title={t("jobs.share")}><Share2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleQuickQR(job)} className="text-muted-foreground hover:text-primary p-1.5 rounded-lg hover:bg-primary/5 transition-colors" title="تحميل QR"><QrCode className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDuplicate(job)} className="text-muted-foreground hover:text-primary p-1.5 rounded-lg hover:bg-primary/5 transition-colors" title={t("jobs.duplicate")}><Copy className="w-3.5 h-3.5" /></button>
                      {job.status === "مؤرشفة" ? (
                        <button onClick={() => handleArchive(job.id, true)} className="text-muted-foreground hover:text-success p-1.5 rounded-lg hover:bg-success/5 transition-colors" title={t("jobs.restore")}><RotateCcw className="w-3.5 h-3.5" /></button>
                      ) : (
                        <button onClick={() => handleArchive(job.id)} className="text-muted-foreground hover:text-warning p-1.5 rounded-lg hover:bg-warning/5 transition-colors" title={t("jobs.archive")}><Archive className="w-3.5 h-3.5" /></button>
                      )}
                      {hasActionPermission("action.delete_jobs") && <button onClick={() => handleDelete(job.id, job.title)} className="text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-destructive/5 transition-colors" title={t("jobs.deleteJob")}><Trash2 className="w-3.5 h-3.5" /></button>}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {visibleJobs.length < filteredJobs.length && (
              <div className="flex items-center justify-center py-6 text-xs text-muted-foreground gap-2">
                <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                {t("common.loadingMore", `جاري تحميل ${filteredJobs.length - visibleJobs.length} وظيفة إضافية…`)}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Template Selection Dialog */}
      {templateDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" dir="rtl">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setTemplateDialogOpen(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-card rounded-2xl shadow-lg w-full max-w-lg mx-4 p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">{t("jobs.readyTemplates")}</h2>
              <button onClick={() => setTemplateDialogOpen(false)} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{t("jobs.chooseTemplate")}</p>
            <div className="space-y-3">
              {JOB_TEMPLATES.map((t2, i) => (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => handleUseTemplate(t2)}
                  className="w-full text-right p-4 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">{t2.title}</span>
                    <Badge variant="outline" className="text-[10px]">{t2.department}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">{t2.description}</p>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      <AddJobDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setTemplateForm(null); }} onAdd={handleAddJob} initialData={templateForm} submitLabel="معاينة قبل النشر" />
      {previewData && (
        <JobPreviewDialog
          open={previewOpen}
          onClose={() => { setPreviewOpen(false); setPreviewData(null); }}
          data={previewData}
          onConfirm={handleConfirmPublish}
          onEdit={handleEditFromPreview}
          isPosting={addJobMutation.isPending}
        />
      )}
      <ShareJobDialog open={shareDialog.open} onClose={() => setShareDialog({ open: false, jobTitle: "", jobId: "", isNew: false })} jobTitle={shareDialog.jobTitle} jobId={shareDialog.jobId} isNewJob={shareDialog.isNew} />

      {/* Floating Batch Actions Bar */}
      <AnimatePresence>
        {selectedJobs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 inset-x-4 max-w-xl mx-auto z-40 bg-foreground/95 backdrop-blur-md rounded-2xl shadow-xl border border-border/20 p-4 text-background flex items-center justify-between gap-4"
            dir={dir}
          >
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30 text-xs font-bold">
                {selectedJobs.length}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {locale === "en" ? "selected jobs" : "وظائف محددة"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleBatchArchive(showArchived)}
                className="text-xs hover:bg-background/10 hover:text-white"
              >
                {showArchived ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 ml-1.5" />
                    {locale === "en" ? "Restore" : "استعادة"}
                  </>
                ) : (
                  <>
                    <Archive className="w-3.5 h-3.5 ml-1.5" />
                    {locale === "en" ? "Archive" : "أرشفة"}
                  </>
                )}
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={handleBatchApplyKsa}
                className="text-xs text-primary hover:bg-primary/10 hover:text-primary-foreground"
              >
                <Workflow className="w-3.5 h-3.5 ml-1.5" />
                {locale === "en" ? "Saudi Path" : "المسار السعودي"}
              </Button>

              {hasActionPermission("action.delete_jobs") && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleBatchDelete}
                  className="text-xs h-8"
                >
                  <Trash2 className="w-3.5 h-3.5 ml-1.5" />
                  {locale === "en" ? "Delete" : "حذف"}
                </Button>
              )}

              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedJobs([])}
                className="text-xs p-1 h-8 w-8 hover:bg-background/10 hover:text-white rounded-lg animate-pulse"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
