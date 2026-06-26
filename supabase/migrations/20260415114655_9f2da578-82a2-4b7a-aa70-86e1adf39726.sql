
-- Add new columns to pipeline_sub_stages
ALTER TABLE public.pipeline_sub_stages
  ADD COLUMN IF NOT EXISTS description text DEFAULT '',
  ADD COLUMN IF NOT EXISTS estimated_hours numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS checklist jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS assignee_type text DEFAULT 'recruiter';
