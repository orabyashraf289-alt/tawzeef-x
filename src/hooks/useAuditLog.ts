import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

export interface AuditLogRecord {
  id: string;
  event_type: string;
  user_id: string | null;
  user_email: string | null;
  details: Record<string, unknown>;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
}

export type AuditEventType =
  | "login.success"
  | "login.failed"
  | "login.otp_failed"
  | "logout.user"
  | "session.duration"
  | "role.changed"
  | "role.deleted"
  | "offer.accepted"
  | "offer.rejected"
  | "offer.sent"
  | "offer.withdrawn"
  | "member.invited"
  | "member.deleted"
  | "data.exported"
  | "settings.changed";

export async function logAuditEvent(params: {
  eventType: AuditEventType;
  userId?: string | null;
  userEmail?: string | null;
  details?: Record<string, unknown>;
}) {
  try {
    const unauthEvents: string[] = ["login.failed", "login.otp_failed"];
    const isUnauthEvent = unauthEvents.includes(params.eventType);

    if (isUnauthEvent) {
      // For failed login events, call edge function directly without auth header
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      await fetch(`${supabaseUrl}/functions/v1/log-audit-event`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": anonKey,
        },
        body: JSON.stringify({
          eventType: params.eventType,
          userEmail: params.userEmail || null,
          details: params.details || {},
        }),
      });
    } else {
      // For authenticated events, use supabase client (includes auth header)
      await supabase.functions.invoke("log-audit-event", {
        body: {
          eventType: params.eventType,
          userEmail: params.userEmail || null,
          details: params.details || {},
        },
      });
    }
  } catch (e) {
    console.error("Failed to log audit event:", e);
  }
}

export function useAuditLog(limit = 100) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["audit-log", limit],
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_log" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as AuditLogRecord[];
    },
    enabled: !!user,
  });
}
