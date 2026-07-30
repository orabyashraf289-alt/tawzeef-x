import { Users, Mail, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";

export interface PipelineBulkActionBarProps {
  selectedCount: number;
  stages: { id: string; label: string }[];
  targetStage: string;
  setTargetStage: (stage: string) => void;
  onBulkMove: () => void;
  onBulkReject: () => void;
  onClearSelection: () => void;
  isPending: boolean;
}

export default function PipelineBulkActionBar({
  selectedCount,
  stages,
  targetStage,
  setTargetStage,
  onBulkMove,
  onBulkReject,
  onClearSelection,
  isPending,
}: PipelineBulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card border border-primary/30 shadow-2xl rounded-2xl p-3 px-5 flex items-center gap-4 max-w-2xl w-full text-xs"
      >
        <div className="flex items-center gap-2 text-foreground font-semibold shrink-0">
          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[11px]">
            {selectedCount}
          </div>
          <span>تم تحديث مرشحين</span>
        </div>

        <div className="h-4 w-[1px] bg-border shrink-0" />

        <div className="flex items-center gap-2 flex-1 justify-end">
          <Select value={targetStage} onValueChange={setTargetStage}>
            <SelectTrigger className="h-8 text-xs w-[140px] bg-background">
              <SelectValue placeholder="اختر المرحلة" />
            </SelectTrigger>
            <SelectContent>
              {stages.map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-xs">
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            size="sm"
            className="h-8 text-xs gap-1"
            disabled={!targetStage || isPending}
            onClick={onBulkMove}
          >
            نقل الجماعي
          </Button>

          <Button
            variant="destructive"
            size="sm"
            className="h-8 text-xs gap-1"
            disabled={isPending}
            onClick={onBulkReject}
          >
            <XCircle className="w-3.5 h-3.5" />
            رفض الجماعي
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground"
            onClick={onClearSelection}
          >
            إلغاء التحديد
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
