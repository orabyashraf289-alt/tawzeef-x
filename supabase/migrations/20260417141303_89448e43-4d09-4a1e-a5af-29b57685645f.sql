-- Blog Posts table
CREATE TABLE public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  excerpt_ar TEXT,
  excerpt_en TEXT,
  content_ar TEXT NOT NULL,
  content_en TEXT NOT NULL,
  cover_image TEXT,
  category TEXT DEFAULT 'general',
  author_name TEXT NOT NULL DEFAULT 'فريق Tawzeef-X',
  author_avatar TEXT,
  read_time_minutes INTEGER DEFAULT 5,
  published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for slug lookups
CREATE INDEX idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX idx_blog_posts_published ON public.blog_posts(published, published_at DESC);

-- Enable RLS
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Anyone can view published posts
CREATE POLICY "Anyone can view published blog posts"
ON public.blog_posts
FOR SELECT
USING (published = true);

-- Admins can do everything
CREATE POLICY "Admins can manage blog posts"
ON public.blog_posts
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Auto update updated_at
CREATE TRIGGER blog_posts_updated_at
BEFORE UPDATE ON public.blog_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Seed initial posts
INSERT INTO public.blog_posts (slug, title_ar, title_en, excerpt_ar, excerpt_en, content_ar, content_en, category, read_time_minutes, published, published_at) VALUES
(
  'ai-revolutionizing-recruitment',
  'كيف يُحدث الذكاء الاصطناعي ثورة في عالم التوظيف',
  'How AI Is Revolutionizing the World of Recruitment',
  'اكتشف كيف يغير الذكاء الاصطناعي طريقة عمل فرق الموارد البشرية ويوفر 80% من الوقت في فلترة المرشحين.',
  'Discover how AI is transforming HR teams and saving 80% of time in candidate screening.',
  E'# الذكاء الاصطناعي في التوظيف\n\nشهد مجال التوظيف تحولاً جذرياً مع دخول تقنيات الذكاء الاصطناعي. اليوم، يمكن للشركات معالجة آلاف السير الذاتية في دقائق معدودة بدلاً من أسابيع.\n\n## أبرز الفوائد\n\n- **توفير الوقت**: تحليل تلقائي للسير الذاتية\n- **دقة عالية**: تقييم موضوعي للمهارات\n- **تجربة مرشح أفضل**: ردود فورية وتواصل سريع\n\n## كيف نطبق هذا في Tawzeef-X؟\n\nنستخدم نماذج لغوية متقدمة لتحليل المرشحين وتقييم تطابقهم مع الوظائف بدقة تصل إلى 92%.',
  E'# AI in Recruitment\n\nThe recruitment field has witnessed a radical transformation with AI technologies. Today, companies can process thousands of resumes in minutes instead of weeks.\n\n## Key Benefits\n\n- **Time Saving**: Automatic resume analysis\n- **High Accuracy**: Objective skills assessment\n- **Better Candidate Experience**: Instant responses\n\n## How We Apply This at Tawzeef-X?\n\nWe use advanced language models to analyze candidates and assess their match with jobs at 92% accuracy.',
  'ai',
  6,
  true,
  now() - interval '5 days'
),
(
  'remote-hiring-best-practices',
  'أفضل ممارسات التوظيف عن بُعد في 2026',
  'Best Remote Hiring Practices in 2026',
  'دليل شامل لإدارة فرق التوظيف عن بُعد بفعالية مع استخدام أحدث الأدوات الرقمية.',
  'A comprehensive guide to managing remote hiring teams with the latest digital tools.',
  E'# التوظيف عن بُعد\n\nأصبح التوظيف عن بُعد المعيار الجديد للشركات الحديثة. إليك أفضل الممارسات:\n\n## 1. المقابلات المرئية المنظمة\n\nاستخدم منصات احترافية مع تسجيل ونسخ نصي تلقائي.\n\n## 2. اختبارات تقنية موحدة\n\nقم بإنشاء بنك أسئلة شامل لكل وظيفة.\n\n## 3. تجربة مرشح متميزة\n\nتواصل سريع، شفافية، وردود فعل واضحة في كل مرحلة.',
  E'# Remote Hiring\n\nRemote hiring has become the new standard for modern companies. Here are the best practices:\n\n## 1. Structured Video Interviews\n\nUse professional platforms with recording and auto-transcription.\n\n## 2. Standardized Technical Tests\n\nBuild a comprehensive question bank for each role.\n\n## 3. Excellent Candidate Experience\n\nFast communication, transparency, and clear feedback at every stage.',
  'hr',
  8,
  true,
  now() - interval '12 days'
),
(
  'employer-branding-guide',
  'بناء العلامة التجارية للموظف: دليل مفصّل',
  'Employer Branding: A Detailed Guide',
  'كيف تبني علامة تجارية قوية تجذب أفضل المواهب وتحتفظ بها على المدى الطويل.',
  'How to build a strong brand that attracts and retains top talent long-term.',
  E'# العلامة التجارية للموظف\n\nالعلامة التجارية للموظف هي ما يجعل شركتك مميزة في عيون المرشحين. إنها أكثر من مجرد شعار أو موقع جذاب.\n\n## العناصر الأساسية\n\n- **الثقافة المؤسسية**: قيم واضحة وبيئة عمل صحية\n- **التطور المهني**: فرص نمو وتدريب مستمر\n- **التعويضات والمزايا**: حزمة تنافسية وعادلة\n\n## قياس النجاح\n\nتابع معدل القبول، رضا الموظفين، ومراجعات Glassdoor.',
  E'# Employer Branding\n\nEmployer branding is what makes your company stand out to candidates. It is more than a logo or attractive website.\n\n## Core Elements\n\n- **Company Culture**: Clear values and healthy work environment\n- **Career Growth**: Continuous development opportunities\n- **Compensation**: Competitive and fair packages\n\n## Measuring Success\n\nTrack offer acceptance rate, employee satisfaction, and Glassdoor reviews.',
  'branding',
  7,
  true,
  now() - interval '20 days'
);