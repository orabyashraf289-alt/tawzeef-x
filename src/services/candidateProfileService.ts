import { supabase } from "@/integrations/supabase/client";
import type { CandidateRow } from "@/hooks/useJobs";

/** Read a profile without creating records or inferring a missing owner. */
export async function fetchCandidateProfile(identifier: string | undefined): Promise<CandidateRow | null> {
  if (!identifier) return null;
  const cleanId = identifier.trim();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);

  let candQuery = supabase.from("candidates").select("*, jobs(title)");
  if (isUuid) candQuery = candQuery.or(`id.eq.${cleanId},tracking_code.ilike.${cleanId}`);
  else candQuery = candQuery.or(`tracking_code.ilike.${cleanId},email.ilike.${cleanId}`);

  const { data: cand, error: candidateError } = await candQuery.maybeSingle();
  if (candidateError) throw candidateError;
  if (cand) return cand;

  let appQuery = supabase.from("applications").select("*, jobs(title)");
  if (isUuid) appQuery = appQuery.or(`id.eq.${cleanId},tracking_code.ilike.${cleanId}`);
  else appQuery = appQuery.or(`tracking_code.ilike.${cleanId},email.ilike.${cleanId}`);

  const { data: app, error: applicationError } = await appQuery.maybeSingle();
  if (applicationError) throw applicationError;
  if (app) {
    // Check if there is already a candidate record in candidates table with the same email and job_id
    if (app.email && app.job_id) {
      const { data: linkedCand, error: linkedError } = await supabase
        .from("candidates")
        .select("*, jobs(title)")
        .eq("job_id", app.job_id)
        .ilike("email", app.email.trim())
        .maybeSingle();
      if (linkedError) throw linkedError;
      if (linkedCand) return linkedCand;
    }

    // Reading a legacy application must not create a candidate or assign its
    // ownership to the viewer. Candidate creation belongs to the DB trigger.

    return {
      id: app.id,
      name: app.name,
      email: app.email,
      phone: app.phone,
      job_id: app.job_id,
      user_id: null,
      company_id: app.company_id,
      role: app.jobs?.title || app.specialty || "متقدم جديد",
      stage: "تقديم الطلب",
      status: app.status || "قيد المراجعة",
      experience: app.experience,
      resume_url: app.resume_url,
      skills: app.skills,
      summary: app.cover_letter,
      source: "رابط التقديم المباشر",
      tracking_code: app.tracking_code || null,
      license_number: app.license_number || null,
      license_expiry: app.license_expiry || null,
      university_degree: app.university_degree || null,
      demo_video_url: app.demo_video_url || null,
      created_at: app.created_at,
      jobs: app.jobs,
      candidate_scorecards: [],
    };
  }

  return null;
}
