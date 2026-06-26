import { useState } from "react";
import { useCreateQuestion } from "@/hooks/useQuestionBank";
import { useI18n } from "@/contexts/I18nContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Code, Megaphone, Briefcase, CheckSquare, ToggleLeft, MessageSquare, Sparkles, Calculator, Users, Headphones } from "lucide-react";

interface TemplateQuestion {
  question_text: string;
  question_type: "multiple_choice" | "open_ended" | "code" | "true_false";
  difficulty: "easy" | "medium" | "hard";
  category: string;
  correct_answer: string | null;
  points: number;
  code_language?: string;
  options?: { option_text: string; is_correct: boolean; sort_order: number }[];
}

interface TemplateCategory {
  id: string;
  nameAr: string;
  nameEn: string;
  icon: React.ComponentType<any>;
  color: string;
  questions: TemplateQuestion[];
}

export const TEMPLATES: TemplateCategory[] = [
  {
    id: "programming",
    nameAr: "البرمجة والتطوير",
    nameEn: "Programming & Development",
    icon: Code,
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    questions: [
      {
        question_text: "ما الفرق بين == و === في JavaScript؟",
        question_type: "multiple_choice",
        difficulty: "easy",
        category: "programming",
        correct_answer: null,
        points: 1,
        options: [
          { option_text: "== تقارن القيمة فقط، === تقارن القيمة والنوع", is_correct: true, sort_order: 0 },
          { option_text: "لا يوجد فرق بينهما", is_correct: false, sort_order: 1 },
          { option_text: "=== أسرع في الأداء فقط", is_correct: false, sort_order: 2 },
          { option_text: "== تقارن النوع فقط", is_correct: false, sort_order: 3 },
        ],
      },
      {
        question_text: "ما هو مفهوم الـ RESTful API؟",
        question_type: "open_ended",
        difficulty: "medium",
        category: "programming",
        correct_answer: "RESTful API هو نمط معماري لبناء واجهات برمجة التطبيقات يعتمد على بروتوكول HTTP ويستخدم أفعال HTTP القياسية (GET, POST, PUT, DELETE) للتعامل مع الموارد.",
        points: 2,
      },
      {
        question_text: "SQL Injection هو ثغرة أمنية تحدث عند عدم تنقية مدخلات المستخدم",
        question_type: "true_false",
        difficulty: "easy",
        category: "programming",
        correct_answer: "true",
        points: 1,
      },
      {
        question_text: "اكتب دالة تقوم بعكس نص (String) بدون استخدام الدوال الجاهزة",
        question_type: "code",
        difficulty: "medium",
        category: "programming",
        correct_answer: "function reverseString(str) {\n  let result = '';\n  for (let i = str.length - 1; i >= 0; i--) {\n    result += str[i];\n  }\n  return result;\n}",
        points: 3,
        code_language: "JavaScript",
      },
      {
        question_text: "ما هو الفرق بين Stack و Queue في هياكل البيانات؟",
        question_type: "multiple_choice",
        difficulty: "easy",
        category: "programming",
        correct_answer: null,
        points: 1,
        options: [
          { option_text: "Stack يعمل بنظام LIFO، Queue يعمل بنظام FIFO", is_correct: true, sort_order: 0 },
          { option_text: "كلاهما يعمل بنظام FIFO", is_correct: false, sort_order: 1 },
          { option_text: "Stack أسرع من Queue دائماً", is_correct: false, sort_order: 2 },
          { option_text: "Queue يعمل بنظام LIFO، Stack يعمل بنظام FIFO", is_correct: false, sort_order: 3 },
        ],
      },
      {
        question_text: "ما هو مفهوم الـ OOP (البرمجة كائنية التوجه)؟ اذكر أركانها الأربعة مع أمثلة.",
        question_type: "open_ended",
        difficulty: "hard",
        category: "programming",
        correct_answer: "OOP تعتمد على 4 أركان: التغليف (Encapsulation)، الوراثة (Inheritance)، تعدد الأشكال (Polymorphism)، والتجريد (Abstraction).",
        points: 3,
      },
      {
        question_text: "اكتب استعلام SQL لاسترجاع أسماء الموظفين الذين رواتبهم أعلى من متوسط الرواتب",
        question_type: "code",
        difficulty: "medium",
        category: "programming",
        correct_answer: "SELECT name FROM employees WHERE salary > (SELECT AVG(salary) FROM employees);",
        points: 2,
        code_language: "SQL",
      },
      {
        question_text: "Git هو نظام للتحكم في الإصدارات يعمل بشكل مركزي فقط",
        question_type: "true_false",
        difficulty: "easy",
        category: "programming",
        correct_answer: "false",
        points: 1,
      },
    ],
  },
  {
    id: "marketing",
    nameAr: "التسويق الرقمي",
    nameEn: "Digital Marketing",
    icon: Megaphone,
    color: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400",
    questions: [
      {
        question_text: "ما الفرق بين SEO و SEM؟",
        question_type: "multiple_choice",
        difficulty: "easy",
        category: "marketing",
        correct_answer: null,
        points: 1,
        options: [
          { option_text: "SEO تحسين مجاني لمحركات البحث، SEM يشمل الإعلانات المدفوعة", is_correct: true, sort_order: 0 },
          { option_text: "لا يوجد فرق بينهما", is_correct: false, sort_order: 1 },
          { option_text: "SEM مجاني و SEO مدفوع", is_correct: false, sort_order: 2 },
          { option_text: "كلاهما يعتمد على الإعلانات المدفوعة فقط", is_correct: false, sort_order: 3 },
        ],
      },
      {
        question_text: "اشرح استراتيجية تسويق محتوى فعّالة لشركة ناشئة في مجال التقنية",
        question_type: "open_ended",
        difficulty: "hard",
        category: "marketing",
        correct_answer: "يجب البدء بتحديد الجمهور المستهدف، ثم إنشاء محتوى قيّم ومتنوع (مقالات، فيديو، بودكاست)، وتوزيعه عبر القنوات المناسبة مع قياس الأداء وتحسينه باستمرار.",
        points: 3,
      },
      {
        question_text: "معدل الارتداد (Bounce Rate) المرتفع دائماً يعني أن الموقع سيء",
        question_type: "true_false",
        difficulty: "medium",
        category: "marketing",
        correct_answer: "false",
        points: 1,
      },
      {
        question_text: "ما هو الـ CTR (Click-Through Rate)؟",
        question_type: "multiple_choice",
        difficulty: "easy",
        category: "marketing",
        correct_answer: null,
        points: 1,
        options: [
          { option_text: "نسبة النقرات إلى عدد مرات الظهور", is_correct: true, sort_order: 0 },
          { option_text: "عدد الزيارات الكلي للموقع", is_correct: false, sort_order: 1 },
          { option_text: "تكلفة كل نقرة إعلانية", is_correct: false, sort_order: 2 },
          { option_text: "نسبة التحويل من الزيارات", is_correct: false, sort_order: 3 },
        ],
      },
      {
        question_text: "كيف تقيس ROI لحملة تسويق على وسائل التواصل الاجتماعي؟",
        question_type: "open_ended",
        difficulty: "medium",
        category: "marketing",
        correct_answer: "ROI = (الإيرادات المحققة - تكلفة الحملة) / تكلفة الحملة × 100. يجب تتبع التحويلات عبر UTM وأدوات التحليل.",
        points: 2,
      },
      {
        question_text: "ما أهم عناصر صفحة الهبوط (Landing Page) الناجحة؟",
        question_type: "multiple_choice",
        difficulty: "medium",
        category: "marketing",
        correct_answer: null,
        points: 2,
        options: [
          { option_text: "عنوان جذاب، CTA واضح، دليل اجتماعي، وتصميم بسيط", is_correct: true, sort_order: 0 },
          { option_text: "أكبر عدد ممكن من الروابط والمعلومات", is_correct: false, sort_order: 1 },
          { option_text: "صور متحركة كثيرة وألوان صارخة", is_correct: false, sort_order: 2 },
          { option_text: "نموذج تسجيل طويل ومفصل", is_correct: false, sort_order: 3 },
        ],
      },
    ],
  },
  {
    id: "management",
    nameAr: "الإدارة والقيادة",
    nameEn: "Management & Leadership",
    icon: Briefcase,
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    questions: [
      {
        question_text: "ما الفرق بين القائد والمدير؟",
        question_type: "open_ended",
        difficulty: "medium",
        category: "management",
        correct_answer: "المدير يركز على العمليات والتنظيم والتخطيط، بينما القائد يركز على الرؤية والإلهام وتحفيز الفريق. القائد الناجح يجمع بين المهارتين.",
        points: 2,
      },
      {
        question_text: "مصفوفة أيزنهاور تستخدم لتحديد أولويات المهام بناءً على الأهمية والاستعجال",
        question_type: "true_false",
        difficulty: "easy",
        category: "management",
        correct_answer: "true",
        points: 1,
      },
      {
        question_text: "ما هو أسلوب القيادة الأنسب في حالات الأزمات؟",
        question_type: "multiple_choice",
        difficulty: "medium",
        category: "management",
        correct_answer: null,
        points: 2,
        options: [
          { option_text: "القيادة التوجيهية (Directive) مع تواصل واضح وسريع", is_correct: true, sort_order: 0 },
          { option_text: "القيادة التفويضية وترك الفريق يقرر", is_correct: false, sort_order: 1 },
          { option_text: "عدم التدخل وانتظار انتهاء الأزمة", is_correct: false, sort_order: 2 },
          { option_text: "التركيز على التخطيط طويل المدى فقط", is_correct: false, sort_order: 3 },
        ],
      },
      {
        question_text: "كيف تتعامل مع موظف ذو أداء منخفض في فريقك؟ اذكر الخطوات.",
        question_type: "open_ended",
        difficulty: "hard",
        category: "management",
        correct_answer: "1- تحديد المشكلة بوضوح 2- محادثة خاصة لفهم الأسباب 3- وضع خطة تحسين واضحة مع أهداف قابلة للقياس 4- متابعة دورية 5- تقديم الدعم والموارد اللازمة.",
        points: 3,
      },
      {
        question_text: "منهجية OKR تعني:",
        question_type: "multiple_choice",
        difficulty: "easy",
        category: "management",
        correct_answer: null,
        points: 1,
        options: [
          { option_text: "Objectives and Key Results - الأهداف والنتائج الرئيسية", is_correct: true, sort_order: 0 },
          { option_text: "Online Knowledge Repository", is_correct: false, sort_order: 1 },
          { option_text: "Operational Key Requirements", is_correct: false, sort_order: 2 },
          { option_text: "Organizational Knowledge Review", is_correct: false, sort_order: 3 },
        ],
      },
      {
        question_text: "الذكاء العاطفي (EQ) أهم من الذكاء العقلي (IQ) في القيادة الناجحة",
        question_type: "true_false",
        difficulty: "medium",
        category: "management",
        correct_answer: "true",
        points: 1,
      },
      {
        question_text: "ما هي مراحل تشكيل الفريق حسب نموذج تاكمان (Tuckman)؟",
        question_type: "multiple_choice",
        difficulty: "hard",
        category: "management",
        correct_answer: null,
        points: 2,
        options: [
          { option_text: "التشكيل، العصف، التطبيع، الأداء، الإنهاء", is_correct: true, sort_order: 0 },
          { option_text: "التخطيط، التنفيذ، المراقبة، الإغلاق", is_correct: false, sort_order: 1 },
          { option_text: "التحليل، التصميم، البناء، الاختبار", is_correct: false, sort_order: 2 },
          { option_text: "الرؤية، الأهداف، التنفيذ، التقييم", is_correct: false, sort_order: 3 },
        ],
      },
    ],
  },
  {
    id: "accounting",
    nameAr: "المحاسبة والمالية",
    nameEn: "Accounting & Finance",
    icon: Calculator,
    color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    questions: [
      {
        question_text: "ما الفرق بين الأصول المتداولة والأصول الثابتة؟",
        question_type: "multiple_choice",
        difficulty: "easy",
        category: "accounting",
        correct_answer: null,
        points: 1,
        options: [
          { option_text: "الأصول المتداولة يمكن تحويلها لنقد خلال سنة، الثابتة تستخدم لأكثر من سنة", is_correct: true, sort_order: 0 },
          { option_text: "لا يوجد فرق بينهما", is_correct: false, sort_order: 1 },
          { option_text: "الأصول الثابتة هي النقد فقط", is_correct: false, sort_order: 2 },
          { option_text: "الأصول المتداولة لا تظهر في الميزانية", is_correct: false, sort_order: 3 },
        ],
      },
      {
        question_text: "اشرح مبدأ القيد المزدوج في المحاسبة مع مثال عملي",
        question_type: "open_ended",
        difficulty: "medium",
        category: "accounting",
        correct_answer: "مبدأ القيد المزدوج يعني أن كل عملية مالية تؤثر على حسابين على الأقل: حساب مدين وحساب دائن بنفس المبلغ. مثال: شراء بضاعة نقداً → مدين: المشتريات، دائن: النقدية.",
        points: 2,
      },
      {
        question_text: "الميزانية العمومية تعرض المركز المالي للشركة في لحظة زمنية محددة",
        question_type: "true_false",
        difficulty: "easy",
        category: "accounting",
        correct_answer: "true",
        points: 1,
      },
      {
        question_text: "ما هو الفرق بين الإيرادات والأرباح؟",
        question_type: "multiple_choice",
        difficulty: "easy",
        category: "accounting",
        correct_answer: null,
        points: 1,
        options: [
          { option_text: "الإيرادات هي إجمالي الدخل، والأرباح هي الإيرادات بعد خصم المصروفات", is_correct: true, sort_order: 0 },
          { option_text: "الإيرادات والأرباح نفس الشيء", is_correct: false, sort_order: 1 },
          { option_text: "الأرباح دائماً أكبر من الإيرادات", is_correct: false, sort_order: 2 },
          { option_text: "الإيرادات تشمل القروض فقط", is_correct: false, sort_order: 3 },
        ],
      },
      {
        question_text: "كيف تحلل القوائم المالية لشركة لتقييم أدائها المالي؟ اذكر أهم النسب المالية.",
        question_type: "open_ended",
        difficulty: "hard",
        category: "accounting",
        correct_answer: "تحليل القوائم المالية يشمل نسب السيولة (النسبة الجارية)، نسب الربحية (هامش الربح، العائد على حقوق الملكية)، نسب النشاط (معدل دوران المخزون)، ونسب المديونية (نسبة الدين إلى حقوق الملكية).",
        points: 3,
      },
      {
        question_text: "الإهلاك يُسجل كمصروف في قائمة الدخل رغم أنه لا يمثل تدفقاً نقدياً فعلياً",
        question_type: "true_false",
        difficulty: "medium",
        category: "accounting",
        correct_answer: "true",
        points: 1,
      },
      {
        question_text: "اكتب صيغة حساب نسبة السيولة السريعة (Quick Ratio)",
        question_type: "code",
        difficulty: "medium",
        category: "accounting",
        correct_answer: "Quick Ratio = (Current Assets - Inventory) / Current Liabilities",
        points: 2,
        code_language: "Formula",
      },
    ],
  },
  {
    id: "hr",
    nameAr: "الموارد البشرية",
    nameEn: "Human Resources",
    icon: Users,
    color: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
    questions: [
      {
        question_text: "ما هي أهم خطوات عملية التوظيف الفعّالة؟",
        question_type: "multiple_choice",
        difficulty: "medium",
        category: "hr",
        correct_answer: null,
        points: 2,
        options: [
          { option_text: "تحليل الوظيفة، الاستقطاب، الفرز، المقابلات، التعيين، التهيئة", is_correct: true, sort_order: 0 },
          { option_text: "نشر الإعلان وتعيين أول متقدم", is_correct: false, sort_order: 1 },
          { option_text: "إجراء مقابلة واحدة فقط", is_correct: false, sort_order: 2 },
          { option_text: "الاعتماد على التوصيات فقط", is_correct: false, sort_order: 3 },
        ],
      },
      {
        question_text: "اشرح الفرق بين التدريب والتطوير في إدارة الموارد البشرية",
        question_type: "open_ended",
        difficulty: "medium",
        category: "hr",
        correct_answer: "التدريب يركز على تحسين المهارات للوظيفة الحالية وهو قصير المدى، بينما التطوير يركز على إعداد الموظف لأدوار مستقبلية وهو طويل المدى ويشمل النمو المهني والشخصي.",
        points: 2,
      },
      {
        question_text: "مقابلة الخروج (Exit Interview) تُجرى عند تعيين موظف جديد",
        question_type: "true_false",
        difficulty: "easy",
        category: "hr",
        correct_answer: "false",
        points: 1,
      },
      {
        question_text: "ما هو نظام تقييم الأداء 360 درجة؟",
        question_type: "multiple_choice",
        difficulty: "medium",
        category: "hr",
        correct_answer: null,
        points: 2,
        options: [
          { option_text: "تقييم شامل من المدير والزملاء والمرؤوسين والعملاء والتقييم الذاتي", is_correct: true, sort_order: 0 },
          { option_text: "تقييم من المدير المباشر فقط", is_correct: false, sort_order: 1 },
          { option_text: "تقييم ذاتي فقط", is_correct: false, sort_order: 2 },
          { option_text: "تقييم من العملاء الخارجيين فقط", is_correct: false, sort_order: 3 },
        ],
      },
      {
        question_text: "كيف تتعامل مع نزاع بين موظفين في نفس الفريق؟ اذكر الخطوات.",
        question_type: "open_ended",
        difficulty: "hard",
        category: "hr",
        correct_answer: "1- الاستماع لكلا الطرفين بشكل منفصل 2- تحديد جذر المشكلة 3- عقد جلسة وساطة محايدة 4- الاتفاق على حل مشترك 5- المتابعة والتأكد من تنفيذ الحل 6- توثيق الحالة.",
        points: 3,
      },
      {
        question_text: "معدل دوران الموظفين (Turnover Rate) المرتفع دائماً مؤشر سلبي",
        question_type: "true_false",
        difficulty: "medium",
        category: "hr",
        correct_answer: "false",
        points: 1,
      },
      {
        question_text: "ما هي أهم عناصر حزمة التعويضات والمزايا التنافسية؟",
        question_type: "multiple_choice",
        difficulty: "easy",
        category: "hr",
        correct_answer: null,
        points: 1,
        options: [
          { option_text: "الراتب الأساسي، التأمين الصحي، الإجازات، المكافآت، التطوير المهني", is_correct: true, sort_order: 0 },
          { option_text: "الراتب الأساسي فقط", is_correct: false, sort_order: 1 },
          { option_text: "المكافآت السنوية فقط", is_correct: false, sort_order: 2 },
          { option_text: "التأمين الصحي فقط", is_correct: false, sort_order: 3 },
        ],
      },
    ],
  },
  {
    id: "customer_service",
    nameAr: "خدمة العملاء",
    nameEn: "Customer Service",
    icon: Headphones,
    color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
    questions: [
      {
        question_text: "كيف تتعامل مع عميل غاضب يهدد بإلغاء اشتراكه؟",
        question_type: "open_ended",
        difficulty: "hard",
        category: "customer_service",
        correct_answer: "1- الاستماع بهدوء وتعاطف 2- الاعتذار عن الإزعاج 3- فهم المشكلة بدقة 4- تقديم حل فوري أو بديل مناسب 5- المتابعة بعد الحل 6- تحويل التجربة السلبية لإيجابية.",
        points: 3,
      },
      {
        question_text: "ما هو الفرق بين خدمة العملاء وتجربة العملاء؟",
        question_type: "multiple_choice",
        difficulty: "medium",
        category: "customer_service",
        correct_answer: null,
        points: 2,
        options: [
          { option_text: "خدمة العملاء تفاعل مباشر لحل المشاكل، تجربة العملاء رحلة شاملة مع العلامة التجارية", is_correct: true, sort_order: 0 },
          { option_text: "لا يوجد فرق بينهما", is_correct: false, sort_order: 1 },
          { option_text: "تجربة العملاء تقتصر على الموقع الإلكتروني", is_correct: false, sort_order: 2 },
          { option_text: "خدمة العملاء أشمل من تجربة العملاء", is_correct: false, sort_order: 3 },
        ],
      },
      {
        question_text: "مؤشر NPS (Net Promoter Score) يقيس ولاء العملاء واحتمالية توصيتهم بالخدمة",
        question_type: "true_false",
        difficulty: "easy",
        category: "customer_service",
        correct_answer: "true",
        points: 1,
      },
      {
        question_text: "ما هي أهم مهارات موظف خدمة العملاء الناجح؟",
        question_type: "multiple_choice",
        difficulty: "easy",
        category: "customer_service",
        correct_answer: null,
        points: 1,
        options: [
          { option_text: "الصبر، التواصل الفعّال، حل المشكلات، التعاطف، المعرفة بالمنتج", is_correct: true, sort_order: 0 },
          { option_text: "سرعة إنهاء المكالمة فقط", is_correct: false, sort_order: 1 },
          { option_text: "حفظ نصوص الردود الجاهزة فقط", is_correct: false, sort_order: 2 },
          { option_text: "القدرة على رفض طلبات العملاء", is_correct: false, sort_order: 3 },
        ],
      },
      {
        question_text: "اشرح كيف تقيس رضا العملاء وما هي أهم المؤشرات التي تتابعها",
        question_type: "open_ended",
        difficulty: "medium",
        category: "customer_service",
        correct_answer: "أهم المؤشرات: NPS (صافي نقاط الترويج)، CSAT (رضا العملاء)، CES (جهد العميل)، معدل الاحتفاظ، وقت الاستجابة الأولى، معدل حل المشكلة من أول تواصل.",
        points: 2,
      },
      {
        question_text: "العميل دائماً على حق هو مبدأ مطلق يجب اتباعه في كل الحالات",
        question_type: "true_false",
        difficulty: "medium",
        category: "customer_service",
        correct_answer: "false",
        points: 1,
      },
      {
        question_text: "ما الفرق بين الدعم الاستباقي (Proactive) والدعم التفاعلي (Reactive)؟",
        question_type: "multiple_choice",
        difficulty: "medium",
        category: "customer_service",
        correct_answer: null,
        points: 2,
        options: [
          { option_text: "الاستباقي يتوقع المشاكل ويحلها مسبقاً، التفاعلي ينتظر تواصل العميل", is_correct: true, sort_order: 0 },
          { option_text: "لا يوجد فرق عملي بينهما", is_correct: false, sort_order: 1 },
          { option_text: "التفاعلي أفضل دائماً لأنه يوفر الموارد", is_correct: false, sort_order: 2 },
          { option_text: "الاستباقي يعني تجاهل شكاوى العملاء", is_correct: false, sort_order: 3 },
        ],
      },
    ],
  },
];

