-- Migration: Add manager_user_id to companies table for branch manager assignment

ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS manager_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_companies_manager_user_id ON public.companies(manager_user_id);

-- Ensure company members and assigned branch managers can view their assigned branch companies
CREATE POLICY "Branch managers can view assigned branch company"
  ON public.companies FOR SELECT
  USING (
    manager_user_id = auth.uid()
    OR owner_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = companies.id
      AND cm.user_id = auth.uid()
    )
    OR public.is_super_admin_user()
  );
