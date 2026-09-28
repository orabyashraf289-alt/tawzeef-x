-- Fix is_super_admin function to avoid querying auth.users table inside RLS policies
-- Eliminates "Database error querying schema" globally across all tables

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF _user_id IS NULL THEN
    RETURN false;
  END IF;

  -- 1. Check JWT claims if checking current session user
  IF _user_id = auth.uid() THEN
    IF (auth.jwt() ->> 'email') IN ('tx@tawzeefx.com', 'ctraining801@gmail.com')
       OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('super_admin', 'admin') THEN
      RETURN true;
    END IF;
  END IF;

  -- 2. Check public.user_roles or public.profiles without querying auth.users
  IF EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.role = 'admin'::app_role
  ) OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _user_id AND p.role IN ('admin', 'super_admin')
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;
