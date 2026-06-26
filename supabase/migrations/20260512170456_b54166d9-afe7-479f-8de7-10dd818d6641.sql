
-- 1) Storage listing: restrict avatars SELECT (listing) to authenticated.
-- Public file URLs still work because the bucket is public.
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
CREATE POLICY "Authenticated users can list avatars"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'avatars');

-- 2) Lock down SECURITY DEFINER functions: revoke from PUBLIC + anon + authenticated,
--    then grant back only to the public-flow RPCs.

-- Revoke broad EXECUTE on every public SECURITY DEFINER function we manage.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated',
                   r.proname, r.args);
  END LOOP;
END $$;

-- Re-grant ONLY the public-facing RPCs the app needs
GRANT EXECUTE ON FUNCTION public.get_offer_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_offer(text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_assessment_for_candidate(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_assessment_response(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_assessment_response(uuid, jsonb, integer, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(text) TO anon, authenticated;

-- has_role / get_user_role used inside RLS policies — RLS evaluates as the policy owner,
-- so explicit GRANT to clients is not required. Leave revoked.
