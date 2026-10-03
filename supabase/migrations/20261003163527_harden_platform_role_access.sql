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
