-- Link private CVs to their real job or uploader before RLS grants access.
CREATE FUNCTION public.guard_resume_reference()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE _path text := NULLIF(BTRIM(NEW.resume_url), '');
BEGIN
  IF _path IS NULL THEN RETURN NEW; END IF;
  -- Existing URL-form links remain usable during unrelated edits.
  IF TG_OP = 'UPDATE' AND NEW.resume_url IS NOT DISTINCT FROM OLD.resume_url
     AND NEW.company_id IS NOT DISTINCT FROM OLD.company_id
     AND (TG_TABLE_NAME <> 'applications' OR NEW.job_id IS NOT DISTINCT FROM OLD.job_id)
  THEN RETURN NEW; END IF;

  IF TG_TABLE_NAME = 'applications' THEN
    IF _path !~ ('^applications/' || NEW.job_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](pdf|doc|docx)$')
       OR NOT EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id = 'resumes' AND o.name = _path)
    THEN RAISE EXCEPTION 'invalid_application_resume_reference' USING ERRCODE = '23514'; END IF;
  ELSIF TG_TABLE_NAME = 'candidates' AND auth.uid() IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.company_id = NEW.company_id AND a.resume_url = _path
    ) AND NOT EXISTS (
      SELECT 1 FROM storage.objects o
      WHERE o.bucket_id = 'resumes' AND o.name = _path
        AND (storage.foldername(o.name))[1] = auth.uid()::text
        AND o.owner_id = auth.uid()::text
    ) THEN RAISE EXCEPTION 'invalid_candidate_resume_reference' USING ERRCODE = '23514'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_resume_reference() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER zz_guard_application_resume_reference
  BEFORE INSERT OR UPDATE OF resume_url, job_id, company_id ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.guard_resume_reference();
CREATE TRIGGER zz_guard_candidate_resume_reference
  BEFORE INSERT OR UPDATE OF resume_url, company_id ON public.candidates
  FOR EACH ROW EXECUTE FUNCTION public.guard_resume_reference();

-- The parent company's inherited branch access also applies to private CVs.
DROP POLICY IF EXISTS "Job owners can read their resumes" ON storage.objects;
CREATE POLICY "Job owners can read their resumes" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'resumes' AND (
      EXISTS (SELECT 1 FROM public.candidates c
        WHERE c.company_id IS NOT NULL AND public.has_company_access(c.company_id)
          AND c.resume_url LIKE '%' || storage.objects.name || '%')
      OR EXISTS (SELECT 1 FROM public.applications a
        WHERE a.company_id IS NOT NULL AND public.has_company_access(a.company_id)
          AND a.resume_url LIKE '%' || storage.objects.name || '%')
    )
  );
