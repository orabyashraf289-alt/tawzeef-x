
CREATE OR REPLACE FUNCTION public.increment_job_posts_used(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.company_subscriptions
  SET job_posts_used = job_posts_used + 1, updated_at = now()
  WHERE user_id = _user_id;
END;
$$;
