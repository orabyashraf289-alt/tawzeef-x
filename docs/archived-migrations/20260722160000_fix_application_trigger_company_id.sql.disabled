-- Fix the application trigger to include company_id so candidates are correctly associated with companies
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
    user_id, company_id, name, email, phone, role, experience, 
    summary, stage, status, source, job_id
  ) VALUES (
    _job.user_id,
    _job.company_id,
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
