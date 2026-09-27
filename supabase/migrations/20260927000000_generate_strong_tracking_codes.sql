-- The existing candidate trigger and application-to-candidate trigger still
-- generated short, guessable codes when a caller omitted tracking_code.
-- Generate the same 128-bit code on the application before its AFTER INSERT
-- trigger copies it to candidates. Keep valid client-generated codes intact.
CREATE OR REPLACE FUNCTION public.generate_tracking_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.tracking_code IS NULL OR NEW.tracking_code !~* '^TX-[0-9a-f]{32}$' THEN
    NEW.tracking_code := 'TX-' || upper(replace(gen_random_uuid()::text, '-', ''));
  ELSE
    NEW.tracking_code := upper(NEW.tracking_code);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_tracking_code ON public.candidates;
CREATE TRIGGER set_tracking_code
  BEFORE INSERT ON public.candidates
  FOR EACH ROW EXECUTE FUNCTION public.generate_tracking_code();

CREATE OR REPLACE FUNCTION public.set_application_tracking_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.tracking_code IS NULL OR NEW.tracking_code !~* '^TX-[0-9a-f]{32}$' THEN
    NEW.tracking_code := 'TX-' || upper(replace(gen_random_uuid()::text, '-', ''));
  ELSE
    NEW.tracking_code := upper(NEW.tracking_code);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_application_tracking_code ON public.applications;
CREATE TRIGGER set_application_tracking_code
  BEFORE INSERT ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.set_application_tracking_code();
