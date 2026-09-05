import { memo } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Star, GripVertical, Bot, CheckCircle2, Clock, AlertTriangle, Check, XCircle } from "lucide-react";

export interface CandidateCardProps {
  candidate: any;
  isDragging?: boolean;
  response?: any;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onReject?: (id: string, name: string) => void;
  onDefer?: (id: string) => void;
  onRestore?: (id: string, originalStage: string) => void;
  stageSlaHours?: number;
}

const getInitials = (name: string) => name ? name.split(" ").map(n => n[0]).join("") : "?";

const PipelineCandidateCard = memo(function PipelineCandidateCard({
  candidate,
  isDragging = false,
  response,
  isSelected = false,
  onToggleSelect,
  onReject,
  onDefer,
  onRestore,
  stageSlaHours = 0
}: CandidateCardProps) {
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
              <Link
                to={`/candidates/${candidate.id}`}
                className="text-xs font-semibold text-foreground hover:text-primary transition-colors block truncate"
              >
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

          {/* Card Actions */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end gap-1.5 mt-2 pt-1.5 border-t border-border/40">
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
                    <XCircle className="w-3.5 h-3.5 text-red-500" />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

export default PipelineCandidateCard;
