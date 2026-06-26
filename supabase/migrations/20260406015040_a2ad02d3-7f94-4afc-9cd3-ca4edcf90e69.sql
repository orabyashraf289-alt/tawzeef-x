CREATE TABLE public.email_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE SET NULL,
  candidate_email TEXT NOT NULL,
  email_type TEXT NOT NULL DEFAULT 'general',
  subject TEXT,
  tracking_id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  opened_at TIMESTAMP WITH TIME ZONE,
  opened_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.email_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own email tracking"
  ON public.email_tracking FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own email tracking"
  ON public.email_tracking FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_email_tracking_tracking_id ON public.email_tracking(tracking_id);
CREATE INDEX idx_email_tracking_candidate ON public.email_tracking(candidate_id);
CREATE INDEX idx_email_tracking_user ON public.email_tracking(user_id);