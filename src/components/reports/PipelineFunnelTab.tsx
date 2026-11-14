import { motion } from "framer-motion";
import { Target } from "lucide-react";
import type { FunnelStageItem } from "./reportTypes";

interface PipelineFunnelTabProps {
  funnelData: FunnelStageItem[];
  title: string;
}

export function PipelineFunnelTab({ funnelData, title }: PipelineFunnelTabProps) {
  const maxCount = funnelData[0]?.count || 1;

  return (
    <div className="glass-card-premium p-5 border border-border/30 bg-card/40 backdrop-blur-md rounded-2xl shadow-sm">
      <h3 className="text-sm font-bold flex items-center gap-2 mb-5 text-foreground">
        <Target className="w-4 h-4 text-primary" />
        {title}
      </h3>
      <div className="space-y-3">
        {funnelData.map((stage, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-center gap-3 sm:gap-4"
          >
            <span className="text-xs sm:text-sm w-24 sm:w-28 text-muted-foreground shrink-0 font-medium">
              {stage.displayStage}
            </span>
            <div className="flex-1 h-9 bg-muted/50 dark:bg-muted/20 rounded-lg overflow-hidden relative border border-border/30">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(stage.count / maxCount) * 100}%` }}
                transition={{ duration: 0.8, delay: i * 0.1 }}
                className="h-full rounded-lg bg-gradient-to-r from-primary to-accent/80 dark:from-primary/70 dark:to-accent/60"
              />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-foreground">
                {stage.count} ({stage.rate})
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
