
-- Fix candidates RLS: replace auth.users reference with auth.jwt()
DROP POLICY IF EXISTS "Job seekers can view own candidate records" ON public.candidates;
CREATE POLICY "Job seekers can view own candidate records"
  ON public.candidates
  FOR SELECT
  TO authenticated
  USING (email = (auth.jwt() ->> 'email')::text);

-- Fix interviews RLS: replace auth.users subquery with auth.jwt()
DROP POLICY IF EXISTS "Job seekers can view own interviews" ON public.interviews;
CREATE POLICY "Job seekers can view own interviews"
  ON public.interviews
  FOR SELECT
  TO authenticated
  USING (candidate_id IN (
    SELECT c.id FROM public.candidates c
    WHERE c.email = (auth.jwt() ->> 'email')::text
  ));
