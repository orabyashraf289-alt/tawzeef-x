-- Fix company_members RLS Policy Infinite Recursion
-- Replaces recursive subquery with the security definer has_company_access function.

DROP POLICY IF EXISTS "Members view own company members" ON public.company_members;
CREATE POLICY "Members view own company members" ON public.company_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    public.has_company_access(company_id)
  );
