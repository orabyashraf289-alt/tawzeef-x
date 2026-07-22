import { useState, useCallback, useMemo } from "react";
import {
  usePipelineStages, useStageMutations,
  type PipelineStage, STAGE_TEMPLATES,
} from "@/hooks/usePipelineStages";
import { useCandidates } from "@/hooks/useJobs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import PipelineStepper from "@/components/PipelineStepper";
import StageDetailPanel from "@/components/StageDetailPanel";
import {
  Plus, Trash2, Check, X,
  FileText, FileSearch, Phone, Code, Users, Briefcase, Circle,
  LayoutTemplate, Download, Upload,
  Mail, Target, Award, Heart, ThumbsUp, AlertTriangle,
  Eye, Star, Timer, Search, SlidersHorizontal, List, Kanban, Save, ArrowUpDown, Pencil, BarChart3, Zap
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  "file-text": FileText, "file-search": FileSearch, phone: Phone,
  code: Code, users: Users, briefcase: Briefcase, circle: Circle,
  mail: Mail, target: Target, award: Award, heart: Heart,
  "thumbs-up": ThumbsUp, "alert-triangle": AlertTriangle, eye: Eye,
  star: Star, timer: Timer,
};

const COLORS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
  "#f43f5e", "#ef4444", "#f97316", "#f59e0b", "#eab308",
  "#84cc16", "#22c55e", "#10b981", "#14b8a6", "#06b6d4",
  "#0ea5e9", "#3b82f6", "#2563eb", "#6d28d9", "#059669",
];

const ICONS = [
  { id: "file-text", label: "ملف" }, { id: "file-search", label: "مراجعة" },
  { id: "phone", label: "هاتف" }, { id: "code", label: "تقني" },
  { id: "users", label: "فريق" }, { id: "briefcase", label: "عرض" },
  { id: "circle", label: "عام" }, { id: "mail", label: "بريد" },
  { id: "target", label: "هدف" }, { id: "award", label: "جائزة" },
  { id: "heart", label: "مفضل" }, { id: "thumbs-up", label: "موافق" },
  { id: "eye", label: "مشاهدة" }, { id: "star", label: "نجمة" },
  { id: "timer", label: "مؤقت" }, { id: "alert-triangle", label: "تنبيه" },
];

const IconComponent = ({ icon, className, style }: { icon: string; className?: string; style?: React.CSSProperties }) => {
  const Comp = ICON_MAP[icon] || Circle;
  return <Comp className={className} style={style} />;
};

