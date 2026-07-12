-- 1) Update unified signup trigger function to handle job_seeker account type correctly
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER AS $$
DECLARE
  _account_type text;
  _role app_role;
  _inv RECORD;
BEGIN
  _account_type := NEW.raw_user_meta_data->>'account_type';

  -- Determine role
  IF NEW.email = 'ctraining801@gmail.com' THEN
    _role := 'admin'::app_role;
  ELSIF _account_type = 'job_seeker' THEN
    _role := 'job_seeker'::app_role;
  ELSE
    _role := 'recruiter'::app_role;
  END IF;

  -- Check if there is an invitation for this email
  SELECT * INTO _inv FROM public.invitations 
  WHERE email = NEW.email AND status = 'pending' AND expires_at > now()
  LIMIT 1;

  IF FOUND THEN
    _role := _inv.role;
    -- Mark invitation as accepted
    UPDATE public.invitations SET status = 'accepted', accepted_at = now() WHERE id = _inv.id;
  END IF;

  -- Insert profile
  INSERT INTO public.profiles (user_id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    _role::text
  ) ON CONFLICT (user_id) DO UPDATE
  SET role = EXCLUDED.role;

  -- Insert user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Seed default pipeline stages if not a job seeker
  IF _account_type IS DISTINCT FROM 'job_seeker' THEN
    INSERT INTO public.pipeline_stages (user_id, name, sort_order, color, icon, is_default) VALUES
      (NEW.id, 'تقديم الطلب', 0, '#6366f1', 'file-text', true),
      (NEW.id, 'مراجعة السيرة', 1, '#8b5cf6', 'file-search', true),
      (NEW.id, 'فحص هاتفي', 2, '#0ea5e9', 'phone', true),
      (NEW.id, 'مقابلة تقنية', 3, '#f59e0b', 'code', true),
      (NEW.id, 'مقابلة نهائية', 4, '#10b981', 'users', true),
      (NEW.id, 'العرض الوظيفي', 5, '#059669', 'briefcase', true)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2) Backfill profiles and user_roles for any existing auth.users
-- Insert/Update profiles
INSERT INTO public.profiles (user_id, full_name, role)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'full_name', email),
  CASE 
    WHEN email = 'ctraining801@gmail.com' THEN 'admin'
    WHEN raw_user_meta_data->>'account_type' = 'job_seeker' THEN 'job_seeker'
    ELSE 'recruiter'
  END
FROM auth.users
ON CONFLICT (user_id) DO UPDATE
SET role = EXCLUDED.role;

-- Insert user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT 
  id,
  CASE 
    WHEN email = 'ctraining801@gmail.com' THEN 'admin'::app_role
    WHEN raw_user_meta_data->>'account_type' = 'job_seeker' THEN 'job_seeker'::app_role
    ELSE 'recruiter'::app_role
  END
FROM auth.users
ON CONFLICT (user_id, role) DO NOTHING;
