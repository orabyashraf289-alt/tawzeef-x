-- Fix security leak: restrict "Anyone can view active jobs" policy to non-company users (candidates/anonymous) or own-company members
DROP POLICY IF EXISTS "Anyone can view active jobs" ON public.jobs;

CREATE POLICY "Anyone can view active jobs" ON public.jobs
  FOR SELECT
  TO public
  USING (
    -- 1) If the user is NOT authenticated (anonymous visitor on public careers page)
    (auth.uid() IS NULL AND status = 'نشطة') OR
    
    -- 2) If the user is a Job Seeker (authenticated candidate looking at active jobs)
    (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'job_seeker'::app_role) AND status = 'نشطة') OR
    
    -- 3) If the user is a Super Admin
    (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::app_role)) OR
    
    -- 4) If the user is a member of the company that owns the job (recruiter/reviewer/owner)
    (auth.uid() IS NOT NULL AND company_id IS NOT NULL AND public.has_company_access(company_id))
  );
