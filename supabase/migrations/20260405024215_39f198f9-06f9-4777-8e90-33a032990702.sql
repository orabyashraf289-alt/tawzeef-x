
ALTER TABLE public.pipeline_stages
ADD COLUMN assessment_id uuid REFERENCES public.assessments(id) ON DELETE SET NULL DEFAULT NULL;
