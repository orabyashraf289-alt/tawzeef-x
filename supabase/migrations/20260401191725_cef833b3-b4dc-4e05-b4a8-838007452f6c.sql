
-- Create stage transitions history table
CREATE TABLE public.stage_transitions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  from_stage text,
  to_stage text NOT NULL,
  moved_by_name text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stage_transitions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own stage transitions"
ON public.stage_transitions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stage transitions"
ON public.stage_transitions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_stage_transitions_candidate ON public.stage_transitions(candidate_id);
CREATE INDEX idx_stage_transitions_user ON public.stage_transitions(user_id);
CREATE INDEX idx_stage_transitions_created ON public.stage_transitions(created_at DESC);

-- Add automation_rules to pipeline_stages
ALTER TABLE public.pipeline_stages
ADD COLUMN IF NOT EXISTS automation_rules jsonb NOT NULL DEFAULT '{}'::jsonb;
