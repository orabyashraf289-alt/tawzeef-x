-- Restore database-enforced tenant isolation. Client-side filters do not protect
-- the Data API, and an RLS policy cannot validate a tracking code supplied in a
-- separate HTTP query.
DROP POLICY IF EXISTS "Public tracking code lookup candidates" ON public.candidates;
DROP POLICY IF EXISTS "Public tracking code lookup applications" ON public.applications;
DROP POLICY IF EXISTS "Authenticated users access all candidates" ON public.candidates;
DROP POLICY IF EXISTS "Authenticated users access all applications" ON public.applications;
-- Public applicants insert applications; its SECURITY DEFINER trigger writes
-- the candidate row. Anonymous direct candidate inserts are unnecessary.
DROP POLICY IF EXISTS "Anyone can submit candidate application" ON public.candidates;

DROP POLICY IF EXISTS "Users manage own candidates" ON public.candidates;
DROP POLICY IF EXISTS "Company members access candidates" ON public.candidates;
DROP POLICY IF EXISTS "Job seekers can view own candidate records" ON public.candidates;
DROP POLICY IF EXISTS "Admins manage all candidates" ON public.candidates;

CREATE POLICY "Company members manage their candidates" ON public.candidates
  FOR ALL TO authenticated
  USING (company_id IS NOT NULL AND public.has_company_access(company_id))
  WITH CHECK (company_id IS NOT NULL AND public.has_company_access(company_id));

CREATE POLICY "Job seekers view own candidate records" ON public.candidates
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL AND email = (auth.jwt() ->> 'email'));

CREATE POLICY "Platform admins manage candidates" ON public.candidates
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Anyone can submit applications" ON public.applications;
DROP POLICY IF EXISTS "Anyone can submit application" ON public.applications;
DROP POLICY IF EXISTS "Company members view applications" ON public.applications;
DROP POLICY IF EXISTS "Company members update applications" ON public.applications;
DROP POLICY IF EXISTS "Job owners can view applications" ON public.applications;
DROP POLICY IF EXISTS "Applicants can view own applications" ON public.applications;
DROP POLICY IF EXISTS "Admins manage all applications" ON public.applications;

CREATE POLICY "Submit applications to active jobs" ON public.applications
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = applications.job_id
        AND j.status IN ('نشطة', 'active')
        AND applications.company_id IS NOT DISTINCT FROM j.company_id
    )
  );

CREATE POLICY "Company members view applications" ON public.applications
  FOR SELECT TO authenticated
  USING (company_id IS NOT NULL AND public.has_company_access(company_id));

CREATE POLICY "Company members update applications" ON public.applications
  FOR UPDATE TO authenticated
  USING (company_id IS NOT NULL AND public.has_company_access(company_id))
  WITH CHECK (company_id IS NOT NULL AND public.has_company_access(company_id));

CREATE POLICY "Applicants view own applications" ON public.applications
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL AND email = (auth.jwt() ->> 'email'));

CREATE POLICY "Platform admins manage applications" ON public.applications
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Scorecards were also made writable by every signed-in user in July.
-- Some existing projects have this migration recorded without the table.
-- Create the expected shape before replacing the policies, without granting
-- anonymous access.
CREATE TABLE IF NOT EXISTS public.candidate_scorecards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewer_name text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT candidate_scorecards_candidate_reviewer_key UNIQUE (candidate_id, reviewer_id)
);
ALTER TABLE public.candidate_scorecards ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_scorecards TO authenticated;
GRANT ALL ON public.candidate_scorecards TO service_role;

DROP POLICY IF EXISTS "Authenticated users access scorecards" ON public.candidate_scorecards;
DROP POLICY IF EXISTS "Users can view scorecards of accessible candidates" ON public.candidate_scorecards;
DROP POLICY IF EXISTS "Users can manage scorecards of accessible candidates" ON public.candidate_scorecards;

CREATE POLICY "Company members view candidate scorecards" ON public.candidate_scorecards
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.candidates c
    WHERE c.id = candidate_scorecards.candidate_id
      AND c.company_id IS NOT NULL AND public.has_company_access(c.company_id)
  ));

CREATE POLICY "Reviewers insert own candidate scorecards" ON public.candidate_scorecards
  FOR INSERT TO authenticated
  WITH CHECK (reviewer_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.candidates c
    WHERE c.id = candidate_scorecards.candidate_id
      AND c.company_id IS NOT NULL AND public.has_company_access(c.company_id)
  ));

CREATE POLICY "Reviewers update own candidate scorecards" ON public.candidate_scorecards
  FOR UPDATE TO authenticated
  USING (reviewer_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.candidates c
    WHERE c.id = candidate_scorecards.candidate_id
      AND c.company_id IS NOT NULL AND public.has_company_access(c.company_id)
  ))
  WITH CHECK (reviewer_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.candidates c
    WHERE c.id = candidate_scorecards.candidate_id
      AND c.company_id IS NOT NULL AND public.has_company_access(c.company_id)
  ));

CREATE POLICY "Reviewers delete own candidate scorecards" ON public.candidate_scorecards
  FOR DELETE TO authenticated
  USING (reviewer_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.candidates c
    WHERE c.id = candidate_scorecards.candidate_id
      AND c.company_id IS NOT NULL AND public.has_company_access(c.company_id)
  ));

-- These SECURITY DEFINER procedures can change Auth credentials or purge an
-- entire tenant. Only server-side service credentials may execute them.
DO $$
BEGIN
  IF to_regprocedure('public.create_agency_account(text,text,text,text,uuid,uuid)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.create_agency_account(text, text, text, text, uuid, uuid)
      FROM PUBLIC, anon, authenticated;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.delete_company_permanently(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_company_permanently(uuid, uuid) TO service_role;
