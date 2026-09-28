-- Run only on the disposable migration-replay database; roll back fixtures.
BEGIN;

INSERT INTO public.companies (id, name) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Permissions fixture A'),
  ('10000000-0000-0000-0000-000000000002', 'Permissions fixture B');

INSERT INTO public.company_members (company_id, user_id, member_role) VALUES
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'owner'),
  ('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'owner'),
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 'hr');

INSERT INTO public.granular_permissions (company_id, role_key, module_key, can_delete) VALUES
  ('10000000-0000-0000-0000-000000000001', 'recruiter', 'fixture.jobs', false),
  ('10000000-0000-0000-0000-000000000002', 'recruiter', 'fixture.jobs', false);

INSERT INTO public.granular_permissions (company_id, role_key, user_id, module_key) VALUES
  ('10000000-0000-0000-0000-000000000001',
   'user:20000000-0000-0000-0000-000000000003',
   '20000000-0000-0000-0000-000000000003', 'fixture.jobs');

-- The same column list used by the frontend must work for NULL and non-NULL user_id.
INSERT INTO public.granular_permissions (company_id, role_key, module_key, can_delete)
VALUES ('10000000-0000-0000-0000-000000000001', 'recruiter', 'fixture.jobs', true)
ON CONFLICT (company_id, role_key, user_id, module_key)
DO UPDATE SET can_delete = EXCLUDED.can_delete;

INSERT INTO public.granular_permissions (company_id, role_key, user_id, module_key, can_delete)
VALUES ('10000000-0000-0000-0000-000000000001',
        'user:20000000-0000-0000-0000-000000000003',
        '20000000-0000-0000-0000-000000000003', 'fixture.jobs', true)
ON CONFLICT (company_id, role_key, user_id, module_key)
DO UPDATE SET can_delete = EXCLUDED.can_delete;

DO $$
BEGIN
  IF (SELECT count(*) FROM public.granular_permissions) <> 3 THEN
    RAISE EXCEPTION 'Column-based upsert created duplicate role or user overrides';
  END IF;
  IF has_table_privilege('anon', 'public.granular_permissions', 'SELECT') THEN
    RAISE EXCEPTION 'Anonymous users must not read permissions';
  END IF;
  BEGIN
    INSERT INTO public.granular_permissions (company_id, role_key, user_id, module_key)
    VALUES ('10000000-0000-0000-0000-000000000001',
            'user:20000000-0000-0000-0000-000000000002',
            '20000000-0000-0000-0000-000000000002', 'fixture.foreign');
    RAISE EXCEPTION 'Cross-company user override unexpectedly passed the foreign key';
  EXCEPTION WHEN foreign_key_violation THEN
    NULL;
  END;
END $$;

SELECT set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  IF (SELECT count(*) FROM public.granular_permissions WHERE module_key = 'fixture.jobs') <> 2 THEN
    RAISE EXCEPTION 'Company owner can view another company permissions';
  END IF;
  INSERT INTO public.granular_permissions (company_id, role_key, module_key, can_edit)
  VALUES ('10000000-0000-0000-0000-000000000001', 'recruiter', 'fixture.jobs', false)
  ON CONFLICT (company_id, role_key, user_id, module_key)
  DO UPDATE SET can_edit = EXCLUDED.can_edit;
  IF (SELECT can_edit FROM public.granular_permissions
      WHERE company_id = '10000000-0000-0000-0000-000000000001'
        AND role_key = 'recruiter' AND user_id IS NULL AND module_key = 'fixture.jobs') THEN
    RAISE EXCEPTION 'Company owner upsert did not update its own permission';
  END IF;
  BEGIN
    INSERT INTO public.granular_permissions (company_id, role_key, module_key)
    VALUES ('10000000-0000-0000-0000-000000000002', 'recruiter', 'fixture.cross');
    RAISE EXCEPTION 'Cross-company permission insert unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END $$;

SELECT set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000003', true);
DO $$
BEGIN
  IF (SELECT count(*) FROM public.granular_permissions WHERE module_key = 'fixture.jobs') <> 2 THEN
    RAISE EXCEPTION 'Company member cannot view role and own override';
  END IF;
  BEGIN
    INSERT INTO public.granular_permissions (company_id, role_key, module_key)
    VALUES ('10000000-0000-0000-0000-000000000001', 'recruiter', 'fixture.member');
    RAISE EXCEPTION 'Non-owner permission insert unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END $$;

RESET ROLE;
ROLLBACK;
