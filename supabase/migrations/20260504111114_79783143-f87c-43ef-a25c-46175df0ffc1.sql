
-- ============================================================
-- 1) RESUMES BUCKET: make private + tighten policies
-- ============================================================
UPDATE storage.buckets SET public = false WHERE id = 'resumes';

-- Drop all existing policies on storage.objects for resumes bucket
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (qual LIKE '%resumes%' OR with_check LIKE '%resumes%' OR policyname ILIKE '%resume%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Authenticated users can upload to resumes (10MB, restricted mime types enforced client-side; bucket ACL just needs auth)
CREATE POLICY "Authenticated users can upload resumes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'resumes');

-- Owners (recruiters) can read resumes attached to candidates/applications under their jobs
CREATE POLICY "Job owners can read their resumes"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'resumes' AND (
    EXISTS (
      SELECT 1 FROM public.candidates c
      WHERE c.user_id = auth.uid()
        AND c.resume_url LIKE '%' || storage.objects.name || '%'
    )
    OR EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.jobs j ON j.id = a.job_id
      WHERE j.user_id = auth.uid()
        AND a.resume_url LIKE '%' || storage.objects.name || '%'
    )
  )
);

-- Job seekers can read their own resume files
CREATE POLICY "Candidates can read own resumes"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'resumes' AND (
    EXISTS (
      SELECT 1 FROM public.candidates c
      WHERE c.email = (auth.jwt() ->> 'email')
        AND c.resume_url LIKE '%' || storage.objects.name || '%'
    )
  )
);

-- Owners can delete resumes they own
CREATE POLICY "Job owners can delete their resumes"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'resumes' AND (
    EXISTS (
      SELECT 1 FROM public.candidates c
      WHERE c.user_id = auth.uid()
        AND c.resume_url LIKE '%' || storage.objects.name || '%'
    )
  )
);

-- ============================================================
-- 2) QUESTION_OPTIONS: lock down public SELECT
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view options for assessment" ON public.question_options;

-- Owner-only SELECT policy already exists ("Users manage own question options"), keep it.

