-- ============================================================
-- ALTER COMPANIES TABLE FOR E2E ENCRYPTION
-- ============================================================
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS e2e_encryption boolean DEFAULT false;

-- ============================================================
-- ALTER CANDIDATES TABLE FOR E2E ENCRYPTION FIELDS
-- ============================================================
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS expected_salary text;
ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS notes text;

-- ============================================================
-- SHARE QUESTION BANK & OPTIONS WITH TEAM MEMBERS
-- ============================================================
DROP POLICY IF EXISTS "Allow company members to view shared questions" ON public.question_bank;
CREATE POLICY "Allow company members to view shared questions" ON public.question_bank
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 
      FROM public.company_members cm1 
      JOIN public.company_members cm2 ON cm1.company_id = cm2.company_id 
      WHERE cm1.user_id = auth.uid() 
        AND cm2.user_id = question_bank.user_id
    )
  );

DROP POLICY IF EXISTS "Allow company members to view shared options" ON public.question_options;
CREATE POLICY "Allow company members to view shared options" ON public.question_options
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.question_bank q
      WHERE q.id = question_options.question_id
        AND (
          q.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 
            FROM public.company_members cm1 
            JOIN public.company_members cm2 ON cm1.company_id = cm2.company_id 
            WHERE cm1.user_id = auth.uid() 
              AND cm2.user_id = q.user_id
          )
        )
    )
  );

-- ============================================================
-- UPGRADE ASSESSMENT RESPONSES SUBMISSION FUNCTION
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
    ELSIF _question.question_type = 'matching' THEN
      -- _user_answer is a JSON string of a map: {"option_id": "value", ...}
      DECLARE
        _opt RECORD;
        _user_match text;
        _total_pairs integer := 0;
        _correct_pairs integer := 0;
      BEGIN
        FOR _opt IN SELECT * FROM public.question_options WHERE question_id = _question.id LOOP
          _total_pairs := _total_pairs + 1;
          _user_match := NULL;
          IF _user_answer IS NOT NULL AND _user_answer <> '' THEN
            BEGIN
              _user_match := (_user_answer::jsonb)->>_opt.id::text;
            EXCEPTION WHEN OTHERS THEN
              _user_match := NULL;
            END;
          END IF;
          
          -- Option text format left||right. Extract right part
          IF _user_match = split_part(_opt.option_text, '||', 2) THEN
            _correct_pairs := _correct_pairs + 1;
          END IF;
        END LOOP;
        
        IF _total_pairs > 0 AND _correct_pairs = _total_pairs THEN
          _is_correct := true;
          _points_earned := _question.effective_points;
          _total_score := _total_score + _points_earned;
        END IF;
      END;
    ELSIF _question.question_type = 'ordering' THEN
      -- _user_answer is a JSON array of strings: ["item1", "item2", ...]
      DECLARE
        _opt RECORD;
        _idx integer := 0;
        _is_order_correct boolean := true;
        _total_opts integer := 0;
        _user_item text;
      BEGIN
        FOR _opt IN SELECT * FROM public.question_options WHERE question_id = _question.id ORDER BY sort_order LOOP
          _user_item := NULL;
          IF _user_answer IS NOT NULL AND _user_answer <> '' THEN
            BEGIN
              _user_item := (_user_answer::jsonb)->>_idx;
            EXCEPTION WHEN OTHERS THEN
              _user_item := NULL;
            END;
          END IF;
          
          IF _user_item IS NULL OR _user_item <> _opt.option_text THEN
            _is_order_correct := false;
          END IF;
          _idx := _idx + 1;
          _total_opts := _total_opts + 1;
        END LOOP;
        
        IF _total_opts > 0 AND _is_order_correct THEN
          -- Verify array length matches total options
          DECLARE
            _user_len integer;
          BEGIN
            _user_len := jsonb_array_length(_user_answer::jsonb);
            IF _user_len = _total_opts THEN
              _is_correct := true;
              _points_earned := _question.effective_points;
              _total_score := _total_score + _points_earned;
            END IF;
          EXCEPTION WHEN OTHERS THEN
            -- ignore
          END;
        END IF;
      END;
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
