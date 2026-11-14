-- Let a new company owner read their company before the first membership is
-- inserted. This makes the ownership lookup below work under companies RLS.
DROP POLICY IF EXISTS "Company creators view their own main company" ON public.companies;
CREATE POLICY "Company creators view their own main company" ON public.companies
  FOR SELECT TO authenticated
  USING (
    owner_user_id = (SELECT auth.uid())
    AND parent_company_id IS NULL
  );

-- The old self-join policy only checked user_id, so a signed-in user could
-- attach themselves as owner to any company ID. The owner lookup here runs
-- with the caller's RLS privileges; it does not introduce a bypass function.
DROP POLICY IF EXISTS "Users can insert company members" ON public.company_members;
CREATE POLICY "Users can insert company members" ON public.company_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND member_role = 'owner'
    AND EXISTS (
      SELECT 1 FROM public.companies AS c
      WHERE c.id = company_id
        AND c.parent_company_id IS NULL
        AND c.owner_user_id = (SELECT auth.uid())
    )
  );

-- The separate branch INSERT policy still lets a parent company owner add a
-- branch. Self-service company creation must not attach to another parent.
DROP POLICY IF EXISTS "Users can insert companies" ON public.companies;
CREATE POLICY "Users can insert companies" ON public.companies
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_user_id = (SELECT auth.uid())
    AND parent_company_id IS NULL
  );
