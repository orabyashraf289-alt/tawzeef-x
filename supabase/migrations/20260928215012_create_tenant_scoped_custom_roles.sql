-- Replace the unrecorded July custom_roles migration. Roles are scoped to a
-- company and can only be managed by its owner (including the parent owner).
CREATE TABLE public.custom_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  name_en text,
  description text,
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(permissions) = 'array'),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX custom_roles_company_created_idx
  ON public.custom_roles (company_id, created_at DESC);

ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.custom_roles FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.custom_roles TO authenticated;
GRANT ALL ON public.custom_roles TO service_role;

CREATE POLICY "Company members view custom roles" ON public.custom_roles
  FOR SELECT TO authenticated
  USING (public.has_company_access(company_id));

CREATE POLICY "Company owners create custom roles" ON public.custom_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_company_owner(company_id)
    AND created_by = (SELECT auth.uid())
  );

CREATE POLICY "Company owners delete custom roles" ON public.custom_roles
  FOR DELETE TO authenticated
  USING (public.is_company_owner(company_id));
