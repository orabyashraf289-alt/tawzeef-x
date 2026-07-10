-- ============================================================
-- CREATE NOTIFICATION TEMPLATES TABLE FOR CUSTOM MESSAGING
-- ============================================================

CREATE TABLE public.notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('approval', 'rejection', 'assessment')),
  subject text NOT NULL,
  body_html text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT notification_templates_company_id_type_key UNIQUE (company_id, type)
);

ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view templates of their company" ON public.notification_templates
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = notification_templates.company_id
        AND cm.user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.companies c
      JOIN public.company_members cm ON c.parent_company_id = cm.company_id
      WHERE c.id = notification_templates.company_id
        AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage templates of their company" ON public.notification_templates
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = notification_templates.company_id
        AND cm.user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.companies c
      JOIN public.company_members cm ON c.parent_company_id = cm.company_id
      WHERE c.id = notification_templates.company_id
        AND cm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.company_members cm
      WHERE cm.company_id = notification_templates.company_id
        AND cm.user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.companies c
      JOIN public.company_members cm ON c.parent_company_id = cm.company_id
      WHERE c.id = notification_templates.company_id
        AND cm.user_id = auth.uid()
    )
  );
