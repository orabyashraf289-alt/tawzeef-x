-- Fix recursion in public.company_members RLS by adding a direct user_id check for SELECT
CREATE POLICY "Users can view own company memberships" ON public.company_members
  FOR SELECT USING (auth.uid() = user_id);
