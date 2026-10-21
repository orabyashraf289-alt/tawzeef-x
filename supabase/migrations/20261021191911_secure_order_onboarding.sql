-- A random capability link exposes only the employee-facing summary. The order UUID
-- and company data remain protected by the existing owner-only RLS policies.
ALTER TABLE public.converted_orders
  ADD COLUMN onboarding_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  ADD COLUMN onboarding_acknowledged_at timestamptz,
  ADD COLUMN onboarding_signature text;

CREATE FUNCTION public.guard_order_onboarding_token()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.onboarding_token := gen_random_uuid();
  ELSIF NEW.onboarding_token IS DISTINCT FROM OLD.onboarding_token THEN
    RAISE EXCEPTION 'Order onboarding link cannot be changed';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_order_onboarding_token() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER guard_order_onboarding_token_before_write
  BEFORE INSERT OR UPDATE ON public.converted_orders
  FOR EACH ROW EXECUTE FUNCTION public.guard_order_onboarding_token();

CREATE FUNCTION public.get_order_onboarding(_token uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT jsonb_build_object(
    'order_number', o.order_number,
    'candidate_name', o.candidate_name,
    'job_title', o.job_title,
    'company_name', o.company_name,
    'target_branch', o.target_branch,
    'joining_date', o.joining_date,
    'total_salary', o.total_salary,
    'currency', o.currency,
    'status', o.status,
    'onboarding_acknowledged_at', o.onboarding_acknowledged_at
  )
  FROM public.converted_orders o
  JOIN public.companies c ON c.id = o.company_id AND c.status = 'active'
  WHERE o.onboarding_token = _token
    AND o.order_type = 'direct_hire'
    AND o.candidate_id IS NOT NULL
    AND o.status NOT IN ('draft', 'cancelled')
    AND (c.parent_company_id IS NULL OR EXISTS (
      SELECT 1 FROM public.companies p
      WHERE p.id = c.parent_company_id AND p.status = 'active'));
$$;
REVOKE ALL ON FUNCTION public.get_order_onboarding(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_onboarding(uuid) TO anon, authenticated;

-- A signature acknowledges receipt only. HR reviews documents and changes the
-- employment status separately. Repeated submissions cannot replace the evidence.
CREATE FUNCTION public.acknowledge_order_onboarding(_token uuid, _signature text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF _signature IS NULL OR length(_signature) < 100 OR length(_signature) > 200000
     OR _signature !~ '^data:image/png;base64,iVBORw0KGgo[A-Za-z0-9+/]+={0,2}$' THEN
    RAISE EXCEPTION 'A valid drawn signature is required';
  END IF;

  UPDATE public.converted_orders o
  SET onboarding_signature = _signature, onboarding_acknowledged_at = now()
  FROM public.companies c
  WHERE o.onboarding_token = _token
    AND c.id = o.company_id AND c.status = 'active'
    AND (c.parent_company_id IS NULL OR EXISTS (
      SELECT 1 FROM public.companies p
      WHERE p.id = c.parent_company_id AND p.status = 'active'))
    AND o.order_type = 'direct_hire' AND o.candidate_id IS NOT NULL
    AND o.status NOT IN ('draft', 'cancelled', 'completed')
    AND o.onboarding_acknowledged_at IS NULL;

  RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.acknowledge_order_onboarding(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acknowledge_order_onboarding(uuid, text) TO anon, authenticated;