-- ============================================================
-- 3) Safe RPC for candidate-side question fetching (no is_correct)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_assessment_for_candidate(_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _assessment RECORD;
  _questions jsonb;
BEGIN
  SELECT id, title, description, duration_minutes, passing_score, is_randomized, is_active
  INTO _assessment
  FROM public.assessments
  WHERE token = _token AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'NOT_FOUND');
  END IF;

  SELECT COALESCE(jsonb_agg(qq ORDER BY qq->>'sort_order'), '[]'::jsonb)
  INTO _questions
  FROM (
    SELECT jsonb_build_object(
      'id', q.id,
      'question_text', q.question_text,
      'question_type', q.question_type,
      'code_language', q.code_language,
      'points', q.points,
      'sort_order', aq.sort_order,
      'options', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', o.id,
          'option_text', o.option_text,
          'sort_order', o.sort_order
        ) ORDER BY o.sort_order)
        FROM public.question_options o
        WHERE o.question_id = q.id
      ), '[]'::jsonb)
    ) AS qq
    FROM public.assessment_questions aq
    JOIN public.question_bank q ON q.id = aq.question_id
    WHERE aq.assessment_id = _assessment.id
    ORDER BY aq.sort_order
  ) sub;

  RETURN jsonb_build_object(
    'assessment', to_jsonb(_assessment),
    'questions', _questions
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_assessment_for_candidate(text) TO anon, authenticated;

-- ============================================================
-- 4) Safe RPC to start an assessment response
-- ============================================================
CREATE OR REPLACE FUNCTION public.start_assessment_response(_token text, _name text, _email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _assessment_id uuid;
  _response_id uuid;
BEGIN
  IF _name IS NULL OR length(trim(_name)) = 0 OR length(_name) > 200 THEN
    RAISE EXCEPTION 'Invalid name';
  END IF;
  IF _email IS NULL OR _email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(_email) > 320 THEN
    RAISE EXCEPTION 'Invalid email';
  END IF;

  SELECT id INTO _assessment_id
  FROM public.assessments
  WHERE token = _token AND is_active = true
  LIMIT 1;

  IF _assessment_id IS NULL THEN
    RAISE EXCEPTION 'Assessment not found';
  END IF;

  INSERT INTO public.assessment_responses (assessment_id, candidate_name, candidate_email, answers, status)
  VALUES (_assessment_id, trim(_name), lower(trim(_email)), '[]'::jsonb, 'in_progress')
  RETURNING id INTO _response_id;

  RETURN _response_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_assessment_response(text, text, text) TO anon, authenticated;

-- ============================================================
-- 5) Safe RPC to submit (score) an assessment response server-side
-- ============================================================
CREATE OR REPLACE FUNCTION public.submit_assessment_response(
  _response_id uuid,
  _answers jsonb,
  _tab_switches integer DEFAULT 0,
  _tab_switch_log jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _response RECORD;
  _assessment RECORD;
  _question RECORD;
  _ans jsonb;
  _user_answer text;
  _is_correct boolean;
  _points_earned integer;
  _total_score integer := 0;
  _max_score integer := 0;
  _percentage numeric;
  _answers_out jsonb := '[]'::jsonb;
  _open_answers jsonb := '[]'::jsonb;
  _correct_opt_id uuid;
  _correct_answer text;
BEGIN
  SELECT * INTO _response FROM public.assessment_responses WHERE id = _response_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Response not found'; END IF;
  IF _response.status <> 'in_progress' THEN
    RAISE EXCEPTION 'Response already submitted';
  END IF;

  SELECT * INTO _assessment FROM public.assessments WHERE id = _response.assessment_id;

  -- Iterate over assessment questions in defined order
  FOR _question IN
    SELECT q.id, q.question_text, q.question_type, q.code_language, q.correct_answer, q.points,
           COALESCE(aq.points_override, q.points) AS effective_points,
           aq.sort_order
    FROM public.assessment_questions aq
    JOIN public.question_bank q ON q.id = aq.question_id
    WHERE aq.assessment_id = _assessment.id
    ORDER BY aq.sort_order
  LOOP
    _max_score := _max_score + _question.effective_points;

    -- Find user's answer for this question
    SELECT a INTO _ans
    FROM jsonb_array_elements(_answers) a
    WHERE (a->>'question_id') = _question.id::text
    LIMIT 1;

    _user_answer := COALESCE(_ans->>'answer', '');
    _is_correct := false;
    _points_earned := 0;

    IF _question.question_type = 'multiple_choice' THEN
      SELECT id INTO _correct_opt_id FROM public.question_options
      WHERE question_id = _question.id AND is_correct = true LIMIT 1;
      IF _correct_opt_id::text = _user_answer THEN
        _is_correct := true;
        _points_earned := _question.effective_points;
        _total_score := _total_score + _points_earned;
      END IF;
    ELSIF _question.question_type = 'true_false' THEN
      IF _question.correct_answer = _user_answer THEN
        _is_correct := true;
        _points_earned := _question.effective_points;
        _total_score := _total_score + _points_earned;
      END IF;
    ELSIF _question.question_type IN ('open_ended', 'code') THEN
      -- Defer to AI; just record the answer
      _open_answers := _open_answers || jsonb_build_object(
        'question_id', _question.id,
        'question_text', _question.question_text,
        'question_type', _question.question_type,
        'answer', _user_answer,
        'correct_answer', _question.correct_answer,
        'code_language', _question.code_language,
        'points', _question.effective_points
      );
    END IF;

    _answers_out := _answers_out || jsonb_build_object(
      'question_id', _question.id,
      'answer', _user_answer,
      'is_correct', _is_correct,
      'points_earned', _points_earned,
      'ai_evaluated', _question.question_type IN ('open_ended','code')
    );
  END LOOP;

  _percentage := CASE WHEN _max_score > 0 THEN round((_total_score::numeric / _max_score) * 100) ELSE 0 END;

  UPDATE public.assessment_responses
  SET answers = _answers_out,
      total_score = _total_score,
      max_score = _max_score,
      percentage = _percentage,
      status = 'completed',
      completed_at = now(),
      tab_switches = COALESCE(_tab_switches, 0),
      tab_switch_log = COALESCE(_tab_switch_log, '[]'::jsonb)
  WHERE id = _response_id;

  RETURN jsonb_build_object(
    'response_id', _response_id,
    'total_score', _total_score,
    'max_score', _max_score,
    'percentage', _percentage,
    'open_answers', _open_answers
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_assessment_response(uuid, jsonb, integer, jsonb) TO anon, authenticated;

-- ============================================================
-- 6) Tighten assessment_responses UPDATE policy
-- ============================================================
DROP POLICY IF EXISTS "Candidates can update own in-progress responses" ON public.assessment_responses;
-- Owner UPDATE/SELECT/DELETE remain via "Users view responses for own assessments" + ALL via assessment ownership
-- (Adds owner update policy to ensure recruiters can update)
CREATE POLICY "Owners can update assessment responses"
ON public.assessment_responses FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_responses.assessment_id AND a.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_responses.assessment_id AND a.user_id = auth.uid()));

-- Allow patching AI-evaluated open answers via SECURITY DEFINER (already covered by submit_assessment_response)

-- ============================================================
-- 7) RPC to apply AI evaluations after submission
-- ============================================================
CREATE OR REPLACE FUNCTION public.apply_ai_evaluations(_response_id uuid, _evaluations jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _resp RECORD;
  _ans jsonb;
  _new_answers jsonb := '[]'::jsonb;
  _ev jsonb;
  _q_id text;
  _added integer;
  _total integer := 0;
  _percentage numeric;
BEGIN
  SELECT * INTO _resp FROM public.assessment_responses WHERE id = _response_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not found'; END IF;

  FOR _ans IN SELECT value FROM jsonb_array_elements(_resp.answers)
  LOOP
    _q_id := _ans->>'question_id';
    SELECT value INTO _ev FROM jsonb_array_elements(_evaluations)
      WHERE (value->>'question_id') = _q_id LIMIT 1;
    IF _ev IS NOT NULL THEN
      _added := COALESCE((_ev->>'score')::int, 0);
      _ans := _ans || jsonb_build_object(
        'points_earned', _added,
        'ai_feedback', _ev->>'feedback',
        'ai_strengths', _ev->'strengths',
        'ai_improvements', _ev->'improvements'
      );
    END IF;
    _total := _total + COALESCE((_ans->>'points_earned')::int, 0);
    _new_answers := _new_answers || _ans;
  END LOOP;

  _percentage := CASE WHEN _resp.max_score > 0 THEN round((_total::numeric / _resp.max_score) * 100) ELSE 0 END;

  UPDATE public.assessment_responses
  SET answers = _new_answers,
      total_score = _total,
      percentage = _percentage
  WHERE id = _response_id;

  RETURN jsonb_build_object('total_score', _total, 'percentage', _percentage);
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_ai_evaluations(uuid, jsonb) TO anon, authenticated;
