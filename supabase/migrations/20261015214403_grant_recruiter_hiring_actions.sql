-- Enable the four approved hiring actions for the global recruiter role.
-- Keep reviewer denied and leave destructive actions to tenant admins.
INSERT INTO public.role_permissions
  (permission_key, description, admin, recruiter, reviewer)
VALUES
  ('action.edit_jobs', 'تعديل الوظائف', true, true, false),
  ('action.edit_candidates', 'تعديل بيانات المرشحين', true, true, false),
  ('action.create_interviews', 'جدولة المقابلات', true, true, false),
  ('action.edit_interviews', 'تعديل المقابلات', true, true, false)
ON CONFLICT (permission_key) DO NOTHING;
