-- Match the production table privileges on a fresh migration replay.
-- Existing row level policies still limit offers to permitted company users.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_offers TO authenticated;
