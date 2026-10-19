-- Run against a disposable database after the registry migration.
-- The fixtures and subscription rows created by company triggers roll back.
BEGIN;

DO $$
DECLARE
  root_id uuid := gen_random_uuid();
  branch_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.companies (id, name) VALUES (root_id, 'Registry test parent');
  INSERT INTO public.companies (id, name, parent_company_id)
    VALUES (branch_id, 'Registry test branch', root_id);

  IF NOT EXISTS (
    SELECT 1 FROM public.tenant_database_registry
    WHERE company_id = root_id AND isolation_mode = 'shared'
      AND provisioning_state = 'pending' AND database_ref IS NULL
  ) THEN
    RAISE EXCEPTION 'New parent is missing its pending database record';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.tenant_database_registry WHERE company_id = branch_id
  ) THEN
    RAISE EXCEPTION 'Branch received a separate database record';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.parent_company_id IS NULL
      AND NOT EXISTS (SELECT 1 FROM public.tenant_database_registry r WHERE r.company_id = c.id)
  ) THEN
    RAISE EXCEPTION 'An existing parent lacks a database record';
  END IF;

  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.tenant_database_registry'::regclass)
    OR has_table_privilege('authenticated', 'public.tenant_database_registry', 'INSERT')
    OR has_table_privilege('authenticated', 'public.tenant_database_registry', 'UPDATE')
    OR has_table_privilege('authenticated', 'public.tenant_database_registry', 'DELETE')
    OR has_function_privilege('authenticated', 'tenant_internal.register_new_company_database()', 'EXECUTE')
  THEN
    RAISE EXCEPTION 'Registry write protection or trigger privileges are incorrect';
  END IF;
END $$;

ROLLBACK;
