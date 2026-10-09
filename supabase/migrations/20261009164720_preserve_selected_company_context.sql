-- Keep explicit tenant context. The previous helper overwrote it with an
-- arbitrary first membership, including when users switched companies.
-- Existing rows and RLS policies are unchanged.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

CREATE OR REPLACE FUNCTION public.set_row_company_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _company_id uuid;
  _job_id uuid;
  _company_count integer;
BEGIN
  -- Assignment is not authorization: the table's RLS policies still validate
  -- an explicitly supplied company after BEFORE INSERT triggers finish.
  IF NEW.company_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME IN ('applications', 'candidates') THEN
    _job_id := (to_jsonb(NEW)->>'job_id')::uuid;
    IF _job_id IS NOT NULL THEN
      SELECT j.company_id INTO _company_id FROM public.jobs j WHERE j.id = _job_id;
    END IF;
  END IF;

  IF _company_id IS NULL AND auth.uid() IS NOT NULL THEN
    SELECT count(DISTINCT m.company_id), (array_agg(DISTINCT m.company_id))[1]
      INTO _company_count, _company_id
    FROM public.company_members m
    WHERE m.user_id = auth.uid();
    IF _company_count > 1 THEN
      RAISE EXCEPTION 'company_context_required' USING ERRCODE = '23514';
    END IF;
  END IF;

  -- Preserve existing no-context behavior for anonymous/server workflows;
  -- their table constraints and policies decide whether NULL is permitted.
  NEW.company_id := _company_id;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_row_company_id() FROM PUBLIC, anon, authenticated;
