-- Migration: Subscription Upgrade Requests & Company Invoices

-- 1. Create subscription_upgrade_requests table
CREATE TABLE IF NOT EXISTS public.subscription_upgrade_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  requested_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_plan_id TEXT NOT NULL,
  target_plan_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create company_invoices table
CREATE TABLE IF NOT EXISTS public.company_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  subscription_id UUID,
  plan_id TEXT NOT NULL,
  plan_name_ar TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'SAR',
  job_posts_limit INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'cancelled')),
  issued_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_upgrade_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_invoices ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(public.is_super_admin(auth.uid()), false) OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'::app_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for subscription_upgrade_requests
CREATE POLICY "Super admins can manage all upgrade requests"
  ON public.subscription_upgrade_requests FOR ALL
  USING (public.is_super_admin_user());

CREATE POLICY "Company members can view their upgrade requests"
  ON public.subscription_upgrade_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = subscription_upgrade_requests.company_id
      AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Company members can insert upgrade requests"
  ON public.subscription_upgrade_requests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = subscription_upgrade_requests.company_id
      AND cm.user_id = auth.uid()
    )
  );

-- RLS Policies for company_invoices
CREATE POLICY "Super admins can manage all company invoices"
  ON public.company_invoices FOR ALL
  USING (public.is_super_admin_user());

CREATE POLICY "Company members can view their company invoices"
  ON public.company_invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = company_invoices.company_id
      AND cm.user_id = auth.uid()
    )
  );

-- Grant privileges
GRANT ALL ON public.subscription_upgrade_requests TO authenticated;
GRANT ALL ON public.subscription_upgrade_requests TO service_role;

GRANT ALL ON public.company_invoices TO authenticated;
GRANT ALL ON public.company_invoices TO service_role;
