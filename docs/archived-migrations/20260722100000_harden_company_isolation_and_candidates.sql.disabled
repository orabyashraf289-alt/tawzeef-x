-- =========================================================================
-- MIGRATION: HARDEN MULTI-TENANT COMPANY ISOLATION & TEAM CANDIDATE ACCESS
-- =========================================================================

-- 1) Auto-heal existing jobs: attach company_id from creator's company membership
UPDATE public.jobs j
SET company_id = cm.company_id
FROM public.company_members cm
WHERE j.user_id = cm.user_id
  AND j.company_id IS NULL;

-- 2) Auto-heal existing candidates: attach company_id & user_id from job
UPDATE public.candidates c
SET company_id = j.company_id,
    user_id = COALESCE(c.user_id, j.user_id)
FROM public.jobs j
WHERE c.job_id = j.id
  AND (c.company_id IS NULL OR c.user_id IS NULL);

-- 3) Auto-heal existing applications: attach company_id from job
UPDATE public.applications a
SET company_id = j.company_id
FROM public.jobs j
WHERE a.job_id = j.id
  AND a.company_id IS NULL;

-- =========================================================================
-- RLS POLICIES FOR STABLE MULTI-TENANCY & TEAM COLLABORATION
-- =========================================================================

-- Jobs table policy
DROP POLICY IF EXISTS "Users manage own jobs" ON public.jobs;
CREATE POLICY "Users manage own jobs" ON public.jobs
  FOR ALL TO authenticated
  USING (
    (company_id IS NOT NULL AND public.has_company_access(company_id))
    OR (user_id = auth.uid())
  )
  WITH CHECK (
    (company_id IS NOT NULL AND public.has_company_access(company_id))
    OR (user_id = auth.uid())
  );

-- Candidates table policy (Allows company team members & job owners access)
DROP POLICY IF EXISTS "Users manage own candidates" ON public.candidates;
CREATE POLICY "Users manage own candidates" ON public.candidates
  FOR ALL TO authenticated
  USING (
    (company_id IS NOT NULL AND public.has_company_access(company_id))
    OR (user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = candidates.job_id
        AND (j.user_id = auth.uid() OR (j.company_id IS NOT NULL AND public.has_company_access(j.company_id)))
    )
  )
  WITH CHECK (
    (company_id IS NOT NULL AND public.has_company_access(company_id))
    OR (user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = candidates.job_id
        AND (j.user_id = auth.uid() OR (j.company_id IS NOT NULL AND public.has_company_access(j.company_id)))
    )
  );

-- Applications table policy (Allows company team members to view applications)
DROP POLICY IF EXISTS "Job owners can view applications" ON public.applications;
CREATE POLICY "Job owners can view applications" ON public.applications
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = applications.job_id
        AND (j.user_id = auth.uid() OR (j.company_id IS NOT NULL AND public.has_company_access(j.company_id)))
    )
  );
