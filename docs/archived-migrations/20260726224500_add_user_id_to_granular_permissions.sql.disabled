-- Add user_id column to granular_permissions table for individual user overrides
ALTER TABLE public.granular_permissions ADD COLUMN IF NOT EXISTS user_id uuid;

-- Drop previous unique constraint if exists
ALTER TABLE public.granular_permissions DROP CONSTRAINT IF EXISTS unique_company_role_module;

-- Create flexible unique index for both Role-based and User-specific permissions
DROP INDEX IF EXISTS idx_company_role_user_module;
CREATE UNIQUE INDEX IF NOT EXISTS idx_company_role_user_module ON public.granular_permissions (
  COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid),
  role_key,
  COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid),
  module_key
);
