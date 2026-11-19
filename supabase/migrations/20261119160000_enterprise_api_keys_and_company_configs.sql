-- Enterprise Backend Persistence:
-- 1. Scoped Public API Keys (SHA-256 hashed, multi-tenant RLS)
-- 2. Company-wide Enterprise Settings (Regional Hijri/Currency, E2E Encryption Policy, SOC 2 / PDPL Compliance Schedule)

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- ============================================================================
-- 1. Company Public API Keys (public-api-v1 Bearer Authentication)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.company_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
  key_prefix text NOT NULL CHECK (length(btrim(key_prefix)) BETWEEN 6 AND 40),
  key_hash text NOT NULL UNIQUE CHECK (key_hash ~ '^[0-9a-f]{64}$'),
  scopes text[] NOT NULL DEFAULT ARRAY['jobs:read', 'candidates:read']::text[]
    CHECK (
      cardinality(scopes) >= 1
      AND scopes <@ ARRAY['jobs:read', 'jobs:write', 'candidates:read', 'candidates:write', 'webhooks:manage']::text[]
    ),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_api_keys_company_status
  ON public.company_api_keys(company_id, status, created_at DESC);

ALTER TABLE public.company_api_keys ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.company_api_keys FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.company_api_keys TO authenticated;
GRANT ALL ON TABLE public.company_api_keys TO service_role;

DROP POLICY IF EXISTS "Company admins read API keys" ON public.company_api_keys;
CREATE POLICY "Company admins read API keys"
  ON public.company_api_keys
  FOR SELECT
  TO authenticated
  USING (public.can_manage_company_retention(company_id));

DROP POLICY IF EXISTS "Company admins create API keys" ON public.company_api_keys;
CREATE POLICY "Company admins create API keys"
  ON public.company_api_keys
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_manage_company_retention(company_id)
    AND (created_by IS NULL OR created_by = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Company admins update API keys" ON public.company_api_keys;
CREATE POLICY "Company admins update API keys"
  ON public.company_api_keys
  FOR UPDATE
  TO authenticated
  USING (public.can_manage_company_retention(company_id))
  WITH CHECK (public.can_manage_company_retention(company_id));

DROP POLICY IF EXISTS "Company admins delete API keys" ON public.company_api_keys;
CREATE POLICY "Company admins delete API keys"
  ON public.company_api_keys
  FOR DELETE
  TO authenticated
  USING (public.can_manage_company_retention(company_id));

DROP TRIGGER IF EXISTS update_company_api_keys_ts ON public.company_api_keys;
CREATE TRIGGER update_company_api_keys_ts
  BEFORE UPDATE ON public.company_api_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- 2. Company-Wide Enterprise Settings (Regional, Encryption Policy, Compliance)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.company_enterprise_settings (
  company_id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  regional_settings jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(regional_settings) = 'object'),
  encryption_policy jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(encryption_policy) = 'object'),
  compliance_schedule jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(compliance_schedule) = 'object'),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.company_enterprise_settings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.company_enterprise_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.company_enterprise_settings TO authenticated;
GRANT ALL ON TABLE public.company_enterprise_settings TO service_role;

DROP POLICY IF EXISTS "Company members read enterprise settings" ON public.company_enterprise_settings;
CREATE POLICY "Company members read enterprise settings"
  ON public.company_enterprise_settings
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin((SELECT auth.uid()))
    OR public.is_company_owner(company_id)
    OR EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = company_enterprise_settings.company_id
        AND cm.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Company admins insert enterprise settings" ON public.company_enterprise_settings;
CREATE POLICY "Company admins insert enterprise settings"
  ON public.company_enterprise_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_manage_company_retention(company_id));

DROP POLICY IF EXISTS "Company admins update enterprise settings" ON public.company_enterprise_settings;
CREATE POLICY "Company admins update enterprise settings"
  ON public.company_enterprise_settings
  FOR UPDATE
  TO authenticated
  USING (public.can_manage_company_retention(company_id))
  WITH CHECK (public.can_manage_company_retention(company_id));

DROP TRIGGER IF EXISTS update_company_enterprise_settings_ts ON public.company_enterprise_settings;
CREATE TRIGGER update_company_enterprise_settings_ts
  BEFORE UPDATE ON public.company_enterprise_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
