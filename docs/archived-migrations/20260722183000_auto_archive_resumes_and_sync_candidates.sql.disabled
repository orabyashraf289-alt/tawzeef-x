-- Enhance handle_new_application trigger to set resume_url, skills, tracking_code and auto-populate candidate & resume archive
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

  -- 1. Insert into public.candidates with complete applicant data including CV resume_url
  INSERT INTO public.candidates (
    user_id,
    company_id,
    name,
    email,
    phone,
    role,
    experience,
    summary,
    stage,
    status,
    source,
    job_id,
    resume_url,
    skills,
    tracking_code
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
    'جديد',
    'نموذج التقديم',
    _job.id,
    NEW.resume_url,
    NEW.skills,
    COALESCE(NEW.tracking_code, 'TX-' || floor(100000 + random() * 900000)::text)
  );

  -- 2. Insert notification for recruiter
  INSERT INTO public.notifications (user_id, title, description, type)
  VALUES (
    _job.user_id,
    'طلب توظيف جديد: ' || NEW.name,
    'تقدم ' || NEW.name || ' لوظيفة ' || _job.title,
    'application'
  );

  -- 3. Auto-archive resume metadata if CV attached
  IF NEW.resume_url IS NOT NULL AND _job.user_id IS NOT NULL THEN
    BEGIN
      INSERT INTO public.resume_archive_meta (
        user_id,
        resume_url,
        candidate_email,
        notes,
        tags
      ) VALUES (
        _job.user_id,
        NEW.resume_url,
        NEW.email,
        'تم الأرشفة تلقائياً من طلب التقديم على وظيفة: ' || _job.title,
        ARRAY[_job.title, 'متقدم جديد']
      );
    EXCEPTION WHEN OTHERS THEN
      -- Silently handle if table constraint triggers
      NULL;
    END;
  END IF;

  RETURN NEW;
END;
$$;
