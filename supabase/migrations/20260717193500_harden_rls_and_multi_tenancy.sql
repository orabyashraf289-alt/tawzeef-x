-- =========================================================================
-- 1) HARDEN HELPER FUNCTIONS FOR HIERARCHICAL BRANCH ACCESS
-- =========================================================================

CREATE OR REPLACE FUNCTION public.has_company_access(_company_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE company_id = _company_id AND user_id = auth.uid()
  ) OR EXISTS (
    -- If the user is a member of the parent company
    SELECT 1 FROM public.companies c
    JOIN public.company_members pm ON pm.company_id = c.parent_company_id
    WHERE c.id = _company_id AND pm.user_id = auth.uid()
  ) OR public.has_role(auth.uid(), 'admin'::app_role);
$$;

CREATE OR REPLACE FUNCTION public.is_company_owner(_company_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE company_id = _company_id AND user_id = auth.uid() AND member_role = 'owner'
  ) OR EXISTS (
    -- parent company owner can also manage branch settings/billing
    SELECT 1 FROM public.companies c
    JOIN public.company_members pm ON pm.company_id = c.parent_company_id
    WHERE c.id = _company_id AND pm.user_id = auth.uid() AND pm.member_role = 'owner'
  ) OR public.has_role(auth.uid(), 'admin'::app_role);
$$;

-- =========================================================================
-- 2) FIX RECURSION IN company_members AND ENABLE profiles TEAM VIEW
-- =========================================================================

-- Drop old recursive SELECT policy
DROP POLICY IF EXISTS "Members view own company members" ON public.company_members;

-- Recreate SELECT policy using non-recursive get_user_companies() function
CREATE POLICY "Members view own company members" ON public.company_members
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT public.get_user_companies()));

-- Allow company members to view profiles of teammates
DROP POLICY IF EXISTS "Company members can view team profiles" ON public.profiles;
CREATE POLICY "Company members can view team profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.user_id = profiles.user_id
        AND cm.company_id IN (SELECT public.get_user_companies())
    )
  );

-- =========================================================================
-- 3) TIGHTEN CREATOR-BASED POLICIES TO ENSURE CURRENT MEMBERSHIP
-- =========================================================================

-- jobs
DROP POLICY IF EXISTS "Users manage own jobs" ON public.jobs;
CREATE POLICY "Users manage own jobs" ON public.jobs
  FOR ALL TO authenticated
  USING (auth.uid() = user_id AND (company_id IS NULL OR public.has_company_access(company_id)))
  WITH CHECK (auth.uid() = user_id AND (company_id IS NULL OR public.has_company_access(company_id)));

-- candidates
DROP POLICY IF EXISTS "Users manage own candidates" ON public.candidates;
CREATE POLICY "Users manage own candidates" ON public.candidates
  FOR ALL TO authenticated
  USING (auth.uid() = user_id AND (company_id IS NULL OR public.has_company_access(company_id)))
  WITH CHECK (auth.uid() = user_id AND (company_id IS NULL OR public.has_company_access(company_id)));

-- interviews
DROP POLICY IF EXISTS "Users manage own interviews" ON public.interviews;
CREATE POLICY "Users manage own interviews" ON public.interviews
  FOR ALL TO authenticated
  USING (auth.uid() = user_id AND (company_id IS NULL OR public.has_company_access(company_id)))
  WITH CHECK (auth.uid() = user_id AND (company_id IS NULL OR public.has_company_access(company_id)));

-- job_offers
DROP POLICY IF EXISTS "Users can manage own offers" ON public.job_offers;
CREATE POLICY "Users can manage own offers" ON public.job_offers
  FOR ALL TO authenticated
  USING (auth.uid() = user_id AND (company_id IS NULL OR public.has_company_access(company_id)))
  WITH CHECK (auth.uid() = user_id AND (company_id IS NULL OR public.has_company_access(company_id)));

-- applications (viewing applications of owned jobs)
DROP POLICY IF EXISTS "Job owners can view applications" ON public.applications;
CREATE POLICY "Job owners can view applications" ON public.applications
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = applications.job_id AND j.user_id = auth.uid() AND (j.company_id IS NULL OR public.has_company_access(j.company_id))));

-- =========================================================================
-- 4) ADD company_id COLUMNS, TRIGGERS & RLS TO REMAINING TABLES
-- =========================================================================

