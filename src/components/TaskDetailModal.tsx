import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ClipboardList, CheckCircle2, Clock, Calendar, User, Tag, Plus, Trash2,
  MessageSquare, Briefcase, UserCheck, Send, Sparkles, AlertCircle, X, ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";

export interface SubtaskItem {
  id: string;
  title: string;
  completed: boolean;
}

export interface TaskComment {
  id: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface ExtendedTask {
  id: string;
  title: string;
  titleEn?: string;
  description?: string;
  descriptionEn?: string;
  assignee: string;
  assigneeEn?: string;
  dueDate: string;
  priority: "high" | "medium" | "low";
  column: "backlog" | "todo" | "in_progress" | "in_review" | "done";
  candidateId?: string | null;
  candidateName?: string | null;
  jobId?: string | null;
  jobTitle?: string | null;
  subtasks?: SubtaskItem[];
  tags?: string[];
  comments?: TaskComment[];
}

interface TaskDetailModalProps {
  task: ExtendedTask | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateTask: (updated: ExtendedTask) => void;
  onDeleteTask: (taskId: string) => void;
}

export default function TaskDetailModal({
  task,
  isOpen,
  onClose,
  onUpdateTask,
  onDeleteTask,
}: TaskDetailModalProps) {
  const { user } = useAuth();
  const { locale } = useI18n();
  const { toast } = useToast();

  if (!task) return null;

  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newTagText, setNewTagText] = useState("");
  const [newCommentText, setNewCommentText] = useState("");
  const [confirmDeleteTask, setConfirmDeleteTask] = useState(false);

  const subtasks = task.subtasks || [];
  const tags = task.tags || [];
  const comments = task.comments || [];

  const completedSubtasksCount = subtasks.filter((s) => s.completed).length;
  const progressPercent = subtasks.length > 0 ? Math.round((completedSubtasksCount / subtasks.length) * 100) : 0;

