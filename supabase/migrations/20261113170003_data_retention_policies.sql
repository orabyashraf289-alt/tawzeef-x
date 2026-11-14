-- Phase 4 PDPL / GDPR foundation: tenant-scoped data retention and anonymization policies.
-- Strictly tenant-isolated via company_id, company_members, and public.platform_roles (is_super_admin).
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

CREATE TABLE IF NOT EXISTS public.company_retention_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  candidate_retention_days integer NOT NULL DEFAULT 365
    CHECK (candidate_retention_days BETWEEN 30 AND 3650),
  rejected_application_days integer NOT NULL DEFAULT 180
    CHECK (rejected_application_days BETWEEN 30 AND 1825),
  audit_log_retention_days integer NOT NULL DEFAULT 730
    CHECK (audit_log_retention_days BETWEEN 90 AND 3650),
  auto_anonymize_enabled boolean NOT NULL DEFAULT false,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT company_retention_policies_company_id_key UNIQUE (company_id)
);

CREATE INDEX IF NOT EXISTS idx_company_retention_policies_auto_anonymize
  ON public.company_retention_policies (auto_anonymize_enabled)
  WHERE auto_anonymize_enabled = true;

ALTER TABLE public.company_retention_policies ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.company_retention_policies FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.company_retention_policies TO authenticated;
GRANT ALL ON TABLE public.company_retention_policies TO service_role;

-- Tenant-admin & platform super-admin authorization predicate.
-- Uses public.platform_roles via public.is_super_admin and active company_members ('owner', 'admin').
CREATE OR REPLACE FUNCTION public.can_manage_company_retention(_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT (SELECT auth.uid()) IS NOT NULL
    AND _company_id IS NOT NULL
    AND (
      public.is_super_admin((SELECT auth.uid()))
      OR (
        EXISTS (
          SELECT 1
          FROM auth.users u
          WHERE u.id = (SELECT auth.uid())
            AND u.deleted_at IS NULL
            AND (u.banned_until IS NULL OR u.banned_until <= pg_catalog.now())
        )
        AND NOT EXISTS (
          SELECT 1
          FROM public.user_roles ur
          WHERE ur.user_id = (SELECT auth.uid())
            AND ur.role = 'job_seeker'::public.app_role
        )
        AND EXISTS (
          SELECT 1
          FROM public.companies c
          JOIN public.company_members cm
            ON cm.company_id IN (c.id, c.parent_company_id)
          LEFT JOIN public.companies parent_c
            ON parent_c.id = c.parent_company_id
          WHERE c.id = _company_id
            AND c.status = 'active'
            AND (c.parent_company_id IS NULL OR parent_c.status = 'active')
            AND cm.user_id = (SELECT auth.uid())
            AND cm.member_role IN ('owner', 'admin')
        )
      )
    );
$$;

REVOKE ALL ON FUNCTION public.can_manage_company_retention(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_company_retention(uuid) TO authenticated, service_role;

-- Stamp updated_at / updated_by server-side and prevent tenant reassignment on update.
CREATE OR REPLACE FUNCTION public.sync_company_retention_policy_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  _actor uuid := auth.uid();
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.created_at := OLD.created_at;
    IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
      RAISE EXCEPTION 'company_id cannot be modified on retention policies' USING ERRCODE = '42501';
    END IF;
  END IF;

  NEW.updated_at := pg_catalog.now();
  IF _actor IS NOT NULL THEN
    NEW.updated_by := _actor;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_company_retention_policy_audit() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_company_retention_policy_audit ON public.company_retention_policies;
CREATE TRIGGER trg_sync_company_retention_policy_audit
  BEFORE INSERT OR UPDATE ON public.company_retention_policies
  FOR EACH ROW EXECUTE FUNCTION public.sync_company_retention_policy_audit();

DROP POLICY IF EXISTS "Tenant admins and super admins read retention policies" ON public.company_retention_policies;
CREATE POLICY "Tenant admins and super admins read retention policies"
  ON public.company_retention_policies
  FOR SELECT
  TO authenticated
  USING (public.can_manage_company_retention(company_id));

DROP POLICY IF EXISTS "Tenant admins and super admins create retention policies" ON public.company_retention_policies;
CREATE POLICY "Tenant admins and super admins create retention policies"
  ON public.company_retention_policies
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_company_retention(company_id));

DROP POLICY IF EXISTS "Tenant admins and super admins update retention policies" ON public.company_retention_policies;
CREATE POLICY "Tenant admins and super admins update retention policies"
  ON public.company_retention_policies
  FOR UPDATE
  TO authenticated
  USING (public.can_manage_company_retention(company_id))
  WITH CHECK (public.can_manage_company_retention(company_id));

DROP POLICY IF EXISTS "Tenant admins and super admins delete retention policies" ON public.company_retention_policies;
CREATE POLICY "Tenant admins and super admins delete retention policies"
  ON public.company_retention_policies
  FOR DELETE
  TO authenticated
  USING (public.can_manage_company_retention(company_id));
