-- Keep these policies aligned with the live platform-role and owner checks.

DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.company_subscriptions;
CREATE POLICY "Admins can manage all subscriptions" ON public.company_subscriptions
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Company owners update own subscription" ON public.company_subscriptions;
CREATE POLICY "Company owners update own subscription" ON public.company_subscriptions
  FOR UPDATE TO authenticated
  USING (public.is_company_owner(company_id))
  WITH CHECK (public.is_company_owner(company_id));

DROP POLICY IF EXISTS "System can insert company subscriptions" ON public.company_subscriptions;
CREATE POLICY "System can insert company subscriptions" ON public.company_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_company_owner(company_id));
