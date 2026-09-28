-- Replace both unrecorded July granular-permissions migrations. A real
-- nullable-column unique constraint supports PostgREST's column-based upsert.
CREATE TABLE public.granular_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role_key text NOT NULL CHECK (length(btrim(role_key)) > 0),
  user_id uuid,
  module_key text NOT NULL CHECK (length(btrim(module_key)) > 0),
  can_read boolean NOT NULL DEFAULT true,
  can_create boolean NOT NULL DEFAULT true,
  can_edit boolean NOT NULL DEFAULT true,
  can_delete boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT granular_permissions_member_fkey
    FOREIGN KEY (company_id, user_id)
    REFERENCES public.company_members (company_id, user_id) ON DELETE CASCADE,
  CONSTRAINT granular_permissions_target_consistent CHECK (
    (user_id IS NULL AND role_key NOT LIKE 'user:%')
    OR (user_id IS NOT NULL AND role_key = 'user:' || user_id::text)
  ),
  CONSTRAINT granular_permissions_scope_unique
    UNIQUE NULLS NOT DISTINCT (company_id, role_key, user_id, module_key)
);

CREATE INDEX granular_permissions_member_idx
  ON public.granular_permissions (company_id, user_id)
  WHERE user_id IS NOT NULL;

ALTER TABLE public.granular_permissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.granular_permissions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.granular_permissions TO authenticated;
GRANT ALL ON public.granular_permissions TO service_role;

CREATE POLICY "Company members view role or own overrides" ON public.granular_permissions
  FOR SELECT TO authenticated
  USING (
    public.has_company_access(company_id)
    AND (user_id IS NULL OR user_id = (SELECT auth.uid()) OR public.is_company_owner(company_id))
  );

CREATE POLICY "Company owners create permission overrides" ON public.granular_permissions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_company_owner(company_id));

CREATE POLICY "Company owners update permission overrides" ON public.granular_permissions
  FOR UPDATE TO authenticated
  USING (public.is_company_owner(company_id))
  WITH CHECK (public.is_company_owner(company_id));

CREATE POLICY "Company owners delete permission overrides" ON public.granular_permissions
  FOR DELETE TO authenticated
  USING (public.is_company_owner(company_id));
