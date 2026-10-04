-- The application trigger reads these nullable profile fields. Capture their
-- schema dependency for clean replay without rewriting populated columns.
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS license_number text,
  ADD COLUMN IF NOT EXISTS license_expiry text,
  ADD COLUMN IF NOT EXISTS university_degree text,
  ADD COLUMN IF NOT EXISTS demo_video_url text;

ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS license_number text,
  ADD COLUMN IF NOT EXISTS license_expiry text,
  ADD COLUMN IF NOT EXISTS university_degree text,
  ADD COLUMN IF NOT EXISTS demo_video_url text;
