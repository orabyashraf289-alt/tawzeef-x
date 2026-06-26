
-- ============ 1) UNIFY RLS: add company_id-based access alongside user_id ============

-- JOBS
DROP POLICY IF EXISTS "Company members access jobs" ON public.jobs;
CREATE POLICY "Company members access jobs" ON public.jobs
  FOR ALL TO authenticated
  USING (company_id IS NOT NULL AND public.has_company_access(company_id))
  WITH CHECK (company_id IS NOT NULL AND public.has_company_access(company_id));

-- CANDIDATES
DROP POLICY IF EXISTS "Company members access candidates" ON public.candidates;
CREATE POLICY "Company members access candidates" ON public.candidates
  FOR ALL TO authenticated
  USING (company_id IS NOT NULL AND public.has_company_access(company_id))
  WITH CHECK (company_id IS NOT NULL AND public.has_company_access(company_id));

-- APPLICATIONS
DROP POLICY IF EXISTS "Company members view applications" ON public.applications;
CREATE POLICY "Company members view applications" ON public.applications
  FOR SELECT TO authenticated
  USING (company_id IS NOT NULL AND public.has_company_access(company_id));

DROP POLICY IF EXISTS "Company members update applications" ON public.applications;
CREATE POLICY "Company members update applications" ON public.applications
  FOR UPDATE TO authenticated
  USING (company_id IS NOT NULL AND public.has_company_access(company_id))
  WITH CHECK (company_id IS NOT NULL AND public.has_company_access(company_id));

-- INTERVIEWS
DROP POLICY IF EXISTS "Company members access interviews" ON public.interviews;
CREATE POLICY "Company members access interviews" ON public.interviews
  FOR ALL TO authenticated
  USING (company_id IS NOT NULL AND public.has_company_access(company_id))
  WITH CHECK (company_id IS NOT NULL AND public.has_company_access(company_id));

-- JOB_OFFERS
DROP POLICY IF EXISTS "Company members access offers" ON public.job_offers;
CREATE POLICY "Company members access offers" ON public.job_offers
  FOR ALL TO authenticated
  USING (company_id IS NOT NULL AND public.has_company_access(company_id))
  WITH CHECK (company_id IS NOT NULL AND public.has_company_access(company_id));

-- ASSESSMENTS
DROP POLICY IF EXISTS "Company members access assessments" ON public.assessments;
CREATE POLICY "Company members access assessments" ON public.assessments
  FOR ALL TO authenticated
  USING (company_id IS NOT NULL AND public.has_company_access(company_id))
  WITH CHECK (company_id IS NOT NULL AND public.has_company_access(company_id));

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON public.jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_candidates_company_id ON public.candidates(company_id);
CREATE INDEX IF NOT EXISTS idx_candidates_agency_id ON public.candidates(agency_id);
CREATE INDEX IF NOT EXISTS idx_applications_company_id ON public.applications(company_id);
CREATE INDEX IF NOT EXISTS idx_interviews_company_id ON public.interviews(company_id);
CREATE INDEX IF NOT EXISTS idx_job_offers_company_id ON public.job_offers(company_id);
CREATE INDEX IF NOT EXISTS idx_assessments_company_id ON public.assessments(company_id);

-- ============ 2) COMPANY INVITATIONS ============

CREATE TABLE IF NOT EXISTS public.company_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  email text NOT NULL,
  member_role text NOT NULL DEFAULT 'hr',
  invited_by uuid,
  token text NOT NULL UNIQUE DEFAULT UPPER(substr(md5(random()::text || gen_random_uuid()::text), 1, 16)),
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at timestamptz,
  declined_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_invitations TO authenticated;
GRANT ALL ON public.company_invitations TO service_role;

ALTER TABLE public.company_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage company invitations" ON public.company_invitations;
CREATE POLICY "Admins manage company invitations" ON public.company_invitations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Company owners manage own invitations" ON public.company_invitations;
CREATE POLICY "Company owners manage own invitations" ON public.company_invitations
  FOR ALL TO authenticated
  USING (public.is_company_owner(company_id))
  WITH CHECK (public.is_company_owner(company_id));

DROP POLICY IF EXISTS "Invitees can view their invitation by email" ON public.company_invitations;
CREATE POLICY "Invitees can view their invitation by email" ON public.company_invitations
  FOR SELECT TO authenticated
  USING (email = (auth.jwt() ->> 'email'));

CREATE INDEX IF NOT EXISTS idx_company_invitations_email ON public.company_invitations(email);
CREATE INDEX IF NOT EXISTS idx_company_invitations_company ON public.company_invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_company_invitations_token ON public.company_invitations(token);

CREATE TRIGGER trg_company_invitations_updated_at
  BEFORE UPDATE ON public.company_invitations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RPC: accept invitation
CREATE OR REPLACE FUNCTION public.accept_company_invitation(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inv RECORD;
  _user_email text;
  _uid uuid;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'NOT_AUTHENTICATED');
  END IF;

  _user_email := (auth.jwt() ->> 'email');

  SELECT * INTO _inv FROM public.company_invitations
   WHERE token = _token LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVITATION_NOT_FOUND');
  END IF;

  IF _inv.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVITATION_NOT_PENDING', 'status', _inv.status);
  END IF;

  IF _inv.expires_at < now() THEN
    UPDATE public.company_invitations SET status = 'expired' WHERE id = _inv.id;
    RETURN jsonb_build_object('success', false, 'code', 'INVITATION_EXPIRED');
  END IF;

  IF lower(_inv.email) <> lower(_user_email) THEN
    RETURN jsonb_build_object('success', false, 'code', 'EMAIL_MISMATCH');
  END IF;

  -- Insert membership if not exists
  INSERT INTO public.company_members (company_id, user_id, member_role, invited_by)
  VALUES (_inv.company_id, _uid, _inv.member_role, _inv.invited_by)
  ON CONFLICT DO NOTHING;

  UPDATE public.company_invitations
     SET status = 'accepted', accepted_at = now()
   WHERE id = _inv.id;

  RETURN jsonb_build_object('success', true, 'company_id', _inv.company_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.accept_company_invitation(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_company_invitation(text) TO authenticated;

-- RPC: decline invitation
CREATE OR REPLACE FUNCTION public.decline_company_invitation(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inv RECORD;
  _user_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'NOT_AUTHENTICATED');
  END IF;
  _user_email := (auth.jwt() ->> 'email');

  SELECT * INTO _inv FROM public.company_invitations WHERE token = _token LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVITATION_NOT_FOUND');
  END IF;
  IF _inv.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'code', 'INVITATION_NOT_PENDING');
  END IF;
  IF lower(_inv.email) <> lower(_user_email) THEN
    RETURN jsonb_build_object('success', false, 'code', 'EMAIL_MISMATCH');
  END IF;

  UPDATE public.company_invitations
     SET status = 'declined', declined_at = now()
   WHERE id = _inv.id;
  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.decline_company_invitation(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decline_company_invitation(text) TO authenticated;
