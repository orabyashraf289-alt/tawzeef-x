
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
