-- 1) Fix the applications RLS policy by replacing auth.users query with auth.jwt()
-- This resolves the "permission denied for table users" error completely.
DROP POLICY IF EXISTS "Applicants can view own applications" ON public.applications;
CREATE POLICY "Applicants can view own applications" ON public.applications
FOR SELECT TO authenticated
USING (email = (auth.jwt() ->> 'email')::text);

-- 2) Re-grant execute permission on has_role and get_user_role functions to clients
-- RLS policies are evaluated under the querying user's context, so clients need execute rights.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated, anon;
