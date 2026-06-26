-- Fix permission_key names in role_permissions table to match code keys
-- This converts old Arabic keys (which broke startsWith filters and route mapping) to English standard identifiers.

-- 1. Update existing keys if they exist
UPDATE public.role_permissions SET permission_key = 'screen.jobs' WHERE permission_key = 'الوظائف';
UPDATE public.role_permissions SET permission_key = 'screen.candidates' WHERE permission_key = 'المرشحون';
UPDATE public.role_permissions SET permission_key = 'screen.pipeline' WHERE permission_key = 'مسار التوظيف';
UPDATE public.role_permissions SET permission_key = 'screen.interviews' WHERE permission_key = 'المقابلات';
UPDATE public.role_permissions SET permission_key = 'screen.reports' WHERE permission_key = 'التقارير';
UPDATE public.role_permissions SET permission_key = 'screen.ai_assistant' WHERE permission_key = 'مساعد AI';
UPDATE public.role_permissions SET permission_key = 'screen.team' WHERE permission_key = 'إدارة الفريق';
UPDATE public.role_permissions SET permission_key = 'screen.settings' WHERE permission_key = 'الإعدادات';
UPDATE public.role_permissions SET permission_key = 'action.invite_users' WHERE permission_key = 'الدعوات';
UPDATE public.role_permissions SET permission_key = 'action.evaluate_candidates' WHERE permission_key = 'تقييم المرشحين';
UPDATE public.role_permissions SET permission_key = 'action.delete_data' WHERE permission_key = 'حذف البيانات';
UPDATE public.role_permissions SET permission_key = 'action.export_data' WHERE permission_key = 'تصدير البيانات';

-- 2. Insert other screen permissions that might be missing
INSERT INTO public.role_permissions (permission_key, description, admin, recruiter, reviewer) VALUES
  ('screen.dashboard', 'عرض لوحة التحكم الرئيسية', true, true, true),
  ('screen.offers', 'عرض وإدارة العروض الوظيفية', true, true, false),
  ('screen.hiring_plan', 'عرض خطة التوظيف', true, true, false),
  ('screen.notifications', 'عرض الإشعارات وتنبيهات النظام', true, true, true),
  ('screen.talent_pool', 'عرض وإدارة قاعدة المواهب', true, true, false),
  ('screen.audit_log', 'عرض سجل الأمان ومراقبة العمليات', true, false, false),
  ('screen.tutorial', 'عرض الشروحات والتعليمات', true, true, true),
  ('screen.roadmap', 'عرض خارطة الطريق للتطوير', true, false, false)
ON CONFLICT (permission_key) DO NOTHING;
