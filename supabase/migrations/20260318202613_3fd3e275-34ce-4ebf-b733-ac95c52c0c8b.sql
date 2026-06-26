
CREATE OR REPLACE FUNCTION public.dispatch_job_created_webhook()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  BEGIN
    PERFORM extensions.http_post(
      url := (SELECT CONCAT(current_setting('app.settings.supabase_url', true), '/functions/v1/send-webhook')),
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', CONCAT('Bearer ', current_setting('app.settings.anon_key', true))),
      body := jsonb_build_object(
        'event_type', 'job.created',
        'user_id', NEW.user_id,
        'payload', jsonb_build_object(
          'job_id', NEW.id,
          'job_title', NEW.title,
          'department', NEW.department,
          'location', NEW.location,
          'type', NEW.type,
          'description', NEW.description,
          'experience_level', NEW.experience_level,
          'salary_min', NEW.salary_min,
          'salary_max', NEW.salary_max
        )
      )
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_job_created
  AFTER INSERT ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.dispatch_job_created_webhook();
