-- Login/reset workers use this lookup with service_role. Browsers must not
-- enumerate Auth users. Capture the existing production function for replay.
CREATE OR REPLACE FUNCTION public.get_user_by_email_v1(email_input text)
RETURNS TABLE(id uuid, email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.email::text
  FROM auth.users u
  WHERE lower(u.email) = lower(email_input);
END;
$$;

REVOKE ALL ON FUNCTION public.get_user_by_email_v1(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_by_email_v1(text) TO service_role;

-- Historical installations may contain these trigger-only Auth repair helpers.
-- Do not create/replace their bodies or change any Auth trigger attachments.
-- Existing triggers continue firing after caller EXECUTE grants are removed.
DO $$
DECLARE
  helper record;
BEGIN
  FOR helper IN
    SELECT p.oid::regprocedure AS signature, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prorettype = 'trigger'::regtype
      AND p.pronargs = 0
      AND p.proname = ANY (ARRAY[
        'auto_heal_auth_audit_log_entries', 'auto_heal_auth_custom_oauth_providers',
        'auto_heal_auth_flow_state', 'auto_heal_auth_identities',
        'auto_heal_auth_mfa_amr_claims', 'auto_heal_auth_mfa_challenges',
        'auto_heal_auth_mfa_factors', 'auto_heal_auth_oauth_authorizations',
        'auto_heal_auth_oauth_client_states', 'auto_heal_auth_oauth_clients',
        'auto_heal_auth_oauth_consents', 'auto_heal_auth_one_time_tokens',
        'auto_heal_auth_refresh_tokens', 'auto_heal_auth_saml_providers',
        'auto_heal_auth_saml_relay_states', 'auto_heal_auth_sessions',
        'auto_heal_auth_sso_domains', 'auto_heal_auth_sso_providers',
        'auto_heal_auth_users', 'auto_heal_auth_webauthn_challenges',
        'auto_heal_auth_webauthn_credentials', 'ensure_audit_log_id',
        'ensure_refresh_token_id', 'dispatch_candidate_webhook',
        'dispatch_job_webhook', 'dispatch_offer_webhook',
        'handle_new_user_signup', 'handle_profile_company_creation',
        'set_row_company_id'
      ])
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', helper.signature);
    -- The first group only calls catalog built-ins (or schema-qualified net).
    -- Other existing trigger bodies retain their reviewed search_path.
    IF helper.proname NOT IN ('handle_new_user_signup', 'handle_profile_company_creation', 'set_row_company_id') THEN
      EXECUTE format('ALTER FUNCTION %s SET search_path = pg_catalog, pg_temp', helper.signature);
    END IF;
  END LOOP;
END;
$$;
