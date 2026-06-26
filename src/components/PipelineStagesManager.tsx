import { useState, useCallback } from "react";
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
  Eye, Star, Timer,
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

  const sortedStages = [...stages].sort((a, b) => a.sort_order - b.sort_order);
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
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-foreground">مراحل التوظيف</h2>
        <p className="text-sm text-muted-foreground mt-1">
          انقر على أي مرحلة لتعديل نوعها وإعداداتها والإجراءات التلقائية
        </p>
      </div>

      {/* Templates */}
      <TemplatesSection onApply={handleApplyTemplate} />

      {/* Export / Import */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => {
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
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => {
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

      {/* Horizontal Stepper */}
      <Card>
        <CardContent className="p-2">
          <PipelineStepper
            stages={sortedStages}
            selectedStageId={selectedStageId}
            onStageClick={(id) => setSelectedStageId(selectedStageId === id ? null : id)}
            showAddButton
            onAddClick={() => setShowAdd(true)}
            draggable
            onReorder={handleReorder}
          />
        </CardContent>
      </Card>

      {/* Add New Stage */}
      {showAdd && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-dashed border-primary/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: newColor + "20" }}>
              <IconComponent icon={newIcon} className="w-4 h-4" style={{ color: newColor }} />
            </div>
            <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="اسم المرحلة" className="flex-1" autoFocus
              onKeyDown={e => e.key === "Enter" && handleAdd()} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">اللون</p>
            <div className="flex flex-wrap gap-1.5 items-center">
              {COLORS.map(c => (
                <button key={c} onClick={() => setNewColor(c)}
                  className={cn("w-5 h-5 rounded-md transition-all", newColor === c && "ring-2 ring-offset-1 ring-primary")}
                  style={{ backgroundColor: c }} />
              ))}
              <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)}
                className="w-6 h-6 rounded border border-border/50 cursor-pointer p-0.5 ms-1" />
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">الأيقونة</p>
            <div className="flex flex-wrap gap-1">
              {ICONS.map(ic => (
                <button key={ic.id} onClick={() => setNewIcon(ic.id)}
                  className={cn("flex items-center gap-1 px-2 py-1 rounded-md text-[10px] border",
                    newIcon === ic.id ? "border-primary bg-primary/5 text-primary" : "border-border/50 text-muted-foreground")}>
                  <IconComponent icon={ic.id} className="w-3 h-3" />{ic.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAdd} disabled={!newName.trim() || addStage.isPending} size="sm" className="gap-1">
              <Check className="w-3.5 h-3.5" /> إضافة
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>إلغاء</Button>
          </div>
        </motion.div>
      )}

      {/* Stage Detail */}
      <AnimatePresence mode="wait">
        {selectedStage && (
          <StageDetailPanel key={selectedStage.id} stage={selectedStage} />
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
  );
}
