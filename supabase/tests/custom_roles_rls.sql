-- Run only against the disposable database started by the migration replay job.
-- All fixture rows are rolled back at the end of this transaction.
BEGIN;

INSERT INTO public.companies (id, name) VALUES
  ('10000000-0000-0000-0000-000000000001', 'RLS fixture A'),
  ('10000000-0000-0000-0000-000000000002', 'RLS fixture B');

INSERT INTO public.company_members (company_id, user_id, member_role) VALUES
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'owner'),
  ('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'owner'),
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 'hr');

INSERT INTO public.custom_roles (id, company_id, name, created_by) VALUES
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'RLS fixture A', '20000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'RLS fixture B', '20000000-0000-0000-0000-000000000002');

DO $$
BEGIN
  IF has_table_privilege('anon', 'public.custom_roles', 'SELECT')
    OR has_table_privilege('anon', 'public.custom_roles', 'INSERT')
    OR has_table_privilege('authenticated', 'public.custom_roles', 'UPDATE') THEN
    RAISE EXCEPTION 'Unexpected custom role privileges';
  END IF;
END $$;

SELECT set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  IF (SELECT count(*) FROM public.custom_roles WHERE name LIKE 'RLS fixture %') <> 1 THEN
    RAISE EXCEPTION 'Owner can view another company custom role';
  END IF;

  INSERT INTO public.custom_roles (company_id, name, created_by)
  VALUES ('10000000-0000-0000-0000-000000000001', 'RLS fixture own insert', auth.uid());

  BEGIN
    INSERT INTO public.custom_roles (company_id, name, created_by)
    VALUES ('10000000-0000-0000-0000-000000000002', 'RLS fixture cross insert', auth.uid());
    RAISE EXCEPTION 'Cross-company custom role insert unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  BEGIN
    INSERT INTO public.custom_roles (company_id, name, created_by)
    VALUES ('10000000-0000-0000-0000-000000000001', 'RLS fixture spoofed author', '20000000-0000-0000-0000-000000000002');
    RAISE EXCEPTION 'Custom role creator spoof unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  IF (SELECT count(*) FROM public.custom_roles WHERE name LIKE 'RLS fixture %') <> 2 THEN
    RAISE EXCEPTION 'Unexpected custom role visibility after insert';
  END IF;
END $$;

SELECT set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000003', true);
DO $$
BEGIN
  IF (SELECT count(*) FROM public.custom_roles WHERE name LIKE 'RLS fixture %') <> 2 THEN
    RAISE EXCEPTION 'Company member cannot view company custom roles';
  END IF;
  BEGIN
    INSERT INTO public.custom_roles (company_id, name, created_by)
    VALUES ('10000000-0000-0000-0000-000000000001', 'RLS fixture member insert', auth.uid());
    RAISE EXCEPTION 'Non-owner custom role insert unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END $$;

RESET ROLE;
ROLLBACK;
