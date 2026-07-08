-- =========================================================================
-- UPDATE SELECT POLICY FOR COMPANY BRANCHES (PARENT-CHILD HIERARCHY)
-- =========================================================================

-- Allow company owners to view branch companies of their parent company
DROP POLICY IF EXISTS "Members view own company" ON public.companies;
CREATE POLICY "Members view own company" ON public.companies
  FOR SELECT TO authenticated
  USING (
    public.has_company_access(id) OR
    (parent_company_id IS NOT NULL AND public.is_company_owner(parent_company_id))
  );
