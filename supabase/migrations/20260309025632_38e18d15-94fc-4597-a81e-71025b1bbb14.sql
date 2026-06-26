
ALTER TABLE public.candidates
ADD COLUMN ai_score integer DEFAULT NULL,
ADD COLUMN ai_evaluation text DEFAULT NULL;
