-- =========================================================================
-- 1) DEFINE IS_SUPER_ADMIN FUNCTION AND UPDATE SYSTEM ACCESS FUNCTIONS
-- =========================================================================

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN auth.users u ON u.id = ur.user_id
    WHERE ur.user_id = _user_id 
      AND ur.role = 'admin'::app_role 
      AND u.email = 'ctraining801@gmail.com'
  );
$$;

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
  ) OR public.is_super_admin(auth.uid());
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
  ) OR public.is_super_admin(auth.uid());
$$;

-- =========================================================================
-- 2) REWRITE GLOBAL ADMIN BYPASS RLS POLICIES
-- =========================================================================

-- Jobs
DROP POLICY IF EXISTS "Admins manage all jobs" ON public.jobs;
CREATE POLICY "Admins manage all jobs" ON public.jobs
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Anyone can view active jobs" ON public.jobs;
CREATE POLICY "Anyone can view active jobs" ON public.jobs
  FOR SELECT
  TO public
  USING (
    -- 1) If the user is NOT authenticated (anonymous visitor on public careers page)
    (auth.uid() IS NULL AND status = 'نشطة') OR
    
    -- 2) If the user is a Job Seeker (authenticated candidate looking at active jobs)
    (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'job_seeker'::app_role) AND status = 'نشطة') OR
    
    -- 3) If the user is a Super Admin
    (auth.uid() IS NOT NULL AND public.is_super_admin(auth.uid())) OR
    
    -- 4) If the user is a member of the company that owns the job (recruiter/reviewer/owner)
    (auth.uid() IS NOT NULL AND company_id IS NOT NULL AND public.has_company_access(company_id))
  );

-- Candidates
DROP POLICY IF EXISTS "Admins manage all candidates" ON public.candidates;
CREATE POLICY "Admins manage all candidates" ON public.candidates
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Applications
DROP POLICY IF EXISTS "Admins manage all applications" ON public.applications;
CREATE POLICY "Admins manage all applications" ON public.applications
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Interviews
DROP POLICY IF EXISTS "Admins manage all interviews" ON public.interviews;
CREATE POLICY "Admins manage all interviews" ON public.interviews
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Job Offers
DROP POLICY IF EXISTS "Admins manage all job offers" ON public.job_offers;
CREATE POLICY "Admins manage all job offers" ON public.job_offers
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Assessments
DROP POLICY IF EXISTS "Admins manage all assessments" ON public.assessments;
CREATE POLICY "Admins manage all assessments" ON public.assessments
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Companies
DROP POLICY IF EXISTS "Admins manage all companies" ON public.companies;
CREATE POLICY "Admins manage all companies" ON public.companies
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Company Members
DROP POLICY IF EXISTS "Admins manage all company members" ON public.company_members;
CREATE POLICY "Admins manage all company members" ON public.company_members
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage company members" ON public.company_members;
CREATE POLICY "Admins manage company members" ON public.company_members
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles" ON public.profiles
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- User Roles
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
CREATE POLICY "Admins can update roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- Company Subscriptions
DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.company_subscriptions;
CREATE POLICY "Admins can manage all subscriptions" ON public.company_subscriptions
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Invitations
DROP POLICY IF EXISTS "Admins can manage invitations" ON public.invitations;
CREATE POLICY "Admins can manage invitations" ON public.invitations
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Audit Log / Activity Log
DROP POLICY IF EXISTS "Admins can view audit log" ON public.audit_log;
CREATE POLICY "Admins can view audit log" ON public.audit_log
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all activity" ON public.activity_log;
CREATE POLICY "Admins can view all activity" ON public.activity_log
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins and company members view audit log" ON public.audit_log;
CREATE POLICY "Admins and company members view audit log" ON public.audit_log
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR 
    public.has_company_access(company_id)
  );

-- Role Permissions
DROP POLICY IF EXISTS "Admins can manage permissions" ON public.role_permissions;
CREATE POLICY "Admins can manage permissions" ON public.role_permissions
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Subscription Plans
DROP POLICY IF EXISTS "Admins can manage plans" ON public.subscription_plans;
CREATE POLICY "Admins can manage plans" ON public.subscription_plans
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));
