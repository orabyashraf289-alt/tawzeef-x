-- ============================================================
-- AUTOMATIC TENANT ISOLATION TRIGGERS FOR MULTI-TENANCY
-- ============================================================

-- Add brand_settings column to companies if not exists
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS brand_settings jsonb DEFAULT NULL;

CREATE OR REPLACE FUNCTION public.set_row_company_id()
RETURNS TRIGGER AS $$
DECLARE
  _company_id uuid;
BEGIN
  -- 1) Try to get company_id from the current user's membership
  IF auth.uid() IS NOT NULL THEN
    SELECT company_id INTO _company_id 
    FROM public.company_members 
    WHERE user_id = auth.uid() 
    LIMIT 1;
  END IF;

  -- 2) If company_id is still null and we have a job_id (e.g. applications/candidates applying to a job), get it from the job
  IF _company_id IS NULL AND TG_TABLE_NAME IN ('applications', 'candidates') AND NEW.job_id IS NOT NULL THEN
    SELECT company_id INTO _company_id 
    FROM public.jobs 
    WHERE id = NEW.job_id;
  END IF;

  -- 3) Apply the resolved company_id
  IF _company_id IS NOT NULL THEN
    NEW.company_id := _company_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing triggers if they exist to avoid duplicates
DROP TRIGGER IF EXISTS trg_set_jobs_company_id ON public.jobs;
DROP TRIGGER IF EXISTS trg_set_candidates_company_id ON public.candidates;
DROP TRIGGER IF EXISTS trg_set_applications_company_id ON public.applications;
DROP TRIGGER IF EXISTS trg_set_interviews_company_id ON public.interviews;
DROP TRIGGER IF EXISTS trg_set_job_offers_company_id ON public.job_offers;
DROP TRIGGER IF EXISTS trg_set_assessments_company_id ON public.assessments;

-- Attach triggers
CREATE TRIGGER trg_set_jobs_company_id BEFORE INSERT ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.set_row_company_id();
CREATE TRIGGER trg_set_candidates_company_id BEFORE INSERT ON public.candidates FOR EACH ROW EXECUTE FUNCTION public.set_row_company_id();
CREATE TRIGGER trg_set_applications_company_id BEFORE INSERT ON public.applications FOR EACH ROW EXECUTE FUNCTION public.set_row_company_id();
CREATE TRIGGER trg_set_interviews_company_id BEFORE INSERT ON public.interviews FOR EACH ROW EXECUTE FUNCTION public.set_row_company_id();
CREATE TRIGGER trg_set_job_offers_company_id BEFORE INSERT ON public.job_offers FOR EACH ROW EXECUTE FUNCTION public.set_row_company_id();
CREATE TRIGGER trg_set_assessments_company_id BEFORE INSERT ON public.assessments FOR EACH ROW EXECUTE FUNCTION public.set_row_company_id();