const typeIcons: Record<string, any> = {
  multiple_choice: CheckSquare,
  open_ended: MessageSquare,
  code: Code,
  true_false: ToggleLeft,
};

const diffColors: Record<string, string> = {
  easy: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  hard: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export default function QuestionTemplates() {
  const { locale, t } = useI18n();
  const createMutation = useCreateQuestion();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  const category = TEMPLATES.find(c => c.id === selectedCategory);

  const toggleQuestion = (idx: number) => {
    const next = new Set(selectedQuestions);
    if (next.has(idx)) next.delete(idx); else next.add(idx);
    setSelectedQuestions(next);
  };

  const selectAll = () => {
    if (!category) return;
    if (selectedQuestions.size === category.questions.length) {
      setSelectedQuestions(new Set());
    } else {
      setSelectedQuestions(new Set(category.questions.map((_, i) => i)));
    }
  };

  const handleSave = async () => {
    if (!category || selectedQuestions.size === 0) return;
    setSaving(true);
    try {
      const promises = Array.from(selectedQuestions).map(idx => {
        const q = category.questions[idx];
        return createMutation.mutateAsync({
          question: {
            question_text: q.question_text,
            question_type: q.question_type,
            difficulty: q.difficulty,
            category: q.category,
            correct_answer: q.correct_answer,
            points: q.points,
            code_language: q.code_language || null,
            job_id: null,
            explanation: null,
            time_limit_seconds: null,
            is_active: true,
          },
          options: q.options,
        });
      });
      await Promise.all(promises);
      toast({ title: locale === "ar" ? `تم إضافة ${selectedQuestions.size} سؤال بنجاح` : `${selectedQuestions.size} questions added successfully` });
      setSelectedQuestions(new Set());
      setSelectedCategory(null);
    } catch {
      toast({ title: locale === "ar" ? "حدث خطأ أثناء الحفظ" : "Error saving questions", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const diffLabel = (d: string) => locale === "ar" 
    ? { easy: "سهل", medium: "متوسط", hard: "صعب" }[d] || d
    : d;

  const typeLabel = (t: string) => locale === "ar"
    ? { multiple_choice: "اختيار متعدد", open_ended: "مفتوح", code: "كود", true_false: "صح/خطأ" }[t] || t
    : { multiple_choice: "MCQ", open_ended: "Open", code: "Code", true_false: "T/F" }[t] || t;

  if (!selectedCategory) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{t("qbank.templates.title")}</h3>
          <p className="text-sm text-muted-foreground">{t("qbank.templates.subtitle")}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TEMPLATES.map(cat => {
            const Icon = cat.icon;
            return (
              <Card key={cat.id} className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-2 hover:border-primary/30"
                onClick={() => { setSelectedCategory(cat.id); setSelectedQuestions(new Set()); }}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${cat.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{locale === "ar" ? cat.nameAr : cat.nameEn}</CardTitle>
                      <p className="text-sm text-muted-foreground">{cat.questions.length} {t("qbank.questionsCount")}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-1">
                    {["easy", "medium", "hard"].map(d => {
                      const count = cat.questions.filter(q => q.difficulty === d).length;
                      if (!count) return null;
                      return <Badge key={d} className={`text-[10px] border-0 ${diffColors[d]}`}>{count} {diffLabel(d)}</Badge>;
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedCategory(null)}>
            ← {t("common.back")}
          </Button>
          <h3 className="text-lg font-semibold">{locale === "ar" ? category!.nameAr : category!.nameEn}</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={selectAll}>
            {selectedQuestions.size === category!.questions.length ? t("qbank.templates.deselectAll") : t("qbank.templates.selectAll")}
          </Button>
          <Button size="sm" disabled={selectedQuestions.size === 0 || saving} onClick={handleSave} className="gap-1">
            <Sparkles className="h-3 w-3" />
            {saving ? t("common.loading") : `${t("qbank.templates.import")} (${selectedQuestions.size})`}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {category!.questions.map((q, idx) => {
          const Icon = typeIcons[q.question_type] || CheckSquare;
          const isSelected = selectedQuestions.has(idx);
          return (
            <Card key={idx} className={`transition-all cursor-pointer ${isSelected ? "ring-2 ring-primary border-primary" : "hover:shadow-sm"}`}
              onClick={() => toggleQuestion(idx)}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Checkbox checked={isSelected} className="mt-1" />
                  <div className="p-1.5 rounded-lg bg-primary/10 text-primary mt-0.5">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{q.question_text}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <Badge variant="outline" className="text-[10px]">{typeLabel(q.question_type)}</Badge>
                      <Badge className={`text-[10px] border-0 ${diffColors[q.difficulty]}`}>{diffLabel(q.difficulty)}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{q.points} {t("qbank.points")}</Badge>
                      {q.code_language && <Badge variant="outline" className="text-[10px]">{q.code_language}</Badge>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
