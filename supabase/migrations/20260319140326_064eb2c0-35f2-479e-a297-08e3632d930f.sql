
-- Allow job seekers to view their own applications by matching email
CREATE POLICY "Applicants can view own applications"
ON public.applications FOR SELECT
TO authenticated
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Allow job seekers to view their own candidate records by matching email
CREATE POLICY "Job seekers can view own candidate records"
ON public.candidates FOR SELECT
TO authenticated
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Allow job seekers to view their own interviews via candidate records
CREATE POLICY "Job seekers can view own interviews"
ON public.interviews FOR SELECT
TO authenticated
USING (candidate_id IN (
  SELECT id FROM public.candidates 
  WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
));
