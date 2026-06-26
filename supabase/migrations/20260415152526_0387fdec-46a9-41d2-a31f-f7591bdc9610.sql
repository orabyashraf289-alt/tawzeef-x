
-- Add new question types
ALTER TYPE public.question_type ADD VALUE IF NOT EXISTS 'matching';
ALTER TYPE public.question_type ADD VALUE IF NOT EXISTS 'ordering';

-- Add anti-cheat tracking columns to assessment_responses
ALTER TABLE public.assessment_responses 
  ADD COLUMN IF NOT EXISTS tab_switches INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tab_switch_log JSONB DEFAULT '[]'::jsonb;
