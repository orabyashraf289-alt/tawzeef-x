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
  | "settings.changed"
  | "visitor.entry"
  | "visitor.page_view"
  | "guest.visit";

export async function logAuditEvent(params: {
  eventType: AuditEventType;
  userId?: string | null;
  userEmail?: string | null;
  companyId?: string | null;
  details?: Record<string, unknown>;
}) {
  try {
    const unauthEvents: string[] = [
      "login.failed",
      "login.otp_failed",
      "visitor.entry",
      "visitor.page_view",
      "guest.visit",
    ];
    const isUnauthEvent = unauthEvents.includes(params.eventType);

    if (isUnauthEvent) {
      const isVisitorEvent = ["visitor.entry", "visitor.page_view", "guest.visit"].includes(params.eventType);

      // Method 1: For visitor tracking, attempt fast direct RPC first
      if (isVisitorEvent) {
        try {
          const rpc = supabase.rpc as unknown as (
            fn: string,
            args: Record<string, unknown>,
          ) => Promise<{ error: unknown }>;
          const { error: rpcErr } = await rpc("log_guest_visit_event", {
            p_event_type: params.eventType,
            p_details: {
              ...(params.details || {}),
              company_id: params.companyId || (params.details?.company_id as string) || null,
            },
            p_ip: (params.details?.ip_address as string) || null,
          });
          if (!rpcErr) {
            return;
          }
        } catch (rpcEx) {
          console.debug("[AuditLog] RPC log_guest_visit_event fallback to edge function:", rpcEx);
        }
      }

      // Method 2: Edge function call (always include apikey and Bearer auth header)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      await fetch(`${supabaseUrl}/functions/v1/log-audit-event`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": anonKey,
          "Authorization": `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          eventType: params.eventType,
          userEmail: params.userEmail || null,
          companyId: params.companyId || (params.details?.company_id as string) || null,
          details: params.details || {},
        }),
      });
    } else {
      // For authenticated events, use supabase client (includes auth header)
      await supabase.functions.invoke("log-audit-event", {
        body: {
          eventType: params.eventType,
          userEmail: params.userEmail || null,
          companyId: params.companyId || null,
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
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as AuditLogRecord[];
    },
    enabled: !!user,
  });
}
