import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import {
  isOnline as checkIsOnline,
  getPendingOfflineActions,
  processOfflineSyncQueue,
  subscribeToConnectivity,
  type OfflineAction,
} from "@/lib/offlineSyncEngine";

export function useOfflineSync() {
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState<boolean>(checkIsOnline());
  const [pendingActions, setPendingActions] = useState<OfflineAction[]>(getPendingOfflineActions());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const refreshPending = useCallback(() => {
    setPendingActions(getPendingOfflineActions());
  }, []);

  const syncNow = useCallback(async () => {
    if (!checkIsOnline() || isSyncing) return;
    setIsSyncing(true);
    try {
      const { syncedCount, failedCount } = await processOfflineSyncQueue(supabase);
      refreshPending();
      if (syncedCount > 0) {
        queryClient.invalidateQueries({ queryKey: ["candidates"] });
        queryClient.invalidateQueries({ queryKey: ["interviews"] });
        toast({
          title: "تمت مزامنة التعديلات بنجاح ✅",
          description: `تم إرسال ${syncedCount} إجراء كان محفوظاً في وضع عدم الاتصال.`,
        });
      }
      if (failedCount > 0) {
        toast({
          title: "تنبيه مزامنة",
          description: `تعذر إرسال ${failedCount} إجراءات وستتم إعادة المحاولة تلقائياً.`,
          variant: "destructive",
        });
      }
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, refreshPending, queryClient]);

  useEffect(() => {
    const unsubscribe = subscribeToConnectivity((online) => {
      setIsOnline(online);
      if (online) {
        toast({ title: "عادت شبكة الإنترنت 🌐", description: "جاري فحص ومزامنة البيانات المحفوظة محلياً..." });
        syncNow();
      } else {
        toast({ title: "انقطع الاتصال بالإنترنت ⚠️", description: "أنت في وضع عدم الاتصال؛ سيتم حفظ التعديلات محلياً وتلقائياً." });
      }
    });

    return unsubscribe;
  }, [syncNow]);

  return {
    isOnline,
    pendingCount: pendingActions.length,
    pendingActions,
    isSyncing,
    syncNow,
    refreshPending,
  };
}