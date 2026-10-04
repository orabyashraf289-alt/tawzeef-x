import { supabase } from "@/integrations/supabase/client";

export async function updateCandidateStage(input: {
  candidateId: string;
  companyId: string | null | undefined;
  stage: string;
  status: string;
}) {
  if (!input.companyId) throw new Error("يجب مراجعة ربط المرشح بالشركة قبل تغيير مرحلته.");
  const timestamp = new Date().toISOString();
  const { data: written, error: writeError } = await supabase.from("candidates")
    .update({ stage: input.stage, status: input.status, stage_entered_at: timestamp, updated_at: timestamp })
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
