-- Update increment_job_posts_used to resolve parent company subscriptions (for branches support)
CREATE OR REPLACE FUNCTION public.increment_job_posts_used(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _company_id uuid;
  _parent_id uuid;
BEGIN
  -- Get the company_id for the user
  SELECT company_id INTO _company_id FROM public.company_members WHERE user_id = _user_id LIMIT 1;
  
  IF _company_id IS NOT NULL THEN
    -- Check if it has a parent company (it is a branch)
    SELECT parent_company_id INTO _parent_id FROM public.companies WHERE id = _company_id LIMIT 1;
    
    -- If it has a parent, update parent's subscription. Otherwise, update company's subscription.
    IF _parent_id IS NOT NULL THEN
      UPDATE public.company_subscriptions
      SET job_posts_used = job_posts_used + 1, updated_at = now()
      WHERE company_id = _parent_id;
    ELSE
      UPDATE public.company_subscriptions
      SET job_posts_used = job_posts_used + 1, updated_at = now()
      WHERE company_id = _company_id;
    END IF;
  END IF;
END;
$$;
