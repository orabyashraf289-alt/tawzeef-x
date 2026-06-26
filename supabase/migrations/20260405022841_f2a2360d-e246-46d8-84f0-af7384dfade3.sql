
DROP POLICY "Anyone can submit assessment responses" ON public.assessment_responses;
CREATE POLICY "Anyone can submit responses to active assessments" ON public.assessment_responses
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND a.is_active = true)
  );
