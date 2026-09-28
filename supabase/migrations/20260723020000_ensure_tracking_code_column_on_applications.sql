-- Ensure tracking_code column exists on public.applications table
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS tracking_code text;

-- Use the same index name as the later tracking-code repair migration. This
-- avoids creating an equivalent second index on both fresh replay and production.
CREATE INDEX IF NOT EXISTS idx_applications_tracking_code_lookup ON public.applications(tracking_code);
