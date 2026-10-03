-- Disposable replay database only. Fixtures are rolled back.
BEGIN;
SET LOCAL session_replication_role = replica;
INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data) VALUES
  ('25000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'platform-admin@example.test', '{}'::jsonb),
  ('25000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'platform-support@example.test', '{}'::jsonb),
  ('25000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tenant-admin@example.test', '{"role":"super_admin"}'::jsonb);
SET LOCAL session_replication_role = origin;
INSERT INTO public.platform_roles (user_id, role) VALUES
  ('25000000-0000-0000-0000-000000000001', 'super_admin'),
  ('25000000-0000-0000-0000-000000000002', 'platform_support');
INSERT INTO public.user_roles (user_id, role) VALUES ('25000000-0000-0000-0000-000000000003', 'admin');

DO $$
BEGIN
  IF has_table_privilege('anon', 'public.platform_roles', 'SELECT')
     OR has_function_privilege('anon', 'public.get_platform_role(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Anonymous platform role access exists';
  END IF;
END $$;
SELECT set_config('request.jwt.claim.sub', '25000000-0000-0000-0000-000000000002', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF (SELECT count(*) FROM public.platform_roles) <> 1 THEN
    RAISE EXCEPTION 'Platform role self-read is recursive or leaks other roles';
  END IF;
  IF public.get_platform_role(auth.uid()) IS DISTINCT FROM 'platform_support'
     OR public.get_platform_role('25000000-0000-0000-0000-000000000001') IS NOT NULL THEN
    RAISE EXCEPTION 'Platform role helper bypasses its caller scope';
  END IF;
  BEGIN
    INSERT INTO public.platform_roles (user_id, role) VALUES ('25000000-0000-0000-0000-000000000003', 'super_admin');
    RAISE EXCEPTION 'Client assigned a platform role';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.platform_roles SET role='super_admin';
    RAISE EXCEPTION 'Client escalated a platform role';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    DELETE FROM public.platform_roles;
    RAISE EXCEPTION 'Client deleted platform roles';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
SELECT set_config('request.jwt.claim.sub', '25000000-0000-0000-0000-000000000003', true);
SELECT set_config('request.jwt.claims', '{"sub":"25000000-0000-0000-0000-000000000003","role":"authenticated","user_metadata":{"role":"super_admin"}}', true);
DO $$
BEGIN
  IF public.is_super_admin(auth.uid()) OR public.is_super_admin_user()
     OR (SELECT count(*) FROM public.platform_roles) <> 0 THEN
    RAISE EXCEPTION 'Tenant admin or signup metadata granted platform access';
  END IF;
END $$;
SELECT set_config('request.jwt.claim.sub', '25000000-0000-0000-0000-000000000001', true);
DO $$
BEGIN
  IF (SELECT count(*) FROM public.platform_roles) <> 2
     OR public.get_platform_role('25000000-0000-0000-0000-000000000002') IS DISTINCT FROM 'platform_support' THEN
    RAISE EXCEPTION 'Verified platform administrator cannot review roles';
  END IF;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claim.role', 'service_role', true);
SET LOCAL ROLE service_role;
DO $$
BEGIN
  IF public.get_platform_role('25000000-0000-0000-0000-000000000002') IS DISTINCT FROM 'platform_support' THEN
    RAISE EXCEPTION 'Trusted service cannot read a platform role';
  END IF;
END $$;
RESET ROLE;
ROLLBACK;
