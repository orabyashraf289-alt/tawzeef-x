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
-- Synthetic job inserts must not dispatch webhooks.
SET LOCAL session_replication_role = replica;
INSERT INTO public.jobs (id, user_id, company_id, title, department, location, type) VALUES
  ('44000000-0000-0000-0000-000000000001', '24000000-0000-0000-0000-000000000001', '14000000-0000-0000-0000-000000000001', 'Indexing fixture A job', 'Fixture', 'Fixture', 'full-time'),
  ('44000000-0000-0000-0000-000000000002', '24000000-0000-0000-0000-000000000002', '14000000-0000-0000-0000-000000000002', 'Indexing fixture B job', 'Fixture', 'Fixture', 'full-time');
SET LOCAL session_replication_role = origin;
INSERT INTO public.google_indexing_logs (company_id, job_id, url, action, status) VALUES
  ('14000000-0000-0000-0000-000000000001', '44000000-0000-0000-0000-000000000001', 'https://example.test/a', 'URL_UPDATED', 'SUCCESS'),
  ('14000000-0000-0000-0000-000000000002', '44000000-0000-0000-0000-000000000002', 'https://example.test/b', 'URL_UPDATED', 'SUCCESS'),
  (NULL, NULL, 'https://example.test/deleted', 'URL_DELETED', 'SUCCESS');

DO $$
BEGIN
  BEGIN
    INSERT INTO public.google_indexing_logs (company_id, job_id, url, action, status)
    VALUES ('14000000-0000-0000-0000-000000000002', '44000000-0000-0000-0000-000000000001', 'https://example.test/cross-company', 'URL_UPDATED', 'SUCCESS');
    RAISE EXCEPTION 'Indexing log accepted a job from another company';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;
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
DELETE FROM public.jobs WHERE id = '44000000-0000-0000-0000-000000000001';
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.google_indexing_logs
    WHERE url='https://example.test/a' AND job_id IS NULL AND company_id IS NULL
  ) THEN RAISE EXCEPTION 'Deleted job log was not retained without its tenant links'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub', '24000000-0000-0000-0000-000000000001', true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF (SELECT count(*) FROM public.google_indexing_logs) <> 0 THEN
    RAISE EXCEPTION 'Company can read a retained deleted-job log';
  END IF;
END $$;
RESET ROLE;
ROLLBACK;
