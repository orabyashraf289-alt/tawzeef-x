
CREATE OR REPLACE FUNCTION public.handle_new_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _job RECORD;
BEGIN
  SELECT * INTO _job FROM public.jobs WHERE id = NEW.job_id;
  
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.candidates (
    user_id, name, email, phone, role, experience, 
    summary, stage, status, source, job_id
  ) VALUES (
    _job.user_id,
    NEW.name,
    NEW.email,
    NEW.phone,
    _job.title,
    NEW.experience,
    NEW.cover_letter,
    'تقديم الطلب',
    'قيد المراجعة',
    'نموذج التقديم',
    _job.id
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
$$;

CREATE TRIGGER on_new_application
  AFTER INSERT ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_application();
