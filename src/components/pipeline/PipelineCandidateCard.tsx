import { memo } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Star,
  GripVertical,
  Bot,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Check,
  XCircle,
  Eye,
  MessageSquare,
  Sparkles
} from "lucide-react";

export interface CandidateCardProps {
  candidate: any;
  isDragging?: boolean;
  response?: any;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onReject?: (id: string, name: string) => void;
  onDefer?: (id: string) => void;
  onRestore?: (id: string, originalStage: string) => void;
  onQuickPeek?: (candidate: any) => void;
  onWhatsAppDirect?: (candidate: any) => void;
  stageSlaHours?: number;
}

const getInitials = (name: string) => (name ? name.split(" ").map((n) => n[0]).join("") : "?");

const PipelineCandidateCard = memo(function PipelineCandidateCard({
  candidate,
  isDragging = false,
  response,
  isSelected = false,
  onToggleSelect,
  onReject,
  onDefer,
  onRestore,
  onQuickPeek,
  onWhatsAppDirect,
  stageSlaHours = 0,
}: CandidateCardProps) {
  const parsedLog = response?.tab_switch_log
    ? typeof response.tab_switch_log === "string"
      ? JSON.parse(response.tab_switch_log)
      : response.tab_switch_log
    : null;
  const integrityScore = response?.integrity_score ?? parsedLog?.cheat_score;

  return (
    <motion.div
      layout
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={cn(
        "bg-card rounded-2xl border p-3.5 transition-all group relative",
        isSelected
          ? "border-primary bg-primary/8 shadow-md"
          : "border-border/60 hover:shadow-md hover:border-primary/40",
        isDragging ? "shadow-2xl rotate-2 opacity-90 scale-105" : ""
      )}
    >
      <div className="flex items-start gap-2">
        {/* Selection Checkbox & Grip */}
        <div className="flex items-center gap-1 shrink-0 mt-1">
          {onToggleSelect && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                onToggleSelect();
              }}
              className="rounded-md border-border text-primary focus:ring-primary w-4 h-4 cursor-pointer"
            />
          )}
          <div className="text-muted-foreground/30 group-hover:text-muted-foreground/70 transition-colors cursor-grab">
            <GripVertical className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Candidate Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <Avatar className="w-7 h-7 border border-border/80 shadow-xs">
              <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-black">
                {getInitials(candidate.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onQuickPeek) onQuickPeek(candidate);
                  }}
                  className="text-xs font-bold text-foreground hover:text-primary transition-colors text-right truncate block"
                  title="معاينة سريعة للمرشح"
                >
                  {candidate.name}
                </button>

                {/* Direct Eye quick peek button */}
                {onQuickPeek && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuickPeek(candidate);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-primary text-muted-foreground"
                    title="معاينة سريعة للسيرة الذاتية"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {candidate.role && (
                <p className="text-[10px] text-muted-foreground truncate">{candidate.role}</p>
              )}
            </div>
          </div>

          {/* Badges & Scores */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {candidate.rating > 0 && (
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "w-2.5 h-2.5",
                      i < candidate.rating ? "fill-amber-400 text-amber-400" : "text-border"
                    )}
                  />
                ))}
              </div>
            )}

            {/* AI Score Badge */}
            {candidate.ai_score != null && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[9px] h-4 px-1 gap-0.5 border-0 font-mono font-bold",
                  candidate.ai_score >= 70
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : candidate.ai_score >= 40
                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                    : "bg-destructive/10 text-destructive"
                )}
              >
                <Bot className="w-2.5 h-2.5" />
                {candidate.ai_score}%
              </Badge>
            )}

            {/* Assessment Integrity Badge */}
            {integrityScore != null && (
              integrityScore < 60 ? (
                <Badge
                  variant="outline"
                  className="text-[9px] h-4 px-1 gap-0.5 bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 animate-pulse"
                >
                  <AlertTriangle className="w-2.5 h-2.5" />
                  شبهة غش
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-[9px] h-4 px-1 gap-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                >
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
                  title={
                    isOverdue
                      ? `تجاوز الحد الأقصى للمرحلة بـ ${Math.round(elapsedHours - stageSlaHours)} ساعة`
                      : "الوقت المتبقي في هذه المرحلة"
                  }
                >
                  <Clock className="w-2.5 h-2.5" />
                  {isOverdue
                    ? `متأخر (${Math.round(elapsedHours - stageSlaHours)}س)`
                    : `متبقي (${Math.round(remainingHours)}س)`}
                </Badge>
              );
            })()}
          </div>

          {/* Skills Chips */}
          {candidate.skills && candidate.skills.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {candidate.skills.slice(0, 2).map((skill: string) => (
                <span
                  key={skill}
                  className="px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-primary/8 text-primary border border-primary/15"
                >
                  {skill}
                </span>
              ))}
              {candidate.skills.length > 2 && (
                <span className="text-[9px] text-muted-foreground font-semibold">
                  +{candidate.skills.length - 2}
                </span>
              )}
            </div>
          )}

          {/* Card Action Triggers on Hover */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between gap-1.5 mt-2 pt-1.5 border-t border-border/40">
            <div className="flex items-center gap-1">
              {/* WhatsApp direct */}
              {onWhatsAppDirect && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onWhatsAppDirect(candidate);
                  }}
                  className="p-1 rounded-md text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                  title="مراسلة عبر واتساب"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1">
              {candidate.status === "مرفوض" || candidate.is_deferred === true || candidate.status === "مؤجل" ? (
                onRestore && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-6 h-6 rounded-md hover:bg-emerald-500/10 hover:text-emerald-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onRestore(candidate.id, "تقديم الطلب");
                    }}
                    title="استعادة المرشح إلى نشط"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
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
                      <XCircle className="w-3.5 h-3.5 text-red-500" />
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

export default PipelineCandidateCard;
