-- Allow anonymous public portal visitors to look up candidate and application status using tracking_code
DROP POLICY IF EXISTS "Public tracking code lookup candidates" ON public.candidates;
CREATE POLICY "Public tracking code lookup candidates" ON public.candidates
  FOR SELECT TO public
  USING (tracking_code IS NOT NULL);

DROP POLICY IF EXISTS "Public tracking code lookup applications" ON public.applications;
CREATE POLICY "Public tracking code lookup applications" ON public.applications
  FOR SELECT TO public
  USING (tracking_code IS NOT NULL);
