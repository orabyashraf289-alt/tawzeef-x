
-- ============================================================
-- FIX job_offers: Token-based access using RPC approach
-- ============================================================

-- 1. Drop the current policies that are too permissive
DROP POLICY IF EXISTS "Public can view offers by token" ON public.job_offers;
DROP POLICY IF EXISTS "Public can respond to offers" ON public.job_offers;

-- 2. Create a security definer function to fetch offer by token (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_offer_by_token(_token text)
RETURNS SETOF public.job_offers
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.job_offers WHERE token = _token LIMIT 1;
$$;

-- 3. Create a security definer function to respond to offer by token
CREATE OR REPLACE FUNCTION public.respond_to_offer(
  _token text,
  _status text,
  _response_notes text DEFAULT NULL,
  _signature_url text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _offer RECORD;
BEGIN
  -- Validate status
  IF _status NOT IN ('viewed', 'accepted', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status: %', _status;
  END IF;

  -- Find the offer by token
  SELECT * INTO _offer FROM public.job_offers WHERE token = _token;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Offer not found';
  END IF;

  -- Only allow responding to sent or viewed offers
  IF _offer.status NOT IN ('sent', 'viewed') THEN
    RAISE EXCEPTION 'Offer cannot be modified in current status: %', _offer.status;
  END IF;

  -- Update the offer
  UPDATE public.job_offers
  SET 
    status = _status,
    response_notes = COALESCE(_response_notes, response_notes),
    signature_url = COALESCE(_signature_url, signature_url),
    response_date = CASE WHEN _status IN ('accepted', 'rejected') THEN now() ELSE response_date END,
    updated_at = now()
  WHERE token = _token;

  RETURN true;
END;
$$;

-- 4. Owner-only SELECT policy (owners see their own offers)
-- The "Users can manage own offers" ALL policy already covers this

-- 5. Grant execute to anon and authenticated for the RPC functions
GRANT EXECUTE ON FUNCTION public.get_offer_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_offer(text, text, text, text) TO anon, authenticated;
