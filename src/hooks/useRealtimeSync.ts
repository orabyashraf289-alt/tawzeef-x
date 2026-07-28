import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

/**
 * Hook to listen for live Supabase Realtime changes across the entire database
 * and automatically invalidate React Query caches to trigger instant UI re-renders without refreshing.
 */
export function useRealtimeSync() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("global-app-realtime-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public" },
        (payload) => {
          const table = payload.table;
          const eventType = payload.eventType;

          // Invalidate target queries based on changed table
          switch (table) {
            case "interviews":
              queryClient.invalidateQueries({ queryKey: ["interviews"] });
              if (eventType === "INSERT") {
                toast({ title: "⚡ مقابلة جديدة مجدولة (تحديث لحظي)" });
              } else if (eventType === "UPDATE") {
                toast({ title: "⚡ تم تحديث بيانات المقابلة (تحديث لحظي)" });
              }
              break;

            case "job_offers":
            case "offers":
              queryClient.invalidateQueries({ queryKey: ["offers"] });
              if (eventType === "UPDATE") {
                toast({ title: "⚡ تم تحديث حالة العرض الوظيفي (تحديث لحظي)" });
              }
              break;

            case "candidates":
              queryClient.invalidateQueries({ queryKey: ["candidates"] });
              queryClient.invalidateQueries({ queryKey: ["pipeline_candidates"] });
              queryClient.invalidateQueries({ queryKey: ["pipeline-stages"] });
              break;

            case "jobs":
              queryClient.invalidateQueries({ queryKey: ["jobs"] });
              break;

            case "notifications":
              queryClient.invalidateQueries({ queryKey: ["notifications"] });
              queryClient.invalidateQueries({ queryKey: ["unread_notifications_count"] });
              break;

            case "candidate_tasks":
            case "tasks":
              queryClient.invalidateQueries({ queryKey: ["candidate_tasks"] });
              queryClient.invalidateQueries({ queryKey: ["tasks"] });
              break;

            default:
              queryClient.invalidateQueries();
              break;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);
}
