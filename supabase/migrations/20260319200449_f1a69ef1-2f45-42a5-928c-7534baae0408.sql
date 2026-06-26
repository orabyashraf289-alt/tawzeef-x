
-- Table to log LinkedIn/Zapier webhook delivery attempts
CREATE TABLE public.linkedin_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  status_code integer,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.linkedin_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own linkedin deliveries"
ON public.linkedin_deliveries FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service can insert linkedin deliveries"
ON public.linkedin_deliveries FOR INSERT
WITH CHECK (true);

CREATE INDEX idx_linkedin_deliveries_user_created ON public.linkedin_deliveries (user_id, created_at DESC);
