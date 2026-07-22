import { useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  FileText, FileSearch, Phone, Code, Users, Briefcase, Circle,
  Mail, Target, Award, Heart, ThumbsUp, AlertTriangle, Eye, Star, Timer,
  MessageSquare, Zap, CheckCircle, Plus, GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  "file-text": FileText, "file-search": FileSearch, phone: Phone,
  code: Code, users: Users, briefcase: Briefcase, circle: Circle,
  mail: Mail, "message-square": MessageSquare, zap: Zap,
  target: Target, award: Award, heart: Heart, "thumbs-up": ThumbsUp,
  "alert-triangle": AlertTriangle, eye: Eye, star: Star, timer: Timer,
};

export interface StepperStage {
  id: string;
  name: string;
  icon: string;
  color: string;
  is_active: boolean;
  is_default: boolean;
  sla_hours?: number;
  transition_rules?: any;
  candidate_count?: number;
}

interface PipelineStepperProps {
  stages: StepperStage[];
  selectedStageId?: string | null;
  onStageClick?: (stageId: string) => void;
  onAddClick?: () => void;
  showAddButton?: boolean;
  className?: string;
  draggable?: boolean;
  onReorder?: (reordered: { id: string; sort_order: number }[]) => void;
}

export default function PipelineStepper({
  stages,
  selectedStageId,
  onStageClick,
  onAddClick,
  showAddButton = false,
  className,
  draggable = false,
  onReorder,
}: PipelineStepperProps) {
  const IconComp = ({ icon, className: cls, style }: { icon: string; className?: string; style?: React.CSSProperties }) => {
    const Comp = ICON_MAP[icon] || Circle;
    return <Comp className={cls} style={style} />;
  };

  const dragItemRef = useRef<number | null>(null);
  const dragOverRef = useRef<number | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const handleDragStart = useCallback((idx: number) => {
    dragItemRef.current = idx;
    setDragIdx(idx);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    dragOverRef.current = idx;
    setDragOverIdx(idx);
  }, []);

  const handleDrop = useCallback(() => {
    const from = dragItemRef.current;
    const to = dragOverRef.current;
    if (from === null || to === null || from === to) {
      setDragIdx(null);
      setDragOverIdx(null);
      return;
    }
    const reordered = [...stages];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    onReorder?.(reordered.map((s, i) => ({ id: s.id, sort_order: i })));
    dragItemRef.current = null;
    dragOverRef.current = null;
    setDragIdx(null);
    setDragOverIdx(null);
  }, [stages, onReorder]);

  const handleDragEnd = useCallback(() => {
    setDragIdx(null);
    setDragOverIdx(null);
  }, []);

  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <div className="flex items-start justify-center min-w-max px-4 py-6">
        {stages.map((stage, idx) => {
          const isSelected = selectedStageId === stage.id;
          const isInactive = !stage.is_active;
          const isDragging = dragIdx === idx;
          const isDragOver = dragOverIdx === idx && dragIdx !== idx;

          return (
            <div key={stage.id} className="flex items-start"
              {...(draggable ? {
                draggable: true,
                onDragStart: () => handleDragStart(idx),
                onDragOver: (e: React.DragEvent) => handleDragOver(e, idx),
                onDrop: handleDrop,
                onDragEnd: handleDragEnd,
              } : {})}
            >
              {/* Stage node */}
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onStageClick?.(stage.id)}
                className={cn(
                  "flex flex-col items-center gap-2 group relative transition-all",
                  isInactive && "opacity-50",
                  isDragging && "opacity-30",
                  isDragOver && "scale-110",
                  draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
                )}
              >
                {/* Drag handle indicator */}
                {draggable && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="w-3 h-3 text-muted-foreground/50 rotate-90" />
                  </div>
                )}

                {/* Step Number Pill */}
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded-full bg-muted/90 border border-border text-[9px] font-bold text-muted-foreground z-10 shadow-2xs">
                  {idx + 1}
                </div>

                {/* Circle */}
                <div
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 relative",
                    isSelected
                      ? "border-primary bg-primary/10 shadow-md shadow-primary/20 scale-105"
                      : "border-border bg-card hover:border-primary/40 hover:shadow-sm",
                    isDragOver && "border-primary/60 ring-2 ring-primary/20",
                  )}
                >
                  <IconComp
                    icon={stage.icon}
                    className="w-5 h-5"
                    style={{ color: isSelected ? "hsl(var(--primary))" : stage.color }}
                  />

                  {/* Candidate Count Badge */}
                  {stage.candidate_count != null && stage.candidate_count > 0 && (
                    <div className="absolute -bottom-1 -end-1 px-1.5 py-0.2 rounded-full bg-primary text-primary-foreground text-[9px] font-bold shadow-xs">
                      {stage.candidate_count}
                    </div>
                  )}
                </div>

                {/* Default indicator */}
                {stage.is_default && (
                  <div className="absolute -top-1 -end-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center title='مرحلة افتراضية'">
                    <CheckCircle className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}

                {/* Name */}
                <span
                  className={cn(
                    "text-xs font-medium text-center max-w-[85px] leading-tight transition-colors",
                    isSelected ? "text-primary font-bold" : "text-muted-foreground group-hover:text-foreground"
                  )}
                >
                  {stage.name}
                </span>

                {/* SLA and Rule Badges */}
                <div className="flex items-center gap-1 mt-0.5">
                  {stage.sla_hours != null && stage.sla_hours > 0 && (
                    <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      {stage.sla_hours}س
                    </span>
                  )}
                  {stage.transition_rules?.require_ai_evaluation && (
                    <span className="text-[9px] text-purple-500" title="تقييم AI مطلوب">🤖</span>
                  )}
                  {stage.transition_rules?.require_interview && (
                    <span className="text-[9px] text-amber-500" title="مقابلة مطلوبة">🎥</span>
                  )}
                  {stage.transition_rules?.require_assessment && (
                    <span className="text-[9px] text-green-500" title="اختبار مطلوب">📝</span>
                  )}
                </div>
              </motion.button>

              {/* Connector line */}
              {idx < stages.length - 1 && (
                <div className="flex items-center pt-6 px-1">
                  <div className="w-10 lg:w-16 h-0.5 bg-border rounded-full" />
                </div>
              )}
            </div>
          );
        })}

        {/* Add button */}
        {showAddButton && (
          <div className="flex items-start">
            {stages.length > 0 && (
              <div className="flex items-center pt-6 px-1">
                <div className="w-10 lg:w-16 h-0.5 bg-border/50 rounded-full border-dashed" />
              </div>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={onAddClick}
              className="w-12 h-12 rounded-full border-dashed border-2 border-muted-foreground/30 hover:border-primary/50 mt-0"
            >
              <Plus className="w-5 h-5 text-muted-foreground" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
