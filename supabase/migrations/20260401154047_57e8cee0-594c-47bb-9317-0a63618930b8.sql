
CREATE OR REPLACE FUNCTION public.handle_new_application()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _job RECORD;
  _default_stage text;
BEGIN
  SELECT * INTO _job FROM public.jobs WHERE id = NEW.job_id;
  
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Get the default stage name for this user, fallback to 'تقديم الطلب'
  SELECT name INTO _default_stage
  FROM public.pipeline_stages
  WHERE user_id = _job.user_id AND is_default = true AND is_active = true
  ORDER BY sort_order ASC
  LIMIT 1;

  IF _default_stage IS NULL THEN
    _default_stage := 'تقديم الطلب';
  END IF;

  INSERT INTO public.candidates (
    user_id, name, email, phone, role, experience, 
    summary, stage, status, source, job_id, resume_url
  ) VALUES (
    _job.user_id,
    NEW.name,
    NEW.email,
    NEW.phone,
    _job.title,
    NEW.experience,
    NEW.cover_letter,
    _default_stage,
    'قيد المراجعة',
    'نموذج التقديم',
    _job.id,
    NEW.resume_url
  );

  INSERT INTO public.notifications (user_id, title, description, type)
  VALUES (
    _job.user_id,
    'طلب توظيف جديد: ' || NEW.name,
    'تقدم ' || NEW.name || ' لوظيفة ' || _job.title,
    'application'
  );

  RETURN NEW;
END;
$function$;
