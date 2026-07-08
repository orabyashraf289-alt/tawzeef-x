-- =========================================================================
-- UNIFIED SIGNUP TRIGGER & ADMIN PERMISSIONS OVERRIDES
-- =========================================================================

-- 1) Drop old individual auth triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_check_invitation ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_seed_stages ON auth.users;

-- 2) Create the unified signup trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER AS $$
DECLARE
  _account_type text;
  _role app_role;
  _inv RECORD;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (user_id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    CASE WHEN NEW.email = 'ctraining801@gmail.com' THEN 'admin' ELSE 'recruiter' END
  ) ON CONFLICT (user_id) DO UPDATE
  SET role = EXCLUDED.role;

  -- Determine role
  _role := 'recruiter'::app_role; -- default
  IF NEW.email = 'ctraining801@gmail.com' THEN
    _role := 'admin'::app_role;
  END IF;

  -- Check if there is an invitation for this email
  SELECT * INTO _inv FROM public.invitations 
  WHERE email = NEW.email AND status = 'pending' AND expires_at > now()
  LIMIT 1;

  IF FOUND THEN
    _role := _inv.role;
    -- Mark invitation as accepted
    UPDATE public.invitations SET status = 'accepted', accepted_at = now() WHERE id = _inv.id;
  END IF;

  -- Insert user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Seed default pipeline stages if not a job seeker
  _account_type := NEW.raw_user_meta_data->>'account_type';
  IF _account_type IS DISTINCT FROM 'job_seeker' THEN
    INSERT INTO public.pipeline_stages (user_id, name, sort_order, color, icon, is_default) VALUES
      (NEW.id, 'تقديم الطلب', 0, '#6366f1', 'file-text', true),
      (NEW.id, 'مراجعة السيرة', 1, '#8b5cf6', 'file-search', true),
      (NEW.id, 'فحص هاتفي', 2, '#0ea5e9', 'phone', true),
      (NEW.id, 'مقابلة تقنية', 3, '#f59e0b', 'code', true),
      (NEW.id, 'مقابلة نهائية', 4, '#10b981', 'users', true),
      (NEW.id, 'العرض الوظيفي', 5, '#059669', 'briefcase', true)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Re-create trigger
CREATE TRIGGER trg_on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_signup();


-- 3) Create auto company creation trigger function on profiles update
CREATE OR REPLACE FUNCTION public.handle_profile_company_creation()
RETURNS TRIGGER AS $$
DECLARE
  new_comp_id uuid;
BEGIN
  -- Check if company_name is provided, not empty, and user doesn't already belong to any company
  IF NEW.company_name IS NOT NULL AND trim(NEW.company_name) <> '' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.company_members 
      WHERE user_id = NEW.user_id
    ) THEN
      -- Create the company
      INSERT INTO public.companies (name, logo_url, contact_email, owner_user_id, status)
      VALUES (
        trim(NEW.company_name),
        NEW.company_logo,
        (SELECT email FROM auth.users WHERE id = NEW.user_id),
        NEW.user_id,
        'active'
      )
      RETURNING id INTO new_comp_id;

      -- Add the user as owner of the company
      INSERT INTO public.company_members (company_id, user_id, member_role)
      VALUES (new_comp_id, NEW.user_id, 'owner');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attach trigger to public.profiles
DROP TRIGGER IF EXISTS trg_profile_company_creation ON public.profiles;
CREATE TRIGGER trg_profile_company_creation
AFTER INSERT OR UPDATE OF company_name, company_logo ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_profile_company_creation();


-- 4) Create RLS Permissions override policies for system admins
-- Jobs
DROP POLICY IF EXISTS "Admins manage all jobs" ON public.jobs;
CREATE POLICY "Admins manage all jobs" ON public.jobs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Candidates
DROP POLICY IF EXISTS "Admins manage all candidates" ON public.candidates;
CREATE POLICY "Admins manage all candidates" ON public.candidates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Applications
DROP POLICY IF EXISTS "Admins manage all applications" ON public.applications;
CREATE POLICY "Admins manage all applications" ON public.applications
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Interviews
DROP POLICY IF EXISTS "Admins manage all interviews" ON public.interviews;
CREATE POLICY "Admins manage all interviews" ON public.interviews
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Job Offers
DROP POLICY IF EXISTS "Admins manage all job offers" ON public.job_offers;
CREATE POLICY "Admins manage all job offers" ON public.job_offers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Assessments
DROP POLICY IF EXISTS "Admins manage all assessments" ON public.assessments;
CREATE POLICY "Admins manage all assessments" ON public.assessments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Companies
DROP POLICY IF EXISTS "Admins manage all companies" ON public.companies;
CREATE POLICY "Admins manage all companies" ON public.companies
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Company Members
DROP POLICY IF EXISTS "Admins manage all company members" ON public.company_members;
CREATE POLICY "Admins manage all company members" ON public.company_members
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
