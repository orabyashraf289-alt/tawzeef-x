import { useOfflineSync } from "@/hooks/useOfflineSync";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WifiOff, RefreshCw, CheckCircle2, CloudUpload } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function OfflineSyncStatusBanner() {
  const { isOnline, pendingCount, isSyncing, syncNow } = useOfflineSync();

  if (isOnline && pendingCount === 0 && !isSyncing) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -40, opacity: 0 }}
        className="fixed top-2 inset-x-4 max-w-xl mx-auto z-50 flex items-center justify-between p-3 rounded-2xl shadow-xl border backdrop-blur-md bg-card/95 text-foreground"
        dir="rtl"
      >
        <div className="flex items-center gap-2.5">
          {!isOnline ? (
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
              <WifiOff className="w-4 h-4 animate-pulse" />
            </div>
          ) : isSyncing ? (
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
              <RefreshCw className="w-4 h-4 animate-spin" />
            </div>
          ) : (
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <CloudUpload className="w-4 h-4" />
            </div>
          )}

          <div>
            <div className="text-xs font-bold flex items-center gap-2">
              <span>
                {!isOnline
                  ? "وضع عدم الاتصال بالشبكة (Offline Mode)"
                  : isSyncing
                  ? "جاري المزامنة مع الخادم..."
                  : "إجراءات جاهزة للمزامنة"}
              </span>
              {pendingCount > 0 && (
                <Badge variant="secondary" className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300">
                  {pendingCount} محفوظة محلياً
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {!isOnline
                ? "يتم حفظ التقييمات والملاحظات محلياً وسيتم رفعها تلقائياً عند عودة الإنترنت."
                : "تم استعادة الاتصال؛ انقر للمزامنة الفورية الآن."}
            </p>
          </div>
        </div>

        {isOnline && pendingCount > 0 && (
          <Button
            size="sm"
            onClick={syncNow}
            disabled={isSyncing}
            className="text-xs font-bold h-8 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "مزامنة..." : "مزامنة الآن"}</span>
          </Button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}