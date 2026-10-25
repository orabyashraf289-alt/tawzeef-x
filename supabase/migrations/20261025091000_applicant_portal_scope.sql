-- Authenticated applicants receive a deliberately limited projection, never HR
-- notes, recordings, model reports, draft offers or another person's records.
CREATE FUNCTION public.get_my_applicant_portal()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
DECLARE _email text; _result jsonb;
BEGIN
  SELECT lower(trim(email)) INTO _email FROM auth.users
  WHERE id = (SELECT auth.uid()) AND email_confirmed_at IS NOT NULL;
  IF _email IS NULL THEN RAISE EXCEPTION 'Verified account required' USING ERRCODE = '42501'; END IF;
  WITH own_applications AS (
    SELECT a.*, j.title, j.department, co.name AS company_name
    FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id AND j.company_id = a.company_id
    JOIN public.companies co ON co.id = a.company_id AND co.status = 'active'
    WHERE lower(trim(a.email)) = _email
  ), own_candidates AS (
    SELECT c.* FROM public.candidates c
    WHERE lower(trim(c.email)) = _email AND EXISTS (
      SELECT 1 FROM own_applications a WHERE a.company_id = c.company_id AND a.job_id = c.job_id
    )
  )
  SELECT jsonb_build_object(
    'applications', coalesce((SELECT jsonb_agg(jsonb_build_object(
      'id', a.id, 'company_id', a.company_id, 'company_name', a.company_name,
      'job_id', a.job_id, 'name', a.name, 'phone', a.phone, 'specialty', a.specialty,
      'skills', a.skills, 'cover_letter', a.cover_letter, 'resume_url', a.resume_url,
      'status', a.status, 'created_at', a.created_at,
      'jobs', jsonb_build_object('title', a.title, 'department', a.department)
    ) ORDER BY a.created_at DESC) FROM own_applications a), '[]'::jsonb),
    'candidates', coalesce((SELECT jsonb_agg(jsonb_build_object(
      'id', c.id, 'company_id', c.company_id, 'job_id', c.job_id,
      'role', c.role, 'stage', c.stage, 'status', c.status, 'tracking_code', c.tracking_code
    ) ORDER BY c.created_at DESC) FROM own_candidates c), '[]'::jsonb),
    'interviews', coalesce((SELECT jsonb_agg(jsonb_build_object(
      'id', i.id, 'company_id', i.company_id, 'position', i.position, 'date', i.date,
      'time', i.time, 'type', i.type, 'status', i.status, 'meeting_url', i.meeting_url
    ) ORDER BY i.date DESC) FROM public.interviews i JOIN own_candidates c
      ON c.id = i.candidate_id AND c.company_id = i.company_id), '[]'::jsonb),
    'offers', coalesce((SELECT jsonb_agg(jsonb_build_object(
      'id', o.id, 'company_id', o.company_id, 'position', o.position, 'department', o.department,
      'salary', o.salary, 'currency', o.currency, 'status', o.status, 'token', o.token
    ) ORDER BY o.created_at DESC) FROM public.job_offers o JOIN own_candidates c
      ON c.id = o.candidate_id AND c.company_id = o.company_id
      WHERE o.status IN ('sent','viewed','accepted','rejected','expired')
      AND (o.job_id IS NULL OR o.job_id = c.job_id)), '[]'::jsonb)
  ) INTO _result;
  RETURN _result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_my_applicant_portal() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_applicant_portal() TO authenticated;

-- Keep staff and agency policies; remove applicant access to complete HR rows.
DROP POLICY IF EXISTS "Job seekers view own candidate records" ON public.candidates;
DROP POLICY IF EXISTS "Job seekers can view own candidate records" ON public.candidates;
DROP POLICY IF EXISTS "Job seekers can view own interviews" ON public.interviews;

-- Direct application reads must also use the verified server identity.
CREATE FUNCTION public.my_verified_applicant_email()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, pg_temp AS $$
  SELECT lower(trim(email)) FROM auth.users
  WHERE id = (SELECT auth.uid()) AND email_confirmed_at IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.my_verified_applicant_email() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_verified_applicant_email() TO authenticated;
DROP POLICY IF EXISTS "Applicants view own applications" ON public.applications;
CREATE POLICY "Applicants view own applications" ON public.applications
  FOR SELECT TO authenticated USING (lower(trim(email)) = (SELECT public.my_verified_applicant_email()));

-- Preserve private CV downloads without exposing the candidate HR row.
DROP POLICY IF EXISTS "Candidates can read own resumes" ON storage.objects;
CREATE POLICY "Candidates can read own resumes" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'resumes' AND (
  (owner_id = (SELECT auth.uid())::text AND split_part(name, '/', 1) = (SELECT auth.uid())::text)
  OR EXISTS (SELECT 1 FROM public.applications a
    WHERE lower(trim(a.email)) = (SELECT public.my_verified_applicant_email())
      AND a.resume_url = storage.objects.name)
));
