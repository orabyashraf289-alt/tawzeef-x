-- Ensure candidate_scorecards table exists and accessible for all authenticated users
CREATE TABLE IF NOT EXISTS public.candidate_scorecards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewer_name text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT candidate_scorecards_candidate_reviewer_key UNIQUE (candidate_id, reviewer_id)
);

ALTER TABLE public.candidate_scorecards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users access scorecards" ON public.candidate_scorecards;
CREATE POLICY "Authenticated users access scorecards" ON public.candidate_scorecards
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
