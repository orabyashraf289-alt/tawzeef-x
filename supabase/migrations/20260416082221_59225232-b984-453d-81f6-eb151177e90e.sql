ALTER TABLE public.pipeline_stages 
ADD COLUMN assigned_user_ids uuid[] DEFAULT '{}'::uuid[];