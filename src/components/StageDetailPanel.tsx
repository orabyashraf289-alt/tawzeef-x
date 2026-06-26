import { useState, useRef, useCallback } from "react";
import { usePipelineStages, useStageMutations, useAllSubStages, useSubStageMutations, type PipelineStage } from "@/hooks/usePipelineStages";
import { useAssessments } from "@/hooks/useQuestionBank";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Trash2, Pencil, Check, X, Star, ChevronDown, ChevronRight,
  FileText, FileSearch, Phone, Code, Users, Briefcase, Circle, CheckCircle, ArrowRightLeft,
  Shield, Bot, ClipboardCheck, ListTree, Clock, Video, Link2, Copy,
  Mail, Target, Award, Heart, ThumbsUp, AlertTriangle,
  Eye, Timer, Bell, Save, Zap, Settings2, GripVertical,
  MessageSquare, Palette,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  "file-text": FileText, "file-search": FileSearch, phone: Phone,
  code: Code, users: Users, briefcase: Briefcase, circle: Circle,
  mail: Mail, "message-square": MessageSquare, zap: Zap,
  target: Target, award: Award, heart: Heart, "thumbs-up": ThumbsUp,
  "alert-triangle": AlertTriangle, eye: Eye, star: Star, timer: Timer,
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

/* Stage types configuration */
const STAGE_TYPES = [
  { value: "general", label: "عام", icon: Circle, description: "مرحلة عامة بدون إجراءات تلقائية" },
  { value: "assessment", label: "اختبار", icon: ClipboardCheck, description: "إرسال اختبار تلقائي للمرشح" },
  { value: "interview", label: "مقابلة", icon: Video, description: "جدولة مقابلة مع رابط اجتماع" },
  { value: "ai_evaluation", label: "تقييم ذكي", icon: Bot, description: "تقييم AI تلقائي للمرشح" },
  { value: "review", label: "مراجعة", icon: FileSearch, description: "مراجعة يدوية من الفريق" },
  { value: "offer", label: "عرض وظيفي", icon: Briefcase, description: "إعداد وإرسال العرض الوظيفي" },
];

const MEETING_PLATFORMS = [
  { value: "jitsi", label: "Jitsi Meet (مجاني)", icon: "🎥" },
  { value: "zoom", label: "Zoom", icon: "📹" },
  { value: "google_meet", label: "Google Meet", icon: "📺" },
  { value: "teams", label: "Microsoft Teams", icon: "💼" },
  { value: "custom", label: "رابط مخصص", icon: "🔗" },
];

const ASSIGNEE_TYPES = [
  { value: "recruiter", label: "المُوظِّف", icon: "👤" },
  { value: "reviewer", label: "المُراجع", icon: "🔍" },
  { value: "candidate", label: "المرشح", icon: "🙋" },
];

interface StageDetailPanelProps {
  stage: PipelineStage;
  onClose?: () => void;
  compact?: boolean;
}

