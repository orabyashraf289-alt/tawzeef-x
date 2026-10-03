-- Replay bootstrap for the archived platform setup; no roles or companies are assigned.
-- Platform roles are provisioned by trusted server operations, never names or signup metadata.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

CREATE TABLE IF NOT EXISTS public.platform_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('super_admin', 'platform_support', 'platform_auditor')),
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT platform_roles_user_id_key UNIQUE (user_id)
);
CREATE INDEX IF NOT EXISTS idx_platform_roles_lookup ON public.platform_roles(user_id, role);
ALTER TABLE public.platform_roles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_roles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.platform_roles TO authenticated;
GRANT ALL ON public.platform_roles TO service_role;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_roles pr
    WHERE pr.user_id = _user_id AND pr.role = 'super_admin'
  );
$$;
CREATE OR REPLACE FUNCTION public.is_super_admin_user()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.is_super_admin(auth.uid()); $$;
-- Anonymous RLS predicates need these boolean helpers and receive false for auth.uid() = NULL.
REVOKE ALL ON FUNCTION public.is_super_admin(uuid), public.is_super_admin_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid), public.is_super_admin_user()
  TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Platform roles select policy" ON public.platform_roles;
DROP POLICY IF EXISTS "Super admins and self can read platform roles" ON public.platform_roles;
DROP POLICY IF EXISTS "Platform roles insert restricted" ON public.platform_roles;
DROP POLICY IF EXISTS "Platform roles update restricted" ON public.platform_roles;
DROP POLICY IF EXISTS "Platform roles delete restricted" ON public.platform_roles;
CREATE POLICY "Super admins and self can read platform roles"
  ON public.platform_roles FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_super_admin((SELECT auth.uid())));

CREATE OR REPLACE FUNCTION public.get_platform_role(_user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT pr.role FROM public.platform_roles pr
  WHERE pr.user_id = _user_id AND (
    _user_id = auth.uid() OR public.is_super_admin(auth.uid()) OR auth.role() = 'service_role'
  ) LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_platform_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_platform_role(uuid) TO authenticated, service_role;

-- Schema-only lifecycle bootstrap. Platform company designation requires explicit review.
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS is_platform_company boolean DEFAULT false;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.companies'::regclass AND conname = 'companies_status_check'
  ) THEN
    ALTER TABLE public.companies ADD CONSTRAINT companies_status_check
      CHECK (status IN ('active', 'inactive', 'suspended', 'deleting', 'delete_failed', 'deleted'));
  END IF;
END;
$$;

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
