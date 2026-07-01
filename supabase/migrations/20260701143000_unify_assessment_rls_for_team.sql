-- ============================================================
-- UNIFY ASSESSMENT & QUESTIONS RLS FOR TEAM COLLABORATION
-- ============================================================

-- 1) ASSESSMENT QUESTIONS: allow company members to manage
DROP POLICY IF EXISTS "Users manage own assessment questions" ON public.assessment_questions;
CREATE POLICY "Company members manage assessment questions" ON public.assessment_questions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assessments a 
      WHERE a.id = assessment_id 
      AND (
        (a.company_id IS NOT NULL AND public.has_company_access(a.company_id))
        OR (a.user_id = auth.uid())
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assessments a 
      WHERE a.id = assessment_id 
      AND (
        (a.company_id IS NOT NULL AND public.has_company_access(a.company_id))
        OR (a.user_id = auth.uid())
      )
    )
  );

-- 2) ASSESSMENT RESPONSES: allow company members to view responses
DROP POLICY IF EXISTS "Users view responses for own assessments" ON public.assessment_responses;
CREATE POLICY "Company members view assessment responses" ON public.assessment_responses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assessments a 
      WHERE a.id = assessment_id 
      AND (
        (a.company_id IS NOT NULL AND public.has_company_access(a.company_id))
        OR (a.user_id = auth.uid())
      )
    )
  );
