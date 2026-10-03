-- Disposable replay database only. Fixtures are rolled back.
BEGIN;
SET LOCAL session_replication_role = replica;
INSERT INTO auth.users (id, instance_id, aud, role, email) VALUES
  ('24000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'indexing-owner-a@example.test'),
  ('24000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'indexing-owner-b@example.test'),
  ('24000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'indexing-platform@example.test');
SET LOCAL session_replication_role = origin;
INSERT INTO public.companies (id, name) VALUES
  ('14000000-0000-0000-0000-000000000001', 'Indexing fixture A'),
  ('14000000-0000-0000-0000-000000000002', 'Indexing fixture B');
INSERT INTO public.company_members (company_id, user_id, member_role) VALUES
  ('14000000-0000-0000-0000-000000000001', '24000000-0000-0000-0000-000000000001', 'owner'),
  ('14000000-0000-0000-0000-000000000002', '24000000-0000-0000-0000-000000000002', 'owner');
INSERT INTO public.platform_roles (user_id, role) VALUES ('24000000-0000-0000-0000-000000000003', 'super_admin');
INSERT INTO public.jobs (id, user_id, company_id, title, department, location, type) VALUES
  ('44000000-0000-0000-0000-000000000001', '24000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000001', 'Indexing fixture A job', 'Fixture', 'Fixture', 'full-time'),
  ('44000000-0000-0000-0000-000000000002', '24000000-0000-0000-0000-000000000002', '14000000-0000-0000-0000-000000000002', 'Indexing fixture B job', 'Fixture', 'Fixture', 'full-time');
INSERT INTO public.google_indexing_logs (job_id, url, action, status) VALUES
  ('44000000-0000-0000-0000-000000000001', 'https://example.test/a', 'URL_UPDATED', 'SUCCESS'),
  ('44000000-0000-0000-0000-000000000002', 'https://example.test/b', 'URL_UPDATED', 'SUCCESS'),
  (NULL, 'https://example.test/deleted', 'URL_DELETED', 'SUCCESS');

DO $$
BEGIN
  IF has_table_privilege('anon', 'public.google_indexing_logs', 'SELECT')
     OR has_table_privilege('anon', 'public.google_indexing_logs', 'INSERT') THEN
    RAISE EXCEPTION 'Anonymous indexing log access exists';
  END IF;
END $$;
SELECT set_config('request.jwt.claim.sub', '24000000-0000-0000-0000-000000000001', true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF (SELECT count(*) FROM public.google_indexing_logs) <> 1 THEN
    RAISE EXCEPTION 'Indexing logs leaked from another company or a deleted job';
  END IF;
  BEGIN
    INSERT INTO public.google_indexing_logs (url, action, status) VALUES ('https://example.test/forged', 'URL_UPDATED', 'SUCCESS');
    RAISE EXCEPTION 'Client forged an indexing log';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.google_indexing_logs SET status='FORGED';
    RAISE EXCEPTION 'Client changed an indexing log';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    DELETE FROM public.google_indexing_logs;
    RAISE EXCEPTION 'Client deleted an indexing log';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
SELECT set_config('request.jwt.claim.sub', '24000000-0000-0000-0000-000000000003', true);
DO $$
BEGIN
  IF (SELECT count(*) FROM public.google_indexing_logs) <> 3 THEN
    RAISE EXCEPTION 'Platform administrator cannot review retained indexing logs';
  END IF;
END $$;
RESET ROLE;
ROLLBACK;