-- Alter tables to add company_id
ALTER TABLE public.question_bank ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.talent_pool ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.pipeline_stages ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.pipeline_sub_stages ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- Create indices
CREATE INDEX IF NOT EXISTS idx_question_bank_company_id ON public.question_bank(company_id);
CREATE INDEX IF NOT EXISTS idx_talent_pool_company_id ON public.talent_pool(company_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_company_id ON public.pipeline_stages(company_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_sub_stages_company_id ON public.pipeline_sub_stages(company_id);

-- Attach triggers
DROP TRIGGER IF EXISTS trg_set_question_bank_company_id ON public.question_bank;
CREATE TRIGGER trg_set_question_bank_company_id BEFORE INSERT ON public.question_bank FOR EACH ROW EXECUTE FUNCTION public.set_row_company_id();

DROP TRIGGER IF EXISTS trg_set_talent_pool_company_id ON public.talent_pool;
CREATE TRIGGER trg_set_talent_pool_company_id BEFORE INSERT ON public.talent_pool FOR EACH ROW EXECUTE FUNCTION public.set_row_company_id();

DROP TRIGGER IF EXISTS trg_set_pipeline_stages_company_id ON public.pipeline_stages;
CREATE TRIGGER trg_set_pipeline_stages_company_id BEFORE INSERT ON public.pipeline_stages FOR EACH ROW EXECUTE FUNCTION public.set_row_company_id();

DROP TRIGGER IF EXISTS trg_set_pipeline_sub_stages_company_id ON public.pipeline_sub_stages;
CREATE TRIGGER trg_set_pipeline_sub_stages_company_id BEFORE INSERT ON public.pipeline_sub_stages FOR EACH ROW EXECUTE FUNCTION public.set_row_company_id();

-- Backfill company_id
UPDATE public.question_bank qb SET company_id = cm.company_id FROM public.company_members cm WHERE qb.user_id = cm.user_id AND qb.company_id IS NULL;
UPDATE public.talent_pool tp SET company_id = cm.company_id FROM public.company_members cm WHERE tp.user_id = cm.user_id AND tp.company_id IS NULL;
UPDATE public.pipeline_stages ps SET company_id = cm.company_id FROM public.company_members cm WHERE ps.user_id = cm.user_id AND ps.company_id IS NULL;
UPDATE public.pipeline_sub_stages pss SET company_id = cm.company_id FROM public.company_members cm WHERE pss.user_id = cm.user_id AND pss.company_id IS NULL;

-- Apply RLS Policies: question_bank
DROP POLICY IF EXISTS "Users manage own questions" ON public.question_bank;
DROP POLICY IF EXISTS "Allow company members to view shared questions" ON public.question_bank;

CREATE POLICY "Company members access question bank" ON public.question_bank
  FOR ALL TO authenticated
  USING (company_id IS NOT NULL AND public.has_company_access(company_id))
  WITH CHECK (company_id IS NOT NULL AND public.has_company_access(company_id));

CREATE POLICY "Personal questions access" ON public.question_bank
  FOR ALL TO authenticated
  USING (company_id IS NULL AND auth.uid() = user_id)
  WITH CHECK (company_id IS NULL AND auth.uid() = user_id);

-- Apply RLS Policies: question_options
DROP POLICY IF EXISTS "Owners select question options" ON public.question_options;
DROP POLICY IF EXISTS "Owners insert question options" ON public.question_options;
DROP POLICY IF EXISTS "Owners update question options" ON public.question_options;
DROP POLICY IF EXISTS "Owners delete question options" ON public.question_options;
DROP POLICY IF EXISTS "Allow company members to view shared options" ON public.question_options;

CREATE POLICY "Company members access options" ON public.question_options
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.question_bank qb WHERE qb.id = question_options.question_id AND (qb.company_id IS NOT NULL AND public.has_company_access(qb.company_id))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.question_bank qb WHERE qb.id = question_options.question_id AND (qb.company_id IS NOT NULL AND public.has_company_access(qb.company_id))));

CREATE POLICY "Personal options access" ON public.question_options
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.question_bank qb WHERE qb.id = question_options.question_id AND qb.company_id IS NULL AND qb.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.question_bank qb WHERE qb.id = question_options.question_id AND qb.company_id IS NULL AND qb.user_id = auth.uid()));

-- Apply RLS Policies: talent_pool
DROP POLICY IF EXISTS "Users manage own talent pool" ON public.talent_pool;

CREATE POLICY "Company members access talent pool" ON public.talent_pool
  FOR ALL TO authenticated
  USING (company_id IS NOT NULL AND public.has_company_access(company_id))
  WITH CHECK (company_id IS NOT NULL AND public.has_company_access(company_id));

CREATE POLICY "Personal talent pool access" ON public.talent_pool
  FOR ALL TO authenticated
  USING (company_id IS NULL AND auth.uid() = user_id)
  WITH CHECK (company_id IS NULL AND auth.uid() = user_id);

-- Apply RLS Policies: pipeline_stages
DROP POLICY IF EXISTS "Users can manage own stages" ON public.pipeline_stages;

CREATE POLICY "Company members access pipeline stages" ON public.pipeline_stages
  FOR ALL TO authenticated
  USING (company_id IS NOT NULL AND public.has_company_access(company_id))
  WITH CHECK (company_id IS NOT NULL AND public.has_company_access(company_id));

CREATE POLICY "Personal pipeline stages access" ON public.pipeline_stages
  FOR ALL TO authenticated
  USING (company_id IS NULL AND auth.uid() = user_id)
  WITH CHECK (company_id IS NULL AND auth.uid() = user_id);

-- Apply RLS Policies: pipeline_sub_stages
DROP POLICY IF EXISTS "Users can manage own sub-stages" ON public.pipeline_sub_stages;

CREATE POLICY "Company members access sub-stages" ON public.pipeline_sub_stages
  FOR ALL TO authenticated
  USING (company_id IS NOT NULL AND public.has_company_access(company_id))
  WITH CHECK (company_id IS NOT NULL AND public.has_company_access(company_id));

CREATE POLICY "Personal sub-stages access" ON public.pipeline_sub_stages
  FOR ALL TO authenticated
  USING (company_id IS NULL AND auth.uid() = user_id)
  WITH CHECK (company_id IS NULL AND auth.uid() = user_id);

-- =========================================================================
-- 5) SECURE STORAGE OBJECTS FOR TEAMMATE RESUME VIEWS
-- =========================================================================

-- Recreate SELECT policy for resumes bucket to check teammate company access
DROP POLICY IF EXISTS "Job owners can read their resumes" ON storage.objects;
CREATE POLICY "Job owners can read their resumes"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'resumes' AND (
    EXISTS (
      SELECT 1 FROM public.candidates c
      WHERE c.company_id IN (SELECT public.get_user_companies())
        AND c.resume_url LIKE '%' || storage.objects.name || '%'
    )
    OR EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.company_id IN (SELECT public.get_user_companies())
        AND a.resume_url LIKE '%' || storage.objects.name || '%'
    )
  )
);
