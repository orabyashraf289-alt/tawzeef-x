-- Ensure tracking_code column exists on public.applications table
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS tracking_code text;

-- Create index for tracking_code lookups
CREATE INDEX IF NOT EXISTS idx_applications_tracking_code ON public.applications(tracking_code);
