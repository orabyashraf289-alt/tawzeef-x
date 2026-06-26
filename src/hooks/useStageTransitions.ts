import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface StageTransition {
  id: string;
  candidate_id: string;
  user_id: string;
  from_stage: string | null;
  to_stage: string;
  moved_by_name: string | null;
  notes: string | null;
  created_at: string;
}

export function useStageTransitions(candidateId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["stage_transitions", candidateId],
    enabled: !!user && !!candidateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stage_transitions" as any)
        .select("*")
        .eq("candidate_id", candidateId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data as any[]) as StageTransition[];
    },
  });
}

export function useRecordTransition() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      candidateId,
      fromStage,
      toStage,
      movedByName,
      notes,
    }: {
      candidateId: string;
      fromStage: string | null;
      toStage: string;
      movedByName?: string;
      notes?: string;
    }) => {
      const { error } = await supabase
        .from("stage_transitions" as any)
        .insert({
          candidate_id: candidateId,
          user_id: user!.id,
          from_stage: fromStage,
          to_stage: toStage,
          moved_by_name: movedByName || user?.email || "غير معروف",
          notes: notes || null,
        } as any);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["stage_transitions", vars.candidateId] });
    },
  });
}
