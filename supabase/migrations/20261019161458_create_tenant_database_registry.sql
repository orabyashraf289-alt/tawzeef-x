-- Platform metadata only. A database_ref identifies an environment; it is
-- never a connection string, service key, or other credential.
CREATE TABLE IF NOT EXISTS public.tenant_database_registry (
  company_id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  isolation_mode text NOT NULL DEFAULT 'shared'
    CHECK (isolation_mode IN ('shared', 'dedicated')),
  provisioning_state text NOT NULL DEFAULT 'pending'
    CHECK (provisioning_state IN ('pending', 'provisioning', 'migrating', 'ready', 'failed')),
  database_ref text,
  region text,
  schema_version text,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tenant_ready_requires_dedicated_database CHECK (
    provisioning_state <> 'ready'
    OR (isolation_mode = 'dedicated' AND nullif(trim(database_ref), '') IS NOT NULL)
  )
);

ALTER TABLE public.tenant_database_registry ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tenant_database_registry FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.tenant_database_registry TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_database_registry TO service_role;

CREATE POLICY "Platform admins view tenant database states"
  ON public.tenant_database_registry FOR SELECT TO authenticated
  USING (public.is_super_admin((SELECT auth.uid())));

-- Existing companies currently use the shared project. Pending means the
-- dedicated environment has not been provisioned; it does not block their
-- existing shared-database workflows.
INSERT INTO public.tenant_database_registry (company_id)
SELECT id FROM public.companies WHERE parent_company_id IS NULL
ON CONFLICT (company_id) DO NOTHING;

-- Trigger-only function in an unexposed schema so each future parent company
-- appears in the central registry as soon as it is created. Branches use the
-- database location of their parent and do not receive separate registry rows.
CREATE SCHEMA IF NOT EXISTS tenant_internal;
REVOKE ALL ON SCHEMA tenant_internal FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION tenant_internal.register_new_company_database()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF NEW.parent_company_id IS NULL THEN
    INSERT INTO public.tenant_database_registry (company_id)
    VALUES (NEW.id)
    ON CONFLICT (company_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION tenant_internal.register_new_company_database()
  FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_register_new_company_database ON public.companies;
CREATE TRIGGER trg_register_new_company_database
  AFTER INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION tenant_internal.register_new_company_database();
