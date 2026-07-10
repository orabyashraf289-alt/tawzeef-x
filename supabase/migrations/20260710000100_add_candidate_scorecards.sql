-- ============================================================
-- CREATE CANDIDATE SCORECARDS TABLE FOR TEAM RATINGS
-- ============================================================

CREATE TABLE public.candidate_scorecards (
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

CREATE POLICY "Users can view scorecards of accessible candidates" ON public.candidate_scorecards
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.candidates c
      WHERE c.id = candidate_scorecards.candidate_id
        AND (
          c.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.company_members cm
            WHERE cm.company_id = c.company_id
              AND cm.user_id = auth.uid()
          ) OR EXISTS (
            SELECT 1 FROM public.companies parent_c
            JOIN public.company_members cm ON parent_c.parent_company_id = cm.company_id
            WHERE parent_c.id = c.company_id
              AND cm.user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "Users can manage scorecards of accessible candidates" ON public.candidate_scorecards
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.candidates c
      WHERE c.id = candidate_scorecards.candidate_id
        AND (
          c.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.company_members cm
            WHERE cm.company_id = c.company_id
              AND cm.user_id = auth.uid()
          ) OR EXISTS (
            SELECT 1 FROM public.companies parent_c
            JOIN public.company_members cm ON parent_c.parent_company_id = cm.company_id
            WHERE parent_c.id = c.company_id
              AND cm.user_id = auth.uid()
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.candidates c
      WHERE c.id = candidate_scorecards.candidate_id
        AND (
          c.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.company_members cm
            WHERE cm.company_id = c.company_id
              AND cm.user_id = auth.uid()
          ) OR EXISTS (
            SELECT 1 FROM public.companies parent_c
            JOIN public.company_members cm ON parent_c.parent_company_id = cm.company_id
            WHERE parent_c.id = c.company_id
              AND cm.user_id = auth.uid()
          )
        )
    )
  );
