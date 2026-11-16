import { logAuditEvent } from "@/hooks/useAuditLog";
import { detectUserDevice } from "@/lib/deviceDetector";

const VISITOR_SESSION_KEY = "tx_guest_visitor_session_id";
const VISITOR_PERSISTENT_KEY = "tx_guest_visitor_uid";
const LAST_LOGGED_PATH_KEY = "tx_guest_visitor_last_path";
const LAST_LOGGED_TIME_KEY = "tx_guest_visitor_last_time";

export interface GuestVisitorInfo {
  visitorId: string;
  isReturning: boolean;
  path: string;
  referrer: string;
  device: ReturnType<typeof detectUserDevice>;
  screenResolution: string;
  language: string;
  timeZone: string;
  timestamp: string;
}

/**
 * Retrieves or initializes an anonymous visitor identity
 */
export function getOrCreateVisitorId(): { visitorId: string; isReturning: boolean } {
  if (typeof window === "undefined") {
    return { visitorId: "visitor_ssr", isReturning: false };
  }

  try {
    let persistentId = localStorage.getItem(VISITOR_PERSISTENT_KEY);
    const isReturning = Boolean(persistentId);

    if (!persistentId) {
      persistentId = `vis_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
      localStorage.setItem(VISITOR_PERSISTENT_KEY, persistentId);
    }

    let sessionId = sessionStorage.getItem(VISITOR_SESSION_KEY);
    if (!sessionId) {
      sessionId = `sess_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
      sessionStorage.setItem(VISITOR_SESSION_KEY, sessionId);
    }

    return { visitorId: persistentId, isReturning };
  } catch {
    return { visitorId: `vis_${Date.now()}`, isReturning: false };
  }
}

/**
 * Tracks an unauthenticated guest visitor entry and public page navigation
 */
export async function trackGuestVisit(pathname: string, force = false): Promise<void> {
  if (typeof window === "undefined") return;

  // Do not track API, static asset, or dev-only internal paths
  if (pathname.startsWith("/api") || pathname.includes(".")) return;

  try {
    const { visitorId, isReturning } = getOrCreateVisitorId();
    const lastPath = sessionStorage.getItem(LAST_LOGGED_PATH_KEY);
    const lastTimeStr = sessionStorage.getItem(LAST_LOGGED_TIME_KEY);
    const now = Date.now();

    // Prevent duplicate logs for the exact same path within 30 seconds
    if (!force && lastPath === pathname && lastTimeStr && now - Number(lastTimeStr) < 30000) {
      return;
    }

    sessionStorage.setItem(LAST_LOGGED_PATH_KEY, pathname);
    sessionStorage.setItem(LAST_LOGGED_TIME_KEY, String(now));

    const device = detectUserDevice();
    const referrer = document.referrer ? new URL(document.referrer, window.location.origin).hostname : "مباشر (Direct)";
    const screenRes = `${window.screen?.width || 0}x${window.screen?.height || 0}`;
    const language = navigator.language || "ar";
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Riyadh";

    const isFirstSessionVisit = !sessionStorage.getItem("tx_guest_entry_logged");
    const eventType = isFirstSessionVisit ? "visitor.entry" : "visitor.page_view";

    if (isFirstSessionVisit) {
      sessionStorage.setItem("tx_guest_entry_logged", "true");
    }

    await logAuditEvent({
      eventType,
      userEmail: null,
      userId: null,
      details: {
        visitor_id: visitorId,
        is_guest: true,
        is_returning: isReturning,
        path: pathname,
        full_url: window.location.href,
        referrer,
        screen_resolution: screenRes,
        language,
        time_zone: timeZone,
        device_type: device.deviceType,
        device_name: device.deviceName,
        os_name: device.osName,
        browser_name: device.browserName,
        event_label: isFirstSessionVisit ? "دخول زائر جديد للمنصة (دون تسجيل)" : `تصفح صفحة (${pathname})`,
      },
    });
  } catch (err) {
    // Fail silently so guest user experience is never impacted
    console.debug("[Guest Tracker] visit tracking notice:", err);
  }
}
