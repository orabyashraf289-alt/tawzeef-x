-- Function to query triggers on auth.users
CREATE OR REPLACE FUNCTION public.get_auth_triggers()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  res json;
BEGIN
  SELECT json_agg(row_to_json(t)) INTO res
  FROM (
    SELECT 
      trg.tgname as trigger_name,
      rel.relname as table_name,
      nsp.nspname as schema_name,
      proc.proname as function_name,
      pg_get_triggerdef(trg.oid) as trigger_def
    FROM pg_trigger trg
    JOIN pg_class rel ON trg.tgrelid = rel.oid
    JOIN pg_namespace nsp ON rel.relnamespace = nsp.oid
    JOIN pg_proc proc ON trg.tgfoid = proc.oid
    WHERE nsp.nspname = 'auth' AND rel.relname = 'users'
  ) t;
  RETURN COALESCE(res, '[]'::json);
END;
$$;
