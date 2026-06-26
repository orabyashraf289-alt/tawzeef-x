import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type SearchScope = "global" | "candidates" | "jobs" | "interviews" | "offers";

export interface SearchHistoryEntry {
  id: string;
  query: string;
  scope: SearchScope;
  result_count: number;
  filters: Record<string, any>;
  created_at: string;
}

export function useSearchHistory(scope?: SearchScope, limit = 20) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["search-history", user?.id, scope, limit],
    queryFn: async () => {
      let q = supabase
        .from("search_history" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (scope) q = q.eq("scope", scope);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as SearchHistoryEntry[];
    },
    enabled: !!user,
  });
}

export function useRecordSearch() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { query: string; scope: SearchScope; result_count?: number; filters?: Record<string, any> }) => {
      if (!user || !params.query.trim() || params.query.trim().length < 2) return null;
      const { data, error } = await supabase
        .from("search_history" as any)
        .insert({
          user_id: user.id,
          query: params.query.trim().slice(0, 200),
          scope: params.scope,
          result_count: params.result_count ?? 0,
          filters: params.filters ?? {},
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["search-history"] });
    },
  });
}

export function useClearSearchHistory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (scope?: SearchScope) => {
      if (!user) return;
      let q = supabase.from("search_history" as any).delete().eq("user_id", user.id);
      if (scope) q = q.eq("scope", scope);
      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["search-history"] });
    },
  });
}

export function useDeleteSearchEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("search_history" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["search-history"] }),
  });
}
