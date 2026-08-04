import { useState, useMemo, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { usePipelineStages, useStageMutations, useAllSubStages } from "@/hooks/usePipelineStages";
import { useCandidates } from "@/hooks/useJobs";
import { useI18n } from "@/contexts/I18nContext";
import PipelineStepper from "@/components/PipelineStepper";
import StageDetailPanel from "@/components/StageDetailPanel";
import AutomationBuilder from "@/components/AutomationBuilder";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  GitBranch, Plus, Trash2, Check, X, Loader2, Settings2, Users,
  FileText, FileSearch, Phone, Code, Briefcase, Circle,
  Mail, Target, Award, Heart, ThumbsUp, AlertTriangle,
  Eye, Star, Timer, Zap, Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

/* ─── Batch Add Stages ─── */
function BatchAddStages({ onAdd, onClose }: { onAdd: (stages: { name: string; color: string; icon: string }[]) => void; onClose: () => void }) {
  const [entries, setEntries] = useState([{ name: "", color: COLORS[0], icon: "circle" }]);

  const addEntry = () => {
    setEntries(prev => [...prev, { name: "", color: COLORS[(prev.length) % COLORS.length], icon: "circle" }]);
  };
  const updateEntry = (i: number, updates: Partial<typeof entries[0]>) => {
    setEntries(prev => prev.map((e, idx) => idx === i ? { ...e, ...updates } : e));
  };
  const removeEntry = (i: number) => {
    setEntries(prev => prev.filter((_, idx) => idx !== i));
  };
  const validEntries = entries.filter(e => e.name.trim());

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-dashed border-primary/30 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">إضافة مراحل جديدة</p>
        <Button variant="ghost" size="sm" onClick={onClose}><X className="w-4 h-4" /></Button>
      </div>
      <div className="space-y-2">
        {entries.map((entry, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: entry.color + "20" }}>
              <IconComponent icon={entry.icon} className="w-4 h-4" style={{ color: entry.color }} />
            </div>
            <Input value={entry.name} onChange={e => updateEntry(i, { name: e.target.value })}
              placeholder={`مرحلة ${i + 1}`} className="flex-1 h-9" autoFocus={i === entries.length - 1} />
            <input type="color" value={entry.color} onChange={e => updateEntry(i, { color: e.target.value })}
              className="w-8 h-8 rounded border border-border/50 cursor-pointer p-0.5 shrink-0" />
            <Select value={entry.icon} onValueChange={v => updateEntry(i, { icon: v })}>
              <SelectTrigger className="w-24 h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ICONS.map(ic => (
                  <SelectItem key={ic.id} value={ic.id}>
                    <span className="flex items-center gap-1"><IconComponent icon={ic.id} className="w-3 h-3" />{ic.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {entries.length > 1 && (
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => removeEntry(i)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        ))}
      </div>
      <Button variant="outline" size="sm" onClick={addEntry} className="w-full gap-1.5 border-dashed">
        <Plus className="w-3 h-3" /> إضافة مرحلة أخرى
      </Button>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onAdd(validEntries)} disabled={validEntries.length === 0} className="gap-1.5">
          <Check className="w-3.5 h-3.5" /> إضافة {validEntries.length > 0 ? `(${validEntries.length})` : ""}
        </Button>
        <Button variant="ghost" size="sm" onClick={onClose}>إلغاء</Button>
      </div>
    </motion.div>
  );
}

/* ═══════════════ Main Workflow Editor ═══════════════ */
export default function WorkflowEditor() {
  const { data: stages, isLoading: stagesLoading } = usePipelineStages();
  const { data: candidates = [] } = useCandidates();
  const { addStage, deleteStage, reorderStages } = useStageMutations();
  const { locale } = useI18n();
  const isAr = locale !== "en";

  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [showBatchAdd, setShowBatchAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const sortedStages = useMemo(() => (stages || []).sort((a, b) => a.sort_order - b.sort_order), [stages]);
  const selectedStageData = useMemo(() => sortedStages.find(s => s.id === selectedStage), [sortedStages, selectedStage]);

  const handleBatchAdd = async (newStages: { name: string; color: string; icon: string }[]) => {
    try {
      for (const [i, s] of newStages.entries()) {
        await addStage.mutateAsync({ name: s.name, color: s.color, icon: s.icon, sort_order: sortedStages.length + i });
      }
      toast({ title: `تمت إضافة ${newStages.length} مراحل بنجاح ✅` });
      setShowBatchAdd(false);
    } catch {
      toast({ title: "خطأ في الإضافة", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteStage.mutateAsync(deleteTarget.id);
      if (selectedStage === deleteTarget.id) setSelectedStage(null);
      toast({ title: `تم حذف المرحلة "${deleteTarget.name}"` });
      setDeleteTarget(null);
    } catch {
      toast({ title: "خطأ في الحذف", variant: "destructive" });
    }
  };

  if (stagesLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-8 space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <GitBranch className="w-6 h-6 text-primary" />
                {isAr ? "مراحل التوظيف" : "Recruitment Stages"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {isAr
                  ? "انقر على أي مرحلة لتعديل نوعها وإعداداتها والإجراءات التلقائية"
                  : "Click any stage to configure its type, settings, and automations"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs gap-1">
                <Settings2 className="w-3 h-3" />{sortedStages.length} {isAr ? "مرحلة" : "stages"}
              </Badge>
              <Badge variant="outline" className="text-xs gap-1">
                <Users className="w-3 h-3" />{candidates.length} {isAr ? "مرشح" : "candidates"}
              </Badge>
            </div>
          </div>
        </motion.div>

        <Tabs defaultValue="stages" className="w-full space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md h-12 p-1 bg-muted/60 rounded-2xl">
            <TabsTrigger value="stages" className="rounded-xl font-bold text-xs gap-2">
              <GitBranch className="w-4 h-4 text-primary" /> {isAr ? "مسارات ومراحل التوظيف" : "Recruitment Pipeline"}
            </TabsTrigger>

            <TabsTrigger value="automation" className="rounded-xl font-bold text-xs gap-2">
              <Zap className="w-4 h-4 text-amber-500" /> {isAr ? "محرك الأتمتة والسيناريوهات" : "Automation Builder"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stages" className="space-y-6 mt-0">
            {/* Horizontal Stepper */}
            <Card className="bg-card/80 backdrop-blur-sm border-border/60 rounded-3xl">
              <CardContent className="p-2">
                <PipelineStepper
                  stages={sortedStages}
                  selectedStageId={selectedStage}
                  onStageClick={(id) => setSelectedStage(selectedStage === id ? null : id)}
                  showAddButton
                  onAddClick={() => setShowBatchAdd(true)}
                  draggable
                  onReorder={(reordered) => {
                    reorderStages.mutate(reordered);
                    toast({ title: "تم إعادة ترتيب المراحل ✅" });
                  }}
                />
              </CardContent>
            </Card>

            {/* Batch Add */}
            <AnimatePresence>
              {showBatchAdd && (
                <BatchAddStages onAdd={handleBatchAdd} onClose={() => setShowBatchAdd(false)} />
              )}
            </AnimatePresence>

            {/* Stage Detail Panel */}
            <AnimatePresence mode="wait">
              {selectedStage && selectedStageData && (
                <StageDetailPanel
                  key={selectedStage}
                  stage={selectedStageData}
                  onClose={() => setSelectedStage(null)}
                />
              )}
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="automation" className="mt-0">
            <AutomationBuilder />
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف المرحلة</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف مرحلة "{deleteTarget?.name}"؟ لن يتم حذف المرشحين في هذه المرحلة.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
