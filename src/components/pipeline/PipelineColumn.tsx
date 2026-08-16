import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { TrendingUp, Clock, Settings, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface PipelineColumnProps {
  stage: { id: string; label: string; color: string };
  children: React.ReactNode;
  count: number;
  label: string;
  totalCandidates: number;
  avgDays: number;
  tLabel: { conversion: string; avgDays: string };
  slaHours?: number;
  transitionRules?: any;
  onConfigure?: (stageId: string) => void;
}

export default function PipelineColumn({
  stage,
  children,
  count,
  label,
  totalCandidates,
  avgDays,
  tLabel,
  slaHours = 0,
  transitionRules,
  onConfigure,
}: PipelineColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const conversionRate = totalCandidates > 0 ? Math.round((count / totalCandidates) * 100) : 0;
  const hasRules = transitionRules && (
    transitionRules.auto_schedule_interview ||
    transitionRules.auto_send_email ||
    transitionRules.require_evaluation
  );

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col min-w-[240px] w-[240px] lg:w-auto lg:flex-1 rounded-xl border border-border/50 bg-muted/20 transition-all duration-200",
        isOver && "bg-primary/5 border-primary/30 shadow-md"
      )}
    >
      <div className="p-3 border-b border-border/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
            <span className="text-xs font-semibold text-foreground">{label}</span>
            {hasRules && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  </TooltipTrigger>
                  <TooltipContent className="text-[10px]">
                    تحتوي على قواعد انتقال تلقائية
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          <div className="flex items-center gap-1">
            {onConfigure && (
              <Button
                variant="ghost"
                size="icon"
                className="w-5 h-5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                onClick={() => onConfigure(stage.id)}
                title="تخصيص المرحلة وإعدادات SLA"
              >
                <Settings className="w-3 h-3" />
              </Button>
            )}
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
              style={{ backgroundColor: stage.color + "1a", color: stage.color }}
            >
              {count}
            </span>
          </div>
        </div>

        {/* Stage stats & SLA */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3 text-emerald-500" />
              {conversionRate}%
            </span>
            {avgDays > 0 && (
              <span className="flex items-center gap-0.5">
                <Clock className="w-3 h-3" />
                {avgDays}{tLabel.avgDays.charAt(0) === "A" ? "d" : "ي"}
              </span>
            )}
          </div>

          {slaHours > 0 && (
            <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400 font-medium" title={`حد إقامة المرشح بالمرحلة: ${slaHours} ساعة`}>
              <AlertTriangle className="w-2.5 h-2.5" />
              SLA: {slaHours >= 24 ? `${Math.round(slaHours / 24)}d` : `${slaHours}h`}
            </span>
          )}
        </div>
      </div>

      <div className="p-2 space-y-2 flex-1 overflow-y-auto max-h-[calc(100vh-300px)] min-h-[80px]">
        {children}
      </div>
    </div>
  );
}
