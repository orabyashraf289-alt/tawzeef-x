-- Talent Pool table
CREATE TABLE public.talent_pool (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, candidate_id)
);

ALTER TABLE public.talent_pool ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own talent pool"
  ON public.talent_pool
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);