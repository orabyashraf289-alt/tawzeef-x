CREATE TABLE IF NOT EXISTS public.login_otp_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  consumed_at TIMESTAMP WITH TIME ZONE,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.login_otp_challenges ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_login_otp_challenges_email_created_at
  ON public.login_otp_challenges (email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_login_otp_challenges_user_created_at
  ON public.login_otp_challenges (user_id, created_at DESC);