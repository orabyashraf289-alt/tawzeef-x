-- Platform branches share their platform parent's subscription and job quota.
-- Independent companies continue to receive their own subscription.
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

-- The platform parent already in production predates provisioning. Do not
-- replace or reset any existing plan, counter, status, or invoice.
DO $$
DECLARE
  _plan_id uuid;
  _limit integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.companies AS c
    WHERE c.parent_company_id IS NULL
      AND c.is_platform_company = true
      AND c.status = 'active'
      AND c.owner_user_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.company_subscriptions AS s WHERE s.company_id = c.id)
  ) THEN
    RETURN;
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
  SELECT c.id, c.owner_user_id, _plan_id, _limit, 'active'
  FROM public.companies AS c
  WHERE c.parent_company_id IS NULL
    AND c.is_platform_company = true
    AND c.status = 'active'
    AND c.owner_user_id IS NOT NULL
  ON CONFLICT (company_id) DO NOTHING;
END;
$$;
