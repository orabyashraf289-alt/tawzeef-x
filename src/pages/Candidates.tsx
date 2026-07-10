import { useState, useMemo, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Search, Mail, Phone, Star, UserPlus, Users, UserCheck, UserX, Brain, Sparkles, GitCompareArrows, X, Filter, ArrowUpDown, CheckSquare, Trash2, ArrowRight, Archive, Download, LayoutGrid, List, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useCandidates, usePaginatedCandidates, useJobs } from "@/hooks/useJobs";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { stagger, fadeUp, cardHover } from "@/lib/motion";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/contexts/I18nContext";
import { useScreenPermissions } from "@/hooks/useScreenPermissions";
import { useCompactView } from "@/hooks/useCompactView";
import { useProgressiveRender } from "@/hooks/useProgressiveRender";

const statusStyles: Record<string, string> = {
  "مقبول": "bg-success/10 text-success border-success/20",
  "قيد المراجعة": "bg-warning/10 text-warning border-warning/20",
  "مرفوض": "bg-destructive/10 text-destructive border-destructive/20",
  "مكتمل": "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20",
};

const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("");
const EVAL_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evaluate-candidate`;

const container = stagger(0.05);
const item = fadeUp;

/* ─── Compare Dialog ─── */
function CompareDialog({ candidates, onClose }: { candidates: any[]; onClose: () => void }) {
  if (candidates.length < 2) return null;

  const fields = [
    { label: "الوظيفة", key: "role" },
    { label: "الخبرة", key: "experience" },
    { label: "التعليم", key: "education" },
    { label: "الحالة", key: "status" },
    { label: "المرحلة", key: "stage" },
    { label: "المصدر", key: "source" },
    { label: "التقييم", key: "rating" },
    { label: "تقييم AI", key: "ai_score" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-card rounded-2xl shadow-lg w-full max-w-3xl mx-4 max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card rounded-t-2xl z-10">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <GitCompareArrows className="w-5 h-5 text-primary" />
            مقارنة المرشحين ({candidates.length})
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-right py-3 px-3 text-xs font-semibold text-muted-foreground w-28">المعيار</th>
                  {candidates.map(c => (
                    <th key={c.id} className="py-3 px-3 text-center min-w-[140px]">
                      <Link to={`/candidates/${c.id}`} className="hover:text-primary transition-colors">
                        <Avatar className="w-10 h-10 mx-auto mb-2 border-2 border-border">
                          <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">{getInitials(c.name)}</AvatarFallback>
                        </Avatar>
                        <span className="font-semibold text-xs block">{c.name}</span>
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fields.map(f => (
                  <tr key={f.key} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="py-3 px-3 text-xs font-medium text-muted-foreground">{f.label}</td>
                    {candidates.map(c => {
                      const val = (c as any)[f.key];
                      return (
                        <td key={c.id} className="py-3 px-3 text-center text-xs">
                          {f.key === "ai_score" && val != null ? (
                            <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold",
                              val >= 80 ? "bg-success/10 text-success" : val >= 50 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
                            )}>
                              <Brain className="w-3 h-3" />{val}%
                            </span>
                          ) : f.key === "rating" ? (
                            <div className="flex items-center justify-center gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} className={cn("w-3 h-3", i < (val || 0) ? "fill-warning text-warning" : "text-border")} />
                              ))}
                            </div>
                          ) : f.key === "status" ? (
                            <Badge variant="outline" className={cn("text-[10px]", statusStyles[val] || "")}>{val || "—"}</Badge>
                          ) : (
                            <span className="text-foreground">{val || "—"}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {/* Skills row */}
                <tr className="border-b border-border/50 hover:bg-muted/20">
                  <td className="py-3 px-3 text-xs font-medium text-muted-foreground">المهارات</td>
                  {candidates.map(c => (
                    <td key={c.id} className="py-3 px-3 text-center">
                      <div className="flex flex-wrap justify-center gap-1">
                        {(c.skills || []).slice(0, 4).map((s: string) => (
                          <span key={s} className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-primary/5 text-primary border border-primary/10">{s}</span>
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function Candidates() {
  const { t, locale, dir } = useI18n();
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;
  const { data: candidatesResult, isLoading } = usePaginatedCandidates(page, PAGE_SIZE);
  const candidates = candidatesResult?.data;
  const totalCount = candidatesResult?.count || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const { data: jobs } = useJobs();
  const queryClient = useQueryClient();
  const { hasActionPermission } = useScreenPermissions();
  const { isCompact, toggleCompact } = useCompactView();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [jobFilter, setJobFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [skillFilter, setSkillFilter] = useState("");
  const [aiScoreMin, setAiScoreMin] = useState("");
  const [sortMode, setSortMode] = useState<"recent" | "ai" | "rating">("ai");
  const [autoScreeningRunning, setAutoScreeningRunning] = useState(false);
  const [autoTriggered, setAutoTriggered] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [selectedCandidateForAiSummary, setSelectedCandidateForAiSummary] = useState<any | null>(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);

  const runAutoScreening = async (silent = false) => {
    if (autoScreeningRunning || !candidates?.length) return;
    const targets = candidates.filter(c => (c as any).ai_score == null).slice(0, 12);
    if (targets.length === 0) { if (!silent) toast({ title: "كل المرشحين لديهم تقييم AI بالفعل ✅" }); return; }
    setAutoScreeningRunning(true);
    if (!silent) toast({ title: "بدء الفرز الذكي", description: `جاري تقييم ${targets.length} مرشح تلقائياً...` });
    let successCount = 0;
    for (const candidate of targets) {
      try {
        const resp = await fetch(EVAL_URL, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` }, body: JSON.stringify({ candidateId: candidate.id, jobId: candidate.job_id }) });
        if (!resp.ok) { if (resp.status === 429) { toast({ title: "تم تجاوز الحد", variant: "destructive" }); break; } if (resp.status === 402) { toast({ title: "الرصيد غير كافٍ", variant: "destructive" }); break; } continue; }
        successCount++;
      } catch { /* continue */ }
    }
    await queryClient.invalidateQueries({ queryKey: ["candidates"] });
    setAutoScreeningRunning(false);
    if (!silent) toast({ title: "اكتمل الفرز الذكي ✅", description: `تم تقييم ${successCount} مرشح.` });
  };

  useEffect(() => {
    if (!autoTriggered && candidates && candidates.some(c => (c as any).ai_score == null)) { setAutoTriggered(true); runAutoScreening(true); }
  }, [autoTriggered, candidates]);

  const allJobs = jobs || [];
  const stages = useMemo(() => [...new Set((candidates || []).map(c => c.stage).filter(Boolean))], [candidates]);

  const allSkills = useMemo(() => {
    const skills = new Set<string>();
    (candidates || []).forEach(c => (c.skills || []).forEach((s: string) => skills.add(s)));
    return [...skills].sort();
  }, [candidates]);

  const [aiPrompt, setAiPrompt] = useState("");

  const filtered = useMemo(() => {
    let base = candidates || [];
    
    // 1. Apply AI Prompt Filter if active
    if (aiPrompt.trim()) {
      const prompt = aiPrompt.toLowerCase();
      
      // Parse numeric thresholds (e.g. > 80, >= 75)
      const gtMatch = prompt.match(/(?:>|أكبر من|أعلى من)\s*(\d+)/);
      const gtScore = gtMatch ? parseInt(gtMatch[1]) : null;
      
      const ltMatch = prompt.match(/(?:<|أصغر من|أقل من)\s*(\d+)/);
      const ltScore = ltMatch ? parseInt(ltMatch[1]) : null;

      base = base.filter(c => {
        // Text keywords match name, role, email, skills, experience, education, source
        const textToSearch = [
          c.name,
          c.role,
          c.email,
          ...(c.skills || []),
          c.experience,
          c.education,
          c.source,
          c.status,
          c.stage
        ].join(" ").toLowerCase();

        // Check if any keyword in prompt matches
        // We can split prompt into tokens except numeric condition tokens
        const tokens = prompt
          .replace(/(?:>|<|أكبر من|أعلى من|أصغر من|أقل من)\s*\d+/, "")
          .split(/\s+/)
          .filter(t => t.length > 1);

        const matchesTokens = tokens.length === 0 || tokens.every(token => textToSearch.includes(token));
        
        let matchesScore = true;
        if (gtScore !== null) {
          matchesScore = ((c as any).ai_score ?? 0) >= gtScore;
        } else if (ltScore !== null) {
          matchesScore = ((c as any).ai_score ?? 0) <= ltScore;
        }
        
        return matchesTokens && matchesScore;
      });
    }

    // 2. Apply standard filters
    base = base.filter(c => {
      const q = search.trim();
      const matchSearch = !q || 
        c.name.toLowerCase().includes(q.toLowerCase()) || 
        (c.role || "").toLowerCase().includes(q.toLowerCase()) || 
        (c.email || "").toLowerCase().includes(q.toLowerCase()) ||
        (c.experience || "").toLowerCase().includes(q.toLowerCase()) ||
        (c.education || "").toLowerCase().includes(q.toLowerCase()) ||
        (c.source || "").toLowerCase().includes(q.toLowerCase()) ||
        (c.skills || []).some((s: string) => s.toLowerCase().includes(q.toLowerCase()));
      const matchStatus = statusFilter === "all" || c.status === statusFilter;
      const matchJob = jobFilter === "all" || c.job_id === jobFilter;
      const matchStage = stageFilter === "all" || c.stage === stageFilter;
      const matchSkill = !skillFilter || (c.skills || []).some((s: string) => s.includes(skillFilter));
      const matchAiScore = !aiScoreMin || ((c as any).ai_score ?? 0) >= parseInt(aiScoreMin);
      return matchSearch && matchStatus && matchJob && matchStage && matchSkill && matchAiScore;
    });

    if (sortMode === "ai") return [...base].sort((a, b) => ((b as any).ai_score ?? -1) - ((a as any).ai_score ?? -1));
    if (sortMode === "rating") return [...base].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    return [...base].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  }, [candidates, search, statusFilter, jobFilter, stageFilter, sortMode, skillFilter, aiScoreMin, aiPrompt]);

  // Progressive rendering: show first 30 instantly, expand in idle frames.
  // Avoids 50-100ms blocking paint when filtering large pages.
  const visibleFiltered = useProgressiveRender(filtered, { initial: 30, batch: 30, threshold: 60 });

  const toggleCompare = useCallback((id: string) => {
    setSelectedForCompare(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 4 ? [...prev, id] : prev);
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const selectAllFiltered = useCallback(() => {
    setSelectedIds(prev =>
      prev.size === filtered.length ? new Set() : new Set(filtered.map(c => c.id))
    );
  }, [filtered]);

  const bulkUpdateStatus = useCallback(async (newStatus: string) => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    const { error } = await supabase
      .from("candidates")
      .update({ status: newStatus })
      .in("id", [...selectedIds]);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `تم تحديث ${selectedIds.size} مرشح ✅` });
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    }
    setBulkLoading(false);
  }, [selectedIds, queryClient]);

  const bulkUpdateStage = useCallback(async (newStage: string) => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    const { error } = await supabase
      .from("candidates")
      .update({ stage: newStage })
      .in("id", [...selectedIds]);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `تم نقل ${selectedIds.size} مرشح إلى "${newStage}" ✅` });
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    }
    setBulkLoading(false);
  }, [selectedIds, queryClient]);

  const bulkAIScreen = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const ids = [...selectedIds];
    const targets = (candidates || []).filter(c => ids.includes(c.id));
    if (targets.length === 0) return;
    setBulkLoading(true);
    toast({ title: "بدء الفرز الذكي الجماعي", description: `جاري تقييم ${targets.length} مرشح...` });
    let okCount = 0, failCount = 0;
    for (const c of targets) {
      try {
        const resp = await fetch(EVAL_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ candidateId: c.id, jobId: c.job_id }),
        });
        if (!resp.ok) {
          if (resp.status === 429) { toast({ title: "تم تجاوز الحد", variant: "destructive" }); break; }
          if (resp.status === 402) { toast({ title: "الرصيد غير كافٍ", variant: "destructive" }); break; }
          failCount++; continue;
        }
        const data = await resp.json();
        const qualified = (data?.score ?? 0) >= 60;
        await supabase
          .from("candidates")
          .update({ status: qualified ? "مؤهل مبدئياً" : "غير مؤهل مبدئياً" })
          .eq("id", c.id);
        okCount++;
      } catch { failCount++; }
    }
    await queryClient.invalidateQueries({ queryKey: ["candidates"] });
    setBulkLoading(false);
    setSelectedIds(new Set());
    toast({
      title: "اكتمل الفرز الجماعي ✅",
      description: `نجح: ${okCount}${failCount ? ` • فشل: ${failCount}` : ""}`,
    });
  }, [selectedIds, candidates, queryClient]);


  const statusCounts = useMemo(() => {
    const list = candidates || [];
    let accepted = 0, reviewing = 0, rejected = 0, hired = 0;
    for (const c of list) {
      if (c.status === "مقبول") accepted++;
      else if (c.status === "قيد المراجعة") reviewing++;
      else if (c.status === "مرفوض") rejected++;
      else if (c.status === "مكتمل") hired++;
    }
    return { accepted, reviewing, rejected, hired };
  }, [candidates]);
  const { accepted, reviewing, rejected, hired } = statusCounts;
  const hasActiveFilters = jobFilter !== "all" || stageFilter !== "all" || !!skillFilter || !!aiScoreMin;

  const compareList = (candidates || []).filter(c => selectedForCompare.includes(c.id));

  const handleExportExcel = () => {
    import("xlsx").then(XLSX => {
      const exportData = filtered.map(c => ({
        "الاسم": c.name,
        "الوظيفة": c.role || "",
        "البريد": c.email || "",
        "الهاتف": c.phone || "",
        "الحالة": c.status,
        "المرحلة": c.stage || "",
        "تقييم AI": (c as any).ai_score ?? "",
        "التقييم": c.rating || 0,
        "المهارات": (c.skills || []).join(", "),
        "الخبرة": c.experience || "",
        "المصدر": c.source || "",
        "التعليم": c.education || "",
        "تاريخ التقديم": new Date(c.created_at).toLocaleDateString("ar-SA"),
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "المرشحون");
      XLSX.writeFile(wb, `المرشحون_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast({ title: `تم تصدير ${exportData.length} مرشح بنجاح ✅` });
    });
  };

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-8 space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("candidates.title")}</h1>
            <p className="text-muted-foreground text-sm mt-1">{locale === "en" ? "AI-powered automated resume screening & evaluation" : "فرز وتقييم تلقائي للسير الذاتية بالذكاء الاصطناعي"}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={toggleCompact} className="gap-1.5" title={isCompact ? "عرض عادي" : "عرض مدمج"}>
              {isCompact ? <LayoutGrid className="w-4 h-4" /> : <List className="w-4 h-4" />}
            </Button>
            {filtered.length > 0 && (
              <Button size="sm" variant="outline" onClick={handleExportExcel} className="gap-1.5">
                <Download className="w-4 h-4" />
                {locale === "en" ? "Export" : "تصدير Excel"}
              </Button>
            )}
            {selectedForCompare.length >= 2 && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                <Button size="sm" onClick={() => setShowCompare(true)} className="gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90">
                  <GitCompareArrows className="w-4 h-4" />
                  {t("candidates.compare")} ({selectedForCompare.length})
                </Button>
              </motion.div>
            )}
            {selectedForCompare.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedForCompare([])} className="text-xs text-muted-foreground">
                {t("common.cancel")}
              </Button>
            )}
            <Button size="sm" onClick={() => runAutoScreening()} disabled={autoScreeningRunning} data-tour="smart-screening-btn">
              <Sparkles className="w-4 h-4 ml-1" />
              {autoScreeningRunning ? t("candidates.screening") : t("candidates.smartScreening")}
            </Button>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: t("candidates.total"), value: (candidates || []).length, icon: Users, color: "text-foreground", bg: "bg-muted/50" },
            { label: t("status.accepted"), value: accepted, icon: UserCheck, color: "text-success", bg: "bg-success/10" },
            { label: t("status.reviewing"), value: reviewing, icon: Users, color: "text-warning", bg: "bg-warning/10" },
            { label: t("status.rejected"), value: rejected, icon: UserX, color: "text-destructive", bg: "bg-destructive/10" },
            { label: "تم التوظيف", value: hired, icon: UserCheck, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-500/10" },
          ].map((stat, i) => (
            <div key={i} className={`${stat.bg} rounded-xl p-4 border border-border/50`}>
              <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="space-y-3">
          {/* AI Smart Prompt Filter Bar */}
          <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 space-y-3 relative overflow-hidden" dir={dir}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full pointer-events-none translate-x-8 -translate-y-8" />
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              <h4 className="text-xs font-bold text-foreground">
                {locale === "en" ? "AI Natural Language Prompt Filter" : "منظف الفلترة الذكي بالذكاء الاصطناعي"}
              </h4>
            </div>
            <div className="relative">
              <Brain className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/70" />
              <Input
                placeholder={locale === "en" ? "Filter by writing prompts e.g. 'React developer with score > 80' or 'Accepted Figma design'..." : "فلتر بكتابة أي جملة مثل: 'مطور React بتقييم > 80' أو 'قيد المراجعة في التصميم'..."}
                className="pr-10 bg-card border-border/80 focus:border-primary/50 text-xs"
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
              />
              {aiPrompt && (
                <button
                  onClick={() => setAiPrompt("")}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-md hover:bg-muted"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {/* Suggestion Chips */}
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] text-muted-foreground">
                {locale === "en" ? "Try prompt suggestions:" : "جرب كتابة:"}
              </span>
              {[
                { label: "React > 80", text: "React > 80" },
                { label: locale === "en" ? "Figma Reviewing" : "Figma قيد المراجعة", text: "Figma قيد المراجعة" },
                { label: locale === "en" ? "Accepted Score > 75" : "مقبول تقييم > 75", text: "مقبول تقييم > 75" },
                { label: locale === "en" ? "Experience with Python" : "خبرة Python", text: "خبرة Python" }
              ].map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => setAiPrompt(chip.text)}
                  className="px-2 py-0.5 rounded-md bg-card hover:bg-primary/5 hover:text-primary text-[10px] text-muted-foreground border border-border/60 transition-colors"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder={t("candidates.searchPlaceholder")} className="pr-10 bg-card border-border" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <div className="flex bg-muted/50 rounded-lg p-0.5 border border-border/50">
                {[
                  { value: "all", label: t("common.all") },
                  { value: "مقبول", label: t("status.accepted") },
                  { value: "قيد المراجعة", label: t("status.reviewing") },
                  { value: "مرفوض", label: t("status.rejected") },
                  { value: "مكتمل", label: "تم التوظيف" },
                ].map(s => (
                  <button key={s.value} onClick={() => setStatusFilter(s.value)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    statusFilter === s.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}>
                    {s.label}
                  </button>
                ))}
              </div>
              {/* Sort */}
              <Select value={sortMode} onValueChange={(v: any) => setSortMode(v)}>
                <SelectTrigger className="w-[130px] h-8 text-xs gap-1">
                  <ArrowUpDown className="w-3 h-3" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ai">{t("candidates.sortByAI")}</SelectItem>
                  <SelectItem value="rating">{t("candidates.sortByRating")}</SelectItem>
                  <SelectItem value="recent">{t("candidates.sortByRecent")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Advanced filters */}
          <div className="flex gap-2 items-center flex-wrap">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            {allJobs.length > 0 && (
              <Select value={jobFilter} onValueChange={setJobFilter}>
                <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="الوظيفة" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("candidates.allJobs")}</SelectItem>
                  {allJobs.map(j => <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {stages.length > 0 && (
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue placeholder="المرحلة" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("candidates.allStages")}</SelectItem>
                  {stages.map(s => <SelectItem key={s!} value={s!}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {allSkills.length > 0 && (
              <Select value={skillFilter || "none"} onValueChange={v => setSkillFilter(v === "none" ? "" : v)}>
                <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="المهارة" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{locale === "en" ? "All Skills" : "كل المهارات"}</SelectItem>
                  {allSkills.slice(0, 20).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Input
              placeholder="AI ≥"
              value={aiScoreMin}
              onChange={e => setAiScoreMin(e.target.value.replace(/\D/g, ""))}
              className="w-[80px] h-8 text-xs text-center"
            />
            {hasActiveFilters && (
              <button onClick={() => { setJobFilter("all"); setStageFilter("all"); setSkillFilter(""); setAiScoreMin(""); }}
                className="flex items-center gap-1 text-xs text-destructive hover:underline">
                <X className="w-3 h-3" /> {locale === "en" ? "Clear filters" : "مسح الفلاتر"}
              </button>
            )}
          </div>

          {/* Bulk Actions Bar */}
          <AnimatePresence>
            {selectedIds.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                className="flex items-center gap-2 flex-wrap bg-primary/5 border border-primary/20 rounded-xl p-3"
              >
                <CheckSquare className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">{selectedIds.size} {t("common.selected")}</span>
                <div className="h-4 w-px bg-border mx-1" />
                <Select onValueChange={v => bulkUpdateStage(v)}>
                  <SelectTrigger className="w-[150px] h-8 text-xs gap-1" disabled={bulkLoading}>
                    <ArrowRight className="w-3 h-3" />
                    <span>{t("candidates.bulkMoveStage")}</span>
                  </SelectTrigger>
                  <SelectContent>
                    {["تقديم الطلب", "مراجعة السيرة", "فحص هاتفي", "مقابلة تقنية", "مقابلة نهائية", "العرض الوظيفي"].map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {hasActionPermission("action.edit_candidates") && (
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1 text-destructive hover:bg-destructive/10" onClick={() => bulkUpdateStatus("مرفوض")} disabled={bulkLoading}>
                    <Trash2 className="w-3 h-3" />{t("candidates.bulkReject")}
                  </Button>
                )}
                {hasActionPermission("action.edit_candidates") && (
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => bulkUpdateStatus("مقبول")} disabled={bulkLoading}>
                    <UserCheck className="w-3 h-3" />{t("candidates.bulkAccept")}
                  </Button>
                )}
                <Button size="sm" className="h-8 text-xs gap-1 bg-gradient-to-l from-primary to-primary/80 text-primary-foreground" onClick={bulkAIScreen} disabled={bulkLoading}>
                  <Sparkles className="w-3 h-3" />فرز AI جماعي
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground" onClick={() => setSelectedIds(new Set())}>
                  {t("common.cancel")}
                </Button>

              </motion.div>
            )}
          </AnimatePresence>

          {/* Select All */}
          {filtered.length > 0 && (
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedIds.size === filtered.length && filtered.length > 0}
                onCheckedChange={selectAllFiltered}
              />
              <span className="text-xs text-muted-foreground">{t("common.selectAll")} ({filtered.length})</span>
            </div>
          )}
        </motion.div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-card rounded-xl p-5 border border-border/50 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-full bg-muted" />
                  <div className="space-y-2 flex-1"><div className="h-4 bg-muted rounded w-2/3" /><div className="h-3 bg-muted rounded w-1/3" /></div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-20 bg-card rounded-2xl border border-border/50">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <UserPlus className="w-8 h-8 text-primary/50" />
            </div>
            <p className="text-foreground font-semibold mb-1">{t("candidates.noCandidates")}</p>
            <p className="text-sm text-muted-foreground">{t("candidates.noCandidatesDesc")}</p>
          </motion.div>
        ) : (
          <motion.div variants={container} initial="hidden" animate="show" className={cn(
            isCompact ? "space-y-1" : "grid sm:grid-cols-2 xl:grid-cols-3 gap-4"
          )}>
            <AnimatePresence>
              {visibleFiltered.map((c) => {
                const isCompareSelected = selectedForCompare.includes(c.id);
                const isBulkSelected = selectedIds.has(c.id);

                if (isCompact) {
                  return (
                    <motion.div key={c.id} variants={item} className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg border transition-all group",
                      isBulkSelected ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border/50 hover:bg-muted/50"
                    )}>
                      <Checkbox checked={isBulkSelected} onCheckedChange={() => toggleSelect(c.id)} className="data-[state=checked]:bg-primary" />
                      <Avatar className="w-8 h-8 border border-border">
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-[10px]">{getInitials(c.name)}</AvatarFallback>
                      </Avatar>
                      <Link to={`/candidates/${c.id}`} className="font-medium text-sm text-foreground hover:text-primary transition-colors min-w-[120px]">{c.name}</Link>
                      <span className="text-xs text-muted-foreground hidden sm:block min-w-[100px]">{c.role}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${statusStyles[c.status] || "bg-muted text-muted-foreground border-border"}`}>{c.status}</span>
                      {c.stage && <span className="text-[10px] text-muted-foreground hidden md:block">{c.stage}</span>}
                      {(c as any).ai_score != null ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedCandidateForAiSummary(c); }}
                          className={cn("flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors hover:opacity-85",
                            (c as any).ai_score >= 80 ? "bg-success/10 text-success border-success/20" :
                            (c as any).ai_score >= 50 ? "bg-warning/10 text-warning border-warning/20" :
                            "bg-destructive/10 text-destructive border-destructive/20"
                          )}
                          title="عرض ملخص الذكاء الاصطناعي"
                        >
                          <Brain className="w-3 h-3 text-primary" />{(c as any).ai_score}%
                        </button>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedCandidateForAiSummary(c); }}
                          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border border-border/80 text-muted-foreground hover:bg-primary/5 hover:text-primary transition-colors"
                          title="فرز بالذكاء الاصطناعي"
                        >
                          <Brain className="w-3 h-3" />—
                        </button>
                      )}
                      {(() => {
                        const teamAvg = c.candidate_scorecards && c.candidate_scorecards.length > 0
                          ? (() => {
                              const sum = c.candidate_scorecards.reduce((acc: number, s: any) => acc + s.rating, 0);
                              return { avg: (sum / c.candidate_scorecards.length).toFixed(1), count: c.candidate_scorecards.length };
                            })()
                          : null;
                        return teamAvg ? (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded-full mr-2" title="تقييم فريق العمل">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                            {teamAvg.avg} ({teamAvg.count})
                          </div>
                        ) : null;
                      })()}
                      <div className="flex items-center gap-0.5 mr-auto">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={cn("w-3 h-3", i < (c.rating || 0) ? "fill-warning text-warning" : "text-border")} />
                        ))}
                      </div>
                      <div className="flex gap-1">
                        {c.email && <a href={`mailto:${c.email}`} className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-primary"><Mail className="w-3 h-3" /></a>}
                        {c.phone && <a href={`tel:${c.phone}`} className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-primary"><Phone className="w-3 h-3" /></a>}
                      </div>
                    </motion.div>
                  );
                }

                return (
                  <motion.div key={c.id} variants={item} whileHover={{ y: -3, transition: { duration: 0.2 } }}>
                    <div className={cn(
                      "bg-card rounded-xl p-5 border transition-all group relative",
                      isBulkSelected ? "border-primary shadow-md ring-2 ring-primary/20" :
                      isCompareSelected ? "border-accent shadow-md ring-2 ring-accent/20" : "border-border/50 hover:shadow-md hover:border-primary/20"
                    )}>
                      {/* Selection checkboxes */}
                      <div className="absolute top-3 left-3 flex items-center gap-1.5">
                        <Checkbox
                          checked={isBulkSelected}
                          onCheckedChange={() => toggleSelect(c.id)}
                          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <Checkbox
                          checked={isCompareSelected}
                          onCheckedChange={() => toggleCompare(c.id)}
                          className="data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                          title="إضافة للمقارنة"
                        />
                      </div>

                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-11 h-11 border-2 border-border group-hover:border-primary/30 transition-colors">
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">{getInitials(c.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <Link to={`/candidates/${c.id}`} className="font-semibold text-sm text-foreground hover:text-primary transition-colors block">{c.name}</Link>
                            <p className="text-xs text-muted-foreground mt-0.5">{c.role}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 mb-3 flex-wrap">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={cn("w-3.5 h-3.5", i < (c.rating || 0) ? "fill-warning text-warning" : "text-border")} />
                        ))}
                        <span className="text-[11px] text-muted-foreground mr-1">({c.rating || 0}/5)</span>

                        {(() => {
                          const teamAvg = c.candidate_scorecards && c.candidate_scorecards.length > 0
                            ? (() => {
                                const sum = c.candidate_scorecards.reduce((acc: number, s: any) => acc + s.rating, 0);
                                return { avg: (sum / c.candidate_scorecards.length).toFixed(1), count: c.candidate_scorecards.length };
                              })()
                            : null;
                          return teamAvg ? (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full mr-2" title="تقييم فريق العمل">
                              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                              <span>تقييم الفريق: {teamAvg.avg} ({teamAvg.count})</span>
                            </div>
                          ) : null;
                        })()}
                      </div>

                      {c.skills && c.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {c.skills.slice(0, 3).map((skill: string) => (
                            <span key={skill} className="px-2 py-0.5 rounded-md bg-primary/5 text-primary text-[11px] font-medium border border-primary/10">{skill}</span>
                          ))}
                          {c.skills.length > 3 && <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-[11px]">+{c.skills.length - 3}</span>}
                        </div>
                      )}

                      {c.stage && (
                        <p className="text-[11px] text-muted-foreground mb-2">
                          {t("candidates.stage")}: <span className="font-medium text-foreground">{c.stage}</span>
                        </p>
                      )}

                      {c.experience && <p className="text-xs text-muted-foreground mb-3">{t("candidates.experience")}: {c.experience}</p>}

                      <div className="flex items-center justify-between pt-3 border-t border-border/50">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${statusStyles[c.status] || "bg-muted text-muted-foreground border-border"}`}>
                            {c.status}
                          </span>
                          {(c as any).ai_score != null ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedCandidateForAiSummary(c); }}
                              className={cn(
                                "flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold border transition-colors hover:opacity-85",
                                (c as any).ai_score >= 80 ? "bg-success/10 text-success border-success/20" :
                                (c as any).ai_score >= 50 ? "bg-warning/10 text-warning border-warning/20" :
                                "bg-destructive/10 text-destructive border-destructive/20"
                              )}
                              title="عرض ملخص الذكاء الاصطناعي"
                            >
                              <Brain className="w-3 h-3 text-primary" />
                              {(c as any).ai_score}%
                            </button>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedCandidateForAiSummary(c); }}
                              className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium border border-border/80 text-muted-foreground hover:bg-primary/5 hover:text-primary transition-colors"
                              title="فرز بالذكاء الاصطناعي"
                            >
                              <Brain className="w-3 h-3" />
                              —
                            </button>
                          )}
                        </div>
                        <div className="flex gap-1.5">
                          {c.email && (
                            <a href={`mailto:${c.email}`} className="w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all">
                              <Mail className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {c.phone && (
                            <a href={`tel:${c.phone}`} className="w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all">
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {visibleFiltered.length < filtered.length && (
              <div className="col-span-full flex items-center justify-center py-6 text-xs text-muted-foreground gap-2">
                <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                {locale === "en"
                  ? `Loading ${filtered.length - visibleFiltered.length} more…`
                  : `جاري تحميل ${filtered.length - visibleFiltered.length} مرشح إضافي…`}
              </div>
            )}
          </motion.div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>{t("pagination.prev")}</Button>
            <span className="text-sm text-muted-foreground">{t("common.page")} {page + 1} {t("common.of")} {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>{t("pagination.next")}</Button>
          </div>
        )}
      </div>

      {showCompare && compareList.length >= 2 && (
        <CompareDialog candidates={compareList} onClose={() => setShowCompare(false)} />
      )}

      {/* AI CV Summary Side Sheet */}
      <AnimatePresence>
        {selectedCandidateForAiSummary && (
          <div className="fixed inset-0 z-50 flex justify-end" dir="rtl">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
              onClick={() => setSelectedCandidateForAiSummary(null)}
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative bg-card w-full max-w-md h-full shadow-2xl p-6 overflow-y-auto border-r border-border flex flex-col z-10"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-border mb-5">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  <h3 className="font-display font-bold text-base">تحليل السيرة الذاتية بالذكاء الاصطناعي</h3>
                </div>
                <button
                  onClick={() => setSelectedCandidateForAiSummary(null)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Candidate Quick Stats */}
              <div className="bg-muted/30 rounded-xl p-4 border border-border/40 mb-5">
                <h4 className="font-bold text-sm text-foreground mb-1">{selectedCandidateForAiSummary.name}</h4>
                <p className="text-xs text-muted-foreground mb-2">{selectedCandidateForAiSummary.role}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
                  <span>الخبرة: {selectedCandidateForAiSummary.experience || "غير حددة"}</span>
                  <span>•</span>
                  <span>المرحلة: {selectedCandidateForAiSummary.stage || "غير محددة"}</span>
                </div>
              </div>

              {/* AI Score Section */}
              {selectedCandidateForAiSummary.ai_score != null ? (
                (() => {
                  let evalData: any = null;
                  if (selectedCandidateForAiSummary.ai_evaluation) {
                    try {
                      evalData = JSON.parse(selectedCandidateForAiSummary.ai_evaluation);
                    } catch {
                      evalData = { summary: selectedCandidateForAiSummary.ai_evaluation };
                    }
                  }
                  
                  return (
                    <div className="space-y-5 flex-1">
                      {/* Score circle */}
                      <div className="text-center py-4 bg-primary/[0.02] border border-primary/5 rounded-xl">
                        <div className={cn("text-5xl font-black tracking-tight", 
                          selectedCandidateForAiSummary.ai_score >= 80 ? "text-green-600 dark:text-green-400" :
                          selectedCandidateForAiSummary.ai_score >= 50 ? "text-amber-600 dark:text-amber-400" :
                          "text-destructive"
                        )}>
                          {selectedCandidateForAiSummary.ai_score}%
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1.5 font-medium">نسبة توافق المؤهلات مع الوظيفة</p>
                        
                        {evalData?.recommendation && (
                          <div className="mt-3">
                            <span className={cn("px-3 py-1 rounded-full text-xs font-bold border",
                              evalData.recommendation === "مناسب جداً" ? "bg-green-500/10 text-green-700 border-green-200 dark:text-green-400 dark:border-green-500/20" :
                              evalData.recommendation === "مناسب" ? "bg-blue-500/10 text-blue-700 border-blue-200 dark:text-blue-400 dark:border-blue-500/20" :
                              evalData.recommendation === "يحتاج تطوير" ? "bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-400 dark:border-amber-500/20" :
                              "bg-red-500/10 text-red-700 border-red-200 dark:text-red-400 dark:border-red-500/20"
                            )}>
                              {evalData.recommendation}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Summary */}
                      {evalData?.summary && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-foreground">الملخص التنفيذي للتقييم:</h4>
                          <p className="text-xs text-muted-foreground leading-relaxed bg-muted/20 p-3 rounded-lg border border-border/30">
                            {evalData.summary}
                          </p>
                        </div>
                      )}

                      {/* Strengths */}
                      {evalData?.strengths && evalData.strengths.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-green-600 dark:text-green-400 flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5" />نقاط القوة والميزات التنافسية:
                          </h4>
                          <ul className="space-y-1.5 bg-green-500/[0.02] border border-green-500/10 rounded-xl p-3">
                            {evalData.strengths.map((str: string, idx: number) => (
                              <li key={idx} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                                <span>{str}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Weaknesses */}
                      {evalData?.weaknesses && evalData.weaknesses.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <TrendingDown className="w-3.5 h-3.5" />نقاط التحسين والفجوات:
                          </h4>
                          <ul className="space-y-1.5 bg-amber-500/[0.02] border border-amber-500/10 rounded-xl p-3">
                            {evalData.weaknesses.map((weak: string, idx: number) => (
                              <li key={idx} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                                <span>{weak}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-primary/40" />
                  </div>
                  <h4 className="font-semibold text-sm">لم يتم تشغيل التقييم الذكي بعد</h4>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    اضغط على الزر أدناه لتشغيل الفرز والتحليل الذكي لاستخراج نقاط السيرة الذاتية ونسبة التوافق.
                  </p>
                  <Button 
                    onClick={async () => {
                      setAiSummaryLoading(true);
                      try {
                        const resp = await fetch(EVAL_URL, {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                          },
                          body: JSON.stringify({ candidateId: selectedCandidateForAiSummary.id, jobId: selectedCandidateForAiSummary.job_id }),
                        });
                        
                        if (!resp.ok) {
                          const err = await resp.json();
                          throw new Error(err.error || "فشل التقييم");
                        }
                        
                        const evalResult = await resp.json();
                        
                        // Update local state
                        setSelectedCandidateForAiSummary((prev: any) => ({
                          ...prev,
                          ai_score: evalResult.score,
                          ai_evaluation: JSON.stringify(evalResult)
                        }));
                        
                        // Refetch list queries
                        queryClient.invalidateQueries({ queryKey: ["candidates"] });
                        toast({ title: "تم التقييم بنجاح ✅" });
                      } catch (err: any) {
                        toast({ title: "خطأ", description: err.message, variant: "destructive" });
                      } finally {
                        setAiSummaryLoading(false);
                      }
                    }}
                    disabled={aiSummaryLoading}
                    className="w-full bg-gradient-to-l from-primary to-primary/80 text-primary-foreground"
                  >
                    {aiSummaryLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin ml-1" />جاري التقييم...</>
                    ) : (
                      <><Sparkles className="w-4 h-4 ml-1" />بدء التقييم بالذكاء الاصطناعي</>
                    )}
                  </Button>
                </div>
              )}
              
              {/* Profile Link in Drawer */}
              <div className="pt-4 border-t border-border mt-auto">
                <Link to={`/candidates/${selectedCandidateForAiSummary.id}`}>
                  <Button variant="outline" className="w-full text-xs">عرض الملف الشخصي الكامل ←</Button>
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
