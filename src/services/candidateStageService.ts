import { supabase } from "@/integrations/supabase/client";

interface CandidateChange {
  candidateId: string;
  companyId: string | null | undefined;
  status: string;
  notes?: string;
}

async function writeCandidateChange(input: CandidateChange, patch: { stage?: string; stage_entered_at?: string }) {
  if (!input.companyId) throw new Error("يجب مراجعة ربط المرشح بالشركة قبل تغيير مرحلته.");
  const timestamp = new Date().toISOString();
  const { data: written, error: writeError } = await supabase.from("candidates")
    .update({ ...patch, status: input.status, updated_at: timestamp,
      ...(input.notes !== undefined ? { notes: input.notes } : {}) })
    .eq("id", input.candidateId).eq("company_id", input.companyId).select("id").single();
  if (writeError) throw writeError;
  if (!written) throw new Error("تعذر العثور على المرشح في الشركة المحددة.");

  // AFTER triggers can change the stored row after UPDATE RETURNING is evaluated.
  // Read the committed result instead of repeating the requested stage update.
  const { data: current, error: readError } = await supabase.from("candidates")
    .select("id, company_id, stage, status").eq("id", input.candidateId).eq("company_id", input.companyId).single();
  if (readError || !current) throw new Error("تم حفظ التغيير لكن تعذر قراءة المرحلة النهائية؛ أعد تحميل الملف.");
  return current;
}

export function updateCandidateStage(input: CandidateChange & { stage: string }) {
  return writeCandidateChange(input, { stage: input.stage, stage_entered_at: new Date().toISOString() });
}

/** A rejection must not overwrite a newer stage or reset its elapsed time. */
export function updateCandidateStatus(input: CandidateChange) {
  return writeCandidateChange(input, {});
}
