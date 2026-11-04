-- Membership rows can outlive an Auth account; reject stale tokens for deleted/banned accounts.
ALTER FUNCTION evaluation_private.request(uuid,text,jsonb) RENAME TO request_impl;
REVOKE ALL ON FUNCTION evaluation_private.request_impl(uuid,text,jsonb) FROM PUBLIC, anon, authenticated;
CREATE FUNCTION evaluation_private.request(_company_id uuid,_action text,_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS (
   SELECT 1 FROM auth.users u WHERE u.id=auth.uid() AND u.deleted_at IS NULL
     AND (u.banned_until IS NULL OR u.banned_until<=clock_timestamp())
 ) THEN RAISE EXCEPTION 'Active account required' USING ERRCODE='42501'; END IF;
 RETURN evaluation_private.request_impl(_company_id,_action,_payload);
END;
$$;
REVOKE ALL ON FUNCTION evaluation_private.request(uuid,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION evaluation_private.request(uuid,text,jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.performance360(_company_id uuid,_action text,_payload jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 SELECT evaluation_private.request(_company_id,_action,_payload);
$$;
REVOKE ALL ON FUNCTION public.performance360(uuid,text,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.performance360(uuid,text,jsonb) TO authenticated;
