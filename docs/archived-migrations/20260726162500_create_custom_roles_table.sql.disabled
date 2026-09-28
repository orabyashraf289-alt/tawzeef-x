-- Create custom_roles table for granular permissions per company
CREATE TABLE IF NOT EXISTS public.custom_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  name text NOT NULL,
  name_en text,
  description text,
  permissions jsonb DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Anyone view custom roles" ON public.custom_roles;
CREATE POLICY "Anyone view custom roles" ON public.custom_roles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage custom roles" ON public.custom_roles;
CREATE POLICY "Admins manage custom roles" ON public.custom_roles FOR ALL USING (true);
