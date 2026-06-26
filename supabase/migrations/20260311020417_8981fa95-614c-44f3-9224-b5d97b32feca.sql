CREATE OR REPLACE FUNCTION public.dispatch_candidate_webhook()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    BEGIN
      PERFORM extensions.http_post(
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
    EXCEPTION WHEN OTHERS THEN
      -- Silently continue if webhook dispatch fails
      NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$;