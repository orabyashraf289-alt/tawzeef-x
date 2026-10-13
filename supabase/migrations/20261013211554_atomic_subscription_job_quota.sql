-- Provision only independent tenant companies. Branches share their parent's
-- subscription; the platform company is not a billable tenant.
CREATE OR REPLACE FUNCTION public.handle_new_company_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _plan_id uuid;
  _limit integer;
BEGIN
  IF NEW.parent_company_id IS NOT NULL
     OR COALESCE(NEW.is_platform_company, false)
     OR NEW.owner_user_id IS NULL
     OR NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.company_subscriptions WHERE company_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  SELECT id, job_posts_limit INTO _plan_id, _limit
  FROM public.subscription_plans
  WHERE name = 'free' AND price = 0 AND is_active = true
  ORDER BY created_at, id
  LIMIT 1;
  IF _plan_id IS NULL THEN
    RAISE EXCEPTION 'free_subscription_plan_unavailable' USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.company_subscriptions
    (company_id, user_id, plan_id, job_posts_limit, status)
  VALUES (NEW.id, NEW.owner_user_id, _plan_id, _limit, 'active')
  ON CONFLICT (company_id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_company_subscription() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_on_company_created ON public.companies;
CREATE TRIGGER trg_on_company_created
AFTER INSERT ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.handle_new_company_subscription();
CREATE TRIGGER trg_on_company_owner_assigned
AFTER UPDATE OF owner_user_id ON public.companies
FOR EACH ROW
WHEN (OLD.owner_user_id IS NULL AND NEW.owner_user_id IS NOT NULL)
EXECUTE FUNCTION public.handle_new_company_subscription();

-- The only client-side subscription writes should come from a platform super
-- admin. Company owners can read billing state and request an upgrade, but
-- cannot assign themselves a paid plan or reset a job counter.
DROP POLICY IF EXISTS "Company owners update own subscription" ON public.company_subscriptions;
DROP POLICY IF EXISTS "System can insert company subscriptions" ON public.company_subscriptions;

-- The preceding company-context trigger fills and validates NEW.company_id.
-- Trigger names run alphabetically, so this one always runs after it. Updating
-- the counter here is part of the job INSERT transaction and rolls back with it.
CREATE OR REPLACE FUNCTION public.enforce_job_subscription_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _billing_company_id uuid;
BEGIN
  SELECT COALESCE(c.parent_company_id, c.id)
    INTO _billing_company_id
  FROM public.companies AS c
  WHERE c.id = NEW.company_id AND c.status = 'active';

  IF _billing_company_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.companies AS c
    WHERE c.id = _billing_company_id AND c.status = 'active'
  ) THEN
    RAISE EXCEPTION 'company_context_required' USING ERRCODE = '23514';
  END IF;

  UPDATE public.company_subscriptions AS s
  SET job_posts_used = s.job_posts_used + 1,
      updated_at = now()
  WHERE s.company_id = _billing_company_id
    AND s.status = 'active'
    AND s.starts_at <= now()
    AND (s.expires_at IS NULL OR s.expires_at > now())
    AND (s.job_posts_limit = -1 OR s.job_posts_used < s.job_posts_limit);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'subscription_limit_reached' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_job_subscription_quota() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_z_enforce_job_subscription_quota ON public.jobs;
CREATE TRIGGER trg_z_enforce_job_subscription_quota
BEFORE INSERT ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.enforce_job_subscription_quota();

-- The old user-only RPC cannot identify which company owns the new job.
REVOKE ALL ON FUNCTION public.increment_job_posts_used(uuid) FROM PUBLIC, anon, authenticated;
