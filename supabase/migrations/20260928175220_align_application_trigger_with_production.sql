-- Preserve the exact application trigger definition verified on production.
-- The archived July replacements would overwrite candidate deduplication and tracking handling.
CREATE OR REPLACE FUNCTION public.handle_new_application()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _job RECORD;
  _default_stage text;
  _existing_candidate_id uuid;
  _final_tracking_code text;
BEGIN
  SELECT * INTO _job FROM public.jobs WHERE id = NEW.job_id;
  
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Resolve default stage for the job owner or fallback
  SELECT name INTO _default_stage
  FROM public.pipeline_stages
  WHERE user_id = _job.user_id AND is_default = true AND is_active = true
  ORDER BY sort_order ASC
  LIMIT 1;

  IF _default_stage IS NULL THEN
    _default_stage := 'تقديم الطلب';
  END IF;

  _final_tracking_code := COALESCE(NEW.tracking_code, 'TX-' || floor(100000 + random() * 900000)::text);

  -- Check if candidate already created for this job and email
  SELECT id INTO _existing_candidate_id
  FROM public.candidates
  WHERE job_id = _job.id AND LOWER(email) = LOWER(NEW.email)
  LIMIT 1;

  IF _existing_candidate_id IS NOT NULL THEN
    -- Update existing candidate
    UPDATE public.candidates
    SET name = COALESCE(NEW.name, name),
        phone = COALESCE(NEW.phone, phone),
        resume_url = COALESCE(NEW.resume_url, resume_url),
        skills = COALESCE(NEW.skills, skills),
        summary = COALESCE(NEW.cover_letter, summary),
        experience = COALESCE(NEW.experience, experience),
        tracking_code = COALESCE(tracking_code, _final_tracking_code),
        company_id = COALESCE(company_id, _job.company_id),
        user_id = COALESCE(user_id, _job.user_id)
    WHERE id = _existing_candidate_id;
  ELSE
    -- Insert new candidate
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
      tracking_code,
      license_number,
      license_expiry,
      university_degree,
      demo_video_url
    ) VALUES (
      _job.user_id,
      _job.company_id,
      NEW.name,
      NEW.email,
      NEW.phone,
      _job.title,
      NEW.experience,
      NEW.cover_letter,
      _default_stage,
      'قيد المراجعة',
      'رابط التقديم المباشر',
      _job.id,
      NEW.resume_url,
      NEW.skills,
      _final_tracking_code,
      NEW.license_number,
      NEW.license_expiry,
      NEW.university_degree,
      NEW.demo_video_url
    );
  END IF;

  -- Ensure company_id is set on the application row
  UPDATE public.applications
  SET company_id = _job.company_id,
      tracking_code = _final_tracking_code
  WHERE id = NEW.id;

  -- Insert notification for job creator
  IF _job.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, description, type)
    VALUES (
      _job.user_id,
      'طلب توظيف جديد: ' || NEW.name,
      'تقدم ' || NEW.name || ' لوظيفة ' || _job.title,
      'application'
    );
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.handle_new_application() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_application() TO service_role;
