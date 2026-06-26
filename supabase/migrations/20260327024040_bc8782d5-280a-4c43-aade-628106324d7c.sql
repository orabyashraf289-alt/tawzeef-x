
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Schedule cleanup of expired/consumed OTP challenges every hour
SELECT cron.schedule(
  'cleanup-expired-otp-challenges',
  '0 * * * *',
  $$DELETE FROM public.login_otp_challenges WHERE consumed_at IS NOT NULL OR expires_at < now() - interval '1 hour'$$
);
