
-- Fix 1: applications table - restrict INSERT to only allow via anon (public form) but require job_id to exist
-- The current "Anyone can submit applications" WITH CHECK (true) is intentional for public job application forms
-- But we should at least validate the job exists and is active
DROP POLICY IF EXISTS "Anyone can submit applications" ON public.applications;
CREATE POLICY "Anyone can submit applications" ON public.applications
  FOR INSERT TO public
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.jobs WHERE id = job_id AND status = 'نشطة')
  );

-- Fix 2: linkedin_deliveries - restrict INSERT to service role only (edge functions use service key)
-- Change from WITH CHECK (true) to requiring user_id match
DROP POLICY IF EXISTS "Service can insert linkedin deliveries" ON public.linkedin_deliveries;
CREATE POLICY "Service can insert linkedin deliveries" ON public.linkedin_deliveries
  FOR INSERT TO public
  WITH CHECK (auth.uid() = user_id);
