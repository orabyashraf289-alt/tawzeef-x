-- Restore the application action keys used by the hiring forms. Existing
-- tenant-specific grants remain untouched when a row was already configured.
INSERT INTO public.role_permissions (permission_key, description, admin, recruiter, reviewer) VALUES
  ('action.edit_jobs', 'تعديل الوظائف', true, true, false),
  ('action.delete_jobs', 'حذف الوظائف', true, false, false),
  ('action.edit_candidates', 'تعديل بيانات المرشحين', true, true, false),
  ('action.create_interviews', 'جدولة المقابلات', true, true, false),
  ('action.edit_interviews', 'تعديل المقابلات', true, true, false)
ON CONFLICT (permission_key) DO NOTHING;
