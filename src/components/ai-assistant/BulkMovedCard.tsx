import { motion } from "framer-motion";
import { ArrowRightLeft, Users, AlertCircle } from "lucide-react";

export default function BulkMovedCard({ data }: { data: { moved: any[]; failed: string[]; new_stage: string; moved_count: number; failed_count: number } }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mt-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 space-y-2.5"
    >
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-blue-600 shrink-0" />
        <div className="flex-1 text-xs">
          <p className="font-bold text-blue-800 dark:text-blue-300">
            تم نقل {data.moved_count} مرشح إلى "{data.new_stage}"
          </p>
        </div>
      </div>

      {data.moved.length > 0 && (
        <div className="space-y-1">
          {data.moved.map((m, i) => (
            <div key={i} className="text-[11px] flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
              <ArrowRightLeft className="w-3 h-3" />
              <span className="font-medium">{m.name}</span>
              <span className="text-muted-foreground">({m.old_stage} ←)</span>
            </div>
          ))}
        </div>
      )}

      {data.failed.length > 0 && (
        <div className="border-t border-blue-200 dark:border-blue-800 pt-2 space-y-1">
          <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> لم يتم العثور على:
          </p>
          {data.failed.map((name, i) => (
            <div key={i} className="text-[11px] text-amber-600 dark:text-amber-400 mr-4">• {name}</div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
