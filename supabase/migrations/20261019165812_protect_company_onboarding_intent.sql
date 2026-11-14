-- A registration intent is created once, by the auth.users INSERT trigger.
-- Users cannot renew it by editing their user_metadata or profiles later.
CREATE TABLE tenant_internal.company_signup_intents (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz
);
ALTER TABLE tenant_internal.company_signup_intents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON tenant_internal.company_signup_intents FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION tenant_internal.record_company_signup_intent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF NEW.raw_user_meta_data->>'account_type' = 'company' THEN
    INSERT INTO tenant_internal.company_signup_intents (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION tenant_internal.record_company_signup_intent() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_record_company_signup_intent
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION tenant_internal.record_company_signup_intent();

-- Once the account has a company membership, onboarding must never recreate
-- a company even if that membership is subsequently revoked or deleted.
CREATE OR REPLACE FUNCTION tenant_internal.consume_company_signup_intent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  UPDATE tenant_internal.company_signup_intents
  SET consumed_at = now()
  WHERE user_id = NEW.user_id AND consumed_at IS NULL;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION tenant_internal.consume_company_signup_intent() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_consume_company_signup_intent
  AFTER INSERT ON public.company_members
  FOR EACH ROW EXECUTE FUNCTION tenant_internal.consume_company_signup_intent();

-- Keep the old profile trigger attachment. Replace its body with a one-time,
-- signed-in registration check; profile text alone is not an authorization.
CREATE OR REPLACE FUNCTION public.handle_profile_company_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  _consumed_at timestamptz;
  _company_id uuid;
BEGIN
  IF (SELECT auth.uid()) IS DISTINCT FROM NEW.user_id
     OR NEW.company_name IS NULL OR trim(NEW.company_name) = '' THEN
    RETURN NEW;
  END IF;

  SELECT consumed_at INTO _consumed_at
  FROM tenant_internal.company_signup_intents
  WHERE user_id = NEW.user_id
  FOR UPDATE;

  IF NOT FOUND OR _consumed_at IS NOT NULL OR EXISTS (
    SELECT 1 FROM public.company_members WHERE user_id = NEW.user_id
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.companies (name, logo_url, contact_email, owner_user_id, status)
  VALUES (
    trim(NEW.company_name), NEW.company_logo,
    (SELECT email FROM auth.users WHERE id = NEW.user_id),
    NEW.user_id, 'active'
  ) RETURNING id INTO _company_id;

  INSERT INTO public.company_members (company_id, user_id, member_role)
  VALUES (_company_id, NEW.user_id, 'owner');
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.handle_profile_company_creation() FROM PUBLIC, anon, authenticated;

-- Returns only the caller's own pending state. It never grants tenant data
-- access; the normal membership-based policies remain in force.
CREATE OR REPLACE FUNCTION public.can_complete_company_onboarding()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM tenant_internal.company_signup_intents AS i
      WHERE i.user_id = (SELECT auth.uid()) AND i.consumed_at IS NULL
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.company_members AS m
      WHERE m.user_id = (SELECT auth.uid())
    );
$$;
REVOKE ALL ON FUNCTION public.can_complete_company_onboarding() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_complete_company_onboarding() TO authenticated;
