-- Restore a table present in source history but absent from production.
-- The same migration also replaces the legacy FOR ALL member policy on replay.
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('approval', 'rejection', 'assessment')),
  subject text NOT NULL,
  body_html text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notification_templates_company_id_type_key UNIQUE (company_id, type)
);

ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.notification_templates FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.notification_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.notification_templates TO service_role;

CREATE OR REPLACE FUNCTION public.can_manage_notification_templates(_company_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = _company_id AND c.status = 'active'
      AND (c.parent_company_id IS NULL OR EXISTS (
        SELECT 1 FROM public.companies parent
        WHERE parent.id = c.parent_company_id AND parent.status = 'active'
      ))
      AND (
        public.is_company_owner(c.id)
        OR EXISTS (
          SELECT 1 FROM public.company_members cm
          WHERE cm.user_id = auth.uid() AND cm.member_role = 'hr'
            AND (cm.company_id = c.id OR cm.company_id = c.parent_company_id)
        )
      )
  );
$$;
REVOKE ALL ON FUNCTION public.can_manage_notification_templates(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_notification_templates(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Users can view templates of their company" ON public.notification_templates;
DROP POLICY IF EXISTS "Users can manage templates of their company" ON public.notification_templates;
DROP POLICY IF EXISTS "Company members read notification templates" ON public.notification_templates;
DROP POLICY IF EXISTS "Company editors insert notification templates" ON public.notification_templates;
DROP POLICY IF EXISTS "Company editors update notification templates" ON public.notification_templates;

CREATE POLICY "Company members read notification templates"
ON public.notification_templates FOR SELECT TO authenticated
USING (public.has_company_access(company_id));

CREATE POLICY "Company editors insert notification templates"
ON public.notification_templates FOR INSERT TO authenticated
WITH CHECK (public.can_manage_notification_templates(company_id));

CREATE POLICY "Company editors update notification templates"
ON public.notification_templates FOR UPDATE TO authenticated
USING (public.can_manage_notification_templates(company_id))
WITH CHECK (public.can_manage_notification_templates(company_id));
