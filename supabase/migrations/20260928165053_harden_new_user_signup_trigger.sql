-- A signup supplies raw_user_meta_data and can choose its email text.
-- Neither may assign an administrative database role. This replaces the live
-- trigger function without changing any existing Auth, profile, or candidate row.
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _role public.app_role;
BEGIN
  IF NEW.raw_user_meta_data->>'account_type' = 'job_seeker' THEN
    _role := 'job_seeker'::public.app_role;
  ELSE
    _role := 'recruiter'::public.app_role;
  END IF;

  BEGIN
    INSERT INTO public.profiles (id, user_id, full_name, role, updated_at)
    VALUES (
      NEW.id,
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      _role::text,
      now()
    ) ON CONFLICT (id) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      role = EXCLUDED.role,
      updated_at = now();
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'handle_new_user_signup profile insert warning: %', SQLERRM;
  END;

  BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, _role)
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'handle_new_user_signup user_roles insert warning: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;
