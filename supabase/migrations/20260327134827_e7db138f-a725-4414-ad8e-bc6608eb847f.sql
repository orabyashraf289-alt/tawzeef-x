
-- Fix 1: Restrict invitations admin policy to authenticated only
DROP POLICY IF EXISTS "Admins can manage invitations" ON public.invitations;
CREATE POLICY "Admins can manage invitations"
ON public.invitations
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix 2: Add anon deny policy on login_otp_challenges
CREATE POLICY "No anon access to otp challenges"
ON public.login_otp_challenges
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Fix 3: Remove anon insert on audit_log (keep authenticated only)
DROP POLICY IF EXISTS "Anon can insert audit log" ON public.audit_log;
