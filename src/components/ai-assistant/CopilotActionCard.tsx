import { useState } from "react";
import { motion } from "framer-motion";
import {
  Briefcase,
  CalendarCheck,
  ArrowRightLeft,
  Filter,
  MessageCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  RotateCcw,
  Sparkles,
  Clock,
  MapPin,
  Building2,
  DollarSign,
  User,
  Video,
  Copy,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import type { CopilotActionData } from "@/types/copilotActions";
import type { CandidateRow, JobRow } from "@/hooks/useJobs";
import type { PipelineStage } from "@/hooks/usePipelineStages";

interface CopilotActionCardProps {
  action: CopilotActionData;
  onExecute: (action: CopilotActionData) => Promise<void>;
  onCancel: (actionId: string) => void;
  onRollback?: (action: CopilotActionData) => Promise<void>;
  jobs?: JobRow[];
  candidates?: CandidateRow[];
  stages?: PipelineStage[];
}

export default function CopilotActionCard({
  action,
  onExecute,
  onCancel,
  onRollback,
  jobs = [],
  candidates = [],
  stages = [],
}: CopilotActionCardProps) {
  const navigate = useNavigate();
  const [isExecuting, setIsExecuting] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [actionData, setActionData] = useState<CopilotActionData>(action);

  // Quick edit states
  const [editableStage, setEditableStage] = useState(
    action.movePayload?.target_stage || ""
  );
  const [interviewDate, setInterviewDate] = useState(
    action.interviewPayload?.date || new Date().toISOString().split("T")[0]
  );
  const [interviewTime, setInterviewTime] = useState(
    action.interviewPayload?.time || "11:00"
  );

  const handleConfirm = async () => {
    setIsExecuting(true);
    try {
      // Merge any local edits
      const updatedAction = { ...actionData };
      if (updatedAction.type === "move_candidate" && updatedAction.movePayload) {
        updatedAction.movePayload.target_stage = editableStage || updatedAction.movePayload.target_stage;
      }
      if (updatedAction.type === "schedule_interview" && updatedAction.interviewPayload) {
        updatedAction.interviewPayload.date = interviewDate;
        updatedAction.interviewPayload.time = interviewTime;
      }
      await onExecute(updatedAction);
      setActionData(prev => ({ ...prev, status: "executed" }));
    } catch (err: any) {
      toast({
        title: "خطأ في تنفيذ الإجراء",
        description: err?.message || "تعذر تنفيذ الأمر في النظام",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleUndo = async () => {
    if (!onRollback) return;
    setIsRollingBack(true);
    try {
      await onRollback(actionData);
      setActionData(prev => ({
        ...prev,
        status: "pending_review",
        resultDetails: "تم التراجع عن الإجراء بنجاح واستعادة الحالة السابقة.",
      }));
    } catch (err: any) {
      toast({
        title: "خطأ في التراجع",
        description: err?.message || "تعذر التراجع",
        variant: "destructive",
      });
    } finally {
      setIsRollingBack(false);
    }
  };

  const getIcon = () => {
    switch (actionData.type) {
      case "create_job":
        return <Briefcase className="w-5 h-5 text-emerald-500" />;
      case "schedule_interview":
        return <CalendarCheck className="w-5 h-5 text-indigo-500" />;
      case "move_candidate":
        return <ArrowRightLeft className="w-5 h-5 text-blue-500" />;
      case "filter_candidates":
        return <Filter className="w-5 h-5 text-amber-500" />;
      case "whatsapp_dispatch":
        return <MessageCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Sparkles className="w-5 h-5 text-primary" />;
    }
  };

  const getTypeLabel = () => {
    switch (actionData.type) {
      case "create_job":
        return "أمر طرح شاغر وظيفي";
      case "schedule_interview":
        return "أمر حجز وجدولة مقابلة فيديو";
      case "move_candidate":
        return "أمر نقل مرحلة مرشح";
      case "filter_candidates":
        return "مطابقة وترشيح المواهب";
      case "whatsapp_dispatch":
        return "أمر تواصل واتساب فوري";
      default:
        return "أمر تنفيذي مباشر";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`mt-4 rounded-2xl border transition-all duration-300 overflow-hidden shadow-lg ${
        actionData.status === "executed"
          ? "border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-card to-background shadow-emerald-500/5"
          : actionData.status === "cancelled"
          ? "border-border/40 bg-card/40 opacity-70"
          : "border-primary/30 bg-gradient-to-br from-primary/5 via-card to-background shadow-primary/5 ring-1 ring-primary/10"
      }`}
      dir="rtl"
    >
      {/* Header Bar */}
      <div className="p-4 border-b border-border/40 flex items-center justify-between gap-3 bg-card/60 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-background/80 border border-border/60 flex items-center justify-center shadow-xs">
            {getIcon()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-foreground">{actionData.title}</h4>
              <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-primary/30 bg-primary/5 text-primary font-bold">
                {getTypeLabel()}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{actionData.description}</p>
          </div>
        </div>

        <div>
          {actionData.status === "executed" ? (
            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 text-[11px] font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              تم التنفيذ في النظام
            </Badge>
          ) : actionData.status === "cancelled" ? (
            <Badge variant="outline" className="text-muted-foreground text-[11px]">
              ملغي
            </Badge>
          ) : (
            <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1 text-[11px] font-bold animate-pulse">
              <Sparkles className="w-3 h-3" />
              بانتظار التأكيد
            </Badge>
          )}
        </div>
      </div>

      {/* Body Payload Content */}
      <div className="p-4 space-y-4 text-xs">
        {/* ACTION: CREATE JOB */}
        {actionData.type === "create_job" && actionData.jobPayload && (
          <div className="space-y-3 bg-card/80 p-3.5 rounded-xl border border-border/50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="flex items-center gap-2">
                <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">المسمى:</span>
                <span className="font-bold text-foreground">{actionData.jobPayload.title}</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">القسم:</span>
                <span className="font-bold text-foreground">{actionData.jobPayload.department}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">الموقع:</span>
                <span className="font-bold text-foreground">{actionData.jobPayload.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">النوع:</span>
                <span className="font-bold text-foreground">{actionData.jobPayload.type}</span>
              </div>
              {actionData.jobPayload.salary_min && (
                <div className="flex items-center gap-2 col-span-2">
                  <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">الراتب المتوقع:</span>
                  <span className="font-bold text-foreground font-mono">
                    {actionData.jobPayload.salary_min.toLocaleString()} - {actionData.jobPayload.salary_max?.toLocaleString() || "..."} ريال
                  </span>
                </div>
              )}
            </div>
            {actionData.jobPayload.description && (
              <p className="text-[11px] text-muted-foreground line-clamp-2 border-t border-border/40 pt-2">
                {actionData.jobPayload.description}
              </p>
            )}
          </div>
        )}

        {/* ACTION: SCHEDULE INTERVIEW */}
        {actionData.type === "schedule_interview" && actionData.interviewPayload && (
          <div className="space-y-3 bg-card/80 p-3.5 rounded-xl border border-border/50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">المرشح:</span>
                <span className="font-bold text-foreground">{actionData.interviewPayload.candidate_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">الوظيفة:</span>
                <span className="font-bold text-foreground">{actionData.interviewPayload.position}</span>
              </div>
              <div className="flex items-center gap-2">
                <Video className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">نوع المقابلة:</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">{actionData.interviewPayload.type}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">المحاور:</span>
                <span className="font-bold text-foreground">{actionData.interviewPayload.interviewer || "مدير التوظيف"}</span>
              </div>
            </div>

            {/* Date & Time Pickers for pending state */}
            {actionData.status === "pending_review" && (
              <div className="grid grid-cols-2 gap-2 border-t border-border/40 pt-2.5">
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-1">تاريخ المقابلة:</label>
                  <Input
                    type="date"
                    value={interviewDate}
                    onChange={e => setInterviewDate(e.target.value)}
                    className="h-8 text-xs bg-background"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground block mb-1">الوقت:</label>
                  <Input
                    type="time"
                    value={interviewTime}
                    onChange={e => setInterviewTime(e.target.value)}
                    className="h-8 text-xs bg-background"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ACTION: MOVE CANDIDATE */}
        {actionData.type === "move_candidate" && actionData.movePayload && (
          <div className="space-y-3 bg-card/80 p-3.5 rounded-xl border border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <span className="font-bold text-sm text-foreground">{actionData.movePayload.candidate_name}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="outline" className="bg-muted/50 text-muted-foreground">
                  {actionData.movePayload.current_stage}
                </Badge>
                <ChevronRight className="w-3.5 h-3.5 text-primary rotate-180" />
                <Badge className="bg-primary/20 text-primary border-primary/30 font-bold">
                  {actionData.status === "pending_review" ? editableStage : actionData.movePayload.target_stage}
                </Badge>
              </div>
            </div>

            {/* Stage Selector if pending */}
            {actionData.status === "pending_review" && (
              <div className="border-t border-border/40 pt-2">
                <label className="text-[10px] text-muted-foreground block mb-1.5 font-bold">
                  اختر المرحلة المستهدفة:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {stages.length > 0
                    ? stages.map(s => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setEditableStage(s.name)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                            editableStage === s.name
                              ? "bg-primary text-primary-foreground border-primary shadow-xs"
                              : "bg-card hover:bg-muted text-muted-foreground border-border/60"
                          }`}
                        >
                          {s.name}
                        </button>
                      ))
                    : [
                        "تقديم جديد",
                        "فرز أولي",
                        "مقابلة هاتفية",
                        "مقابلة تقنية",
                        "عرض وظيفي",
                        "مقبول",
                      ].map(stageName => (
                        <button
                          key={stageName}
                          type="button"
                          onClick={() => setEditableStage(stageName)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                            editableStage === stageName
                              ? "bg-primary text-primary-foreground border-primary shadow-xs"
                              : "bg-card hover:bg-muted text-muted-foreground border-border/60"
                          }`}
                        >
                          {stageName}
                        </button>
                      ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ACTION: FILTER & MATCH CANDIDATES */}
        {actionData.type === "filter_candidates" && actionData.filterPayload && (
          <div className="space-y-3 bg-card/80 p-3 rounded-xl border border-border/50">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground">
                المواهب المطابقة {actionData.filterPayload.job_title && `لـ: ${actionData.filterPayload.job_title}`}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {actionData.filterPayload.matched_candidates?.length || 0} مرشح
              </span>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {actionData.filterPayload.matched_candidates?.map(cand => (
                <div
                  key={cand.id}
                  className="p-2.5 rounded-lg border border-border/60 bg-background flex items-center justify-between gap-2 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                      {cand.name.slice(0, 1)}
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-xs">{cand.name}</p>
                      <p className="text-[10px] text-muted-foreground">{cand.role} · {cand.stage}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                      {cand.match_score}% تطابق
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[10px] px-2 text-primary hover:bg-primary/10 font-bold"
                      onClick={() => navigate(`/candidate/${cand.id}`)}
                    >
                      الملف
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ACTION: WHATSAPP DISPATCH */}
        {actionData.type === "whatsapp_dispatch" && actionData.whatsappPayload && (
          <div className="space-y-2.5 bg-card/80 p-3.5 rounded-xl border border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-bold text-foreground">{actionData.whatsappPayload.candidate_name}</span>
              </div>
              <span className="font-mono text-muted-foreground dir-ltr text-[11px]">
                {actionData.whatsappPayload.phone}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-background border border-border/40 text-[11px] text-foreground/90 whitespace-pre-wrap">
              {actionData.whatsappPayload.message}
            </div>
          </div>
        )}

        {/* Result details message if executed */}
        {actionData.resultDetails && (
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[11px] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionData.resultDetails}</span>
          </div>
        )}
      </div>

      {/* Action Footer Controls */}
      <div className="p-3 bg-muted/20 border-t border-border/40 flex items-center justify-between gap-2">
        {actionData.status === "pending_review" && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCancel(actionData.id)}
              disabled={isExecuting}
              className="text-xs h-8 text-muted-foreground hover:text-destructive"
            >
              <XCircle className="w-3.5 h-3.5 ml-1" />
              إلغاء الأمر
            </Button>

            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={isExecuting}
              className="text-xs h-8 gap-1.5 font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:shadow-md transition-all"
            >
              {isExecuting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin ml-1" />
                  جاري التنفيذ في النظام...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 ml-1" />
                  تأكيد وتنفيذ فوري ⚡
                </>
              )}
            </Button>
          </>
        )}

        {actionData.status === "executed" && (
          <div className="w-full flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {actionData.type === "create_job" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1 font-bold text-primary border-primary/30"
                  onClick={() => navigate("/jobs")}
                >
                  <ExternalLink className="w-3 h-3 ml-1" />
                  عرض الوظائف
                </Button>
              )}

              {actionData.type === "schedule_interview" && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1 font-bold text-indigo-600 border-indigo-500/30"
                    onClick={() => navigate("/interviews")}
                  >
                    <ExternalLink className="w-3 h-3 ml-1" />
                    جدول المقابلات
                  </Button>
                  {actionData.interviewPayload?.meeting_url && (
                    <Button
                      size="sm"
                      className="h-8 text-xs gap-1 font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                      onClick={() => window.open(actionData.interviewPayload!.meeting_url, "_blank")}
                    >
                      <Video className="w-3 h-3 ml-1" />
                      انضم لقاعة الفيديو
                    </Button>
                  )}
                </>
              )}

              {actionData.type === "move_candidate" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1 font-bold text-primary border-primary/30"
                  onClick={() => navigate("/pipeline")}
                >
                  <ExternalLink className="w-3 h-3 ml-1" />
                  عرض خط الأنابيب
                </Button>
              )}
            </div>

            {/* Undo button for reversible actions like move_candidate */}
            {actionData.type === "move_candidate" && onRollback && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUndo}
                disabled={isRollingBack}
                className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground"
              >
                {isRollingBack ? (
                  <Loader2 className="w-3 h-3 animate-spin ml-1" />
                ) : (
                  <RotateCcw className="w-3 h-3 ml-1" />
                )}
                تراجع
              </Button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
