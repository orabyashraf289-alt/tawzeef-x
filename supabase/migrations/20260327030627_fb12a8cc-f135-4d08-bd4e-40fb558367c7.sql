
DROP POLICY "System can insert audit log" ON public.audit_log;

CREATE POLICY "Authenticated users can insert audit log"
  ON public.audit_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anon can insert audit log"
  ON public.audit_log FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);