/* ─── Templates Section ─── */
function TemplatesSection({ onApply }: { onApply: (stages: { name: string; color: string; icon: string; sort_order: number }[]) => void }) {
  const [confirmTemplate, setConfirmTemplate] = useState<typeof STAGE_TEMPLATES[0] | null>(null);

  return (
    <>
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <LayoutTemplate className="w-3.5 h-3.5" /> قوالب جاهزة
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {STAGE_TEMPLATES.map(tpl => (
            <button key={tpl.id} onClick={() => setConfirmTemplate(tpl)}
              className="text-right p-3 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all space-y-1.5">
              <p className="text-sm font-semibold text-foreground">{tpl.name}</p>
              <p className="text-[10px] text-muted-foreground">{tpl.description}</p>
              <div className="flex gap-1 mt-1">
                {tpl.stages.map((s, i) => (
                  <div key={i} className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} title={s.name} />
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      <AlertDialog open={!!confirmTemplate} onOpenChange={() => setConfirmTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تطبيق قالب "{confirmTemplate?.name}"</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم استبدال جميع المراحل الحالية. هل أنت متأكد؟
              <div className="mt-3 space-y-1">
                {confirmTemplate?.stages.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                    <span>{i + 1}. {s.name}</span>
                  </div>
                ))}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (confirmTemplate) onApply(confirmTemplate.stages.map((s, i) => ({ ...s, sort_order: i })));
              setConfirmTemplate(null);
            }}>تطبيق القالب</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/* ─── Main Manager ─── */
export default function PipelineStagesManager() {
  const { data: stages = [], isLoading } = usePipelineStages();
  const { data: candidates = [] } = useCandidates();
  const { addStage, deleteStage, applyTemplate, reorderStages } = useStageMutations();

  const handleReorder = useCallback((reordered: { id: string; sort_order: number }[]) => {
    reorderStages.mutate(reordered);
    toast({ title: "تم إعادة ترتيب المراحل ✅" });
  }, [reorderStages]);

  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(COLORS[0]);
  const [newIcon, setNewIcon] = useState("circle");
  const [deleteTarget, setDeleteTarget] = useState<PipelineStage | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"stepper" | "list">("stepper");

  const candidateCounts = useMemo(() => {
    const map: Record<string, number> = {};
    (candidates || []).forEach((c: any) => {
      map[c.stage] = (map[c.stage] || 0) + 1;
    });
    return map;
  }, [candidates]);

  const sortedStages = useMemo(() => {
    return [...stages].sort((a, b) => a.sort_order - b.sort_order);
  }, [stages]);

  const filteredStages = useMemo(() => {
    if (!searchQuery.trim()) return sortedStages;
    return sortedStages.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase().trim()));
  }, [sortedStages, searchQuery]);

  const enrichedStages = useMemo(() => {
    return filteredStages.map(s => ({
      ...s,
      candidate_count: candidateCounts[s.name] || 0,
    }));
  }, [filteredStages, candidateCounts]);

  const selectedStage = sortedStages.find(s => s.id === selectedStageId);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      await addStage.mutateAsync({ name: newName.trim(), color: newColor, icon: newIcon, sort_order: sortedStages.length });
      toast({ title: "تمت إضافة المرحلة ✅" });
      setNewName(""); setNewColor(COLORS[0]); setNewIcon("circle"); setShowAdd(false);
    } catch { toast({ title: "خطأ", variant: "destructive" }); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteStage.mutateAsync(deleteTarget.id);
      if (selectedStageId === deleteTarget.id) setSelectedStageId(null);
      toast({ title: `تم حذف "${deleteTarget.name}"` }); setDeleteTarget(null);
    } catch { toast({ title: "خطأ", variant: "destructive" }); }
  };

  const handleApplyTemplate = async (templateStages: { name: string; color: string; icon: string; sort_order: number }[]) => {
    try {
      await applyTemplate.mutateAsync(templateStages);
      toast({ title: "تم تطبيق القالب ✅" });
    } catch { toast({ title: "خطأ", variant: "destructive" }); }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted/30 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header & Top KPI Metrics Summary Bar ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/50">
        <div>
          <h2 className="text-xl font-black text-foreground flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-primary" /> استوديو إدارة وتكوين مراحل التوظيف
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            صمم المسار الوظيفي، واضبط شروط الانتقال التلقائي، وحدد مهل الـ SLA وأتمتة الذكاء الاصطناعي لكل مرحلة
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setShowAdd(true)}
            className="h-9 text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
          >
            <Plus className="w-4 h-4" /> إضافة مرحلة جديدة
          </Button>
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-card border border-border/60 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <Kanban className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground font-medium">عدد المراحل النشطة</p>
            <p className="text-base font-black text-foreground">{sortedStages.length} مراحل</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-card border border-border/60 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground font-medium">المرشحون في المسار</p>
            <p className="text-base font-black text-foreground">{candidates.length} مرشح</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-card border border-border/60 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground font-medium">المراحل المؤتمتة (AI & Test)</p>
            <p className="text-base font-black text-foreground">
              {sortedStages.filter((s: any) => s.automation_rules?.auto_ai_evaluation || s.automation_rules?.auto_send_assessment || s.transition_rules?.require_ai_evaluation).length} مراحل
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-card border border-border/60 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <Timer className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground font-medium">متوسط حد الـ SLA</p>
            <p className="text-base font-black text-foreground">
              {Math.round(sortedStages.reduce((acc, s: any) => acc + (s.sla_hours || 0), 0) / (sortedStages.length || 1))} ساعة
            </p>
          </div>
        </div>
      </div>

      {/* ─── Main Two-Column Studio Layout ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Sidebar: Pipeline Intelligence & Funnel Analytics (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Conversion Funnel Widget */}
          <Card className="border-border/60 shadow-2xs">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-primary" /> قُمع توزيع المرشحين
                </h3>
                <span className="text-[10px] text-muted-foreground font-semibold">توزيع حي</span>
              </div>
              <div className="space-y-2.5 pt-1">
                {enrichedStages.map((stg) => {
                  const percentage = candidates.length > 0 ? Math.round((stg.candidate_count / candidates.length) * 100) : 0;
                  return (
                    <div key={stg.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground flex items-center gap-1.5 truncate max-w-[140px]">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: stg.color }} />
                          {stg.name}
                        </span>
                        <span className="text-[11px] font-bold text-muted-foreground">
                          {stg.candidate_count} ({percentage}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(percentage, stg.candidate_count > 0 ? 5 : 0)}%`, backgroundColor: stg.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Automations Summary Card */}
          <Card className="border-border/60 shadow-2xs">
            <CardContent className="p-4 space-y-3">
              <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" /> ملخص شروط وأتمتة المسار
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-xl bg-purple-500/5 border border-purple-500/10">
                  <span className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300 font-semibold">
                    🤖 تقييم الذكاء الاصطناعي
                  </span>
                  <Badge variant="secondary" className="text-[10px] font-bold">
                    {sortedStages.filter((s: any) => s.transition_rules?.require_ai_evaluation).length} مراحل
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-amber-500/5 border border-amber-500/10">
                  <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-semibold">
                    🎥 المقابلات الرسمية
                  </span>
                  <Badge variant="secondary" className="text-[10px] font-bold">
                    {sortedStages.filter((s: any) => s.transition_rules?.require_interview).length} مراحل
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-green-500/5 border border-green-500/10">
                  <span className="flex items-center gap-1.5 text-green-700 dark:text-green-300 font-semibold">
                    📝 الاختبارات التقييمية
                  </span>
                  <Badge variant="secondary" className="text-[10px] font-bold">
                    {sortedStages.filter((s: any) => s.transition_rules?.require_assessment).length} مراحل
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Main Panel: Drag & Drop Workflow Studio & Configurator (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Templates Presets */}
          <TemplatesSection onApply={handleApplyTemplate} />

          {/* Toolbar: Search & Export/Import & View Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/30 p-2.5 rounded-2xl border border-border/50">
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث في مراحل التوظيف..."
                  className="ps-9 h-9 text-xs bg-card"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-card p-1 rounded-lg border border-border/50 shadow-2xs">
                <Button
                  variant={viewMode === "stepper" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-xs px-2.5 gap-1.5"
                  onClick={() => setViewMode("stepper")}
                >
                  <Kanban className="w-3.5 h-3.5" /> مخطط
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-7 text-xs px-2.5 gap-1.5"
                  onClick={() => setViewMode("list")}
                >
                  <List className="w-3.5 h-3.5" /> قائمة
                </Button>
              </div>

              <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs bg-card" onClick={() => {
                const exportData = sortedStages.map(s => ({
                  name: s.name, color: s.color, icon: s.icon, sort_order: s.sort_order,
                  is_default: s.is_default, transition_rules: s.transition_rules, automation_rules: s.automation_rules,
                }));
                const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a"); a.href = url; a.download = "pipeline-stages.json"; a.click();
                URL.revokeObjectURL(url);
                toast({ title: "تم التصدير 📁" });
              }}>
                <Download className="w-3.5 h-3.5" /> تصدير
              </Button>
              <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs bg-card" onClick={() => {
                const input = document.createElement("input"); input.type = "file"; input.accept = ".json";
                input.onchange = async (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (!file) return;
                  try {
                    const text = await file.text();
                    const imported = JSON.parse(text);
                    if (!Array.isArray(imported) || imported.length === 0) throw new Error("Invalid");
                    const stgs = imported.map((s: any, i: number) => ({ name: s.name, color: s.color || "#6366f1", icon: s.icon || "circle", sort_order: i }));
                    await applyTemplate.mutateAsync(stgs);
                    toast({ title: `تم استيراد ${stgs.length} مراحل ✅` });
                  } catch { toast({ title: "خطأ في الملف", variant: "destructive" }); }
                };
                input.click();
              }}>
                <Upload className="w-3.5 h-3.5" /> استيراد
              </Button>
            </div>
          </div>

          {/* Main View Display */}
          {viewMode === "stepper" ? (
            <Card className="border-border/60 shadow-sm">
              <CardContent className="p-3">
                <PipelineStepper
                  stages={enrichedStages}
                  selectedStageId={selectedStageId}
                  onStageClick={(id) => setSelectedStageId(selectedStageId === id ? null : id)}
                  showAddButton
                  onAddClick={() => setShowAdd(true)}
                  draggable
                  onReorder={handleReorder}
                />
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/60 shadow-sm">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-border/50 text-xs font-semibold text-muted-foreground">
                  <span>اسم المرحلة والترتيب</span>
                  <span>المرشحون الحاليون</span>
                  <span>الاشتراطات والأتمتة</span>
                  <span>الإجراءات والتعديل</span>
                </div>
                {enrichedStages.map((stg, i) => (
                  <div
                    key={stg.id}
                    onClick={() => setSelectedStageId(selectedStageId === stg.id ? null : stg.id)}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl border border-border/50 hover:bg-muted/40 cursor-pointer transition-all",
                      selectedStageId === stg.id && "border-primary bg-primary/5 shadow-2xs"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}.</span>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: stg.color + "20" }}>
                        <IconComponent icon={stg.icon} className="w-4 h-4" style={{ color: stg.color }} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                          {stg.name}
                          {stg.is_default && <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary/10 text-primary">افتراضي</span>}
                        </p>
                      </div>
                    </div>

                    <div className="text-xs font-bold text-foreground">
                      {stg.candidate_count} مرشح
                    </div>

                    <div className="flex items-center gap-1 text-xs">
                      {stg.transition_rules?.require_ai_evaluation && (
                        <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 text-[10px] font-semibold">🤖 تقييم AI</span>
                      )}
                      {stg.transition_rules?.require_interview && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 text-[10px] font-semibold">🎥 مقابلة</span>
                      )}
                      {stg.transition_rules?.require_assessment && (
                        <span className="px-1.5 py-0.5 rounded bg-green-500/10 text-green-600 text-[10px] font-semibold">📝 اختبار</span>
                      )}
                      {!stg.transition_rules?.require_ai_evaluation && !stg.transition_rules?.require_interview && !stg.transition_rules?.require_assessment && (
                        <span className="text-muted-foreground/50 text-[11px]">بدون شروط</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
                        {stg.sla_hours ? `${stg.sla_hours} ساعة` : "غير محدد"}
                      </div>

                      <div className="flex items-center gap-1 ms-2" onClick={e => e.stopPropagation()}>
                        <Button
                          variant={selectedStageId === stg.id ? "default" : "outline"}
                          size="sm"
                          className="h-7 px-2 text-xs gap-1"
                          onClick={() => setSelectedStageId(selectedStageId === stg.id ? null : stg.id)}
                        >
                          <Pencil className="w-3 h-3" />
                          {selectedStageId === stg.id ? "إغلاق التعديل" : "تعديل الإعدادات"}
                        </Button>

                        {!stg.is_default && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteTarget(stg)}
                            title="حذف المرحلة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Add New Stage Drawer */}
          {showAdd && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-dashed border-primary/40 rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-border/40">
                <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Plus className="w-4 h-4 text-primary" /> إضافة مرحلة جديدة إلى مسار التوظيف
                </h4>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowAdd(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-border" style={{ backgroundColor: newColor + "20" }}>
                  <IconComponent icon={newIcon} className="w-5 h-5" style={{ color: newColor }} />
                </div>
                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="اسم المرحلة الجديد (مثال: اختبار الفحص التقني)" className="flex-1 font-medium" autoFocus
                  onKeyDown={e => e.key === "Enter" && handleAdd()} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1.5 font-semibold">اختيار اللون المميز للمرحلة</p>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setNewColor(c)}
                      className={cn("w-6 h-6 rounded-lg transition-all", newColor === c && "ring-2 ring-offset-2 ring-primary scale-110")}
                      style={{ backgroundColor: c }} />
                  ))}
                  <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)}
                    className="w-7 h-7 rounded border border-border/50 cursor-pointer p-0.5 ms-1" />
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1.5 font-semibold">اختيار أيقونة المرحلة</p>
                <div className="flex flex-wrap gap-1">
                  {ICONS.map(ic => (
                    <button key={ic.id} onClick={() => setNewIcon(ic.id)}
                      className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border transition-all",
                        newIcon === ic.id ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs" : "border-border/50 text-muted-foreground hover:bg-muted/50")}>
                      <IconComponent icon={ic.id} className="w-3.5 h-3.5" />{ic.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleAdd} disabled={!newName.trim() || addStage.isPending} size="sm" className="gap-1.5 font-bold">
                  <Check className="w-4 h-4" /> حفظ وإضافة المرحلة
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>إلغاء</Button>
              </div>
            </motion.div>
          )}

          {/* Stage Detail Configuration Panel */}
          <AnimatePresence mode="wait">
            {selectedStage && (
              <StageDetailPanel key={selectedStage.id} stage={selectedStage} onClose={() => setSelectedStageId(null)} />
            )}
          </AnimatePresence>

          {/* Delete Confirmation */}
          <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>حذف المرحلة</AlertDialogTitle>
                <AlertDialogDescription>
                  هل أنت متأكد من حذف "{deleteTarget?.name}"؟
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">حذف</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
