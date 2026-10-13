-- Disposable database fixtures; all mutations roll back and no job webhooks run.
BEGIN;
SET LOCAL session_replication_role = replica;
INSERT INTO auth.users (id, instance_id, aud, role, email) VALUES
  ('21000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','quota1@example.test'),
  ('21000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','quota2@example.test');
SET LOCAL session_replication_role = origin;

INSERT INTO public.companies (id, name, owner_user_id, is_platform_company) VALUES
  ('11000000-0000-0000-0000-000000000001','Quota tenant A','21000000-0000-0000-0000-000000000001',false),
  ('11000000-0000-0000-0000-000000000002','Quota tenant B','21000000-0000-0000-0000-000000000002',false),
  ('11000000-0000-0000-0000-000000000003','Platform fixture','21000000-0000-0000-0000-000000000001',true);
INSERT INTO public.companies (id, name, owner_user_id, parent_company_id) VALUES
  ('11000000-0000-0000-0000-000000000004','Tenant A branch','21000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001'),
  ('11000000-0000-0000-0000-000000000005','Platform branch','21000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000003');
INSERT INTO public.companies (id, name) VALUES
  ('11000000-0000-0000-0000-000000000006','Tenant pending owner');
UPDATE public.companies SET owner_user_id='21000000-0000-0000-0000-000000000002'
WHERE id='11000000-0000-0000-0000-000000000006';

DO $$ BEGIN
  IF (SELECT count(*) FROM public.company_subscriptions
      WHERE company_id IN ('11000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000002','11000000-0000-0000-0000-000000000006')) <> 3
     OR EXISTS (SELECT 1 FROM public.company_subscriptions
                WHERE company_id IN ('11000000-0000-0000-0000-000000000003','11000000-0000-0000-0000-000000000004','11000000-0000-0000-0000-000000000005'))
     OR EXISTS (SELECT 1 FROM public.company_subscriptions s JOIN public.subscription_plans p ON p.id=s.plan_id
                WHERE s.company_id='11000000-0000-0000-0000-000000000001' AND (p.name<>'free' OR p.price<>0 OR s.job_posts_limit<>p.job_posts_limit))
  THEN RAISE EXCEPTION 'Incorrect free subscription provisioning'; END IF;
END $$;

-- A missing free plan must never silently grant the cheapest paid plan.
UPDATE public.subscription_plans SET is_active=false WHERE name='free';
DO $$ BEGIN
  BEGIN
    INSERT INTO public.companies (id,name,owner_user_id) VALUES
      ('11000000-0000-0000-0000-000000000007','No free plan','21000000-0000-0000-0000-000000000001');
    RAISE EXCEPTION 'Paid plan fallback accepted';
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM <> 'free_subscription_plan_unavailable' THEN RAISE; END IF;
  END;
END $$;
UPDATE public.subscription_plans SET is_active=true WHERE name='free';

-- Use only the quota trigger on a temporary probe. This exercises the same
-- NEW.company_id as jobs without dispatching a real job-created webhook.
CREATE TEMP TABLE quota_probe (company_id uuid NOT NULL);
CREATE TRIGGER trg_quota_probe BEFORE INSERT ON quota_probe
FOR EACH ROW EXECUTE FUNCTION public.enforce_job_subscription_quota();
UPDATE public.company_subscriptions SET job_posts_limit=1
WHERE company_id IN ('11000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000002');
INSERT INTO quota_probe VALUES ('11000000-0000-0000-0000-000000000004');
DO $$ BEGIN
  BEGIN
    INSERT INTO quota_probe VALUES ('11000000-0000-0000-0000-000000000001');
    RAISE EXCEPTION 'Branch and parent received separate quotas';
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM <> 'subscription_limit_reached' THEN RAISE; END IF;
  END;
  BEGIN
    INSERT INTO quota_probe VALUES ('11000000-0000-0000-0000-000000000005');
    RAISE EXCEPTION 'Platform branch posted without a subscription';
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM <> 'subscription_limit_reached' THEN RAISE; END IF;
  END;
  IF (SELECT job_posts_used FROM public.company_subscriptions WHERE company_id='11000000-0000-0000-0000-000000000001') <> 1
     OR (SELECT job_posts_used FROM public.company_subscriptions WHERE company_id='11000000-0000-0000-0000-000000000002') <> 0
  THEN RAISE EXCEPTION 'Quota updated a different tenant or counted a rejected job'; END IF;
END $$;

UPDATE public.company_subscriptions SET status='cancelled'
WHERE company_id='11000000-0000-0000-0000-000000000002';
DO $$ BEGIN
  BEGIN
    INSERT INTO quota_probe VALUES ('11000000-0000-0000-0000-000000000002');
    RAISE EXCEPTION 'Cancelled subscription accepted';
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM <> 'subscription_limit_reached' THEN RAISE; END IF;
  END;
END $$;
UPDATE public.company_subscriptions SET status='active', expires_at=now()-interval '1 day'
WHERE company_id='11000000-0000-0000-0000-000000000002';
DO $$ BEGIN
  BEGIN
    INSERT INTO quota_probe VALUES ('11000000-0000-0000-0000-000000000002');
    RAISE EXCEPTION 'Expired subscription accepted';
  EXCEPTION WHEN check_violation THEN
    IF SQLERRM <> 'subscription_limit_reached' THEN RAISE; END IF;
  END;
  IF has_function_privilege('anon','public.enforce_job_subscription_quota()','EXECUTE')
     OR has_function_privilege('authenticated','public.enforce_job_subscription_quota()','EXECUTE')
     OR has_function_privilege('authenticated','public.handle_new_company_subscription()','EXECUTE')
     OR has_function_privilege('authenticated','public.increment_job_posts_used(uuid)','EXECUTE')
  THEN RAISE EXCEPTION 'Quota trigger or legacy RPC exposed to clients'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.jobs'::regclass
                 AND tgname='trg_z_enforce_job_subscription_quota' AND NOT tgisinternal)
     OR EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='company_subscriptions'
                 AND policyname IN ('Company owners update own subscription','System can insert company subscriptions'))
  THEN RAISE EXCEPTION 'Quota trigger or subscription write protection missing'; END IF;
END $$;

INSERT INTO public.company_members (company_id,user_id,member_role) VALUES
  ('11000000-0000-0000-0000-000000000001','21000000-0000-0000-0000-000000000001','owner');
SELECT set_config('request.jwt.claim.sub','21000000-0000-0000-0000-000000000001',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  BEGIN
    UPDATE public.company_subscriptions SET job_posts_limit=500
    WHERE company_id='11000000-0000-0000-0000-000000000001';
    IF FOUND THEN RAISE EXCEPTION 'Tenant owner changed their own quota'; END IF;
  EXCEPTION WHEN insufficient_privilege THEN
    NULL; -- Table-level privilege denial is also the expected protection.
  END;
END $$;
RESET ROLE;
DO $$ BEGIN
  IF (SELECT job_posts_limit FROM public.company_subscriptions
      WHERE company_id='11000000-0000-0000-0000-000000000001') <> 1
  THEN RAISE EXCEPTION 'Tenant owner changed their own quota'; END IF;
END $$;
ROLLBACK;
