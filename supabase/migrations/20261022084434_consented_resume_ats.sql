-- Only explicit, applicant-provided consent enables a recruiter to submit a
-- short professional CV excerpt to an external AI provider.
ALTER TABLE public.applications
  ADD COLUMN ai_processing_consent_at timestamptz,
  ADD COLUMN ai_resume_excerpt text,
  ADD CONSTRAINT applications_ai_excerpt_consent_check
    CHECK (ai_resume_excerpt IS NULL OR (
      ai_processing_consent_at IS NOT NULL AND
      resume_url IS NOT NULL AND
      length(ai_resume_excerpt) BETWEEN 1 AND 8000
    ));

-- Hiring team updates to the application cannot add or alter applicant consent.
CREATE FUNCTION public.prevent_application_ai_consent_edit()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.ai_processing_consent_at IS DISTINCT FROM OLD.ai_processing_consent_at
     OR NEW.ai_resume_excerpt IS DISTINCT FROM OLD.ai_resume_excerpt THEN
    RAISE EXCEPTION 'AI processing consent cannot be modified after submission';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.prevent_application_ai_consent_edit() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER prevent_application_ai_consent_edit
BEFORE UPDATE OF ai_processing_consent_at, ai_resume_excerpt ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.prevent_application_ai_consent_edit();
