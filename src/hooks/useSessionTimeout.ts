import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { logAuditEvent } from "@/hooks/useAuditLog";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE_MS = 2 * 60 * 1000; // Warn 2 minutes before
const SESSION_START_KEY = "tx_session_start_time";

export function useSessionTimeout() {
  const { user, signOut } = useAuth();
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasWarnedRef = useRef(false);

  // Initialize session start time if missing
  useEffect(() => {
    if (!user) return;
    let startTime = sessionStorage.getItem(SESSION_START_KEY);
    if (!startTime) {
      startTime = new Date().toISOString();
      sessionStorage.setItem(SESSION_START_KEY, startTime);
    }
  }, [user]);

  const logSessionDuration = useCallback((reason: "idle" | "manual" | "closed") => {
    if (!user) return;
    const startTime = sessionStorage.getItem(SESSION_START_KEY);
    if (!startTime) return;

    const startMs = new Date(startTime).getTime();
    const endMs = Date.now();
    const durationSeconds = Math.max(1, Math.round((endMs - startMs) / 1000));
    const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));

    logAuditEvent({
      eventType: "session.duration",
      userId: user.id,
      userEmail: user.email,
      details: {
        login_time: startTime,
        logout_time: new Date().toISOString(),
        duration_seconds: durationSeconds,
        duration_minutes: durationMinutes,
        formatted_duration: durationMinutes >= 60
          ? `${Math.floor(durationMinutes / 60)} ساعة و ${durationMinutes % 60} دقيقة`
          : `${durationMinutes} دقيقة`,
        reason,
      },
    });

    sessionStorage.removeItem(SESSION_START_KEY);
  }, [user]);

  const resetTimers = useCallback(() => {
    if (!user) return;
    hasWarnedRef.current = false;

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
      logSessionDuration("idle");
      signOut();
    }, IDLE_TIMEOUT_MS);
  }, [user, signOut, logSessionDuration]);

  useEffect(() => {
    if (!user) return;

    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    const handler = () => resetTimers();

    events.forEach((e) => document.addEventListener(e, handler, { passive: true }));
    resetTimers();

    return () => {
      events.forEach((e) => document.removeEventListener(e, handler));
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [user, resetTimers]);
}
