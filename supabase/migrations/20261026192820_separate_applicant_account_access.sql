-- Account categories are exclusive. Read server-owned roles/memberships only;
-- a user-editable profile or JWT user_metadata cannot turn staff into applicants.
CREATE FUNCTION tenant_internal.is_applicant_account()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
  SELECT (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = (SELECT auth.uid()) AND role = 'job_seeker'::public.app_role)
    AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = (SELECT auth.uid()) AND role <> 'job_seeker'::public.app_role)
    AND NOT EXISTS (SELECT 1 FROM public.platform_roles WHERE user_id = (SELECT auth.uid()))
    AND NOT EXISTS (SELECT 1 FROM public.company_members WHERE user_id = (SELECT auth.uid()))
    AND NOT EXISTS (SELECT 1 FROM public.agency_members WHERE user_id = (SELECT auth.uid()))
    AND NOT EXISTS (SELECT 1 FROM tenant_internal.company_signup_intents WHERE user_id = (SELECT auth.uid()))
    AND NOT EXISTS (SELECT 1 FROM public.company_registration_requests WHERE user_id = (SELECT auth.uid()));
$$;
REVOKE ALL ON FUNCTION tenant_internal.is_applicant_account() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.validate_tenant_status(_company_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  _uid uuid;
  _target_company_id uuid;
  _company_rec RECORD;
  _platform_role text := NULL;
  _user_role text := NULL;
  _is_candidate boolean := false;
  _agency_rec RECORD;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RETURN jsonb_build_object(
      'user_id', NULL,
      'access_state', 'DENIED',
      'denial_reason', 'UNAUTHENTICATED',
      'is_platform_admin', false,
      'company_status', NULL
    );
  END IF;

  -- 1. Check platform role (single server-side source of truth)
  SELECT role INTO _platform_role
  FROM public.platform_roles
  WHERE user_id = _uid;

  IF _platform_role = 'super_admin' THEN
    RETURN jsonb_build_object(
      'user_id', _uid,
      'access_state', 'ALLOWED',
      'denial_reason', NULL,
      'is_platform_admin', true,
      'platform_role', _platform_role,
      'company_id', _company_id,
      'company_status', 'ACTIVE'
    );
  END IF;

  -- 2. Check candidate / job seeker role
  SELECT tenant_internal.is_applicant_account() INTO _is_candidate;

  -- Agency accounts have an active agency membership and an active company
  -- assignment, not a company_members row. Resolve both on the server.
  IF NOT _is_candidate THEN
    SELECT aa.company_id, aa.agency_id INTO _agency_rec
    FROM public.agency_members am
    JOIN public.agencies agency ON agency.id = am.agency_id AND agency.status = 'active'
    JOIN public.agency_assignments aa ON aa.agency_id = am.agency_id AND aa.scope = 'company' AND aa.status = 'active'
    JOIN public.companies company ON company.id = aa.company_id AND company.status = 'active'
    WHERE am.user_id = _uid AND (_company_id IS NULL OR aa.company_id = _company_id)
    ORDER BY aa.created_at ASC LIMIT 1;
    IF FOUND THEN
      RETURN jsonb_build_object(
        'user_id', _uid, 'access_state', 'ALLOWED', 'denial_reason', NULL,
        'is_platform_admin', false, 'is_agency', true, 'role', 'agency',
        'agency_id', _agency_rec.agency_id, 'company_id', _agency_rec.company_id,
        'company_status', 'ACTIVE'
      );
    END IF;
  END IF;

  -- 3. Resolve target company
  _target_company_id := _company_id;
  IF _target_company_id IS NULL THEN
    SELECT company_id INTO _target_company_id
    FROM public.company_members
    WHERE user_id = _uid
    ORDER BY joined_at ASC
    LIMIT 1;
  END IF;

  -- If user is candidate and not bound to a company context
  IF _is_candidate AND _target_company_id IS NULL THEN
    RETURN jsonb_build_object(
      'user_id', _uid,
      'access_state', 'ALLOWED',
      'denial_reason', NULL,
      'is_platform_admin', false,
      'is_candidate', true,
      'role', 'job_seeker',
      'company_id', NULL,
      'company_status', NULL
    );
  END IF;

  IF _target_company_id IS NULL THEN
    RETURN jsonb_build_object(
      'user_id', _uid,
      'access_state', 'DENIED',
      'denial_reason', 'NO_COMPANY_MEMBERSHIP',
      'is_platform_admin', false,
      'company_id', NULL,
      'company_status', NULL
    );
  END IF;

  -- 4. Retrieve company record
  SELECT id, name, status, parent_company_id INTO _company_rec
  FROM public.companies
  WHERE id = _target_company_id;

  IF _company_rec.id IS NULL THEN
    RETURN jsonb_build_object(
      'user_id', _uid,
      'access_state', 'DENIED',
      'denial_reason', 'COMPANY_NOT_FOUND',
      'is_platform_admin', false,
      'company_id', _target_company_id,
      'company_status', 'DELETED'
    );
  END IF;

  -- 5. FAIL-CLOSED: Non-active tenant status check
  IF _company_rec.status NOT IN ('active', 'ACTIVE') THEN
    RETURN jsonb_build_object(
      'user_id', _uid,
      'access_state', 'DENIED',
      'denial_reason', 'COMPANY_' || upper(_company_rec.status),
      'is_platform_admin', false,
      'company_id', _company_rec.id,
      'company_name', _company_rec.name,
      'company_status', upper(_company_rec.status)
    );
  END IF;

  -- 6. Verify user membership in company or parent company
  IF NOT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE user_id = _uid AND company_id = _company_rec.id
  ) AND NOT (
    _company_rec.parent_company_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.company_members
      WHERE user_id = _uid AND company_id = _company_rec.parent_company_id
    )
  ) THEN
    RETURN jsonb_build_object(
      'user_id', _uid,
      'access_state', 'DENIED',
      'denial_reason', 'NOT_COMPANY_MEMBER',
      'is_platform_admin', false,
      'company_id', _company_rec.id,
      'company_status', upper(_company_rec.status)
    );
  END IF;

  -- 7. Get user's role in this tenant
  SELECT role::text INTO _user_role
  FROM public.user_roles
  WHERE user_id = _uid
  LIMIT 1;

  RETURN jsonb_build_object(
    'user_id', _uid,
    'access_state', 'ALLOWED',
    'denial_reason', NULL,
    'is_platform_admin', false,
    'is_candidate', _is_candidate,
    'role', COALESCE(_user_role, 'recruiter'),
    'company_id', _company_rec.id,
    'company_name', _company_rec.name,
    'company_status', upper(_company_rec.status)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.validate_tenant_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validate_tenant_status(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_my_applicant_portal()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
DECLARE _email text; _result jsonb;
BEGIN
  IF NOT tenant_internal.is_applicant_account() THEN
    RAISE EXCEPTION 'Applicant account required' USING ERRCODE = '42501';
  END IF;
  SELECT lower(trim(email)) INTO _email FROM auth.users
  WHERE id = (SELECT auth.uid()) AND email_confirmed_at IS NOT NULL;
  IF _email IS NULL THEN RAISE EXCEPTION 'Verified account required' USING ERRCODE = '42501'; END IF;
  WITH own_applications AS (
    SELECT a.*, j.title, j.department, co.name AS company_name
    FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id AND j.company_id = a.company_id
    JOIN public.companies co ON co.id = a.company_id AND co.status = 'active'
    WHERE lower(trim(a.email)) = _email
  ), own_candidates AS (
    SELECT c.* FROM public.candidates c
    WHERE lower(trim(c.email)) = _email AND EXISTS (
      SELECT 1 FROM own_applications a WHERE a.company_id = c.company_id AND a.job_id = c.job_id
    )
  )
  SELECT jsonb_build_object(
    'applications', coalesce((SELECT jsonb_agg(jsonb_build_object(
      'id', a.id, 'company_id', a.company_id, 'company_name', a.company_name,
      'job_id', a.job_id, 'name', a.name, 'phone', a.phone, 'specialty', a.specialty,
      'skills', a.skills, 'cover_letter', a.cover_letter, 'resume_url', a.resume_url,
      'status', a.status, 'created_at', a.created_at,
      'jobs', jsonb_build_object('title', a.title, 'department', a.department)
    ) ORDER BY a.created_at DESC) FROM own_applications a), '[]'::jsonb),
    'candidates', coalesce((SELECT jsonb_agg(jsonb_build_object(
      'id', c.id, 'company_id', c.company_id, 'job_id', c.job_id,
      'role', c.role, 'stage', c.stage, 'status', c.status, 'tracking_code', c.tracking_code
    ) ORDER BY c.created_at DESC) FROM own_candidates c), '[]'::jsonb),
    'interviews', coalesce((SELECT jsonb_agg(jsonb_build_object(
      'id', i.id, 'company_id', i.company_id, 'position', i.position, 'date', i.date,
      'time', i.time, 'type', i.type, 'status', i.status, 'meeting_url', i.meeting_url
    ) ORDER BY i.date DESC) FROM public.interviews i JOIN own_candidates c
      ON c.id = i.candidate_id AND c.company_id = i.company_id), '[]'::jsonb),
    'offers', coalesce((SELECT jsonb_agg(jsonb_build_object(
      'id', o.id, 'company_id', o.company_id, 'position', o.position, 'department', o.department,
      'salary', o.salary, 'currency', o.currency, 'status', o.status, 'token', o.token
    ) ORDER BY o.created_at DESC) FROM public.job_offers o JOIN own_candidates c
      ON c.id = o.candidate_id AND c.company_id = o.company_id
      WHERE o.status IN ('sent','viewed','accepted','rejected','expired')
      AND (o.job_id IS NULL OR o.job_id = c.job_id)), '[]'::jsonb)
  ) INTO _result;
  RETURN _result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_my_applicant_portal() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_applicant_portal() TO authenticated;

-- The same restriction applies to applicant-only RLS reads. Staff policies
-- remain independent; normal company HR access is not changed.
CREATE OR REPLACE FUNCTION public.my_verified_applicant_email()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
  SELECT lower(trim(email)) FROM auth.users
  WHERE id = (SELECT auth.uid()) AND email_confirmed_at IS NOT NULL
    AND tenant_internal.is_applicant_account();
$$;
REVOKE ALL ON FUNCTION public.my_verified_applicant_email() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_verified_applicant_email() TO authenticated;
