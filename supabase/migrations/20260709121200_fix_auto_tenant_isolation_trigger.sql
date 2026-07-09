-- Fix set_row_company_id trigger function to avoid accessing NEW.job_id on tables without a job_id column
CREATE OR REPLACE FUNCTION public.set_row_company_id()
RETURNS TRIGGER AS $$
DECLARE
  _company_id uuid;
BEGIN
  -- 1) Try to get company_id from the current user's membership
  IF auth.uid() IS NOT NULL THEN
    SELECT company_id INTO _company_id 
    FROM public.company_members 
    WHERE user_id = auth.uid() 
    LIMIT 1;
  END IF;

  -- 2) If company_id is still null and we have a job_id (e.g. applications/candidates applying to a job), get it from the job
  IF _company_id IS NULL AND TG_TABLE_NAME IN ('applications', 'candidates') THEN
    IF NEW.job_id IS NOT NULL THEN
      SELECT company_id INTO _company_id 
      FROM public.jobs 
      WHERE id = NEW.job_id;
    END IF;
  END IF;

  -- 3) Apply the resolved company_id
  IF _company_id IS NOT NULL THEN
    NEW.company_id := _company_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