  const handleToggleSubtask = (subtaskId: string) => {
    const updatedSubtasks = subtasks.map((s) =>
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    );
    onUpdateTask({ ...task, subtasks: updatedSubtasks });
  };

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    const newItem: SubtaskItem = {
      id: `sub-${Date.now()}`,
      title: newSubtaskTitle.trim(),
      completed: false,
    };
    onUpdateTask({ ...task, subtasks: [...subtasks, newItem] });
    setNewSubtaskTitle("");
  };

  const handleDeleteSubtask = (subtaskId: string) => {
    onUpdateTask({ ...task, subtasks: subtasks.filter((s) => s.id !== subtaskId) });
  };

  const handleAddTag = () => {
    if (!newTagText.trim()) return;
    const tag = newTagText.trim();
    if (tags.includes(tag)) return;
    onUpdateTask({ ...task, tags: [...tags, tag] });
    setNewTagText("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onUpdateTask({ ...task, tags: tags.filter((t) => t !== tagToRemove) });
  };

  const handleAddComment = () => {
    if (!newCommentText.trim()) return;
    const author = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "موظف التوظيف";
    const comment: TaskComment = {
      id: `comment-${Date.now()}`,
      authorName: author,
      content: newCommentText.trim(),
      createdAt: new Date().toISOString(),
    };
    onUpdateTask({ ...task, comments: [comment, ...comments] });
    setNewCommentText("");
    toast({ title: "تم إضافة تعليقك على المهمة 💬" });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6 rounded-3xl" dir="rtl">
        <DialogHeader className="space-y-2 border-b border-border/60 pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "font-bold text-xs px-2.5 py-1 rounded-lg",
                  task.priority === "high"
                    ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                    : task.priority === "medium"
                    ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                    : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                )}
              >
                {task.priority === "high" ? "🚨 أولوية عالية" : task.priority === "medium" ? "⚡ أولوية متوسطة" : "🟢 أولوية منخفضة"}
              </Badge>
              <Badge variant="secondary" className="text-xs font-mono">
                {task.column === "done" ? "مكتملة ✅" : task.column === "in_progress" ? "جاري التنفيذ ⏳" : task.column === "in_review" ? "قيد المراجعة 🔍" : "مخططة 📋"}
              </Badge>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/20 hover:bg-destructive/10 gap-1.5 text-xs font-bold rounded-xl"
              onClick={() => setConfirmDeleteTask(true)}
            >
              <Trash2 className="w-3.5 h-3.5" />حذف المهمة
            </Button>
          </div>

          <DialogTitle className="text-xl font-black text-foreground pt-1 leading-snug">
            {task.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Candidate / Job Attached Badges */}
          {(task.candidateName || task.jobTitle) && (
            <div className="flex flex-wrap items-center gap-3 p-3.5 rounded-2xl bg-muted/40 border border-border/60">
              {task.candidateName && (
                <div className="flex items-center gap-2 text-xs font-bold text-primary">
                  <UserCheck className="w-4 h-4" />
                  <span>المرشح المرتبط:</span>
                  <Badge variant="secondary" className="font-bold text-xs bg-primary/10 text-primary border-primary/20">
                    {task.candidateName}
                  </Badge>
                </div>
              )}

              {task.jobTitle && (
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <Briefcase className="w-4 h-4" />
                  <span>الوظيفة المرتبطة:</span>
                  <Badge variant="secondary" className="font-bold text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                    {task.jobTitle}
                  </Badge>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          {task.description && (
            <div className="space-y-1">
              <Label className="text-xs font-bold text-muted-foreground">تفاصيل ووصف المهمة:</Label>
              <p className="text-xs text-foreground bg-card p-3.5 rounded-2xl border border-border/60 leading-relaxed">
                {task.description}
              </p>
            </div>
          )}

          {/* Subtasks Progress Bar & Checklist */}
          <div className="space-y-3 p-4 rounded-2xl bg-card border border-border/60 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <h4 className="font-bold text-xs text-foreground">قائمة المهام الفرعية والأنشطة ({completedSubtasksCount}/{subtasks.length})</h4>
              </div>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">{progressPercent}%</span>
            </div>

            {/* Progress bar */}
            {subtasks.length > 0 && (
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all duration-300 rounded-full" style={{ width: `${progressPercent}%` }} />
              </div>
            )}

            <div className="space-y-2 pt-1">
              {subtasks.map((st) => (
                <div key={st.id} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border/40 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <Checkbox checked={st.completed} onCheckedChange={() => handleToggleSubtask(st.id)} />
                    <span className={cn("text-xs font-medium", st.completed && "line-through text-muted-foreground")}>
                      {st.title}
                    </span>
                  </div>
                  <button onClick={() => handleDeleteSubtask(st.id)} className="text-muted-foreground hover:text-destructive">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              <div className="flex items-center gap-2 pt-1">
                <Input
                  placeholder="إضافة نشاط فرعي جديد..."
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddSubtask()}
                  className="h-9 text-xs rounded-xl"
                />
                <Button size="sm" onClick={handleAddSubtask} disabled={!newSubtaskTitle.trim()} className="h-9 px-3 rounded-xl gap-1 text-xs font-bold">
                  <Plus className="w-3.5 h-3.5" />إضافة
                </Button>
              </div>
            </div>
          </div>

          {/* Tags & Labels */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-primary" />الوسوم والتصنيفات:
            </Label>
            <div className="flex flex-wrap items-center gap-2">
              {tags.map((t) => (
                <Badge key={t} variant="secondary" className="text-xs font-bold gap-1 px-2.5 py-1 rounded-lg">
                  <span>{t}</span>
                  <button onClick={() => handleRemoveTag(t)} className="hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}

              <div className="flex items-center gap-1.5">
                <Input
                  placeholder="وسم جديد..."
                  value={newTagText}
                  onChange={(e) => setNewTagText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                  className="h-8 text-xs rounded-lg w-28"
                />
                <Button size="sm" variant="outline" onClick={handleAddTag} disabled={!newTagText.trim()} className="h-8 px-2.5 text-xs rounded-lg">
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Discussion & Comments */}
          <div className="space-y-3 pt-2">
            <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />ملاحظات ومناقشات فريق التوظيف ({comments.length}):
            </Label>

            <div className="flex items-center gap-2">
              <Input
                placeholder="أضف ملاحظة أو تعليق للمهمة..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                className="h-10 text-xs rounded-xl"
              />
              <Button onClick={handleAddComment} disabled={!newCommentText.trim()} className="h-10 px-4 rounded-xl gap-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white">
                <Send className="w-3.5 h-3.5" />إرسال
              </Button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {comments.map((c) => (
                <div key={c.id} className="p-3 rounded-2xl bg-card border border-border/60 text-xs space-y-1">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="font-bold text-foreground">{c.authorName}</span>
                    <span className="text-[10px]">{new Date(c.createdAt).toLocaleString("ar-SA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <p className="text-foreground leading-relaxed">{c.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border/60 pt-4">
          <Button variant="outline" onClick={onClose} className="rounded-xl h-10 text-xs font-bold">
            إغلاق
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* ─── Delete Task Confirmation Modal (Centered & Modern) ─── */}
      <AlertDialog open={confirmDeleteTask} onOpenChange={setConfirmDeleteTask}>
        <AlertDialogContent className="sm:max-w-[440px] p-6 text-right rounded-2xl border border-border/80 shadow-2xl bg-card" dir="rtl">
          <AlertDialogHeader className="space-y-3 text-right">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-600 flex items-center justify-center border border-red-500/20 shadow-sm">
              <Trash2 className="w-6 h-6 animate-pulse" />
            </div>
            <AlertDialogTitle className="text-lg font-bold text-foreground" style={{ fontFamily: "'Cairo', sans-serif" }}>
              تأكيد حذف المهمة
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed" style={{ fontFamily: "'Cairo', sans-serif" }}>
              هل أنت متأكد من حذف مهمة <strong className="text-foreground">"{task.title}"</strong> نهائياً؟
              <span className="text-xs text-red-600 dark:text-red-400 font-medium block mt-3 bg-red-50 dark:bg-red-950/40 p-2.5 rounded-xl border border-red-200 dark:border-red-900/40">
                ⚠️ سيتم حذف المهمة وجميع المهام الفرعية والتعليقات المرتبطة بها نهائياً.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex flex-row gap-2 justify-end sm:space-x-0" dir="rtl">
            <AlertDialogCancel className="font-bold text-xs rounded-xl px-5 h-10 border-border hover:bg-muted">
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDeleteTask(task.id);
                setConfirmDeleteTask(false);
                onClose();
              }}
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl px-5 h-10 gap-1.5 shadow-md shadow-red-600/20"
            >
              <Trash2 className="w-3.5 h-3.5" />
              تأكيد حذف المهمة
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
