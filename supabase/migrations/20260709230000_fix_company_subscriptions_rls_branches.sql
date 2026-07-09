-- Update company_subscriptions SELECT policy to allow branch members to view the parent subscription
DROP POLICY IF EXISTS "Company members view own subscription" ON public.company_subscriptions;

CREATE POLICY "Company members view own subscription" ON public.company_subscriptions
  FOR SELECT TO authenticated
  USING (
    public.has_company_access(company_id) OR
    EXISTS (
      SELECT 1 FROM public.company_members cm
      JOIN public.companies c ON c.id = cm.company_id
      WHERE c.parent_company_id = company_subscriptions.company_id AND cm.user_id = auth.uid()
    )
  );
