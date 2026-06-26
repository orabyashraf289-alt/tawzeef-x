
-- Create pipeline_stages table
CREATE TABLE public.pipeline_stages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT '#6366f1',
  icon text NOT NULL DEFAULT 'circle',
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can manage own stages"
ON public.pipeline_stages
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_pipeline_stages_updated_at
BEFORE UPDATE ON public.pipeline_stages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Function to seed default stages for new company users
CREATE OR REPLACE FUNCTION public.seed_default_pipeline_stages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _account_type text;
BEGIN
  _account_type := NEW.raw_user_meta_data->>'account_type';
  
  IF _account_type IS DISTINCT FROM 'job_seeker' THEN
    INSERT INTO public.pipeline_stages (user_id, name, sort_order, color, icon, is_default) VALUES
      (NEW.id, 'تقديم الطلب', 0, '#6366f1', 'file-text', true),
      (NEW.id, 'مراجعة السيرة', 1, '#8b5cf6', 'file-search', true),
      (NEW.id, 'فحص هاتفي', 2, '#0ea5e9', 'phone', true),
      (NEW.id, 'مقابلة تقنية', 3, '#f59e0b', 'code', true),
      (NEW.id, 'مقابلة نهائية', 4, '#10b981', 'users', true),
      (NEW.id, 'العرض الوظيفي', 5, '#059669', 'briefcase', true);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Attach trigger to auth.users on insert
CREATE TRIGGER on_auth_user_created_seed_stages
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.seed_default_pipeline_stages();
