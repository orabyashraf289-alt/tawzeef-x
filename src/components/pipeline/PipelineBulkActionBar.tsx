import { Users, Mail, XCircle, Clock, Scale, MessageSquare, ArrowRight, Check } from "lucide-react";
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
  onCompareCandidates?: () => void;
  onSendBulkEmail?: () => void;
  onSendBulkWhatsApp?: () => void;
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
  onCompareCandidates,
  onSendBulkEmail,
  onSendBulkWhatsApp,
  isPending,
}: PipelineBulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card/95 backdrop-blur-xl border border-primary/30 shadow-2xl rounded-3xl p-3 px-5 flex flex-wrap items-center justify-between gap-3 max-w-3xl w-[94%] sm:w-full text-xs"
        dir="rtl"
      >
        <div className="flex items-center gap-2.5 text-foreground font-black shrink-0">
          <div className="w-7 h-7 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shadow-xs">
            {selectedCount}
          </div>
          <span>تم تحديد {selectedCount} مرشحين</span>
        </div>

        <div className="h-5 w-[1px] bg-border/80 hidden sm:block shrink-0" />

        <div className="flex items-center gap-2 flex-wrap flex-1 justify-end">
          {/* Compare Button (enabled when 2 to 4 candidates are selected) */}
          {onCompareCandidates && selectedCount >= 2 && selectedCount <= 4 && (
            <Button
              size="sm"
              variant="outline"
              onClick={onCompareCandidates}
              className="h-8 text-xs font-bold gap-1.5 border-purple-500/40 text-purple-700 dark:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 rounded-xl"
            >
              <Scale className="w-3.5 h-3.5" />
              مقارنة ({selectedCount}) ⚖️
            </Button>
          )}

          {/* Bulk WhatsApp Button */}
          {onSendBulkWhatsApp && (
            <Button
              size="sm"
              variant="outline"
              onClick={onSendBulkWhatsApp}
              className="h-8 text-xs font-bold gap-1.5 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              واتساب
            </Button>
          )}

          {/* Bulk Email Button */}
          {onSendBulkEmail && (
            <Button
              size="sm"
              variant="outline"
              onClick={onSendBulkEmail}
              className="h-8 text-xs font-bold gap-1.5 border-blue-500/40 text-blue-700 dark:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 rounded-xl"
            >
              <Mail className="w-3.5 h-3.5" />
              بريد
            </Button>
          )}

          {/* Stage Selector */}
          <Select value={targetStage} onValueChange={setTargetStage}>
            <SelectTrigger className="h-8 text-xs w-[140px] rounded-xl bg-background border-border">
              <SelectValue placeholder="نقل إلى..." />
            </SelectTrigger>
            <SelectContent>
              {stages.map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-xs">
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Move Button */}
          <Button
            size="sm"
            className="h-8 text-xs font-bold gap-1 bg-primary text-primary-foreground rounded-xl"
            disabled={!targetStage || isPending}
            onClick={onBulkMove}
          >
            نقل جماعي
          </Button>

          {/* Reject Button */}
          <Button
            variant="destructive"
            size="sm"
            className="h-8 text-xs font-bold gap-1 rounded-xl"
            disabled={isPending}
            onClick={onBulkReject}
          >
            <XCircle className="w-3.5 h-3.5" />
            رفض
          </Button>

          {/* Clear Button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground hover:text-foreground rounded-xl"
            onClick={onClearSelection}
          >
            إلغاء
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
