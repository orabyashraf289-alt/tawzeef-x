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


-- ============================================================
-- BILLING MULTI-TENANCY: PER-COMPANY BILLING
-- ============================================================

-- 1) Add company_id column to company_subscriptions if not exists
ALTER TABLE public.company_subscriptions ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- 2) Backfill company_id mapping owner's user_id to company_id
UPDATE public.company_subscriptions cs
SET company_id = cm.company_id
FROM public.company_members cm
WHERE cs.user_id = cm.user_id AND cs.company_id IS NULL;

-- 3) For any remaining subscription where company_id is null, allocate a dummy company or assign the owner's company
DO $$
DECLARE
  rec RECORD;
  new_comp_id uuid;
BEGIN
  FOR rec IN SELECT id, user_id FROM public.company_subscriptions WHERE company_id IS NULL LOOP
    -- Check if user is in company_members
    SELECT company_id INTO new_comp_id FROM public.company_members WHERE user_id = rec.user_id LIMIT 1;
    
    IF new_comp_id IS NULL THEN
      -- Create a placeholder company
      INSERT INTO public.companies (name, owner_user_id) 
      VALUES ('شركة تجريبية', rec.user_id) 
      RETURNING id INTO new_comp_id;
      
      INSERT INTO public.company_members (company_id, user_id, member_role) 
      VALUES (new_comp_id, rec.user_id, 'owner');
    END IF;
    
    UPDATE public.company_subscriptions SET company_id = new_comp_id WHERE id = rec.id;
  END LOOP;
END $$;

-- Make company_id NOT NULL now that it is backfilled
ALTER TABLE public.company_subscriptions ALTER COLUMN company_id SET NOT NULL;

-- 4) Drop old unique constraint on user_id and add unique constraint on company_id
ALTER TABLE public.company_subscriptions DROP CONSTRAINT IF EXISTS company_subscriptions_user_id_key;
ALTER TABLE public.company_subscriptions DROP CONSTRAINT IF EXISTS company_subscriptions_company_id_key;
ALTER TABLE public.company_subscriptions ADD CONSTRAINT company_subscriptions_company_id_key UNIQUE (company_id);

-- 5) Update RLS policies for company_subscriptions
DROP POLICY IF EXISTS "Users can view own subscription" ON public.company_subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON public.company_subscriptions;
DROP POLICY IF EXISTS "System can insert subscriptions" ON public.company_subscriptions;

CREATE POLICY "Company members view own subscription" ON public.company_subscriptions
  FOR SELECT TO authenticated
  USING (public.has_company_access(company_id));

CREATE POLICY "Company owners update own subscription" ON public.company_subscriptions
  FOR UPDATE TO authenticated
  USING (public.is_company_owner(company_id))
  WITH CHECK (public.is_company_owner(company_id));

CREATE POLICY "System can insert company subscriptions" ON public.company_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_company_owner(company_id));


-- ============================================================
-- AUDITING MULTI-TENANCY: PER-COMPANY AUDIT LOGS
-- ============================================================

-- 1) Add company_id column to audit_log table
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- 2) Backfill company_id on existing audit logs
UPDATE public.audit_log al
SET company_id = cm.company_id
FROM public.company_members cm
WHERE al.user_id = cm.user_id AND al.company_id IS NULL;

-- 3) Attach trigger to auto-populate company_id BEFORE INSERT
DROP TRIGGER IF EXISTS trg_set_audit_log_company_id ON public.audit_log;
CREATE TRIGGER trg_set_audit_log_company_id BEFORE INSERT ON public.audit_log FOR EACH ROW EXECUTE FUNCTION public.set_row_company_id();

-- 4) Update RLS Policies on audit_log so company members can view their own company's audit log
DROP POLICY IF EXISTS "Admins can view audit log" ON public.audit_log;
CREATE POLICY "Admins and company members view audit log" ON public.audit_log
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR 
    (company_id IS NOT NULL AND public.has_company_access(company_id))
  );
