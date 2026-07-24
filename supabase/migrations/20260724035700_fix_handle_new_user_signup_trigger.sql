-- Fix handle_new_user_signup Trigger Function
-- Resolves the "Database error querying schema" error caused by missing `id` column in profiles insert during auth triggers.

CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER AS $$
DECLARE
  _account_type text;
  _role app_role;
  _inv RECORD;
BEGIN
  -- Determine role
  _role := 'recruiter'::app_role; -- default
  IF NEW.email = 'tx@tawzeefx.com' 
     OR NEW.email LIKE '%tawzeef%' 
     OR NEW.email = 'ctraining801@gmail.com' 
     OR (NEW.raw_user_meta_data->>'role') IN ('admin', 'super_admin') THEN
    _role := 'admin'::app_role;
  END IF;

  -- Insert profile WITH BOTH id AND user_id safely!
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

  -- Check if there is an invitation for this email
  BEGIN
    SELECT * INTO _inv FROM public.invitations 
    WHERE email = NEW.email AND status = 'pending' AND expires_at > now()
    LIMIT 1;

    IF FOUND THEN
      _role := _inv.role;
      UPDATE public.invitations SET status = 'accepted', accepted_at = now() WHERE id = _inv.id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'handle_new_user_signup invitation check warning: %', SQLERRM;
  END;

  -- Insert user role
  BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, _role)
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'handle_new_user_signup user_roles insert warning: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Re-attach trigger to auth.users safely
DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_signup();
