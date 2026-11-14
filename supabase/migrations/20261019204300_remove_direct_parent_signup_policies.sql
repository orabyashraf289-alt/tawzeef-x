-- Company registration creates the parent and first owner membership in a
-- trusted profile trigger. Direct REST inserts cannot distinguish a new
-- signup from a former owner whose membership was deliberately removed.
-- Platform admin policies and branch-owner policies remain in place.
DROP POLICY IF EXISTS "Users can insert company members" ON public.company_members;
DROP POLICY IF EXISTS "Users can insert companies" ON public.companies;
DROP POLICY IF EXISTS "Company creators view their own main company" ON public.companies;
