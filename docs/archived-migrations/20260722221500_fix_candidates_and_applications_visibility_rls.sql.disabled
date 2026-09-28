-- =========================================================================
-- MIGRATION: SEAMLESS CANDIDATE & APPLICATION VISIBILITY FOR ALL HR USERS
-- =========================================================================

-- 1. Auto-heal any existing candidates & applications with missing company_id / user_id
UPDATE public.candidates c
SET company_id = COALESCE(c.company_id, j.company_id),
    user_id = COALESCE(c.user_id, j.user_id)
FROM public.jobs j
WHERE c.job_id = j.id;

UPDATE public.applications a
SET company_id = COALESCE(a.company_id, j.company_id)
FROM public.jobs j
WHERE a.job_id = j.id;

-- 2. Drop restrictive RLS policies on candidates table and re-grant full access to authenticated HR users
DROP POLICY IF EXISTS "Users manage own candidates" ON public.candidates;
DROP POLICY IF EXISTS "Admins manage all candidates" ON public.candidates;
DROP POLICY IF EXISTS "Company members access candidates" ON public.candidates;

CREATE POLICY "Authenticated users access all candidates" ON public.candidates
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 3. Drop restrictive RLS policies on applications table and re-grant full access to authenticated HR users
DROP POLICY IF EXISTS "Job owners can view applications" ON public.applications;
DROP POLICY IF EXISTS "Applicants can view own applications" ON public.applications;

CREATE POLICY "Authenticated users access all applications" ON public.applications
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow anonymous applicants to insert job applications
DROP POLICY IF EXISTS "Anyone can submit application" ON public.applications;
CREATE POLICY "Anyone can submit application" ON public.applications
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- 4. Update handle_new_application trigger to create complete candidates & notifications
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

  -- Insert into candidates table with full application data
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
    COALESCE(_job.user_id, auth.uid()),
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
    _job.id,
    NEW.resume_url,
    NEW.skills,
    COALESCE(NEW.tracking_code, 'TX-' || floor(100000 + random() * 900000)::text)
  );

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

  -- Auto-archive resume metadata if CV attached
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
      NULL;
    END;
  END IF;

  RETURN NEW;
END;
$$;
