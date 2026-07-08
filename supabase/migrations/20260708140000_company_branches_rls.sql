-- =========================================================================
-- RLS POLICIES FOR COMPANY BRANCHES (PARENT-CHILD HIERARCHY)
-- =========================================================================

-- 1) Allow company owners to insert branch companies under their parent company
DROP POLICY IF EXISTS "Owners can insert company branches" ON public.companies;
CREATE POLICY "Owners can insert company branches" ON public.companies
  FOR INSERT TO authenticated
  WITH CHECK (
    parent_company_id IS NOT NULL AND 
    public.is_company_owner(parent_company_id)
  );

-- 2) Allow company owners to insert member records for their branch companies
DROP POLICY IF EXISTS "Owners can insert members for branch companies" ON public.company_members;
CREATE POLICY "Owners can insert members for branch companies" ON public.company_members
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = company_id
      AND c.parent_company_id IS NOT NULL
      AND public.is_company_owner(c.parent_company_id)
    )
  );
