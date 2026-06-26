import { useState } from "react";
import { motion } from "framer-motion";
import { ClipboardCheck, Plus, Check, Clock, Ban, SkipForward, Loader2, Trash2, Paperclip, Calendar as CalendarIcon, ShieldCheck, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useCandidateChecklists,
  useChecklistItems,
  useChecklistTemplates,
  useCreateChecklistFromTemplate,
  useUpdateChecklistItem,
  useAddChecklistItem,
  useDeleteChecklist,
  type ChecklistItemStatus,
  type ChecklistItem,
} from "@/hooks/useChecklists";
import { useMyCompanyRole } from "@/hooks/useCompanies";
import { useUserRole } from "@/hooks/useUserRole";
import { cn } from "@/lib/utils";

const statusConfig: Record<ChecklistItemStatus, { label: string; icon: any; cls: string }> = {
  pending: { label: "قيد الانتظار", icon: Clock, cls: "bg-muted text-muted-foreground" },
  in_progress: { label: "قيد التنفيذ", icon: Loader2, cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  done: { label: "مكتمل", icon: Check, cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  blocked: { label: "متعثر", icon: Ban, cls: "bg-red-500/10 text-red-700 dark:text-red-400" },
  skipped: { label: "متخطى", icon: SkipForward, cls: "bg-muted text-muted-foreground line-through" },
};

const assigneeLabels: Record<string, string> = {
  owner: "المالك",
  hr: "HR",
  recruiter: "المُوظِّف",
  agency: "المكتب",
};

interface Props {
  candidateId: string;
  companyId: string | null | undefined;
}

export default function CandidateChecklistPanel({ candidateId, companyId }: Props) {
  const { data: checklists = [], isLoading } = useCandidateChecklists(candidateId);
  const { data: templates = [] } = useChecklistTemplates();
  const { data: companyRole } = useMyCompanyRole(companyId);
  const { isAdmin } = useUserRole();
  const createFromTpl = useCreateChecklistFromTemplate();
  const deleteChecklist = useDeleteChecklist();

  const [openTpl, setOpenTpl] = useState(false);
  const [tplKey, setTplKey] = useState("");

  // Effective role: admin treated as owner
  const effRole: "owner" | "hr" | "viewer" | "agency" = isAdmin
    ? "owner"
    : (companyRole as any) || "agency";
  const canCreateChecklist = effRole === "owner" || effRole === "hr";
  const canDeleteChecklist = effRole === "owner";

  if (!companyId) {
    return (
      <div className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm">
        <div className="text-sm text-muted-foreground text-center py-4">
          يجب ربط هذا المرشح بشركة لإدارة قوائم المتابعة.
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border/50 p-6 shadow-sm"
    >
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-sm flex items-center gap-2.5">
          <div className="w-1 h-5 rounded-full bg-primary" />
          <ClipboardCheck className="w-4 h-4 text-primary" />
          قوائم المتابعة
          <Badge variant="outline" className="text-[10px] gap-1">
            <ShieldCheck className="w-3 h-3" />
            {assigneeLabels[effRole] || "—"}
          </Badge>
        </h3>
        {canCreateChecklist && (
          <Dialog open={openTpl} onOpenChange={setOpenTpl}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                قائمة جديدة
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>إنشاء قائمة متابعة</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <label className="text-sm font-medium">اختر قالباً جاهزاً</label>
                <Select value={tplKey} onValueChange={setTplKey}>
                  <SelectTrigger>
                    <SelectValue placeholder="القالب..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.key} value={t.key}>
                        {t.name_ar} {t.is_default && <span className="text-xs text-muted-foreground">(افتراضي)</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {tplKey && (
                  <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                    {templates.find((t) => t.key === tplKey)?.description}
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button
                  onClick={async () => {
                    if (!tplKey) return;
                    await createFromTpl.mutateAsync({ candidateId, companyId, templateKey: tplKey });
                    setOpenTpl(false);
                    setTplKey("");
                  }}
                  disabled={!tplKey || createFromTpl.isPending}
                >
                  {createFromTpl.isPending ? "جارٍ..." : "إنشاء"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading && <p className="text-xs text-muted-foreground">جارٍ التحميل...</p>}

      {!isLoading && checklists.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          {canCreateChecklist
            ? "لا توجد قوائم متابعة بعد. ابدأ بإضافة قائمة من القوالب الجاهزة."
            : "لا توجد قوائم متابعة لعرضها."}
        </div>
      )}

      <div className="space-y-4">
        {checklists.map((cl) => (
          <ChecklistView
            key={cl.id}
            checklistId={cl.id}
            title={cl.title}
            role={effRole}
            canDelete={canDeleteChecklist}
            onDelete={() => deleteChecklist.mutate(cl.id)}
          />
        ))}
      </div>
    </motion.div>
  );
}

function ChecklistView({
  checklistId,
  title,
  role,
  canDelete,
  onDelete,
}: {
  checklistId: string;
  title: string;
  role: "owner" | "hr" | "viewer" | "agency";
  canDelete: boolean;
  onDelete: () => void;
}) {
  const { data: items = [] } = useChecklistItems(checklistId);
  const updateItem = useUpdateChecklistItem();
  const addItem = useAddChecklistItem();

  const [openAdd, setOpenAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newAssignee, setNewAssignee] = useState<string>("recruiter");
  const [newDueDate, setNewDueDate] = useState("");

  const [editing, setEditing] = useState<ChecklistItem | null>(null);
  const [editStatus, setEditStatus] = useState<ChecklistItemStatus>("pending");
  const [editNotes, setEditNotes] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editAttachment, setEditAttachment] = useState("");

  // Role-based filter: agency members see only items assigned to agency;
  // hr sees items assigned to hr/recruiter/agency (not owner-only);
  // owner/admin see everything.
  const visibleItems = items.filter((it) => {
    const a = (it.assigned_to_type || "recruiter").toLowerCase();
    if (role === "owner") return true;
    if (role === "hr") return a !== "owner";
    if (role === "agency") return a === "agency";
    if (role === "viewer") return true;
    return false;
  });

  const canAddItem = role === "owner" || role === "hr";
  const canEditItem = (it: ChecklistItem) => {
    if (role === "owner") return true;
    if (role === "hr") return (it.assigned_to_type || "") !== "owner";
    if (role === "agency") return (it.assigned_to_type || "") === "agency";
    return false;
  };

  const completed = visibleItems.filter((i) => i.status === "done").length;
  const progress = visibleItems.length > 0 ? Math.round((completed / visibleItems.length) * 100) : 0;

  const openEdit = (it: ChecklistItem) => {
    setEditing(it);
    setEditStatus(it.status);
    setEditNotes(it.notes || "");
    setEditDueDate(it.due_date ? it.due_date.slice(0, 10) : "");
    setEditAttachment("");
  };

  return (
    <div className="border border-border/40 rounded-xl p-4 bg-muted/20">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-semibold text-sm">{title}</h4>
          <p className="text-[11px] text-muted-foreground">
            {completed} / {visibleItems.length} مكتمل ({progress}%)
          </p>
        </div>
        <div className="flex gap-1">
          {canAddItem && (
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setOpenAdd(true)}>
              <Plus className="w-3.5 h-3.5" />
            </Button>
          )}
          {canDelete && (
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={onDelete}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-4">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.6 }}
        />
      </div>

      <div className="space-y-2">
        {visibleItems.map((item) => {
          const cfg = statusConfig[item.status];
          const Icon = cfg.icon;
          const editable = canEditItem(item);
          const overdue =
            item.due_date && item.status !== "done" && new Date(item.due_date) < new Date();
          return (
            <button
              key={item.id}
              disabled={!editable}
              onClick={() => editable && openEdit(item)}
              className={cn(
                "w-full text-right flex items-start gap-3 p-2.5 rounded-lg border border-border/40 bg-card transition-colors",
                editable ? "hover:bg-muted/30 cursor-pointer" : "opacity-70 cursor-not-allowed"
              )}
            >
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", cfg.cls)}>
                <Icon className={cn("w-4 h-4", item.status === "in_progress" && "animate-spin")} />
              </div>
              <div className="flex-1 min-w-0 text-right">
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  {item.assigned_to_type && (
                    <Badge variant="secondary" className="text-[9px] px-1.5">
                      {assigneeLabels[item.assigned_to_type] || item.assigned_to_type}
                    </Badge>
                  )}
                </div>
                {item.description && <p className="text-[11px] text-muted-foreground truncate">{item.description}</p>}
                <div className="flex items-center gap-3 mt-1 flex-wrap justify-end">
                  {item.due_date && (
                    <span
                      className={cn(
                        "text-[10px] flex items-center gap-1",
                        overdue ? "text-destructive font-semibold" : "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="w-3 h-3" />
                      {new Date(item.due_date).toLocaleDateString("ar-SA")}
                    </span>
                  )}
                  {item.completed_at && (
                    <span className="text-[10px] text-emerald-600 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      {new Date(item.completed_at).toLocaleDateString("ar-SA")}
                    </span>
                  )}
                  {(item.attachments?.length ?? 0) > 0 && (
                    <span className="text-[10px] text-primary flex items-center gap-1">
                      <Paperclip className="w-3 h-3" />
                      {item.attachments.length}
                    </span>
                  )}
                </div>
              </div>
              <Badge variant="outline" className="shrink-0 text-[10px]">
                {cfg.label}
              </Badge>
            </button>
          );
        })}
      </div>

      {/* Add item dialog */}
      <Dialog open={openAdd} onOpenChange={setOpenAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة بند جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input placeholder="العنوان" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            <Textarea placeholder="الوصف (اختياري)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">الجهة المسؤولة</label>
                <Select value={newAssignee} onValueChange={setNewAssignee}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {role === "owner" && <SelectItem value="owner">المالك فقط</SelectItem>}
                    <SelectItem value="hr">HR</SelectItem>
                    <SelectItem value="recruiter">المُوظِّف</SelectItem>
                    <SelectItem value="agency">المكتب</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">تاريخ الاستحقاق</label>
                <Input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={async () => {
                if (!newTitle.trim()) return;
                await addItem.mutateAsync({
                  checklistId,
                  title: newTitle,
                  description: newDesc,
                  assigned_to_type: newAssignee,
                  due_date: newDueDate || null,
                });
                setNewTitle("");
                setNewDesc("");
                setNewDueDate("");
                setNewAssignee("recruiter");
                setOpenAdd(false);
              }}
            >
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit item dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تحديث البند</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <label className="text-sm font-medium">الحالة</label>
            <Select value={editStatus} onValueChange={(v) => setEditStatus(v as ChecklistItemStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(statusConfig).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="text-sm font-medium">تاريخ الاستحقاق</label>
            <Input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} />
            <label className="text-sm font-medium">إضافة مرفق (رابط)</label>
            <Input
              placeholder="https://..."
              value={editAttachment}
              onChange={(e) => setEditAttachment(e.target.value)}
            />
            {editing && (editing.attachments?.length ?? 0) > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">المرفقات الحالية</label>
                {editing.attachments.map((att: any, idx: number) => (
                  <a
                    key={idx}
                    href={typeof att === "string" ? att : att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-primary hover:underline truncate"
                  >
                    <ExternalLink className="w-3 h-3 shrink-0" />
                    <span className="truncate">{typeof att === "string" ? att : att.name || att.url}</span>
                  </a>
                ))}
              </div>
            )}
            <label className="text-sm font-medium">ملاحظات</label>
            <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button
              onClick={async () => {
                if (!editing) return;
                const merged = editAttachment
                  ? [...(editing.attachments || []), { url: editAttachment, added_at: new Date().toISOString() }]
                  : editing.attachments;
                await updateItem.mutateAsync({
                  id: editing.id,
                  status: editStatus,
                  notes: editNotes,
                  due_date: editDueDate || null,
                  attachments: merged,
                  // Reset completed_at if moving away from done
                  completed_at: editStatus === "done" ? new Date().toISOString() : null,
                } as any);
                setEditing(null);
                setEditAttachment("");
              }}
            >
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
