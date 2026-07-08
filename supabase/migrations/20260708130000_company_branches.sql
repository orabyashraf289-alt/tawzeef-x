-- =========================================================================
-- SUPPORT FOR COMPANY BRANCHES (PARENT-CHILD HIERARCHY)
-- =========================================================================

-- Add parent_company_id to public.companies table
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS parent_company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- Add index on parent_company_id for optimization
CREATE INDEX IF NOT EXISTS idx_companies_parent_id ON public.companies(parent_company_id);
