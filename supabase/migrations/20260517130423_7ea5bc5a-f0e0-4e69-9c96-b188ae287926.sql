INSERT INTO public.checklist_templates (key, name_ar, name_en, description, items, is_default, is_active)
VALUES (
  'ksa_full_recruitment',
  'مسار التوظيف السعودي الكامل',
  'KSA Full Recruitment Flow',
  'مسار شامل من تحديد الاحتياج حتى التعاقد عبر منصة قوى',
  '[
    {"title":"تحديد الاحتياج الوظيفي","description":"وحدة التخطيط — المخرج: إعلان وظيفي مُولَّد تلقائياً","assigned_to_type":"owner"},
    {"title":"تسجيل المتقدمين","description":"الأفراد / الوكالات — المخرج: بروفايل + كود للمتقدم","assigned_to_type":"recruiter"},
    {"title":"الفرز الأولي بالذكاء الاصطناعي","description":"AI + السيرة الذاتية — المخرج: قائمة المؤهلين مبدئياً","assigned_to_type":"recruiter"},
    {"title":"الاختبار التحريري","description":"بنك الأسئلة + المتقدم — المخرج: نتيجة + تحليل AI","assigned_to_type":"recruiter"},
    {"title":"المقابلة الفنية","description":"المشرفون التعليميون — المخرج: نقاط التقييم + توصية","assigned_to_type":"hr"},
    {"title":"مقابلة الاعتماد الإداري","description":"اللجنة الإدارية + AI — المخرج: قرار القبول / الاستبعاد","assigned_to_type":"owner"},
    {"title":"عرض الوظيفة","description":"إدارة الرواتب والمزايا — المخرج: قبول المرشح موثَّقاً","assigned_to_type":"hr"},
    {"title":"إجراءات الاستقدام (خارج المملكة)","description":"المكاتب الخارجية + المعاملات الحكومية — المخرج: تأشيرة سارية 100%","assigned_to_type":"agency"},
    {"title":"النقل إلى HR","description":"وحدة الموارد البشرية — المخرج: عقد عمل عبر منصة قوى","assigned_to_type":"hr"}
  ]'::jsonb,
  false,
  true
)
ON CONFLICT (key) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  description = EXCLUDED.description,
  items = EXCLUDED.items,
  is_active = true;