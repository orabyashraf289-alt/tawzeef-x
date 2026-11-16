import { supabase } from "@/integrations/supabase/client";

export type NotificationType =
  | "application"
  | "candidate"
  | "interview"
  | "interview_reminder"
  | "offer"
  | "stage_change"
  | "rejection"
  | "task"
  | "ai_eval"
  | "security"
  | "system";

export type NotificationPriority = "urgent" | "high" | "normal";

export interface SystemNotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  description?: string;
  priority?: NotificationPriority;
  metadata?: Record<string, any>;
}

const SOUND_PREF_KEY = "tx_sound_notifications_enabled";

export function isSoundNotificationEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const pref = localStorage.getItem(SOUND_PREF_KEY);
  return pref === null ? true : pref === "true";
}

export function setSoundNotificationEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SOUND_PREF_KEY, String(enabled));
}

/**
 * Play an accessible and crisp web audio chime for in-app notifications
 */
export function playNotificationTone(priority: NotificationPriority = "normal"): void {
  if (!isSoundNotificationEnabled() || typeof window === "undefined") return;

  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const audioCtx = new AudioContextClass();
    const now = audioCtx.currentTime;

    const playTone = (freq: number, startTime: number, duration: number, type: OscillatorType = "sine") => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.25, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    if (priority === "urgent") {
      // 3 ascending tones for urgent alerts (e.g. interview in 15m)
      playTone(587.33, now, 0.12, "triangle"); // D5
      playTone(880, now + 0.12, 0.12, "triangle"); // A5
      playTone(1174.66, now + 0.24, 0.25, "triangle"); // D6
    } else if (priority === "high") {
      // Two crisp tones
      playTone(783.99, now, 0.14, "sine"); // G5
      playTone(1046.5, now + 0.14, 0.22, "sine"); // C6
    } else {
      // Gentle harmonious chime
      playTone(830, now, 0.15, "sine");
      playTone(1100, now + 0.15, 0.2, "sine");
    }
  } catch {
    // Audio context may be restricted by browser autoplay policy until user interacts
  }
}

/**
 * Standardized function to dispatch notifications into the database
 */
export async function dispatchSystemNotification(payload: SystemNotificationPayload): Promise<boolean> {
  try {
    const { error } = await supabase.from("notifications").insert({
      user_id: payload.userId,
      type: payload.type,
      title: payload.title,
      description: payload.description || "",
      read: false,
    });

    if (error) {
      console.error("[Notification Dispatch Error]:", error);
      return false;
    }

    playNotificationTone(payload.priority || "normal");
    return true;
  } catch (err) {
    console.error("[Notification Dispatch Exception]:", err);
    return false;
  }
}

/**
 * Helper to determine notification priority from type and title
 */
export function getNotificationPriority(type: string, title?: string): NotificationPriority {
  const lowerTitle = (title || "").toLowerCase();
  if (
    type === "interview_reminder" ||
    lowerTitle.includes("عاجل") ||
    lowerTitle.includes("urgent") ||
    lowerTitle.includes("أمان") ||
    lowerTitle.includes("security")
  ) {
    return "urgent";
  }
  if (type === "interview" || type === "offer" || type === "ai_eval") {
    return "high";
  }
  return "normal";
}

/**
 * Maps notification type to navigation route
 */
export function getNotificationDestination(type: string): { path: string; label: string } {
  switch (type) {
    case "interview":
    case "interview_reminder":
      return { path: "/interviews", label: "الانتقال للمقابلة 📅" };
    case "candidate":
    case "application":
    case "stage_change":
    case "rejection":
      return { path: "/candidates", label: "عرض المرشحين 👤" };
    case "offer":
      return { path: "/offers", label: "العروض الوظيفية 📄" };
    case "task":
      return { path: "/tasks", label: "لوحة المهام ✅" };
    case "ai_eval":
      return { path: "/reports", label: "تقرير الذكاء الاصطناعي 🤖" };
    case "job":
      return { path: "/jobs", label: "إدارة الوظائف 💼" };
    default:
      return { path: "/notifications", label: "عرض التفاصيل 🔔" };
  }
}
