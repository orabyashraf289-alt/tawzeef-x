-- Disposable replay database only. No email is sent; all fixtures roll back.
BEGIN;
SET LOCAL session_replication_role = replica;
INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
VALUES ('26000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated', 'Lookup-Fixture@example.test', '{}'::jsonb);
SET LOCAL session_replication_role = origin;

DO $$
BEGIN
  IF has_function_privilege('anon', 'public.get_user_by_email_v1(text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.get_user_by_email_v1(text)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'public.get_user_by_email_v1(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Auth email lookup must be server-only';
  END IF;
  IF (SELECT proconfig FROM pg_proc WHERE oid = 'public.get_user_by_email_v1(text)'::regprocedure)
       IS DISTINCT FROM ARRAY['search_path=pg_catalog, pg_temp'] THEN
    RAISE EXCEPTION 'Auth email lookup search_path is not pinned';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prorettype='trigger'::regtype
      AND (p.proname LIKE 'auto_heal_auth_%'
        OR p.proname IN ('ensure_audit_log_id','ensure_refresh_token_id',
          'dispatch_candidate_webhook','dispatch_job_webhook','dispatch_offer_webhook',
          'handle_new_user_signup','handle_profile_company_creation','set_row_company_id'))
      AND (has_function_privilege('anon',p.oid,'EXECUTE')
        OR has_function_privilege('authenticated',p.oid,'EXECUTE'))
  ) THEN
    RAISE EXCEPTION 'Trigger helpers retain browser execution privileges';
  END IF;
END $$;

SET LOCAL ROLE anon;
DO $$
BEGIN
  BEGIN
    PERFORM * FROM public.get_user_by_email_v1('lookup-fixture@example.test');
    RAISE EXCEPTION 'Anonymous caller enumerated an Auth user';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  BEGIN
    PERFORM * FROM public.get_user_by_email_v1('lookup-fixture@example.test');
    RAISE EXCEPTION 'Authenticated browser enumerated an Auth user';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;
SET LOCAL ROLE service_role;
SET LOCAL search_path = pg_temp;
DO $$
BEGIN
  IF (SELECT count(*) FROM public.get_user_by_email_v1('LOOKUP-FIXTURE@EXAMPLE.TEST')
      WHERE id='26000000-0000-0000-0000-000000000001') <> 1 THEN
    RAISE EXCEPTION 'Trusted login/reset lookup failed';
  END IF;
  IF EXISTS (SELECT 1 FROM public.get_user_by_email_v1('missing-lookup-fixture@example.test')) THEN
    RAISE EXCEPTION 'Unknown email returned an Auth user';
  END IF;
END $$;
RESET ROLE;
ROLLBACK;
