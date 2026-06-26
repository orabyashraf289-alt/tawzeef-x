
-- Add embedding cache column to candidates (jsonb array of floats)
ALTER TABLE public.candidates
ADD COLUMN IF NOT EXISTS embedding jsonb;

ALTER TABLE public.candidates
ADD COLUMN IF NOT EXISTS embedding_text text;

CREATE INDEX IF NOT EXISTS idx_candidates_user_id_created ON public.candidates(user_id, created_at DESC);
