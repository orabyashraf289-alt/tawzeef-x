import { supabase } from "@/integrations/supabase/client";

export async function recordStageTransition(input: {
  candidateId: string;
  userId: string | undefined;
  fromStage: string | null;
  toStage: string;
  movedByName?: string;
  notes?: string;
}) {
  if (!input.userId) throw new Error("يجب تسجيل الدخول لحفظ سجل انتقال المرشح.");
  const { error } = await supabase.from("stage_transitions").insert({
    candidate_id: input.candidateId,
    user_id: input.userId,
    from_stage: input.fromStage,
    to_stage: input.toStage,
    moved_by_name: input.movedByName || null,
    notes: input.notes || null,
  });
  if (error) throw error;
}