export default function StageDetailPanel({ stage, onClose, compact = false }: StageDetailPanelProps) {
  const { updateStage, updateTransitionRules, setDefaultStage } = useStageMutations();
  const { addSubStage, updateSubStage, deleteSubStage } = useSubStageMutations();
  const { data: assessments = [] } = useAssessments();
  const { data: allSubStages = [] } = useAllSubStages();
  const { data: allStages = [] } = usePipelineStages();
  const { user } = useAuth();
  const otherStages = allStages.filter(s => s.id !== stage.id && s.is_active);
  const stageSubStages = allSubStages.filter(s => s.stage_id === stage.id).sort((a, b) => a.sort_order - b.sort_order);

  // Fetch team members (profiles) for user assignment
  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team_profiles_for_stages"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, job_title, avatar_url");
      if (error) throw error;
      return data || [];
    },
  });

  const [assignedUsers, setAssignedUsers] = useState<string[]>(stage.assigned_user_ids || []);

  const automationRules = (stage.automation_rules || {}) as any;
  const rules = stage.transition_rules || {};

  // Stage type
  const [stageType, setStageType] = useState(automationRules.stage_type || "general");

  // Transition rules
  const [requireInterview, setRequireInterview] = useState(!!rules.require_interview);
  const [requireAI, setRequireAI] = useState(!!rules.require_ai_evaluation);
  const [requireAssessment, setRequireAssessment] = useState(!!rules.require_assessment);
  const [minScore, setMinScore] = useState(rules.min_ai_score || 0);

  // Assessment config
  const [linkedAssessment, setLinkedAssessment] = useState(stage.assessment_id || "");
  const [autoSendAssessment, setAutoSendAssessment] = useState(automationRules.auto_send_assessment !== false);

  // Interview config
  const [meetingPlatform, setMeetingPlatform] = useState(automationRules.meeting_platform || "jitsi");
  const [autoCreateMeeting, setAutoCreateMeeting] = useState(!!automationRules.auto_create_meeting);
  const [defaultInterviewDuration, setDefaultInterviewDuration] = useState(automationRules.interview_duration || 30);
  const [interviewType, setInterviewType] = useState(automationRules.interview_type || "عن بُعد");
  const [customMeetingUrl, setCustomMeetingUrl] = useState(automationRules.custom_meeting_url || "");

  // AI eval config
  const [autoAIEval, setAutoAIEval] = useState(!!automationRules.auto_ai_evaluation);
  const [aiMinScore, setAiMinScore] = useState(automationRules.ai_min_score || 60);
  const [autoRejectBelowScore, setAutoRejectBelowScore] = useState(!!automationRules.auto_reject_below_score);

  // General automation
  const [notifyEmail, setNotifyEmail] = useState(automationRules.notify_candidate_email !== false);
  const [emailTemplate, setEmailTemplate] = useState(automationRules.email_template || "");
  const [autoAdvance, setAutoAdvance] = useState(!!automationRules.auto_advance);
  const [webhookUrl, setWebhookUrl] = useState(automationRules.webhook_url || "");

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(stage.name);
  const [editColor, setEditColor] = useState(stage.color);
  const [editIcon, setEditIcon] = useState(stage.icon);

  // Sub-stage state
  const [newSubName, setNewSubName] = useState("");
  const [expandedSub, setExpandedSub] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editHours, setEditHours] = useState(0);
  const [editAssignee, setEditAssignee] = useState("recruiter");
  const [newCheckItem, setNewCheckItem] = useState("");

  // Drag-and-drop
  const dragItemRef = useRef<number | null>(null);
  const dragOverRef = useRef<number | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const handleDragStart = useCallback((idx: number) => { dragItemRef.current = idx; setDragIdx(idx); }, []);
  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => { e.preventDefault(); dragOverRef.current = idx; }, []);
  const handleDrop = useCallback(() => {
    const from = dragItemRef.current;
    const to = dragOverRef.current;
    if (from === null || to === null || from === to) { setDragIdx(null); return; }
    const reordered = [...stageSubStages];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    reordered.forEach((sub, i) => {
      if (sub.sort_order !== i) updateSubStage.mutate({ id: sub.id, sort_order: i } as any);
    });
    dragItemRef.current = null; dragOverRef.current = null; setDragIdx(null);
  }, [stageSubStages, updateSubStage]);

  const activeAssessments = assessments.filter((a: any) => a.is_active);

  const saveAllSettings = async () => {
    try {
      // Save transition rules
      await updateTransitionRules.mutateAsync({
        id: stage.id,
        rules: {
          ...(requireInterview ? { require_interview: true } : {}),
          ...(requireAI ? { require_ai_evaluation: true } : {}),
          ...(requireAssessment ? { require_assessment: true } : {}),
          ...(minScore > 0 ? { min_ai_score: minScore } : {}),
        },
      });

      // Save automation rules + assessment link
      const fullAutomationRules: any = {
        stage_type: stageType,
        notify_candidate_email: notifyEmail,
        ...(emailTemplate ? { email_template: emailTemplate } : {}),
        ...(autoAdvance ? { auto_advance: true } : {}),
        ...(webhookUrl ? { webhook_url: webhookUrl } : {}),
      };

      if (stageType === "assessment") {
        fullAutomationRules.auto_send_assessment = autoSendAssessment;
      }
      if (stageType === "interview") {
        fullAutomationRules.meeting_platform = meetingPlatform;
        fullAutomationRules.auto_create_meeting = autoCreateMeeting;
        fullAutomationRules.interview_duration = defaultInterviewDuration;
        fullAutomationRules.interview_type = interviewType;
        if (meetingPlatform === "custom" && customMeetingUrl) {
          fullAutomationRules.custom_meeting_url = customMeetingUrl;
        }
      }
      if (stageType === "ai_evaluation") {
        fullAutomationRules.auto_ai_evaluation = autoAIEval;
        fullAutomationRules.ai_min_score = aiMinScore;
        fullAutomationRules.auto_reject_below_score = autoRejectBelowScore;
      }

      await updateStage.mutateAsync({
        id: stage.id,
        assessment_id: linkedAssessment && linkedAssessment !== "none" ? linkedAssessment : null,
        automation_rules: fullAutomationRules,
        assigned_user_ids: assignedUsers,
      } as any);

      toast({ title: "تم حفظ جميع إعدادات المرحلة ✅" });
    } catch {
      toast({ title: "خطأ في الحفظ", variant: "destructive" });
    }
  };

  const handleEditSave = async () => {
    try {
      await updateStage.mutateAsync({ id: stage.id, name: editName.trim(), color: editColor, icon: editIcon });
      toast({ title: "تم تحديث المرحلة" });
      setIsEditing(false);
    } catch {
      toast({ title: "خطأ", variant: "destructive" });
    }
  };

  const startExpand = (sub: any) => {
    setExpandedSub(expandedSub === sub.id ? null : sub.id);
    setEditDesc(sub.description || "");
    setEditHours(sub.estimated_hours || 0);
    setEditAssignee(sub.assignee_type || "recruiter");
  };

  const getProgress = (sub: any) => {
    const list = Array.isArray(sub.checklist) ? sub.checklist : [];
    if (list.length === 0) return 0;
    return Math.round((list.filter((it: any) => it.done).length / list.length) * 100);
  };

  const toggleCheckItem = (sub: any, itemId: string) => {
    const list = Array.isArray(sub.checklist) ? [...sub.checklist] : [];
    const updated = list.map((it: any) => it.id === itemId ? { ...it, done: !it.done } : it);
    updateSubStage.mutate({ id: sub.id, checklist: updated } as any);
  };

  const addCheckItem = (sub: any) => {
    if (!newCheckItem.trim()) return;
    const list = Array.isArray(sub.checklist) ? [...sub.checklist] : [];
    list.push({ id: crypto.randomUUID(), text: newCheckItem.trim(), done: false });
    updateSubStage.mutate({ id: sub.id, checklist: list } as any);
    setNewCheckItem("");
  };

  const deleteCheckItem = (sub: any, itemId: string) => {
    const list = Array.isArray(sub.checklist) ? sub.checklist.filter((it: any) => it.id !== itemId) : [];
    updateSubStage.mutate({ id: sub.id, checklist: list } as any);
  };

  const saveSubDetails = (subId: string, checklist: any[]) => {
    updateSubStage.mutate({ id: subId, description: editDesc, estimated_hours: editHours, assignee_type: editAssignee, checklist } as any);
    toast({ title: "تم حفظ التفاصيل ✅" });
  };

  const generateJitsiLink = () => {
    const roomName = `tawzeef-${stage.name.replace(/\s/g, "-")}-${Date.now()}`;
    return `https://meet.jit.si/${roomName}`;
  };

  const currentTypeInfo = STAGE_TYPES.find(t => t.value === stageType);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-card rounded-2xl border border-border/50 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border/30">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: stage.color + "20" }}>
          <IconComponent icon={stage.icon} className="w-5 h-5" style={{ color: stage.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg text-foreground">{stage.name}</h3>
            {currentTypeInfo && (
              <Badge variant="secondary" className="text-[10px] gap-1">
                <currentTypeInfo.icon className="w-3 h-3" />
                {currentTypeInfo.label}
              </Badge>
            )}
            {stage.is_default && (
              <Badge className="bg-amber-500/10 text-amber-600 text-[10px]">
                <Star className="w-3 h-3 me-0.5" /> افتراضية
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">تهيئة المرحلة • الإجراءات التلقائية • المراحل الفرعية</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Switch checked={stage.is_active}
            onCheckedChange={async (v) => {
              await updateStage.mutateAsync({ id: stage.id, is_active: v });
              toast({ title: v ? "تم تفعيل المرحلة" : "تم تعطيل المرحلة" });
            }} />
          {!stage.is_default && (
            <Button variant="ghost" size="sm" className="text-amber-500 gap-1 text-xs h-8"
              onClick={async () => { await setDefaultStage.mutateAsync(stage.id); toast({ title: "تم التعيين كافتراضية ⭐" }); }}>
              <Star className="w-3 h-3" /> افتراضية
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-8" onClick={() => setIsEditing(!isEditing)}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          {onClose && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Edit Section */}
      <AnimatePresence>
        {isEditing && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-border/30">
            <div className="p-4 space-y-3">
              <Input value={editName} onChange={e => setEditName(e.target.value)} className="font-medium" />
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">اللون</p>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setEditColor(c)}
                      className={cn("w-5 h-5 rounded-md transition-all", editColor === c && "ring-2 ring-offset-1 ring-primary")}
                      style={{ backgroundColor: c }} />
                  ))}
                  <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)}
                    className="w-6 h-6 rounded border border-border/50 cursor-pointer p-0.5 ms-1" />
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">الأيقونة</p>
                <div className="flex flex-wrap gap-1">
                  {ICONS.map(ic => (
                    <button key={ic.id} onClick={() => setEditIcon(ic.id)}
                      className={cn("flex items-center gap-1 px-2 py-1 rounded-md text-[10px] border",
                        editIcon === ic.id ? "border-primary bg-primary/5 text-primary" : "border-border/50 text-muted-foreground")}>
                      <IconComponent icon={ic.id} className="w-3 h-3" />{ic.label}
                    </button>
                  ))}
                </div>
              </div>
              <Button size="sm" onClick={handleEditSave} className="gap-1"><Check className="w-3 h-3" /> حفظ التعديلات</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs Content */}
      <Tabs defaultValue="type" className="w-full">
        <TabsList className="w-full justify-start rounded-none border-b border-border/30 bg-transparent px-4 h-auto py-0 gap-0">
          <TabsTrigger value="type" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs py-2.5 gap-1.5">
            <Zap className="w-3.5 h-3.5" /> نوع المرحلة
          </TabsTrigger>
          <TabsTrigger value="rules" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs py-2.5 gap-1.5">
            <Shield className="w-3.5 h-3.5" /> شروط الانتقال
          </TabsTrigger>
          <TabsTrigger value="automation" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs py-2.5 gap-1.5">
            <Settings2 className="w-3.5 h-3.5" /> الأتمتة
          </TabsTrigger>
          <TabsTrigger value="substages" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs py-2.5 gap-1.5">
            <ListTree className="w-3.5 h-3.5" /> المراحل الفرعية ({stageSubStages.length})
          </TabsTrigger>
          <TabsTrigger value="team" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs py-2.5 gap-1.5">
            <Users className="w-3.5 h-3.5" /> الفريق ({assignedUsers.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab: Stage Type */}
        <TabsContent value="type" className="p-4 space-y-4 mt-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {STAGE_TYPES.map(type => {
              const TypeIcon = type.icon;
              const isSelected = stageType === type.value;
              return (
                <button key={type.value} onClick={() => setStageType(type.value)}
                  className={cn(
                    "text-start p-3 rounded-xl border-2 transition-all space-y-1",
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border/50 hover:border-primary/30 hover:bg-muted/30"
                  )}>
                  <div className="flex items-center gap-2">
                    <TypeIcon className={cn("w-4 h-4", isSelected ? "text-primary" : "text-muted-foreground")} />
                    <span className={cn("text-sm font-semibold", isSelected ? "text-primary" : "text-foreground")}>{type.label}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">{type.description}</p>
                </button>
              );
            })}
          </div>

          {/* Type-specific settings */}
          <AnimatePresence mode="wait">
            {stageType === "assessment" && (
              <motion.div key="assessment" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="bg-muted/30 rounded-xl p-4 border border-border/20 space-y-3">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-primary" /> إعدادات الاختبار
                </p>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">الاختبار المرتبط</label>
                  <Select value={linkedAssessment || "none"} onValueChange={setLinkedAssessment}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="اختر اختبار" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون اختبار</SelectItem>
                      {activeAssessments.map((a: any) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.title} {a.duration_minutes ? `(${a.duration_minutes} دقيقة)` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Switch checked={autoSendAssessment} onCheckedChange={setAutoSendAssessment} />
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  إرسال الاختبار تلقائياً عند وصول المرشح لهذه المرحلة
                </label>
                {linkedAssessment && linkedAssessment !== "none" && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-primary/5 rounded-lg p-2.5">
                    <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                    عند وصول المرشح لهذه المرحلة سيتم إرسال رابط الاختبار تلقائياً لبريده
                  </div>
                )}
              </motion.div>
            )}

            {stageType === "interview" && (
              <motion.div key="interview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="bg-muted/30 rounded-xl p-4 border border-border/20 space-y-3">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Video className="w-4 h-4 text-primary" /> إعدادات المقابلة
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">منصة الاجتماع</label>
                    <Select value={meetingPlatform} onValueChange={setMeetingPlatform}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MEETING_PLATFORMS.map(p => (
                          <SelectItem key={p.value} value={p.value}>{p.icon} {p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">نوع المقابلة</label>
                    <Select value={interviewType} onValueChange={setInterviewType}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="عن بُعد">عن بُعد</SelectItem>
                        <SelectItem value="حضوري">حضوري</SelectItem>
                        <SelectItem value="هاتفي">هاتفي</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">مدة المقابلة (دقيقة)</label>
                  <div className="flex items-center gap-3">
                    <Slider value={[defaultInterviewDuration]} onValueChange={v => setDefaultInterviewDuration(v[0])}
                      min={15} max={120} step={15} className="flex-1" />
                    <Badge variant="outline" className="text-xs shrink-0">{defaultInterviewDuration} دقيقة</Badge>
                  </div>
                </div>

                {meetingPlatform === "custom" && (
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">رابط الاجتماع المخصص</label>
                    <Input value={customMeetingUrl} onChange={e => setCustomMeetingUrl(e.target.value)}
                      placeholder="https://meet.example.com/..." className="h-9 text-sm" />
                  </div>
                )}

                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Switch checked={autoCreateMeeting} onCheckedChange={setAutoCreateMeeting} />
                  <Link2 className="w-4 h-4 text-muted-foreground" />
                  إنشاء رابط اجتماع تلقائياً عند جدولة المقابلة
                </label>

                {meetingPlatform === "jitsi" && (
                  <div className="flex items-center gap-2 text-xs bg-primary/5 rounded-lg p-2.5">
                    <Video className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-muted-foreground">Jitsi Meet مجاني ولا يحتاج حساب - سيتم إنشاء رابط فريد لكل مقابلة</span>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 shrink-0"
                      onClick={() => {
                        const link = generateJitsiLink();
                        navigator.clipboard.writeText(link);
                        toast({ title: "تم نسخ رابط تجريبي 📋", description: link });
                      }}>
                      <Copy className="w-3 h-3" /> تجربة رابط
                    </Button>
                  </div>
                )}
              </motion.div>
            )}

            {stageType === "ai_evaluation" && (
              <motion.div key="ai_eval" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="bg-muted/30 rounded-xl p-4 border border-border/20 space-y-3">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Bot className="w-4 h-4 text-primary" /> إعدادات التقييم الذكي
                </p>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Switch checked={autoAIEval} onCheckedChange={setAutoAIEval} />
                  <Zap className="w-4 h-4 text-muted-foreground" />
                  تقييم AI تلقائي عند الوصول لهذه المرحلة
                </label>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">الحد الأدنى للدرجة: <strong className="text-foreground">{aiMinScore}%</strong></label>
                  <Slider value={[aiMinScore]} onValueChange={v => setAiMinScore(v[0])} max={100} step={5} className="max-w-[250px]" />
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Switch checked={autoRejectBelowScore} onCheckedChange={setAutoRejectBelowScore} />
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  رفض تلقائي للمرشحين تحت الحد الأدنى
                </label>
                {autoRejectBelowScore && (
                  <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-500/10 rounded-lg p-2.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    سيتم رفض المرشحين تلقائياً إذا كانت درجة AI أقل من {aiMinScore}%
                  </div>
                )}
              </motion.div>
            )}

            {stageType === "offer" && (
              <motion.div key="offer" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="bg-muted/30 rounded-xl p-4 border border-border/20 space-y-2">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-primary" /> إعدادات العرض الوظيفي
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-primary/5 rounded-lg p-2.5">
                  <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                  عند وصول المرشح لهذه المرحلة يمكنك إنشاء عرض وظيفي من ملفه الشخصي
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>

        {/* Tab: Transition Rules */}
        <TabsContent value="rules" className="p-4 space-y-4 mt-0">
          <div className="space-y-3 bg-muted/30 rounded-xl p-4 border border-border/20">
            <p className="text-sm font-semibold flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-amber-500" /> شروط يجب تحقيقها قبل الانتقال للمرحلة التالية
            </p>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={requireInterview} onCheckedChange={v => setRequireInterview(!!v)} />
              <Video className="w-4 h-4 text-muted-foreground" />
              يجب إكمال مقابلة وتقييمها
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={requireAI} onCheckedChange={v => setRequireAI(!!v)} />
              <Bot className="w-4 h-4 text-muted-foreground" />
              يجب وجود تقييم AI
            </label>
            {requireAI && (
              <div className="ms-8 space-y-1.5">
                <p className="text-xs text-muted-foreground">الحد الأدنى للدرجة: <strong className="text-foreground">{minScore}%</strong></p>
                <Slider value={[minScore]} onValueChange={v => setMinScore(v[0])} max={100} step={5} className="w-full max-w-[200px]" />
              </div>
            )}
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={requireAssessment} onCheckedChange={v => setRequireAssessment(!!v)} />
              <ClipboardCheck className="w-4 h-4 text-muted-foreground" />
              يجب إكمال الاختبار المرتبط
            </label>
          </div>

          {/* Linked Assessment (always visible) */}
          <div className="space-y-2">
            <p className="text-sm font-semibold flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" /> اختبار مرتبط بهذه المرحلة
            </p>
            <Select value={linkedAssessment || "none"} onValueChange={setLinkedAssessment}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="بدون اختبار" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">بدون اختبار</SelectItem>
                {activeAssessments.map((a: any) => (
                  <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </TabsContent>

        {/* Tab: Automation */}
        <TabsContent value="automation" className="p-4 space-y-4 mt-0">
          <div className="space-y-3">
            <p className="text-sm font-semibold flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" /> إجراءات تلقائية عند وصول المرشح
            </p>

            <label className="flex items-center gap-3 text-sm cursor-pointer bg-muted/30 rounded-xl p-3 border border-border/20">
              <Switch checked={notifyEmail} onCheckedChange={setNotifyEmail} />
              <Bell className="w-4 h-4 text-muted-foreground" />
              <div>
                <span className="font-medium">إرسال بريد إلكتروني للمرشح</span>
                <p className="text-[10px] text-muted-foreground">إشعار المرشح تلقائياً عند انتقاله لهذه المرحلة</p>
              </div>
            </label>

            {notifyEmail && (
              <div className="ms-4 space-y-1.5">
                <label className="text-xs text-muted-foreground">نص البريد المخصص (اختياري)</label>
                <Textarea value={emailTemplate} onChange={e => setEmailTemplate(e.target.value)}
                  placeholder="اكتب نص البريد المخصص أو اتركه فارغاً لاستخدام القالب الافتراضي..."
                  className="text-sm min-h-[60px]" />
              </div>
            )}

            <label className="flex items-center gap-3 text-sm cursor-pointer bg-muted/30 rounded-xl p-3 border border-border/20">
              <Switch checked={autoAdvance} onCheckedChange={setAutoAdvance} />
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <div>
                <span className="font-medium">تقدّم تلقائي للمرحلة التالية</span>
                <p className="text-[10px] text-muted-foreground">نقل المرشح تلقائياً عند إكمال جميع متطلبات المرحلة</p>
              </div>
            </label>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground flex items-center gap-1">
                <Link2 className="w-3 h-3" /> Webhook URL (اختياري)
              </label>
              <Input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)}
                placeholder="https://your-api.com/webhook" className="h-9 text-sm font-mono" dir="ltr" />
              <p className="text-[10px] text-muted-foreground">سيتم إرسال إشعار HTTP عند انتقال مرشح لهذه المرحلة</p>
            </div>
          </div>
        </TabsContent>

        {/* Tab: Sub-stages */}
        <TabsContent value="substages" className="p-4 space-y-4 mt-0">
          {stageSubStages.length > 0 && (
            <div className="flex items-center gap-1">
              {stageSubStages.map((sub: any, i: number) => {
                const progress = getProgress(sub);
                return (
                  <div key={sub.id} className="flex-1 flex items-center gap-0.5">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    {i < stageSubStages.length - 1 && <ChevronRight className="w-2.5 h-2.5 text-muted-foreground/40 shrink-0" />}
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {stageSubStages.map((sub: any, i: number) => {
              const progress = getProgress(sub);
              const checklist = Array.isArray(sub.checklist) ? sub.checklist : [];
              const isExpanded = expandedSub === sub.id;
              const assigneeInfo = ASSIGNEE_TYPES.find(a => a.value === (sub.assignee_type || "recruiter"));
              const isDragging = dragIdx === i;

              return (
                <div key={sub.id}
                  draggable
                  onDragStart={() => handleDragStart(i)}
                  onDragOver={(e) => handleDragOver(e, i)}
                  onDrop={handleDrop}
                  onDragEnd={() => setDragIdx(null)}
                  className={cn("bg-muted/20 rounded-xl border border-border/20 overflow-hidden cursor-grab active:cursor-grabbing transition-opacity",
                    isDragging && "opacity-40")}>
                  <div className="flex items-center gap-2 px-3 py-2.5 text-sm cursor-pointer" onClick={() => startExpand(sub)}>
                    <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                    <span className="text-muted-foreground text-xs w-5 shrink-0">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-foreground font-medium block truncate">{sub.name}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        {sub.estimated_hours > 0 && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />{sub.estimated_hours}h
                          </span>
                        )}
                        <span className="text-[10px]">{assigneeInfo?.icon}</span>
                        {checklist.length > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            {checklist.filter((c: any) => c.done).length}/{checklist.length}
                          </span>
                        )}
                        {progress === 100 && <CheckCircle className="w-3 h-3 text-green-500" />}
                      </div>
                    </div>
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    {otherStages.length > 0 && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                            onClick={e => e.stopPropagation()} title="نقل لمرحلة أخرى">
                            <ArrowRightLeft className="w-3 h-3" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-1" align="end">
                          <p className="text-[10px] text-muted-foreground px-2 py-1">نقل إلى مرحلة:</p>
                          {otherStages.map(os => (
                            <button key={os.id}
                              className="w-full text-start flex items-center gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-muted transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                const targetSubCount = allSubStages.filter(s => s.stage_id === os.id).length;
                                updateSubStage.mutate({ id: sub.id, stage_id: os.id, sort_order: targetSubCount } as any);
                                toast({ title: `تم نقل "${sub.name}" إلى "${os.name}" ✅` });
                              }}>
                              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: os.color }} />
                              {os.name}
                            </button>
                          ))}
                        </PopoverContent>
                      </Popover>
                    )}
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive"
                      onClick={e => { e.stopPropagation(); deleteSubStage.mutate(sub.id); }}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden">
                        <div className="px-3 pb-3 space-y-2.5 border-t border-border/20 pt-2.5">
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">الوصف</label>
                            <Input value={editDesc} onChange={e => setEditDesc(e.target.value)}
                              placeholder="وصف هذه الخطوة..." className="h-8 text-sm mt-1" />
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="text-xs font-medium text-muted-foreground flex items-center gap-0.5">
                                <Clock className="w-3 h-3" /> المدة (ساعات)
                              </label>
                              <Input type="number" value={editHours} onChange={e => setEditHours(Number(e.target.value))}
                                className="h-8 text-sm mt-1" min={0} />
                            </div>
                            <div className="flex-1">
                              <label className="text-xs font-medium text-muted-foreground">المسؤول</label>
                              <Select value={editAssignee} onValueChange={setEditAssignee}>
                                <SelectTrigger className="h-8 text-sm mt-1"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {ASSIGNEE_TYPES.map(a => (
                                    <SelectItem key={a.value} value={a.value}>{a.icon} {a.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground flex items-center gap-0.5">
                              <ClipboardCheck className="w-3 h-3" /> قائمة المهام ({checklist.length})
                            </label>
                            <div className="space-y-1 mt-1">
                              {checklist.map((item: any) => (
                                <div key={item.id} className="flex items-center gap-1.5 text-xs">
                                  <Checkbox checked={item.done} onCheckedChange={() => toggleCheckItem(sub, item.id)} />
                                  <span className={cn("flex-1", item.done && "line-through text-muted-foreground")}>{item.text}</span>
                                  <button onClick={() => deleteCheckItem(sub, item.id)} className="text-destructive/50 hover:text-destructive">
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                              <div className="flex items-center gap-1">
                                <Input value={newCheckItem} onChange={e => setNewCheckItem(e.target.value)}
                                  placeholder="إضافة مهمة..." className="h-7 text-xs flex-1"
                                  onKeyDown={e => e.key === "Enter" && addCheckItem(sub)} />
                                <Button size="sm" variant="ghost" className="h-7 px-2" disabled={!newCheckItem.trim()}
                                  onClick={() => addCheckItem(sub)}>
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                          <Button size="sm" className="h-7 text-xs gap-1 w-full" onClick={() => saveSubDetails(sub.id, checklist)}>
                            <Check className="w-3 h-3" /> حفظ التفاصيل
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Add sub-stage */}
          <div className="flex items-center gap-2">
            <Input value={newSubName} onChange={e => setNewSubName(e.target.value)}
              placeholder="أضف خطوة فرعية..." className="h-9 text-sm flex-1"
              onKeyDown={e => {
                if (e.key === "Enter" && newSubName.trim()) {
                  addSubStage.mutate({ stage_id: stage.id, name: newSubName.trim(), sort_order: stageSubStages.length });
                  setNewSubName("");
                }
              }} />
            <Button size="sm" variant="outline" className="h-9 gap-1" disabled={!newSubName.trim()}
              onClick={() => { addSubStage.mutate({ stage_id: stage.id, name: newSubName.trim(), sort_order: stageSubStages.length }); setNewSubName(""); }}>
              <Plus className="w-3 h-3" /> إضافة
            </Button>
          </div>
        </TabsContent>

        {/* Tab: Team Assignment */}
        <TabsContent value="team" className="p-4 space-y-4 mt-0">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> المستخدمون المسؤولون عن هذه المرحلة
            </p>
            <p className="text-xs text-muted-foreground">
              حدد أعضاء الفريق الذين سيكونون مسؤولين عن هذه المرحلة
            </p>
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {teamMembers.map((member: any) => {
              const isAssigned = assignedUsers.includes(member.user_id);
              return (
                <button
                  key={member.user_id}
                  onClick={() => {
                    setAssignedUsers(prev =>
                      isAssigned
                        ? prev.filter(id => id !== member.user_id)
                        : [...prev, member.user_id]
                    );
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-start",
                    isAssigned
                      ? "border-primary bg-primary/5"
                      : "border-border/50 hover:border-primary/30"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                    isAssigned ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {member.full_name?.charAt(0) || "؟"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{member.full_name || "بدون اسم"}</p>
                    {member.job_title && <p className="text-[10px] text-muted-foreground truncate">{member.job_title}</p>}
                  </div>
                  {isAssigned && <CheckCircle className="w-5 h-5 text-primary shrink-0" />}
                </button>
              );
            })}
            {teamMembers.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-6">لا يوجد أعضاء فريق</p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Save All Button */}
      <div className="p-4 border-t border-border/30">
        <Button onClick={saveAllSettings} className="w-full gap-2">
          <Save className="w-4 h-4" /> حفظ جميع الإعدادات
        </Button>
      </div>
    </motion.div>
  );
}
