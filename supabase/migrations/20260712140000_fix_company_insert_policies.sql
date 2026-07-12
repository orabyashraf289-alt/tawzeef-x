-- Allow authenticated users to insert companies where they are the owner
DROP POLICY IF EXISTS "Users can insert companies" ON public.companies;
CREATE POLICY "Users can insert companies" ON public.companies
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_user_id);

-- Allow authenticated users to insert company memberships for themselves
DROP POLICY IF EXISTS "Users can insert company members" ON public.company_members;
CREATE POLICY "Users can insert company members" ON public.company_members
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
