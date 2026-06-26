
-- ============================================================
-- Trigger: Auto-fill audit_log fields (user_email from auth)
-- ============================================================
CREATE OR REPLACE FUNCTION public.audit_log_auto_fill()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auto-fill user_id from auth context if not set
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;

  -- Always override user_email from JWT to prevent spoofing
  NEW.user_email := COALESCE(
    (auth.jwt() ->> 'email')::text,
    NEW.user_email
  );

  -- ip_address cannot be reliably obtained server-side in Supabase,
  -- so we keep client-provided value but mark it as unverified if empty
  IF NEW.ip_address IS NULL OR NEW.ip_address = '' THEN
    NEW.ip_address := 'unknown';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_log_auto_fill
BEFORE INSERT ON public.audit_log
FOR EACH ROW
EXECUTE FUNCTION public.audit_log_auto_fill();

-- ============================================================
-- Trigger: Auto-fill activity_log fields (user_name from profile)
-- ============================================================
CREATE OR REPLACE FUNCTION public.activity_log_auto_fill()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _profile RECORD;
BEGIN
  -- Auto-fill user_id from auth context if not set
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;

  -- Always override user_name from profiles table to prevent spoofing
  SELECT full_name INTO _profile
  FROM public.profiles
  WHERE user_id = NEW.user_id
  LIMIT 1;

  IF FOUND AND _profile.full_name IS NOT NULL THEN
    NEW.user_name := _profile.full_name;
  ELSE
    -- Fallback to email from JWT
    NEW.user_name := COALESCE(
      (auth.jwt() ->> 'email')::text,
      NEW.user_name,
      'مستخدم غير معروف'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_activity_log_auto_fill
BEFORE INSERT ON public.activity_log
FOR EACH ROW
EXECUTE FUNCTION public.activity_log_auto_fill();
