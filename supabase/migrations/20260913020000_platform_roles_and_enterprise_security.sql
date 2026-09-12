-- =========================================================================
-- MIGRATION: 20260913020000_platform_roles_and_enterprise_security.sql
-- DESCRIPTION: Enterprise Security Overhaul:
--   1. PROMPT 01: Platform Roles architecture (public.platform_roles),
--      rewritten public.is_super_admin(_user_id) querying ONLY platform_roles.
--      Purged user_metadata, user_roles.role='admin', and profiles.role checks.
--   2. PROMPT 02: Fail-Closed server-side tenant validation RPC:
--      public.validate_tenant_status(_company_id uuid)
--   3. PROMPT 04: Company Lifecycle status check constraint:
--      ('active', 'inactive', 'suspended', 'deleting', 'delete_failed', 'deleted')
--      and is_platform_company safeguard flag.
-- =========================================================================

-- 1. Create public.platform_roles table
CREATE TABLE IF NOT EXISTS public.platform_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('super_admin', 'platform_support', 'platform_auditor')),
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT platform_roles_user_id_key UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_roles_lookup ON public.platform_roles (user_id, role);

-- Enable RLS on platform_roles
ALTER TABLE public.platform_roles ENABLE ROW LEVEL SECURITY;

-- Drop any prior policies on platform_roles if present
DROP POLICY IF EXISTS "Platform roles select policy" ON public.platform_roles;
DROP POLICY IF EXISTS "Super admins and self can read platform roles" ON public.platform_roles;
DROP POLICY IF EXISTS "Platform roles insert restricted" ON public.platform_roles;
DROP POLICY IF EXISTS "Platform roles update restricted" ON public.platform_roles;
DROP POLICY IF EXISTS "Platform roles delete restricted" ON public.platform_roles;

-- SELECT: Only self or verified super admins can view platform roles
CREATE POLICY "Super admins and self can read platform roles"
ON public.platform_roles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.platform_roles pr
    WHERE pr.user_id = auth.uid() AND pr.role = 'super_admin'
  )
);

-- NO direct INSERT / UPDATE / DELETE policies for authenticated users!
-- Only service_role or SECURITY DEFINER functions can modify platform_roles.

-- 2. Seed verified Platform Super Admins into platform_roles
INSERT INTO public.platform_roles (user_id, role)
SELECT id, 'super_admin'
FROM auth.users
WHERE email IN ('tx@tawzeefx.com', 'ctraining801@gmail.com')
ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role, updated_at = now();

-- 3. Rewrite public.is_super_admin(_user_id uuid) to use ONLY platform_roles
-- CRITICAL SECURITY FIX: Never check user_metadata, user_roles.role = 'admin', or profiles.role.
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_roles pr
    WHERE pr.user_id = _user_id AND pr.role = 'super_admin'
  );
$$;

-- 4. Rewrite public.is_super_admin_user() to use public.is_super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin(auth.uid());
$$;

-- 5. Helper function: get_platform_role(_user_id uuid)
CREATE OR REPLACE FUNCTION public.get_platform_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pr.role
  FROM public.platform_roles pr
  WHERE pr.user_id = _user_id
  LIMIT 1;
$$;

-- 6. Add is_platform_company flag and update company status constraints
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS is_platform_company boolean DEFAULT false;

-- Mark platform company
UPDATE public.companies
SET is_platform_company = true
WHERE id = '00000000-0000-0000-0000-000000000001'::uuid
   OR lower(name) LIKE '%tawzeef%'
   OR lower(name) LIKE '%توظيف إكس%';

-- Update companies status check constraint
DO $$
DECLARE
  _con text;
BEGIN
  FOR _con IN (
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.companies'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%status%'
  ) LOOP
    EXECUTE 'ALTER TABLE public.companies DROP CONSTRAINT ' || quote_ident(_con);
  END LOOP;
END $$;

ALTER TABLE public.companies
ADD CONSTRAINT companies_status_check
CHECK (status IN ('active', 'inactive', 'suspended', 'deleting', 'delete_failed', 'deleted'));

-- 7. PROMPT 02: Fail-Closed server-side tenant validation RPC
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
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _uid AND role = 'job_seeker'::app_role
  ) INTO _is_candidate;

  -- 3. Resolve target company
  _target_company_id := _company_id;
  IF _target_company_id IS NULL THEN
    SELECT company_id INTO _target_company_id
    FROM public.company_members
    WHERE user_id = _uid
    ORDER BY created_at ASC
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

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin_user() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_platform_role(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.validate_tenant_status(uuid) TO authenticated, service_role, anon;
