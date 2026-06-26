CREATE POLICY "No client access to login otp challenges"
ON public.login_otp_challenges
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);