
-- Add skills and specialty to applications table
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS skills text[] DEFAULT '{}';
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS specialty text DEFAULT NULL;
