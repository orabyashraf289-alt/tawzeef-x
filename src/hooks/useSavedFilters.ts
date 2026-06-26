import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { SearchScope } from "./useSearchHistory";

export interface SavedFilter {
  id: string;
  name: string;
  scope: SearchScope;
  filters: Record<string, any>;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export function useSavedFilters(scope?: SearchScope) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["saved-filters", user?.id, scope],
    queryFn: async () => {
      let q = supabase
        .from("saved_filters" as any)
        .select("*")
        .order("is_pinned", { ascending: false })
        .order("updated_at", { ascending: false });
      if (scope) q = q.eq("scope", scope);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as SavedFilter[];
    },
    enabled: !!user,
  });
}

export function useSaveFilter() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { name: string; scope: SearchScope; filters: Record<string, any> }) => {
      const { data, error } = await supabase
        .from("saved_filters" as any)
        .insert({
          user_id: user!.id,
          name: params.name.trim().slice(0, 100),
          scope: params.scope,
          filters: params.filters,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-filters"] });
      toast({ title: "تم حفظ الفلتر ✅" });
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteSavedFilter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("saved_filters" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-filters"] });
      toast({ title: "تم حذف الفلتر" });
    },
  });
}

export function useToggleFilterPin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; is_pinned: boolean }) => {
      const { error } = await supabase
        .from("saved_filters" as any)
        .update({ is_pinned: !params.is_pinned })
        .eq("id", params.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved-filters"] }),
  });
}
