-- Migration: Pipeline Stages Enhancement
-- Adds SLA tracking to pipeline_stages and candidate stage-tracking columns.
-- All statements are idempotent (safe to re-run).

-- 1. Add SLA column to pipeline_stages
ALTER TABLE public.pipeline_stages
  ADD COLUMN IF NOT EXISTS sla_hours integer DEFAULT 0;

-- 2. Add tracking columns to candidates
ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS stage_entered_at timestamptz DEFAULT now();

ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS rejection_reason text;

ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS is_deferred boolean DEFAULT false;

-- 3. Index on candidates.stage_entered_at for SLA queries
CREATE INDEX IF NOT EXISTS idx_candidates_stage_entered_at
  ON public.candidates(stage_entered_at);

-- 4. Backfill stage_entered_at from updated_at for existing rows
UPDATE public.candidates
  SET stage_entered_at = updated_at
  WHERE stage_entered_at IS NULL;
