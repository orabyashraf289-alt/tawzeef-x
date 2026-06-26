
-- Table to store editable permissions per role
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_key text NOT NULL,
  description text,
  admin boolean NOT NULL DEFAULT true,
  recruiter boolean NOT NULL DEFAULT false,
  reviewer boolean NOT NULL DEFAULT false,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  UNIQUE(permission_key)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage permissions"
  ON public.role_permissions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- All authenticated users can read permissions (needed to enforce them)
CREATE POLICY "Authenticated users can read permissions"
  ON public.role_permissions FOR SELECT
  TO authenticated
  USING (true);

-- Seed default permissions
INSERT INTO public.role_permissions (permission_key, description, admin, recruiter, reviewer) VALUES
  ('الوظائف', 'إنشاء وتعديل وحذف الوظائف', true, true, false),
  ('المرشحون', 'عرض وإدارة المرشحين', true, true, true),
  ('مسار التوظيف', 'تحريك المرشحين بين المراحل', true, true, false),
  ('المقابلات', 'جدولة وإدارة المقابلات', true, true, true),
  ('التقارير', 'عرض التقارير والإحصائيات', true, true, false),
  ('مساعد AI', 'استخدام المساعد الذكي', true, true, false),
  ('إدارة الفريق', 'إدارة المستخدمين والأدوار', true, false, false),
  ('الإعدادات', 'تغيير إعدادات النظام', true, false, false),
  ('الدعوات', 'دعوة مستخدمين جدد', true, false, false),
  ('تقييم المرشحين', 'إضافة تقييمات ومراجعات', true, true, true),
  ('حذف البيانات', 'حذف المرشحين والوظائف', true, false, false),
  ('تصدير البيانات', 'تصدير التقارير والبيانات', true, true, false);
