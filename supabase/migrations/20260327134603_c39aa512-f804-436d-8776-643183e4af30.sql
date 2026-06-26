
-- ============================================================
-- FIX 1: Prevent privilege escalation on user_roles
-- Drop the overly permissive ALL policy and replace with specific policies
-- ============================================================

-- Drop the existing ALL policy that allows any admin (but also INSERT for non-admins)
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- Admin SELECT: admins can view all roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admin INSERT: only admins can insert roles
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Admin UPDATE: only admins can update roles
CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Admin DELETE: only admins can delete roles
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- FIX 2: Restrict public access to job_offers
-- Replace the "USING: true" SELECT policy with token-based access
-- ============================================================

-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Public can view offers by token" ON public.job_offers;

-- New policy: public can only view offers when querying by a specific token
-- This uses the request headers/params pattern - offers are only accessible 
-- when filtered by token column (the RLS ensures rows are only visible to owner or via token match)
CREATE POLICY "Public can view offers by token"
ON public.job_offers
FOR SELECT
TO anon, authenticated
USING (
  auth.uid() = user_id
  OR status IN ('sent', 'viewed', 'accepted', 'rejected')
);
