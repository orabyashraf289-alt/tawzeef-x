-- Registration requests confer no company membership or tenant data access.
CREATE TABLE public.company_registration_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name text NOT NULL CHECK (length(trim(company_name)) BETWEEN 1 AND 200),
  contact_email text NOT NULL,
  logo_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  review_note text CHECK (length(review_note) <= 1000),
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL
);
ALTER TABLE public.company_registration_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.company_registration_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.company_registration_requests TO authenticated;
GRANT ALL ON public.company_registration_requests TO service_role;
CREATE POLICY "Read own registration or platform review queue"
  ON public.company_registration_requests FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_super_admin((SELECT auth.uid())));

CREATE OR REPLACE FUNCTION public.handle_profile_company_creation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
DECLARE _consumed_at timestamptz;
BEGIN
  IF (SELECT auth.uid()) IS DISTINCT FROM NEW.user_id
     OR nullif(trim(NEW.company_name),'') IS NULL THEN RETURN NEW; END IF;
  SELECT consumed_at INTO _consumed_at
  FROM tenant_internal.company_signup_intents WHERE user_id = NEW.user_id FOR UPDATE;
  IF NOT FOUND OR _consumed_at IS NOT NULL OR EXISTS (
    SELECT 1 FROM public.company_members WHERE user_id = NEW.user_id
  ) THEN RETURN NEW; END IF;
  INSERT INTO public.company_registration_requests(user_id, company_name, contact_email, logo_url)
  VALUES (NEW.user_id, trim(NEW.company_name),
    (SELECT email FROM auth.users WHERE id = NEW.user_id), NEW.company_logo);
  UPDATE tenant_internal.company_signup_intents SET consumed_at = now() WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.handle_profile_company_creation() FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.get_my_company_registration()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
  SELECT jsonb_build_object('id', id, 'company_name', company_name, 'status', status,
    'created_at', created_at, 'reviewed_at', reviewed_at, 'review_note', review_note)
  FROM public.company_registration_requests WHERE user_id = (SELECT auth.uid());
$$;
REVOKE ALL ON FUNCTION public.get_my_company_registration() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_company_registration() TO authenticated;

CREATE FUNCTION public.review_company_registration(_request_id uuid, _decision text, _note text DEFAULT '')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
DECLARE _request public.company_registration_requests%ROWTYPE; _company_id uuid;
BEGIN
  IF NOT coalesce(public.is_super_admin((SELECT auth.uid())), false) THEN
    RAISE EXCEPTION 'Platform administrator required' USING ERRCODE = '42501';
  END IF;
  IF _decision IS NULL OR _decision NOT IN ('approved','rejected')
     OR length(coalesce(_note,'')) > 1000
     OR (_decision = 'rejected' AND nullif(trim(_note),'') IS NULL) THEN
    RAISE EXCEPTION 'Invalid review decision or reason';
  END IF;
  SELECT * INTO _request FROM public.company_registration_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND OR _request.status <> 'pending' THEN RAISE EXCEPTION 'Request is no longer pending'; END IF;
  IF _decision = 'approved' THEN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _request.user_id AND email_confirmed_at IS NOT NULL) THEN
      RAISE EXCEPTION 'Applicant must verify their email first';
    END IF;
    IF EXISTS (SELECT 1 FROM public.company_members WHERE user_id = _request.user_id) THEN
      RAISE EXCEPTION 'Account already belongs to a company';
    END IF;
    INSERT INTO public.companies(name, logo_url, contact_email, owner_user_id, status)
    VALUES (_request.company_name, _request.logo_url, _request.contact_email, _request.user_id, 'active')
    RETURNING id INTO _company_id;
    INSERT INTO public.company_members(company_id, user_id, member_role)
    VALUES (_company_id, _request.user_id, 'owner');
  END IF;
  UPDATE public.company_registration_requests SET status = _decision,
    reviewed_at = now(), reviewed_by = (SELECT auth.uid()), review_note = nullif(trim(_note),''),
    company_id = _company_id WHERE id = _request_id;
  RETURN _company_id;
END;
$$;
REVOKE ALL ON FUNCTION public.review_company_registration(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_company_registration(uuid,text,text) TO authenticated;
