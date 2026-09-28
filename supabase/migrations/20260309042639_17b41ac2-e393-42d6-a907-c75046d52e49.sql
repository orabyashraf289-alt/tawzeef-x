
-- These webhook tables existed in the original project, but their CREATE TABLE
-- statements were missing from the exported migration history. Reconstruct
-- them here, before the first policy that references webhook_deliveries.
CREATE TABLE public.webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own webhook endpoints"
ON public.webhook_endpoints FOR ALL
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id UUID NOT NULL REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL,
  status_code INTEGER,
  response_body TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own webhook deliveries"
ON public.webhook_deliveries FOR SELECT
USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhook_endpoints TO authenticated;
GRANT SELECT, INSERT ON public.webhook_deliveries TO authenticated;

-- Allow service role to insert webhook deliveries (already has RLS bypass)
-- But also allow authenticated users to insert via edge function context
CREATE POLICY "Service can insert webhook deliveries"
ON public.webhook_deliveries
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create function to dispatch webhooks on candidate status change
CREATE OR REPLACE FUNCTION public.dispatch_candidate_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM net.http_post(
      url := (SELECT CONCAT(current_setting('app.settings.supabase_url', true), '/functions/v1/send-webhook')),
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', CONCAT('Bearer ', current_setting('app.settings.anon_key', true))),
      body := jsonb_build_object(
        'event_type', 'candidate.status_changed',
        'user_id', NEW.user_id,
        'payload', jsonb_build_object(
          'candidate_id', NEW.id,
          'candidate_name', NEW.name,
          'old_status', OLD.status,
          'new_status', NEW.status,
          'role', NEW.role,
          'email', NEW.email
        )
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create function to dispatch webhooks on job status change
CREATE OR REPLACE FUNCTION public.dispatch_job_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM net.http_post(
      url := (SELECT CONCAT(current_setting('app.settings.supabase_url', true), '/functions/v1/send-webhook')),
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', CONCAT('Bearer ', current_setting('app.settings.anon_key', true))),
      body := jsonb_build_object(
        'event_type', 'job.status_changed',
        'user_id', NEW.user_id,
        'payload', jsonb_build_object(
          'job_id', NEW.id,
          'job_title', NEW.title,
          'department', NEW.department,
          'old_status', OLD.status,
          'new_status', NEW.status
        )
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Attach triggers
CREATE TRIGGER on_candidate_status_change
AFTER UPDATE ON public.candidates
FOR EACH ROW
EXECUTE FUNCTION public.dispatch_candidate_webhook();

CREATE TRIGGER on_job_status_change
AFTER UPDATE ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.dispatch_job_webhook();
