import { supabase } from "@/integrations/supabase/client";

export interface ApplicantPortalData {
  applications: Array<{ id: string; company_id: string; company_name: string; job_id: string; name?: string; phone?: string; specialty?: string; skills?: string[]; cover_letter?: string; resume_url?: string; status: string; created_at: string; jobs: { title: string; department?: string } }>;
  candidates: Array<{ id: string; company_id: string; job_id: string; role: string; stage: string; status: string; tracking_code?: string }>;
  interviews: Array<{ id: string; company_id: string; position: string; date: string; time: string; type: string; status: string; meeting_url?: string }>;
  offers: Array<{ id: string; company_id: string; position: string; department?: string; salary: number; currency: string; status: string; token?: string }>;
}
export async function loadApplicantPortal(): Promise<ApplicantPortalData> {
  // The server derives the verified identity and scope; no client email or
  // company ID can select another applicant's records.
  const { data, error } = await supabase.rpc("get_my_applicant_portal" as any);
  if (error) throw error;
  if (!data || typeof data !== "object" || ["applications", "candidates", "interviews", "offers"].some(key => !Array.isArray((data as any)[key]))) {
    throw new Error("Invalid applicant portal response");
  }
  return data as unknown as ApplicantPortalData;
}
