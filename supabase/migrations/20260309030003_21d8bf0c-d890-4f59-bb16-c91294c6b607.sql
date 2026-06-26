
ALTER TABLE public.candidates
ADD COLUMN tracking_code text DEFAULT NULL UNIQUE;

-- Generate tracking codes for existing candidates
UPDATE public.candidates
SET tracking_code = UPPER(SUBSTR(md5(random()::text || id::text), 1, 8))
WHERE tracking_code IS NULL;

-- Create trigger to auto-generate tracking code for new candidates
CREATE OR REPLACE FUNCTION public.generate_tracking_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.tracking_code IS NULL THEN
    NEW.tracking_code := UPPER(SUBSTR(md5(random()::text || NEW.id::text), 1, 8));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_tracking_code
  BEFORE INSERT ON public.candidates
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_tracking_code();
