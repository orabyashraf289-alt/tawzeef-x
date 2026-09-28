-- The original unrecorded July migration ran an UPDATE across existing jobs.
-- A constant column default supplies the same value without a data backfill.
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS approval_chain text
  DEFAULT 'سلسلة موافقة قياسية (مدير الموارد البشرية)';

NOTIFY pgrst, 'reload schema';
