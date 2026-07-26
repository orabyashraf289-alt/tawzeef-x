-- Create granular_permissions table for Module-level Read/Create/Edit/Delete Matrix
CREATE TABLE IF NOT EXISTS public.granular_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  role_key text NOT NULL,
  module_key text NOT NULL,
  can_read boolean DEFAULT true,
  can_create boolean DEFAULT true,
  can_edit boolean DEFAULT true,
  can_delete boolean DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_company_role_module UNIQUE (company_id, role_key, module_key)
);

-- Enable RLS
ALTER TABLE public.granular_permissions ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Anyone view granular permissions" ON public.granular_permissions;
CREATE POLICY "Anyone view granular permissions" ON public.granular_permissions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage granular permissions" ON public.granular_permissions;
CREATE POLICY "Admins manage granular permissions" ON public.granular_permissions FOR ALL USING (true);
