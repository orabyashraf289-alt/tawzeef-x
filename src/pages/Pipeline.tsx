import { useState, useMemo, memo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useI18n } from "@/contexts/I18nContext";
import { useCandidates, useJobs, useInterviews } from "@/hooks/useJobs";
import { useActiveStages, usePipelineStages, useCandidateStageActions, type TransitionRules } from "@/hooks/usePipelineStages";
import { useRecordTransition } from "@/hooks/useStageTransitions";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from "@/components/ui/dropdown-menu";
import { Star, GripVertical, Users, Search, Filter, TrendingUp, Clock, Bot, Kanban, List, CheckCircle2, ArrowRight, ArrowUpDown, BarChart3, ClipboardCopy, ExternalLink, FileCheck, Mail, Loader2, Eye, Check, AlertTriangle, Settings, Sliders, ClipboardCheck, Video, Lock, XCircle, Pause, RotateCcw, Trash2, ArrowRightLeft, Zap, MoreVertical, Sparkles, ChevronLeft, Calendar } from "lucide-react";
import PipelineAnalytics from "@/components/PipelineAnalytics";
import StageDetailPanel from "@/components/StageDetailPanel";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { PipelineSkeleton } from "@/components/Skeletons";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";

// Fallback stages if DB hasn't loaded yet
const FALLBACK_STAGES = [
  { id: "تقديم الطلب", label: "تقديم الطلب", color: "#6366f1" },
  { id: "مراجعة السيرة", label: "مراجعة السيرة", color: "#8b5cf6" },
  { id: "فحص هاتفي", label: "فحص هاتفي", color: "#0ea5e9" },
  { id: "مقابلة تقنية", label: "مقابلة تقنية", color: "#f59e0b" },
  { id: "مقابلة نهائية", label: "مقابلة نهائية", color: "#10b981" },
  { id: "العرض الوظيفي", label: "العرض الوظيفي", color: "#059669" },
];

function hexToTailwind(hex: string) {
  return {
    color: `bg-[${hex}]`,
    lightBg: `bg-[${hex}]/10`,
    text: `text-[${hex}]`,
  };
}

const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("");

