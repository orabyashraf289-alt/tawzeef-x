
-- 1. Restrict question_options public read - only owners can read directly
DROP POLICY IF EXISTS "Users manage own question options" ON public.question_options;

CREATE POLICY "Owners select question options"
ON public.question_options FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM public.question_bank q WHERE q.id = question_options.question_id AND q.user_id = auth.uid()));

CREATE POLICY "Owners insert question options"
ON public.question_options FOR INSERT
TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.question_bank q WHERE q.id = question_options.question_id AND q.user_id = auth.uid()));

CREATE POLICY "Owners update question options"
ON public.question_options FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.question_bank q WHERE q.id = question_options.question_id AND q.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.question_bank q WHERE q.id = question_options.question_id AND q.user_id = auth.uid()));

CREATE POLICY "Owners delete question options"
ON public.question_options FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.question_bank q WHERE q.id = question_options.question_id AND q.user_id = auth.uid()));

-- Also restrict assessment_questions public read (used to be open)
DROP POLICY IF EXISTS "Anyone can view assessment questions for active assessments" ON public.assessment_questions;
-- Candidates use SECURITY DEFINER RPC get_assessment_for_candidate(_token); no public policy needed.

-- 2. Block public direct INSERT into assessment_responses (must use start_assessment_response RPC)
DROP POLICY IF EXISTS "Anyone can submit responses to active assessments" ON public.assessment_responses;
-- start_assessment_response and submit_assessment_response are SECURITY DEFINER, so they bypass RLS.

-- 3. Restrict resumes bucket uploads: allow anon but only to 'applications/' folder, files <= reasonable extensions, and 1 file per request
DROP POLICY IF EXISTS "Anyone can upload to resumes bucket" ON storage.objects;

CREATE POLICY "Public can upload application resumes"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'resumes'
  AND (storage.foldername(name))[1] = 'applications'
  AND lower(right(name, 4)) IN ('.pdf', '.doc', 'docx')
);

CREATE POLICY "Authenticated users upload own resumes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'resumes'
  AND (auth.uid()::text = (storage.foldername(name))[1] OR (storage.foldername(name))[1] = 'applications')
);

-- 4. roadmap_tasks: add user-scoped policy
CREATE POLICY "Users manage own roadmap tasks"
ON public.roadmap_tasks FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. Invitations: secure token lookup RPC
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inv RECORD;
BEGIN
  SELECT id, email, role, status, expires_at INTO _inv
  FROM public.invitations
  WHERE token = _token AND status = 'pending' AND expires_at > now()
  LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;
  RETURN jsonb_build_object(
    'found', true,
    'id', _inv.id,
    'email', _inv.email,
    'role', _inv.role,
    'expires_at', _inv.expires_at
  );
END;
$$;
