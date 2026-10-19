-- Run on a disposable database after protect_company_onboarding_intent.
BEGIN;

-- Exercise the actual auth INSERT and profile UPDATE triggers together.
INSERT INTO auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
VALUES (
  '42000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'signup-intent@example.test',
  '{"account_type":"company"}'::jsonb
);
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM tenant_internal.company_signup_intents
    WHERE user_id = '42000000-0000-0000-0000-000000000001'
      AND consumed_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Company registration did not create an intent';
  END IF;
  IF has_table_privilege('authenticated', 'tenant_internal.company_signup_intents', 'INSERT')
    OR has_table_privilege('authenticated', 'tenant_internal.company_signup_intents', 'UPDATE')
    OR has_function_privilege('anon', 'public.can_complete_company_onboarding()', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.handle_profile_company_creation()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Private signup intent can be changed or spoofed by clients';
  END IF;
END $$;

SELECT set_config('request.jwt.claim.sub', '42000000-0000-0000-0000-000000000001', true);
SET LOCAL ROLE authenticated;

DO $$ BEGIN
  IF public.can_complete_company_onboarding() IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Pending signup cannot complete onboarding';
  END IF;
END $$;

UPDATE public.profiles SET company_name = 'Signup test company'
WHERE user_id = '42000000-0000-0000-0000-000000000001';

DO $$ BEGIN
  IF public.can_complete_company_onboarding() IS DISTINCT FROM false
    OR (SELECT count(*) FROM public.company_members
        WHERE user_id = '42000000-0000-0000-0000-000000000001') <> 1 THEN
    RAISE EXCEPTION 'Company membership did not consume signup intent';
  END IF;
END $$;

RESET ROLE;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM tenant_internal.company_signup_intents
    WHERE user_id = '42000000-0000-0000-0000-000000000001'
      AND consumed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Signup intent was not consumed';
  END IF;
END $$;

-- Simulate later removal from a company. The consumed intent must remain.
DELETE FROM public.company_members
WHERE user_id = '42000000-0000-0000-0000-000000000001';
SET LOCAL ROLE authenticated;
UPDATE public.profiles SET company_name = 'Attempted second company'
WHERE user_id = '42000000-0000-0000-0000-000000000001';

DO $$ BEGIN
  IF public.can_complete_company_onboarding() IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'Removed user regained an onboarding intent';
  END IF;
  BEGIN
    INSERT INTO public.companies (name, owner_user_id)
    VALUES ('Forged replacement company', '42000000-0000-0000-0000-000000000001');
    RAISE EXCEPTION 'Removed user created a replacement company';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

RESET ROLE;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.companies
      WHERE owner_user_id = '42000000-0000-0000-0000-000000000001') <> 1 THEN
    RAISE EXCEPTION 'Profile update created another company after removal';
  END IF;
END $$;

ROLLBACK;
