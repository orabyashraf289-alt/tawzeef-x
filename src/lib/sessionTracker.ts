import { logAuditEvent } from "@/hooks/useAuditLog";

const SESSION_START_KEY = "tx_session_start_time";
const ACTIVE_SECONDS_KEY = "tx_session_active_seconds";
const IDLE_SECONDS_KEY = "tx_session_idle_seconds";
const LAST_ACTIVITY_KEY = "tx_session_last_activity";

export function formatExactArabicDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return "أقل من ثانية";

  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const parts: string[] = [];

  if (hrs > 0) {
    parts.push(hrs === 1 ? "ساعة" : hrs === 2 ? "ساعتان" : hrs <= 10 ? `${hrs} ساعات` : `${hrs} ساعة`);
  }
  if (mins > 0) {
    parts.push(mins === 1 ? "دقيقة" : mins === 2 ? "دقيقتان" : mins <= 10 ? `${mins} دقائق` : `${mins} دقيقة`);
  }
  if (secs > 0 || parts.length === 0) {
    parts.push(secs === 1 ? "ثانية واحدة" : secs === 2 ? "ثانيتان" : secs <= 10 ? `${secs} ثواني` : `${secs} ثانية`);
  }

  return parts.join(" و ");
}

export function initSessionTracker(userId: string) {
  if (typeof window === "undefined") return;

  const nowIso = new Date().toISOString();
  if (!sessionStorage.getItem(SESSION_START_KEY)) {
    sessionStorage.setItem(SESSION_START_KEY, nowIso);
    sessionStorage.setItem(ACTIVE_SECONDS_KEY, "0");
    sessionStorage.setItem(IDLE_SECONDS_KEY, "0");
    sessionStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
  }
}

export function recordActivity() {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
}

export function getSessionMetrics() {
  if (typeof window === "undefined") {
    return {
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      totalSeconds: 0,
      activeSeconds: 0,
      idleSeconds: 0,
      activePercentage: 100,
      formattedTotal: "0 ثانية",
      formattedActive: "0 ثانية",
      formattedIdle: "0 ثانية",
    };
  }

  const startTimeStr = sessionStorage.getItem(SESSION_START_KEY) || new Date().toISOString();
  const startMs = new Date(startTimeStr).getTime();
  const endMs = Date.now();

  const totalSeconds = Math.max(1, Math.round((endMs - startMs) / 1000));
  const activeSeconds = Math.min(totalSeconds, parseInt(sessionStorage.getItem(ACTIVE_SECONDS_KEY) || "0", 10) || totalSeconds);
  const idleSeconds = Math.max(0, totalSeconds - activeSeconds);
  const activePercentage = totalSeconds > 0 ? Math.round((activeSeconds / totalSeconds) * 100) : 100;

  return {
    startTime: startTimeStr,
    endTime: new Date().toISOString(),
    totalSeconds,
    activeSeconds,
    idleSeconds,
    activePercentage,
    formattedTotal: formatExactArabicDuration(totalSeconds),
    formattedActive: formatExactArabicDuration(activeSeconds),
    formattedIdle: formatExactArabicDuration(idleSeconds),
  };
}

export async function flushSessionAudit(userId: string, userEmail?: string | null, reason: "manual" | "idle" | "tab_closed" = "manual") {
  if (typeof window === "undefined") return;

  const metrics = getSessionMetrics();
  if (metrics.totalSeconds < 2) return; // Ignore ultra-short flash events

  try {
    await logAuditEvent({
      eventType: reason === "manual" ? "logout.user" : "session.duration",
      userId,
      userEmail,
      details: {
        login_time: metrics.startTime,
        logout_time: metrics.endTime,
        duration_seconds: metrics.totalSeconds,
        duration_minutes: Math.round(metrics.totalSeconds / 60),
        active_seconds: metrics.activeSeconds,
        idle_seconds: metrics.idleSeconds,
        active_percentage: metrics.activePercentage,
        formatted_duration: metrics.formattedTotal,
        formatted_active: metrics.formattedActive,
        formatted_idle: metrics.formattedIdle,
        reason,
      },
    });

    sessionStorage.removeItem(SESSION_START_KEY);
    sessionStorage.removeItem(ACTIVE_SECONDS_KEY);
    sessionStorage.removeItem(IDLE_SECONDS_KEY);
    sessionStorage.removeItem(LAST_ACTIVITY_KEY);
  } catch (err) {
    console.error("Failed to flush precise session audit:", err);
  }
}
