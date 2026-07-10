-- ============================================================
-- AUTO-PROVISION FREE SUBSCRIPTION FOR NEW TENANTS
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_company_subscription()
RETURNS TRIGGER AS $$
DECLARE
  free_plan_id uuid;
  free_plan_limit integer;
BEGIN
  -- 1) Try to find the 'free' plan
  SELECT id, job_posts_limit INTO free_plan_id, free_plan_limit 
  FROM public.subscription_plans 
  WHERE name = 'free' 
  LIMIT 1;

  -- 2) Fallback to any active plan if 'free' is not defined
  IF free_plan_id IS NULL THEN
    SELECT id, job_posts_limit INTO free_plan_id, free_plan_limit 
    FROM public.subscription_plans 
    WHERE is_active = true 
    ORDER BY price ASC 
    LIMIT 1;
  END IF;

  -- 3) Insert default subscription for the company
  IF free_plan_id IS NOT NULL AND NEW.owner_user_id IS NOT NULL THEN
    INSERT INTO public.company_subscriptions (user_id, company_id, plan_id, job_posts_limit, status)
    VALUES (NEW.owner_user_id, NEW.id, free_plan_id, COALESCE(free_plan_limit, 2), 'active')
    ON CONFLICT (company_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger
DROP TRIGGER IF EXISTS trg_on_company_created ON public.companies;
CREATE TRIGGER trg_on_company_created
AFTER INSERT ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.handle_new_company_subscription();
