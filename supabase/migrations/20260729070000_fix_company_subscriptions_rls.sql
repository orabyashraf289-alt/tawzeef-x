-- Migration: Fix company_subscriptions RLS policies to use is_super_admin_user()
-- Eliminates enum app_role casting issues and guarantees super admin access

DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.company_subscriptions;
CREATE POLICY "Admins can manage all subscriptions" ON public.company_subscriptions
  FOR ALL TO authenticated
  USING (public.is_super_admin_user())
  WITH CHECK (public.is_super_admin_user());

DROP POLICY IF EXISTS "Company owners update own subscription" ON public.company_subscriptions;
CREATE POLICY "Company owners update own subscription" ON public.company_subscriptions
  FOR UPDATE TO authenticated
  USING (public.is_company_owner(company_id) OR public.is_super_admin_user())
  WITH CHECK (public.is_company_owner(company_id) OR public.is_super_admin_user());

DROP POLICY IF EXISTS "System can insert company subscriptions" ON public.company_subscriptions;
CREATE POLICY "System can insert company subscriptions" ON public.company_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_company_owner(company_id) OR public.is_super_admin_user());