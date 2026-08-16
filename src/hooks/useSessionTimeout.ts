import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { initSessionTracker, recordActivity, flushSessionAudit } from "@/lib/sessionTracker";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE_MS = 2 * 60 * 1000; // Warn 2 minutes before

export function useSessionTimeout() {
  const { user, signOut } = useAuth();
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasWarnedRef = useRef(false);

  // Initialize session start time if missing
  useEffect(() => {
    if (!user) return;
    initSessionTracker(user.id);
  }, [user]);

  const resetTimers = useCallback(() => {
    if (!user) return;
    hasWarnedRef.current = false;
    recordActivity();

    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

    warningTimerRef.current = setTimeout(() => {
      if (!hasWarnedRef.current) {
        hasWarnedRef.current = true;
        toast({
          title: "⏳ تنبيه انتهاء الجلسة",
          description: "سيتم تسجيل خروجك تلقائياً خلال دقيقتين بسبب عدم النشاط",
          variant: "destructive",
        });
      }
    }, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS);

    idleTimerRef.current = setTimeout(() => {
      toast({ title: "تم تسجيل الخروج تلقائياً 🔒", description: "لحماية حسابك بسبب عدم النشاط" });
      flushSessionAudit(user.id, user.email, "idle");
      signOut();
    }, IDLE_TIMEOUT_MS);
  }, [user, signOut]);

  useEffect(() => {
    if (!user) return;

    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    const handler = () => resetTimers();

    events.forEach((e) => document.addEventListener(e, handler, { passive: true }));
    resetTimers();

    // Track beforeunload / page hide for exact exit duration
    const handleUnload = () => {
      flushSessionAudit(user.id, user.email, "tab_closed");
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      events.forEach((e) => document.removeEventListener(e, handler));
      window.removeEventListener("beforeunload", handleUnload);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [user, resetTimers]);
}
