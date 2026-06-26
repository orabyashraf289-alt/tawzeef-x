
-- Add transition_rules to pipeline_stages
ALTER TABLE public.pipeline_stages
ADD COLUMN IF NOT EXISTS transition_rules jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Create sub-stages table
CREATE TABLE public.pipeline_sub_stages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stage_id uuid NOT NULL REFERENCES public.pipeline_stages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pipeline_sub_stages ENABLE ROW LEVEL SECURITY;

-- RLS policy
CREATE POLICY "Users can manage own sub-stages"
ON public.pipeline_sub_stages
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Index for performance
CREATE INDEX idx_sub_stages_stage_id ON public.pipeline_sub_stages(stage_id);
CREATE INDEX idx_sub_stages_user_id ON public.pipeline_sub_stages(user_id);
