-- Function to increment open count (called by tracking pixel endpoint)
CREATE OR REPLACE FUNCTION public.increment_email_open_count(_tracking_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.email_tracking
  SET 
    opened_count = opened_count + 1,
    opened_at = COALESCE(opened_at, now())
  WHERE tracking_id = _tracking_id;
END;
$$;

-- Allow anon to call this function (tracking pixel has no auth)
GRANT EXECUTE ON FUNCTION public.increment_email_open_count(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_email_open_count(UUID) TO authenticated;