function DroppableColumn({ stage, children, count, label, totalCandidates, avgDays, tLabel, slaHours, transitionRules, automationRules, onConfigure, isVirtual, dragViolation, isDraggingActive }: {
  stage: { id: string; label: string; color: string }; children: React.ReactNode; count: number; label: string;
  totalCandidates: number; avgDays: number; tLabel: { conversion: string; avgDays: string };
  slaHours?: number; transitionRules?: TransitionRules; automationRules?: any; onConfigure?: () => void; isVirtual?: boolean;
  dragViolation?: { message: string; assessmentId?: string } | null;
  isDraggingActive?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const conversionRate = totalCandidates > 0 ? Math.round((count / totalCandidates) * 100) : 0;

  return (
    <div
      id={`column-${stage.id}`}
      ref={setNodeRef}
      className={cn(
        "flex flex-col min-w-[240px] w-[240px] lg:w-auto lg:flex-1 rounded-xl border border-border/50 bg-muted/20 transition-all duration-200 scroll-mt-20",
        isOver && !isDraggingActive && "bg-primary/5 border-primary/30 shadow-md",
        isDraggingActive && (
          dragViolation
            ? cn("border-destructive/40 bg-destructive/5 opacity-90", isOver && "border-destructive bg-destructive/15 shadow-lg scale-[1.01]")
            : cn("border-emerald-500/40 bg-emerald-500/5", isOver && "border-emerald-500 bg-emerald-500/15 shadow-lg scale-[1.01]")
        )
      )}
    >
      <div className="p-3 border-b border-border/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
            <span className="text-xs font-semibold text-foreground">{label}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Active Automations Zap Badge */}
            {automationRules && (automationRules.auto_ai_evaluation || automationRules.auto_send_assessment || automationRules.auto_create_meeting) && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-amber-500 bg-amber-500/10 p-0.5 rounded animate-pulse">
                      <Zap className="w-3 h-3" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs font-semibold">
                    أتمتة مفعّلة في هذه المرحلة ⚡
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {/* SLA Badge on header */}
            {slaHours != null && slaHours > 0 && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />{slaHours}س
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">الحد الأقصى للبقاء: {slaHours} ساعة</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {/* Transition Rules Icons */}
            {transitionRules && (
              <div className="flex items-center gap-0.5">
                {transitionRules.require_interview && (
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-amber-500"><Video className="w-3 h-3" /></span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">يتطلب مقابلة مكتملة</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {transitionRules.require_ai_evaluation && (
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-purple-500"><Bot className="w-3 h-3" /></span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">يتطلب تقييم AI{transitionRules.min_ai_score ? ` (حد أدنى ${transitionRules.min_ai_score}%)` : ""}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {transitionRules.require_assessment && (
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-green-500"><ClipboardCheck className="w-3 h-3" /></span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">يتطلب إكمال اختبار</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            )}
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ backgroundColor: stage.color + "1a", color: stage.color }}>
              {count}
            </span>
            {/* Configure cog (not for virtual stages) */}
            {!isVirtual && onConfigure && (
              <button
                onClick={(e) => { e.stopPropagation(); onConfigure(); }}
                className="p-0.5 rounded hover:bg-muted text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                title="إعدادات المرحلة"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        {/* Stage stats */}
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-0.5">
            <TrendingUp className="w-3 h-3" />{conversionRate}%
          </span>
          {avgDays > 0 && (
            <span className="flex items-center gap-0.5">
              <Clock className="w-3 h-3" />{avgDays}{tLabel.avgDays.charAt(0) === "A" ? "d" : "ي"}
            </span>
          )}
        </div>

        {/* Real-time Guidance Banner during Drag */}
        {isDraggingActive && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2"
          >
            {dragViolation ? (
              <div className="px-2 py-1 rounded-md bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-1.5 text-[10px] animate-pulse">
                <Lock className="w-3 h-3 shrink-0" />
                <span className="font-semibold truncate">{dragViolation.message}</span>
              </div>
            ) : (
              <div className="px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 text-[10px]">
                <CheckCircle2 className="w-3 h-3 shrink-0" />
                <span className="font-semibold">مؤهل للنقل</span>
              </div>
            )}
          </motion.div>
        )}
      </div>
      <div className="p-2 space-y-2 flex-1 overflow-y-auto max-h-[calc(100vh-300px)] min-h-[80px]">
        {children}
      </div>
    </div>
  );
}

const CandidateCard = memo(function CandidateCard({
  candidate,
  isDragging = false,
  response,
  isSelected = false,
  onToggleSelect,
  onReject,
  onDefer,
  onRestore,
  stageSlaHours = 0,
  onPreview,
  onQuickMove,
  allStages
}: {
  candidate: any;
  isDragging?: boolean;
  response?: any;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onReject?: (id: string, name: string) => void;
  onDefer?: (id: string) => void;
  onRestore?: (id: string, originalStage: string) => void;
  stageSlaHours?: number;
  onPreview?: () => void;
  onQuickMove?: (newStageId: string) => void;
  allStages?: any[];
}) {
  const parsedLog = response?.tab_switch_log
    ? (typeof response.tab_switch_log === "string" ? JSON.parse(response.tab_switch_log) : response.tab_switch_log)
    : null;
  const integrityScore = response?.integrity_score ?? parsedLog?.cheat_score;

  return (
    <motion.div
      layout
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={cn(
        "bg-card rounded-lg border p-3 transition-all group",
        isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-border/50 hover:shadow-sm hover:border-primary/20",
        isDragging ? "shadow-xl rotate-2 opacity-90 scale-105" : ""
      )}
    >
      <div className="flex items-start gap-2">
        <div className="flex items-center gap-1 shrink-0 mt-1">
          {onToggleSelect && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                onToggleSelect();
              }}
              className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5 cursor-pointer bg-transparent"
            />
          )}
          <div className="text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors cursor-grab">
            <GripVertical className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <Avatar className="w-7 h-7 border border-border">
              <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                {getInitials(candidate.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <Link to={`/candidates/${candidate.id}`}
                className="text-xs font-semibold text-foreground hover:text-primary transition-colors block truncate">
                {candidate.name}
              </Link>
              {candidate.role && <p className="text-[10px] text-muted-foreground truncate">{candidate.role}</p>}
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {candidate.rating > 0 && (
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={cn("w-2.5 h-2.5", i < candidate.rating ? "fill-amber-400 text-amber-400" : "text-border")} />
                ))}
              </div>
            )}
            {(() => {
              const teamAvg = candidate.candidate_scorecards && candidate.candidate_scorecards.length > 0
                ? (() => {
                    const sum = candidate.candidate_scorecards.reduce((acc: number, s: any) => acc + s.rating, 0);
                    return { avg: (sum / candidate.candidate_scorecards.length).toFixed(1), count: candidate.candidate_scorecards.length };
                  })()
                : null;
              return teamAvg ? (
                <Badge variant="outline" className="text-[9px] h-4 px-1 gap-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-0" title="تقييم فريق العمل">
                  <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                  {teamAvg.avg} ({teamAvg.count})
                </Badge>
              ) : null;
            })()}
            {candidate.ai_score != null && (
              <Badge variant="outline" className={cn("text-[9px] h-4 px-1 gap-0.5 border-0",
                candidate.ai_score >= 70 ? "bg-green-500/10 text-green-700 dark:text-green-400" :
                candidate.ai_score >= 40 ? "bg-amber-500/10 text-amber-700 dark:text-amber-400" :
                "bg-destructive/10 text-destructive"
              )}>
                <Bot className="w-2.5 h-2.5" />{candidate.ai_score}
              </Badge>
            )}
            {integrityScore != null && (
              integrityScore < 60 ? (
                <Badge variant="outline" className="text-[9px] h-4 px-1 gap-0.5 bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 animate-pulse">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  شبهة غش
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[9px] h-4 px-1 gap-0.5 bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  نزيه
                </Badge>
              )
            )}

            {/* SLA Badge */}
            {(() => {
              if (!candidate.stage_entered_at || !stageSlaHours) return null;
              const entryDate = new Date(candidate.stage_entered_at).getTime();
              const now = Date.now();
              const elapsedHours = (now - entryDate) / (1000 * 60 * 60);
              const remainingHours = stageSlaHours - elapsedHours;
              const isOverdue = remainingHours <= 0;

              return (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[9px] h-4 px-1 gap-0.5 border-0 font-medium",
                    isOverdue 
                      ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 animate-pulse" 
                      : remainingHours <= 24 
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                        : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                  )}
                  title={isOverdue ? `تجاوز الحد الأقصى للمرحلة بـ ${Math.round(elapsedHours - stageSlaHours)} ساعة` : `الوقت المتبقي في هذه المرحلة`}
                >
                  <Clock className="w-2.5 h-2.5" />
                  {isOverdue 
                    ? `متأخر (${Math.round(elapsedHours - stageSlaHours)}س)` 
                    : `متبقي (${Math.round(remainingHours)}س)`}
                </Badge>
              );
            })()}
          </div>

          {candidate.skills && candidate.skills.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {candidate.skills.slice(0, 2).map((skill: string) => (
                <span key={skill} className="px-1.5 rounded text-[9px] font-medium bg-primary/5 text-primary border border-primary/10">
                  {skill}
                </span>
              ))}
              {candidate.skills.length > 2 && (
                <span className="text-[9px] text-muted-foreground">+{candidate.skills.length - 2}</span>
              )}
            </div>
          )}

          {/* Card Actions (visible on hover) */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end gap-1.5 mt-2 pt-1.5 border-t border-border/40">
            {onPreview && (
              <Button
                variant="ghost"
                size="icon"
                className="w-6 h-6 rounded-md hover:bg-primary/10 hover:text-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onPreview();
                }}
                title="معاينة سريعة 👁️"
              >
                <Eye className="w-3.5 h-3.5 text-primary" />
              </Button>
            )}

            {candidate.status === "مرفوض" || candidate.is_deferred === true || candidate.status === "مؤجل" ? (
              onRestore && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-6 h-6 rounded-md hover:bg-green-500/10 hover:text-green-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onRestore(candidate.id, "تقديم الطلب");
                  }}
                  title="استعادة المرشح إلى نشط"
                >
                  <Check className="w-3.5 h-3.5 text-green-500" />
                </Button>
              )
            ) : (
              <>
                {onDefer && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-6 h-6 rounded-md hover:bg-amber-500/10 hover:text-amber-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onDefer(candidate.id);
                    }}
                    title="تأجيل المرشح"
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                  </Button>
                )}
                {onReject && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-6 h-6 rounded-md hover:bg-red-500/10 hover:text-red-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onReject(candidate.id, candidate.name);
                    }}
                    title="رفض المرشح"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                  </Button>
                )}
              </>
            )}

            {onQuickMove && allStages && allStages.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-6 h-6 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                    onClick={(e) => e.stopPropagation()}
                    title="خيارات إضافية"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 text-xs">
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="text-xs">
                      <ArrowRightLeft className="w-3.5 h-3.5 me-1.5 text-primary" /> نقل سريع إلى...
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-44 text-xs">
                      {allStages.map((s: any) => (
                        <DropdownMenuItem
                          key={s.id}
                          disabled={s.id === candidate.stage}
                          onClick={() => onQuickMove(s.id)}
                          className="text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color || "#0ea5e9" }} />
                          <span className="truncate">{s.label || s.id}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  {onPreview && (
                    <DropdownMenuItem onClick={onPreview} className="text-xs">
                      <Eye className="w-3.5 h-3.5 me-1.5 text-blue-500" /> معاينة سريعة
                    </DropdownMenuItem>
                  )}
                  {onDefer && (
                    <DropdownMenuItem onClick={() => onDefer(candidate.id)} className="text-xs">
                      <Clock className="w-3.5 h-3.5 me-1.5 text-amber-500" /> تأجيل المرشح
                    </DropdownMenuItem>
                  )}
                  {onReject && (
                    <DropdownMenuItem onClick={() => onReject(candidate.id, candidate.name)} className="text-xs text-destructive">
                      <AlertTriangle className="w-3.5 h-3.5 me-1.5" /> رفض المرشح
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

function DraggableCard({
  candidate,
  response,
  isSelected,
  onToggleSelect,
  onReject,
  onDefer,
  onRestore,
  stageSlaHours,
  onPreview,
  onQuickMove,
  allStages
}: {
  candidate: any;
  response?: any;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onReject?: (id: string, name: string) => void;
  onDefer?: (id: string) => void;
  onRestore?: (id: string, originalStage: string) => void;
  stageSlaHours?: number;
  onPreview?: () => void;
  onQuickMove?: (newStageId: string) => void;
  allStages?: any[];
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: candidate.id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="cursor-grab active:cursor-grabbing"
    >
      <CandidateCard
        candidate={candidate}
        response={response}
        isSelected={isSelected}
        onToggleSelect={onToggleSelect}
        onReject={onReject}
        onDefer={onDefer}
        onRestore={onRestore}
        stageSlaHours={stageSlaHours}
        onPreview={onPreview}
        onQuickMove={onQuickMove}
        allStages={allStages}
      />
    </div>
  );
}

export default function Pipeline() {
  const { t, dir, locale } = useI18n();
  const { data: candidates, isLoading } = useCandidates();
  const { data: jobs } = useJobs();
  const { data: interviews } = useInterviews();
  const activeStages = useActiveStages();
  const { data: allStages } = usePipelineStages();
  const { user } = useAuth();
  const { role, isAdmin, isRecruiter } = useUserRole();
  const canMoveCandidates = isAdmin || isRecruiter;

  // Fetch assessment responses for gating
  const { data: assessmentResponses } = useQuery({
    queryKey: ["assessment_responses_pipeline"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_responses")
        .select("candidate_email, assessment_id, status, percentage, integrity_score, tab_switch_log")
        .eq("status", "completed");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch assessments to get tokens for links
  const { data: assessments } = useQuery({
    queryKey: ["assessments_tokens"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessments")
        .select("id, token, title")
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
  });

  const recordTransition = useRecordTransition();
  const queryClient = useQueryClient();
  const { rejectCandidate, deferCandidate, restoreCandidate } = useCandidateStageActions();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [jobFilter, setJobFilter] = useState("all");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"active" | "deferred" | "rejected">("active");
  const [previewCandidate, setPreviewCandidate] = useState<any | null>(null);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [rejectionTarget, setRejectionTarget] = useState<{ candidateId: string; candidateName: string } | null>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState("");
  const [editingStage, setEditingStage] = useState<any>(null);

  const [viewMode, setViewMode] = useState<"kanban" | "timeline" | "analytics">("kanban");
  const [timelineSort, setTimelineSort] = useState<"newest" | "oldest" | "ai_score">("newest");
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; candidateId: string; candidateName: string; stageId: string; stageLabel: string } | null>(null);
  const [transitionDialog, setTransitionDialog] = useState<{ open: boolean; candidateId: string; candidateName: string; fromStage: string; toStage: string; toStageLabel: string } | null>(null);
  const [transitionNote, setTransitionNote] = useState("");
  const [assessmentDialog, setAssessmentDialog] = useState<{ open: boolean; candidateId: string; candidateName: string; candidateEmail: string | null; assessmentId: string; assessmentToken: string; assessmentTitle: string } | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);

  // Fetch email tracking data for candidates
  const { data: emailTracking, refetch: refetchTracking } = useQuery({
    queryKey: ["email_tracking", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_tracking")
        .select("*")
        .order("sent_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const STAGES = useMemo(() => {
    let baseStages = activeStages.length > 0
      ? activeStages.map(s => ({ ...s, id: s.name, label: s.name, color: s.color, sla_hours: s.sla_hours || 0, transition_rules: s.transition_rules || {}, isVirtual: false }))
      : FALLBACK_STAGES.map(s => ({ ...s, sla_hours: 0, transition_rules: {} as TransitionRules, isVirtual: false }));

    if (statusFilter === "rejected") {
      baseStages = [...baseStages, { id: "مرفوض", label: "مرفوض", color: "#ef4444", sla_hours: 0, transition_rules: {} as TransitionRules, isVirtual: true } as any];
    } else if (statusFilter === "deferred") {
      baseStages = [...baseStages, { id: "مؤجل", label: "مؤجل", color: "#f59e0b", sla_hours: 0, transition_rules: {} as TransitionRules, isVirtual: true } as any];
    }
    return baseStages;
  }, [activeStages, statusFilter]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Filter candidates
  const filteredCandidates = useMemo(() => {
    return (candidates || []).filter(c => {
      const matchesSearch = !search || c.name.toLowerCase().includes(search.toLowerCase());
      const matchesJob = jobFilter === "all" || c.job_id === jobFilter;
      const matchesScore = scoreFilter === "all" ||
        (scoreFilter === "high" && (c.ai_score ?? 0) >= 70) ||
        (scoreFilter === "med" && (c.ai_score ?? 0) >= 40 && (c.ai_score ?? 0) < 70) ||
        (scoreFilter === "low" && (c.ai_score ?? 0) < 40 && c.ai_score != null);

      const isDeferred = c.is_deferred === true || c.status === "مؤجل";
      const isRejected = c.status === "مرفوض" || c.stage === "مرفوض";

      if (statusFilter === "rejected") {
        return matchesSearch && matchesJob && matchesScore && isRejected;
      }
      if (statusFilter === "deferred") {
        return matchesSearch && matchesJob && matchesScore && isDeferred;
      }
      // default: active
      return matchesSearch && matchesJob && matchesScore && !isRejected && !isDeferred;
    });
  }, [candidates, search, jobFilter, scoreFilter, statusFilter]);

  const grouped = useMemo(() => {
    const map: Record<string, any[]> = {};
    (STAGES || []).forEach(s => {
      if (s.id) map[s.id] = [];
      if (s.label) map[s.label] = [];
    });
    const fallbackKey = STAGES[0]?.id || STAGES[0]?.label || "تقديم الطلب";
    if (!map[fallbackKey]) map[fallbackKey] = [];

    (filteredCandidates || []).forEach(c => {
      const stage = c.stage || fallbackKey;
      if (!map[stage]) map[stage] = [];
      map[stage].push(c);
    });
    return map;
  }, [STAGES, filteredCandidates]);

  // Avg days in stage (based on updated_at - created_at approximation)
  const getAvgDays = (stageId: string) => {
    const items = grouped[stageId] || [];
    if (items.length === 0) return 0;
    const totalDays = items.reduce((sum, c) => {
      const created = c.created_at ? new Date(c.created_at).getTime() : Date.now();
      const updated = c.updated_at ? new Date(c.updated_at).getTime() : Date.now();
      const diff = Math.max(1, Math.round((updated - created) / 86400000));
      return sum + (isNaN(diff) ? 1 : diff);
    }, 0);
    const avg = Math.round(totalDays / items.length);
    return isNaN(avg) ? 0 : avg;
  };

  const activeCand = activeId ? filteredCandidates.find(c => c.id === activeId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const checkTransitionRules = (candidate: any, targetStageName: string): { message: string; assessmentId?: string } | null => {
    // Find the target stage's transition rules
    const targetStageObj = (allStages || []).find(s => s.name === targetStageName);
    if (!targetStageObj) return null;
    const rules: TransitionRules = targetStageObj.transition_rules || {};

    if (rules.require_interview) {
      const hasCompletedInterview = (interviews || []).some(
        i => i.candidate_id === candidate.id && i.status === "مكتملة"
      );
      if (!hasCompletedInterview) {
        return { message: "يجب إكمال مقابلة وتقييمها قبل الانتقال لهذه المرحلة" };
      }
    }

    if (rules.require_ai_evaluation) {
      if (candidate.ai_score == null) {
        return { message: "يجب وجود تقييم AI قبل الانتقال لهذه المرحلة" };
      }
      if (rules.min_ai_score && candidate.ai_score < rules.min_ai_score) {
        return { message: `تقييم AI (${candidate.ai_score}%) أقل من الحد الأدنى المطلوب (${rules.min_ai_score}%)` };
      }
    }

    // Check assessment completion requirement
    if (rules.require_assessment) {
      const stageAssessmentId = (targetStageObj as any).assessment_id;
      if (stageAssessmentId) {
        const candidateEmail = candidate.email;
        const hasCompleted = (assessmentResponses || []).some(
          r => r.assessment_id === stageAssessmentId && r.candidate_email === candidateEmail && r.status === "completed"
        );
        if (!hasCompleted) {
          return { message: "يجب إكمال الاختبار المرتبط بهذه المرحلة قبل الانتقال", assessmentId: stageAssessmentId };
        }
      } else {
        return { message: "يجب ربط اختبار بهذه المرحلة أولاً من إعدادات المراحل" };
      }
    }

    return null;
  };

  const handleTransitionBlock = (candidate: any, ruleViolation: { message: string; assessmentId?: string }) => {
    if (ruleViolation.assessmentId) {
      const assessment = (assessments || []).find(a => a.id === ruleViolation.assessmentId);
      if (assessment) {
        setAssessmentDialog({
          open: true,
          candidateId: candidate.id,
          candidateName: candidate.name,
          candidateEmail: candidate.email || null,
          assessmentId: assessment.id,
          assessmentToken: assessment.token,
          assessmentTitle: assessment.title,
        });
        return;
      }
    }
    toast({ title: "⚠️ لا يمكن الانتقال", description: ruleViolation.message, variant: "destructive" });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const candidateId = active.id as string;
    const newStage = over.id as string;

    if (!STAGES.find(s => s.id === newStage)) return;

    const candidate = (candidates || []).find(c => c.id === candidateId);
    if (!candidate || candidate.stage === newStage) return;

    if (newStage === "مرفوض") {
      setRejectionTarget({ candidateId, candidateName: candidate.name });
      setRejectionReasonText("");
      return;
    }

    if (newStage === "مؤجل") {
      deferCandidate.mutate({ candidateId });
      toast({ title: `تم نقل ${candidate.name} إلى المؤجلين ⏸️` });
      return;
    }

    // Check transition rules
    const ruleViolation = checkTransitionRules(candidate, newStage);
    if (ruleViolation) {
      handleTransitionBlock(candidate, ruleViolation);
      return;
    }

    const oldStage = candidate.stage || "تقديم الطلب";
    const stageInfo = STAGES.find(s => s.id === newStage);

    // Show transition dialog with optional note
    setTransitionDialog({
      open: true,
      candidateId,
      candidateName: candidate.name,
      fromStage: oldStage,
      toStage: newStage,
      toStageLabel: stageInfo?.label || newStage,
    });
    setTransitionNote("");
  };

  const executeTransition = async (candidateId: string, fromStage: string, toStage: string, note: string) => {
    const candidate = (candidates || []).find(c => c.id === candidateId);
    if (!candidate) return;

    const nowIso = new Date().toISOString();
    queryClient.setQueryData(["candidates", user?.id], (old: any[] | undefined) =>
      old?.map(c => c.id === candidateId ? { ...c, stage: toStage, stage_entered_at: nowIso } : c)
    );

    const { error } = await supabase
      .from("candidates")
      .update({ 
        stage: toStage,
        stage_entered_at: nowIso
      })
      .eq("id", candidateId);

    if (error) {
      toast({ title: t("pipeline.moveError"), description: error.message, variant: "destructive" });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    } else {
      const stageInfo = STAGES.find(s => s.id === toStage);
      toast({ title: `${t("pipeline.movedTo").replace("{name}", candidate.name).replace("{stage}", stageInfo?.label || "")}` });

      if (toStage === "العرض الوظيفي" || toStage === "مكتمل") {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
      }

      recordTransition.mutate({
        candidateId,
        fromStage,
        toStage,
        movedByName: user?.email || undefined,
        notes: note || undefined,
      });

      if (user) {
        supabase.from("notifications").insert({
          user_id: user.id,
          title: `تم نقل ${candidate.name}`,
          description: `من "${fromStage}" إلى "${toStage}"${note ? ` — ${note}` : ""}`,
          type: "stage_change",
        }).then();
      }

      // Auto-generate Jitsi interview room if advancing to an interview stage
      const isTargetInterviewStage = /مقابلة|interview|فحص|فنية|فني|شخصية|تقنية|مبدئي/i.test(toStage);
      if (isTargetInterviewStage) {
        const { data: existingInt } = await supabase
          .from("interviews")
          .select("id")
          .eq("candidate_id", candidateId)
          .maybeSingle();

        if (!existingInt) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const dateStr = tomorrow.toISOString().split("T")[0];
          const roomId = `tx-room-${candidateId.slice(0, 8)}-${Date.now().toString(36)}`;
          const meetingUrl = `${window.location.origin}/meeting/${roomId}?name=${encodeURIComponent(candidate.name)}&position=${encodeURIComponent(candidate.role || "")}`;

          await supabase.from("interviews").insert({
            candidate_id: candidateId,
            candidate_name: candidate.name,
            position: candidate.role || "غير محدد",
            date: dateStr,
            time: "10:00",
            type: "عن بُعد",
            interviewer: user?.email || "فريق التوظيف",
            meeting_url: meetingUrl,
            status: "مجدولة",
          }).catch(err => console.warn("Auto interview generation warning in Pipeline:", err));

          queryClient.invalidateQueries({ queryKey: ["interviews"] });
        }
      }

      const targetStageObj = (allStages || []).find(s => s.name === toStage);
      const automationRules = (targetStageObj as any)?.automation_rules || {};
      const shouldNotify = automationRules.notify_candidate_email !== false;

      if (candidate.email && shouldNotify) {
        const { data: sessionData } = await supabase.auth.getSession();
        const authToken = sessionData.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

        fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-stage-change`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              candidateId,
              newStage: toStage,
              action: "approve",
            }),
          }
        ).catch(console.error);
      }

      // 1. Auto-run AI Evaluation if configured and not evaluated yet
      if (automationRules.auto_ai_evaluation && (candidate as any).ai_score == null) {
        toast({ title: "🤖 أتمتة الذكاء الاصطناعي", description: `جاري تشغيل التقييم التلقائي لـ ${candidate.name}...` });
        fetch(EVAL_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ candidateId, jobId: candidate.job_id }),
        }).then(res => {
          if (res.ok) {
            toast({ title: `✅ اكتمل التقييم التلقائي لـ ${candidate.name}` });
            queryClient.invalidateQueries({ queryKey: ["candidates"] });
          }
        }).catch(console.error);
      }

      // 2. Auto-send Assessment if configured and stage has linked assessment_id
      const stageAssessmentId = (targetStageObj as any)?.assessment_id;
      if (automationRules.auto_send_assessment !== false && stageAssessmentId && candidate.email) {
        // Find assessment token & title
        const assessment = (assessments || []).find(a => a.id === stageAssessmentId);
        if (assessment) {
          // Check if candidate has not completed it yet
          const hasCompleted = (assessmentResponses || []).some(
            r => r.assessment_id === stageAssessmentId && r.candidate_email === candidate.email && r.status === "completed"
          );
          if (!hasCompleted) {
            toast({ title: "📝 أتمتة الاختبارات", description: `جاري إرسال اختبار "${assessment.title}" تلقائياً إلى ${candidate.name}...` });
            
            const trackingId = crypto.randomUUID();
            supabase.from("email_tracking").insert({
              user_id: user!.id,
              candidate_id: candidate.id,
              candidate_email: candidate.email,
              email_type: "assessment",
              subject: `مطلوب إكمال اختبار: ${assessment.title}`,
              tracking_id: trackingId,
            }).then(async () => {
              const { data: { session } } = await supabase.auth.getSession();
              const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
              const assessmentLink = `${window.location.origin}/assessment/${assessment.token}`;
              const trackingPixelUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-tracking-pixel?tid=${trackingId}`;
              
              fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  to: candidate.email,
                  subject: `مطلوب إكمال اختبار: ${assessment.title}`,
                  html: `
                    <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                      <h2 style="color: #1a1a1a; margin-bottom: 16px;">مرحباً ${candidate.name}</h2>
                      <p style="color: #555; font-size: 16px; line-height: 1.8;">
                        يرجى إكمال الاختبار التالي كجزء من عملية التوظيف:
                      </p>
                      <p style="color: #555; font-size: 16px; font-weight: bold;">${assessment.title}</p>
                      <div style="text-align: center; margin: 30px 0;">
                        <a href="${assessmentLink}" 
                           style="background-color: #16a34a; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold; display: inline-block;">
                          ابدأ الاختبار الآن
                        </a>
                      </div>
                      <p style="color: #999; font-size: 13px; margin-top: 30px;">
                        أو انسخ الرابط التالي: <br/>
                        <a href="${assessmentLink}" style="color: #16a34a;">${assessmentLink}</a>
                      </p>
                      <img src="${trackingPixelUrl}" width="1" height="1" alt="" style="display:none;" />
                    </div>
                  `,
                  user_id: user?.id,
                }),
              }).then(emailRes => {
                if (emailRes.ok) {
                  toast({ title: "✅ تم إرسال رابط الاختبار تلقائياً بالبريد الإلكتروني" });
                  refetchTracking();
                }
              }).catch(console.error);
            });
          }
        }
      }

      // 3. Auto-create meeting/interview if configured
      if (automationRules.auto_create_meeting) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = tomorrow.toISOString().split('T')[0];
        const timeStr = "10:00";
        const meetingPlatform = automationRules.meeting_platform || "jitsi";
        const meetingUrl = automationRules.custom_meeting_url || `https://meet.jit.si/${crypto.randomUUID()}`;
        
        toast({ title: "📅 أتمتة المقابلات", description: `جاري جدولة مقابلة تلقائية لـ ${candidate.name}...` });
        
        supabase.from("interviews").insert({
          user_id: user!.id,
          candidate_name: candidate.name,
          position: candidate.role || "مقابلة تقييمية",
          date: dateStr,
          time: timeStr,
          type: automationRules.interview_type || "عن بُعد",
          interviewer: user?.email || "فريق التوظيف",
          candidate_id: candidate.id,
          meeting_url: meetingUrl,
        } as any).then(({ error: interviewErr }) => {
          if (!interviewErr) {
            toast({ title: `✅ تم جدولة المقابلة تلقائياً (${meetingPlatform})` });
            queryClient.invalidateQueries({ queryKey: ["interviews"] });
          } else {
            console.error("Auto interview creation failed:", interviewErr);
          }
        });
      }
    }
  };

  const hasFilters = search || jobFilter !== "all" || scoreFilter !== "all";

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-8 space-y-4">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">{t("pipeline.title")}</h1>
            <p className="text-muted-foreground text-sm mt-1">{t("pipeline.subtitle")}</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Stage Settings Link */}
            <Link to="/settings?tab=pipeline">
              <Button variant="outline" size="sm" className="h-7 px-3 text-xs gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                إعدادات المراحل
              </Button>
            </Link>
            {/* View Toggle */}
            <div className="flex items-center bg-muted/50 rounded-lg p-0.5 border border-border/50">
              <Button
                variant="ghost"
                size="sm"
                className={cn("h-7 px-3 text-xs gap-1.5 rounded-md", viewMode === "kanban" && "bg-card shadow-sm text-foreground")}
                onClick={() => setViewMode("kanban")}
              >
                <Kanban className="w-3.5 h-3.5" />{t("pipeline.viewKanban")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn("h-7 px-3 text-xs gap-1.5 rounded-md", viewMode === "timeline" && "bg-card shadow-sm text-foreground")}
                onClick={() => setViewMode("timeline")}
              >
                <List className="w-3.5 h-3.5" />{t("pipeline.viewTimeline")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn("h-7 px-3 text-xs gap-1.5 rounded-md", viewMode === "analytics" && "bg-card shadow-sm text-foreground")}
                onClick={() => setViewMode("analytics")}
              >
                <BarChart3 className="w-3.5 h-3.5" />إحصائيات
              </Button>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {filteredCandidates.length}
                {hasFilters && ` / ${(candidates || []).length}`}
                {" "}{t("common.candidate")}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Filters Bar */}
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className={`absolute ${dir === "rtl" ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
            <Input
              placeholder={t("pipeline.searchPlaceholder")}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={cn("h-9 text-sm", dir === "rtl" ? "pr-9" : "pl-9")}
            />
          </div>
          <Select value={jobFilter} onValueChange={setJobFilter}>
            <SelectTrigger className="w-full sm:w-44 h-9 text-xs">
              <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0 me-1.5" />
              <SelectValue placeholder={t("pipeline.allJobs")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("pipeline.allJobs")}</SelectItem>
              {(jobs || []).map(j => (
                <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={scoreFilter} onValueChange={setScoreFilter}>
            <SelectTrigger className="w-full sm:w-44 h-9 text-xs">
              <Bot className="w-3.5 h-3.5 text-muted-foreground shrink-0 me-1.5" />
              <SelectValue placeholder={t("pipeline.allScores")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("pipeline.allScores")}</SelectItem>
              <SelectItem value="high">{t("pipeline.highScore")}</SelectItem>
              <SelectItem value="med">{t("pipeline.medScore")}</SelectItem>
              <SelectItem value="low">{t("pipeline.lowScore")}</SelectItem>
            </SelectContent>
          </Select>
          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={(v: any) => { setStatusFilter(v); setSelectedCandidateIds([]); }}>
            <SelectTrigger className="w-full sm:w-44 h-9 text-xs">
              <Eye className="w-3.5 h-3.5 text-muted-foreground shrink-0 me-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">النشطين</SelectItem>
              <SelectItem value="rejected">المرفوضين</SelectItem>
              <SelectItem value="deferred">المؤجلين</SelectItem>
            </SelectContent>
          </Select>
          {viewMode === "timeline" && (
            <Select value={timelineSort} onValueChange={(v: any) => setTimelineSort(v)}>
              <SelectTrigger className="w-full sm:w-44 h-9 text-xs">
                <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground shrink-0 me-1.5" />
                <SelectValue placeholder={t("pipeline.sortBy")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">{t("pipeline.sortNewest")}</SelectItem>
                <SelectItem value="oldest">{t("pipeline.sortOldest")}</SelectItem>
                <SelectItem value="ai_score">{t("pipeline.sortAiScore")}</SelectItem>
              </SelectContent>
            </Select>
          )}
        </motion.div>

        {/* Pipeline Board / Timeline */}
        {isLoading ? (
          <PipelineSkeleton />
        ) : (candidates || []).length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20 bg-card rounded-2xl border border-border/50">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-primary/50" />
            </div>
            <p className="text-foreground font-semibold mb-1">{t("pipeline.noCandidates")}</p>
            <p className="text-sm text-muted-foreground">{t("pipeline.noCandidatesDesc")}</p>
          </motion.div>
        ) : filteredCandidates.length === 0 && hasFilters ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-16 bg-card rounded-2xl border border-border/50">
            <Search className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{t("pipeline.noMatch")}</p>
          </motion.div>
        ) : viewMode === "analytics" ? (
          <PipelineAnalytics stages={STAGES} candidates={filteredCandidates} dir={dir} />
        ) : viewMode === "kanban" ? (
          <div>
            {/* Interactive Stage Filter Pills Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2.5 mb-3 scrollbar-none">
              {STAGES.map((s) => {
                const stageCount = grouped[s.id]?.length || 0;
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      document.getElementById(`column-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border/60 bg-card hover:bg-muted/80 text-[11px] font-semibold transition-all shrink-0 shadow-2xs hover:scale-[1.02] active:scale-95 cursor-pointer"
                  >
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="truncate max-w-[110px]">{s.label}</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-muted text-[10px] text-muted-foreground font-bold">
                      {stageCount}
                    </span>
                  </button>
                );
              })}
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 lg:mx-0 lg:px-0">
                {STAGES.map((stage) => {
                  const isVirtual = (stage as any).isVirtual === true;
                  const stageObj = !isVirtual ? (allStages || []).find(s => s.name === stage.id) : null;
                  const ruleViolation = (activeCand && !isVirtual) ? checkTransitionRules(activeCand, stage.id) : null;
                  const isDraggingActive = !!activeId;

                  return (
                    <DroppableColumn
                      key={stage.id}
                      stage={stage}
                      count={grouped[stage.id]?.length || 0}
                      label={stage.label}
                      totalCandidates={filteredCandidates.length}
                      avgDays={getAvgDays(stage.id)}
                      tLabel={{ conversion: t("pipeline.conversionRate"), avgDays: t("pipeline.avgDays") }}
                      slaHours={(stage as any).sla_hours}
                      transitionRules={(stage as any).transition_rules}
                      automationRules={(stage as any).automation_rules}
                      isVirtual={isVirtual}
                      onConfigure={stageObj ? () => setEditingStage(stageObj) : undefined}
                      dragViolation={ruleViolation}
                      isDraggingActive={isDraggingActive}
                    >
                      {grouped[stage.id]?.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground/40">
                          <p className="text-[11px]">{t("pipeline.dragHere")}</p>
                        </div>
                      ) : (
                        grouped[stage.id]?.map((candidate) => {
                          const response = (assessmentResponses || []).find(r => r.candidate_email === candidate.email);
                          return (
                            <DraggableCard
                              key={candidate.id}
                              candidate={candidate}
                              response={response}
                              isSelected={selectedCandidateIds.includes(candidate.id)}
                              onToggleSelect={() => {
                                setSelectedCandidateIds(prev =>
                                  prev.includes(candidate.id)
                                    ? prev.filter(id => id !== candidate.id)
                                    : [...prev, candidate.id]
                                );
                              }}
                              onReject={(id, name) => {
                                setRejectionTarget({ candidateId: id, candidateName: name });
                                setRejectionReasonText("");
                              }}
                              onDefer={(id) => {
                                deferCandidate.mutate({ candidateId: id });
                                toast({ title: `تم نقل ${candidate.name} إلى المؤجلين ⏸️` });
                              }}
                              onRestore={(id, originalStage) => {
                                restoreCandidate.mutate({ candidateId: id, stage: originalStage });
                                toast({ title: `تم استعادة ${candidate.name} ✅` });
                              }}
                              stageSlaHours={(stage as any).sla_hours || 0}
                              onPreview={() => setPreviewCandidate(candidate)}
                              onQuickMove={(newStageId) => {
                                const targetStage = STAGES.find(s => s.id === newStageId);
                                const violation = checkTransitionRules(candidate, newStageId);
                                if (violation) {
                                  toast({ title: "تعذر النقل", description: violation.message, variant: "destructive" });
                                  return;
                                }
                                moveStageMutation.mutate({ candidateId: candidate.id, newStage: newStageId });
                                toast({ title: `تم نقل ${candidate.name} إلى ${targetStage?.label || newStageId} ✅` });
                              }}
                              allStages={STAGES}
                            />
                          );
                        })
                      )}
                    </DroppableColumn>
                  );
                })}
              </div>

              <DragOverlay>
                {activeCand && (
                  <CandidateCard 
                    candidate={activeCand} 
                    isDragging 
                    response={(assessmentResponses || []).find(r => r.candidate_email === activeCand.email)} 
                  />
                )}
              </DragOverlay>
            </DndContext>
          </div>
        ) : (
          /* ─── Timeline View ─── */
          <div className="space-y-3">
            {filteredCandidates
              .sort((a, b) => {
                if (timelineSort === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                if (timelineSort === "ai_score") return (b.ai_score ?? -1) - (a.ai_score ?? -1);
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
              })
              .map((candidate, idx) => {
                const currentStageIndex = STAGES.findIndex(s => s.id === (candidate.stage || "تقديم الطلب"));
                const daysInPipeline = Math.max(1, Math.round((Date.now() - new Date(candidate.created_at).getTime()) / 86400000));

                const executeStageChange = async (candidateId: string, stageId: string, candidateName: string) => {
                  const oldStage = candidate.stage || "تقديم الطلب";
                  queryClient.setQueryData(["candidates", candidate.user_id], (old: any[] | undefined) =>
                    old?.map(c => c.id === candidateId ? { ...c, stage: stageId } : c)
                  );
                  const { error } = await supabase
                    .from("candidates")
                    .update({ stage: stageId })
                    .eq("id", candidateId);
                  if (error) {
                    toast({ title: t("pipeline.moveError"), description: error.message, variant: "destructive" });
                    queryClient.invalidateQueries({ queryKey: ["candidates"] });
                  } else {
                    const stageInfo = STAGES.find(s => s.id === stageId);
                    toast({ title: t("pipeline.movedSuccess").replace("{name}", candidateName).replace("{stage}", stageInfo?.label || "") });
                    recordTransition.mutate({ candidateId, fromStage: oldStage, toStage: stageId, movedByName: user?.email || undefined });
                    if (user) {
                      supabase.from("notifications").insert({
                        user_id: user.id, title: `تم نقل ${candidateName}`,
                        description: `من "${oldStage}" إلى "${stageId}"`, type: "stage_change",
                      }).then();
                    }
                  }
                };

                const handleStageClick = (stageId: string) => {
                  if (stageId === candidate.stage) return;

                  // Check transition rules before allowing move
                   const ruleViolation = checkTransitionRules(candidate, stageId);
                   if (ruleViolation) {
                     handleTransitionBlock(candidate, ruleViolation);
                     return;
                   }

                  const targetIndex = STAGES.findIndex(s => s.id === stageId);
                  // Moving backward → confirm first
                  if (targetIndex < currentStageIndex) {
                    const stageInfo = STAGES.find(s => s.id === stageId);
                    setConfirmDialog({ open: true, candidateId: candidate.id, candidateName: candidate.name, stageId, stageLabel: stageInfo?.label || "" });
                  } else {
                    executeStageChange(candidate.id, stageId, candidate.name);
                  }
                };

                return (
                  <motion.div
                    key={candidate.id}
                    initial={{ opacity: 0, x: dir === "rtl" ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                    className="bg-card border border-border/50 rounded-xl p-4 hover:border-primary/20 hover:shadow-sm transition-all"
                  >
                    {/* Top row: candidate info */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="w-9 h-9 border border-border shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                            {getInitials(candidate.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <Link to={`/candidates/${candidate.id}`}
                            className="text-sm font-semibold text-foreground hover:text-primary transition-colors block truncate">
                            {candidate.name}
                          </Link>
                          <p className="text-xs text-muted-foreground truncate">
                            {candidate.role || "—"}
                            {candidate.ai_score != null && (
                              <span className={cn("ms-2 font-medium",
                                candidate.ai_score >= 70 ? "text-green-600 dark:text-green-400" :
                                candidate.ai_score >= 40 ? "text-amber-600 dark:text-amber-400" :
                                "text-destructive"
                              )}>
                                AI: {candidate.ai_score}%
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {daysInPipeline} {locale === "en" ? "days" : "يوم"}
                        </span>
                        <span>
                          {new Date(candidate.created_at).toLocaleDateString(locale === "en" ? "en-US" : "ar-SA", { month: "short", day: "numeric" })}
                        </span>
                        {candidate.rating > 0 && (
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={cn("w-2.5 h-2.5", i < candidate.rating ? "fill-amber-400 text-amber-400" : "text-border")} />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Stage timeline bar - clickable */}
                    <TooltipProvider delayDuration={200}>
                      <div className="flex items-center gap-1">
                        {STAGES.map((stage, i) => {
                          const isCompleted = i < currentStageIndex;
                          const isCurrent = i === currentStageIndex;
                          return (
                            <div key={stage.id} className="flex items-center flex-1 min-w-0">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => handleStageClick(stage.id)}
                                    className={cn(
                                      "flex flex-col items-center flex-1 group/stage cursor-pointer rounded-md p-1 -m-1 transition-all",
                                      isCurrent ? "ring-1 ring-primary/30 bg-primary/5" : "hover:bg-muted/80"
                                    )}
                                  >
                                    <div
                                      className={cn(
                                        "w-full h-2.5 rounded-full transition-all",
                                        !isCompleted && !isCurrent && "bg-muted group-hover/stage:bg-muted-foreground/20",
                                        isCurrent && "animate-pulse"
                                      )}
                                      style={isCompleted || isCurrent ? { backgroundColor: stage.color } : undefined}
                                    />
                                    <span className={cn(
                                      "text-[9px] mt-1 truncate max-w-full text-center transition-colors",
                                      isCurrent ? "font-bold text-foreground" : isCompleted ? "text-muted-foreground" : "text-muted-foreground/50 group-hover/stage:text-muted-foreground"
                                    )}>
                                      {stage.label}
                                    </span>
                                    {isCurrent && (
                                      <CheckCircle2 className="w-3 h-3 mt-0.5" style={{ color: stage.color }} />
                                    )}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                  {isCurrent ? stage.label : t("pipeline.clickToMove")}
                                </TooltipContent>
                              </Tooltip>
                              {i < STAGES.length - 1 && (
                                <ArrowRight className={cn(
                                  "w-3 h-3 shrink-0 mx-0.5",
                                  isCompleted ? "text-muted-foreground" : "text-muted-foreground/20"
                                )} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </TooltipProvider>
                  </motion.div>
                );
              })}
          </div>
        )}
      </div>

      {/* Transition Note Dialog */}
      <Dialog open={!!transitionDialog?.open} onOpenChange={(open) => { if (!open) { setTransitionDialog(null); setTransitionNote(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRight className="w-5 h-5 text-primary" />
              نقل المرشح
            </DialogTitle>
            <DialogDescription>
              نقل <strong>{transitionDialog?.candidateName}</strong> من "{transitionDialog?.fromStage}" إلى "{transitionDialog?.toStageLabel}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">ملاحظة (اختياري)</label>
              <Textarea
                value={transitionNote}
                onChange={e => setTransitionNote(e.target.value)}
                placeholder="أضف ملاحظة حول سبب النقل..."
                className="min-h-[80px] text-sm"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setTransitionDialog(null); setTransitionNote(""); }}>
              إلغاء
            </Button>
            <Button
              onClick={() => {
                if (transitionDialog) {
                  executeTransition(transitionDialog.candidateId, transitionDialog.fromStage, transitionDialog.toStage, transitionNote);
                  setTransitionDialog(null);
                  setTransitionNote("");
                }
              }}
              className="gap-2"
            >
              <Check className="w-4 h-4" />
              تأكيد النقل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm backward stage move */}
      <AlertDialog open={!!confirmDialog?.open} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("pipeline.confirmBackward")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("pipeline.confirmBackwardDesc")
                .replace("{name}", confirmDialog?.candidateName || "")
                .replace("{stage}", confirmDialog?.stageLabel || "")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDialog) {
                  executeTransition(confirmDialog.candidateId, 
                    (filteredCandidates.find(c => c.id === confirmDialog.candidateId)?.stage || "تقديم الطلب"),
                    confirmDialog.stageId, "");
                }
                setConfirmDialog(null);
              }}
            >
              {t("pipeline.confirmMove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assessment Required Dialog */}
      <Dialog open={!!assessmentDialog?.open} onOpenChange={(open) => !open && setAssessmentDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-primary" />
              يجب إكمال الاختبار أولاً
            </DialogTitle>
            <DialogDescription>
              لا يمكن نقل <strong>{assessmentDialog?.candidateName}</strong> لهذه المرحلة قبل إكمال الاختبار المطلوب: <strong>{assessmentDialog?.assessmentTitle}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border/50">
              <Input
                readOnly
                value={assessmentDialog ? `${window.location.origin}/assessment/${assessmentDialog.assessmentToken}` : ""}
                className="text-xs bg-transparent border-0 focus-visible:ring-0 h-8"
                dir="ltr"
              />
            </div>
            {/* Email tracking status */}
            {assessmentDialog && (() => {
              const trackingRecords = (emailTracking || []).filter(
                t => t.candidate_email === assessmentDialog.candidateEmail && t.email_type === "assessment"
              );
              if (trackingRecords.length === 0) return null;
              const latest = trackingRecords[0];
              return (
                <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border border-border/30 text-xs">
                  <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <span className="text-muted-foreground">آخر إرسال: </span>
                    <span>{new Date(latest.sent_at).toLocaleDateString("ar-SA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  {latest.opened_at ? (
                    <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-[10px]">
                      <Eye className="w-3 h-3 me-1" />
                      تم الفتح ({latest.opened_count}×)
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">
                      <Clock className="w-3 h-3 me-1" />
                      لم يُفتح بعد
                    </Badge>
                  )}
                </div>
              );
            })()}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                if (assessmentDialog) {
                  navigator.clipboard.writeText(`${window.location.origin}/assessment/${assessmentDialog.assessmentToken}`);
                  toast({ title: "✅ تم نسخ رابط الاختبار" });
                }
              }}
            >
              <ClipboardCopy className="w-4 h-4" />
              نسخ الرابط
            </Button>
            {assessmentDialog?.candidateEmail && (
              <Button
                variant="outline"
                className="gap-2"
                disabled={sendingEmail}
                onClick={async () => {
                  if (!assessmentDialog?.candidateEmail) return;
                  setSendingEmail(true);
                  try {
                    // Create tracking record
                    const trackingId = crypto.randomUUID();
                    await supabase.from("email_tracking").insert({
                      user_id: user!.id,
                      candidate_id: assessmentDialog.candidateId,
                      candidate_email: assessmentDialog.candidateEmail,
                      email_type: "assessment",
                      subject: `مطلوب إكمال اختبار: ${assessmentDialog.assessmentTitle}`,
                      tracking_id: trackingId,
                    });

                    const assessmentLink = `${window.location.origin}/assessment/${assessmentDialog.assessmentToken}`;
                    const trackingPixelUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-tracking-pixel?tid=${trackingId}`;

                    const { data: { session } } = await supabase.auth.getSession();
                    const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

                    const res = await fetch(
                      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`,
                      {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                          to: assessmentDialog.candidateEmail,
                          subject: `مطلوب إكمال اختبار: ${assessmentDialog.assessmentTitle}`,
                          html: `
                            <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                              <h2 style="color: #1a1a1a; margin-bottom: 16px;">مرحباً ${assessmentDialog.candidateName}</h2>
                              <p style="color: #555; font-size: 16px; line-height: 1.8;">
                                يرجى إكمال الاختبار التالي كجزء من عملية التوظيف:
                              </p>
                              <p style="color: #555; font-size: 16px; font-weight: bold;">${assessmentDialog.assessmentTitle}</p>
                              <div style="text-align: center; margin: 30px 0;">
                                <a href="${assessmentLink}" 
                                   style="background-color: #16a34a; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold; display: inline-block;">
                                  ابدأ الاختبار الآن
                                </a>
                              </div>
                              <p style="color: #999; font-size: 13px; margin-top: 30px;">
                                أو انسخ الرابط التالي: <br/>
                                <a href="${assessmentLink}" style="color: #16a34a;">${assessmentLink}</a>
                              </p>
                              <img src="${trackingPixelUrl}" width="1" height="1" alt="" style="display:none;" />
                            </div>
                          `,
                          user_id: user?.id,
                        }),
                      }
                    );
                    if (res.ok) {
                      toast({ title: "✅ تم إرسال رابط الاختبار بالبريد الإلكتروني", description: `تم الإرسال إلى ${assessmentDialog.candidateEmail}` });
                      refetchTracking();
                      setAssessmentDialog(null);
                    } else {
                      const err = await res.json().catch(() => ({}));
                      toast({ title: "❌ فشل إرسال البريد", description: err.error || "تأكد من إعدادات البريد الإلكتروني في الإعدادات", variant: "destructive" });
                    }
                  } catch {
                    toast({ title: "❌ فشل إرسال البريد", description: "تأكد من إعدادات البريد الإلكتروني", variant: "destructive" });
                  } finally {
                    setSendingEmail(false);
                  }
                }}
              >
                {sendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                إرسال بالبريد
              </Button>
            )}
            <Button
              className="gap-2"
              onClick={() => {
                if (assessmentDialog) {
                  window.open(`/assessment/${assessmentDialog.assessmentToken}`, "_blank");
                }
              }}
            >
              <ExternalLink className="w-4 h-4" />
              فتح صفحة الاختبار
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Rejection Reason Dialog ─── */}
      <Dialog open={!!rejectionTarget} onOpenChange={(open) => { if (!open) { setRejectionTarget(null); setRejectionReasonText(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="w-5 h-5" />
              رفض المرشح
            </DialogTitle>
            <DialogDescription>
              هل أنت متأكد من رفض <strong>{rejectionTarget?.candidateName}</strong>؟ يرجى تحديد سبب الرفض.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">سبب الرفض</label>
              <Textarea
                value={rejectionReasonText}
                onChange={e => setRejectionReasonText(e.target.value)}
                placeholder="أدخل سبب الرفض (مثال: عدم تطابق المهارات المطلوبة)..."
                className="min-h-[80px] text-sm"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setRejectionTarget(null); setRejectionReasonText(""); }}>
              إلغاء
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectionReasonText.trim()}
              onClick={() => {
                if (rejectionTarget && rejectionReasonText.trim()) {
                  rejectCandidate.mutate({ candidateId: rejectionTarget.candidateId, reason: rejectionReasonText.trim() });
                  toast({ title: `تم رفض ${rejectionTarget.candidateName} ❌`, description: rejectionReasonText.trim() });
                  setRejectionTarget(null);
                  setRejectionReasonText("");
                }
              }}
              className="gap-2"
            >
              <XCircle className="w-4 h-4" />
              تأكيد الرفض
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Floating Bulk Actions Bar ─── */}
      <AnimatePresence>
        {selectedCandidateIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card/95 backdrop-blur-md border border-border shadow-2xl rounded-2xl px-6 py-3 flex items-center gap-4"
          >
            <span className="text-sm font-semibold text-foreground">
              {selectedCandidateIds.length} محدد
            </span>
            <div className="w-px h-6 bg-border" />
            {/* Bulk Move */}
            <Select onValueChange={(stageId) => {
              selectedCandidateIds.forEach(id => {
                const cand = (candidates || []).find(c => c.id === id);
                if (cand) {
                  executeTransition(id, cand.stage || "تقديم الطلب", stageId, "نقل جماعي");
                }
              });
              setSelectedCandidateIds([]);
            }}>
              <SelectTrigger className="w-auto h-8 text-xs gap-1.5 border-primary/30 bg-primary/5 text-primary">
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <SelectValue placeholder="نقل للمرحلة" />
              </SelectTrigger>
              <SelectContent>
                {STAGES.filter(s => !(s as any).isVirtual).map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Bulk Defer */}
            {statusFilter === "active" && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5 border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                onClick={() => {
                  selectedCandidateIds.forEach(id => {
                    deferCandidate.mutate({ candidateId: id });
                  });
                  toast({ title: `تم تأجيل ${selectedCandidateIds.length} مرشح ⏸️` });
                  setSelectedCandidateIds([]);
                }}
              >
                <Pause className="w-3.5 h-3.5" />
                تأجيل
              </Button>
            )}
            {/* Bulk Reject */}
            {statusFilter === "active" && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5 border-red-500/30 text-red-600 hover:bg-red-500/10"
                onClick={() => {
                  const names = selectedCandidateIds.map(id => (candidates || []).find(c => c.id === id)?.name || "").join("، ");
                  setRejectionTarget({ candidateId: selectedCandidateIds.join(","), candidateName: names });
                  setRejectionReasonText("");
                }}
              >
                <XCircle className="w-3.5 h-3.5" />
                رفض
              </Button>
            )}
            {/* Bulk Restore */}
            {(statusFilter === "rejected" || statusFilter === "deferred") && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5 border-green-500/30 text-green-600 hover:bg-green-500/10"
                onClick={() => {
                  selectedCandidateIds.forEach(id => {
                    restoreCandidate.mutate({ candidateId: id, stage: "تقديم الطلب" });
                  });
                  toast({ title: `تم استعادة ${selectedCandidateIds.length} مرشح ✅` });
                  setSelectedCandidateIds([]);
                }}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                استعادة
              </Button>
            )}
            <div className="w-px h-6 bg-border" />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1.5 text-muted-foreground"
              onClick={() => setSelectedCandidateIds([])}
            >
              إلغاء التحديد
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Quick Stage Edit Dialog ─── */}
      <Dialog open={!!editingStage} onOpenChange={(open) => { if (!open) setEditingStage(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              إعدادات المرحلة: {editingStage?.name}
            </DialogTitle>
            <DialogDescription>تعديل إعدادات SLA والشروط والأتمتة لهذه المرحلة.</DialogDescription>
          </DialogHeader>
          {editingStage && (
            <StageDetailPanel
              stage={editingStage}
              onClose={() => setEditingStage(null)}
            />
          )}
        </DialogContent>
      </Dialog>
      {/* ─── Candidate Quick Preview Drawer ─── */}
      <Dialog open={!!previewCandidate} onOpenChange={(open) => !open && setPreviewCandidate(null)}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto p-6 rounded-2xl">
          <DialogHeader className="border-b border-border/50 pb-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12 border-2 border-primary/20">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                    {getInitials(previewCandidate?.name || "")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <DialogTitle className="text-lg font-bold">{previewCandidate?.name}</DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                    <span>{previewCandidate?.role}</span>
                    <span>•</span>
                    <span>{previewCandidate?.email}</span>
                  </DialogDescription>
                </div>
              </div>
            </div>
          </DialogHeader>

          {previewCandidate && (
            <div className="space-y-4">
              {/* Quick Stats Grid */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-muted/30 border border-border/50 text-center">
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium">المرحلة الحالية</p>
                  <p className="text-xs font-bold text-primary mt-0.5">{previewCandidate.stage}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium">درجة الـ AI</p>
                  <p className="text-xs font-bold text-purple-600 dark:text-purple-400 mt-0.5">
                    {previewCandidate.ai_score != null ? `${previewCandidate.ai_score}%` : "غير مقيّم"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium">رمز التتبع</p>
                  <p className="text-xs font-mono font-bold mt-0.5">{previewCandidate.tracking_code || "N/A"}</p>
                </div>
              </div>

              {/* Skills */}
              {previewCandidate.skills && previewCandidate.skills.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-foreground mb-1.5">المهارات والخبرات</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {previewCandidate.skills.map((s: string) => (
                      <Badge key={s} variant="secondary" className="text-xs px-2 py-0.5">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Notes */}
              {previewCandidate.ai_notes && (
                <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/10">
                  <h4 className="text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5 mb-1">
                    <Bot className="w-3.5 h-3.5" /> ملاحظات الذكاء الاصطناعي
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{previewCandidate.ai_notes}</p>
                </div>
              )}

              {/* Action Link */}
              <div className="pt-3 border-t border-border/40 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setPreviewCandidate(null)}>
                  إغلاق
                </Button>
                <Button size="sm" asChild onClick={() => setPreviewCandidate(null)}>
                  <Link to={`/candidates/${previewCandidate.id}`}>
                    عرض الملف الكامل <ArrowRight className="w-3.5 h-3.5 ms-1" />
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
