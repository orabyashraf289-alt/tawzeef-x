import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useI18n } from "@/contexts/I18nContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { MaterialIconShowcase } from "@/components/ui/MaterialIconShowcase";
import { AnimatedDashboardBackground } from "@/components/AnimatedBackground";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  LibraryBig, Palette, Briefcase, FileText, HelpCircle, Mail,
  Copy, Check, Plus, Search, ExternalLink, Sparkles, Star,
  Shield, CheckCircle2, Award, BookOpen, Layers, Zap
} from "lucide-react";

/* ───────── Pre-Built Job Templates ───────── */
const JOB_TEMPLATES = [
  {
    id: "ar-teacher",
    title: "معلم لغة عربية وتربية إسلامية",
    department: "القسم التعليمي",
    category: "تعليمي",
    type: "دوام كامل",
    location: "المملكة العربية السعودية",
    license: "مطلوب رخصة ETEC سارية",
    experience: "3+ سنوات",
    description: "تدريس مناهج اللغة العربية والتربية الإسلامية وفق معايير وزارة التعليم، وإعداد الخطط الدراسية، وتقييم أداء الطلاب ومتابعة تقدمهم الأكاديمي.",
    requirements: [
      "بكالوريوس لغة عربية أو دراسات إسلامية أو دبلوم تربوي معتمد",
      "رخصة مهنية تعليمية سارية من هيئة تقويم التعليم والتدريب (ETEC)",
      "إتقان استراتيجيات التدريس الحديثة وإدارة الصف التفاعلي",
      "القدرة على توظيف التقنيات التعليمية والمنصات المدرسية الرقمية",
    ],
    skills: ["تدريس لغة عربية", "إدارة الصف", "تخطيط الدروس", "التقويم التربوي", "تقنيات التعليم"]
  },
  {
    id: "math-teacher",
    title: "معلم رياضيات وموهبة",
    department: "القسم التعليمي",
    category: "تعليمي",
    type: "دوام كامل",
    location: "المملكة العربية السعودية",
    license: "مطلوب رخصة ETEC سارية",
    experience: "3+ سنوات",
    description: "تدريس مناهج الرياضيات وتنمية مهارات التفكير المنطقي وحل المشكلات، وإعداد الطلاب للمسابقات والأنشطة الأكاديمية.",
    requirements: [
      "بكالوريوس رياضيات أو علوم تطبيقية مع إعداد تربوي",
      "رخصة مهنية تعليمية لمعلمي الرياضيات (ETEC)",
      "خبرة سابقة في برامج الموهوبين والأولمبياد الرياضي ميزة إضافية",
      "مهارات عالية في التفكير الحسابي واستخدام التطبيقات التفاعلية",
    ],
    skills: ["رياضيات", "تفكير منطقي", "إدارة الصف", "برامج الموهبة", "STEM"]
  },
  {
    id: "en-teacher",
    title: "معلم لغة إنجليزية (English Teacher)",
    department: "القسم التعليمي",
    category: "تعليمي",
    type: "دوام كامل",
    location: "المملكة العربية السعودية",
    license: "مطلوب رخصة ETEC سارية",
    experience: "2+ سنوات",
    description: "تدريس مناهج اللغة الإنجليزية وفق المعايير العالمية المعتمدة، مع التركيز على مهارات التحدث والاستماع والقراءة والكتابة.",
    requirements: [
      "بكالوريوس لغة إنجليزية وأدبها أو ترجمة أو TESOL/CELTA",
      "رخصة مهنية تعليمية سارية (ETEC)",
      "طلاقة تامة ونطق ممتاز باللغة الإنجليزية",
      "خبرة في المناهج الدولية (American / British Curriculum) ميزة إضافية",
    ],
    skills: ["English ESL", "Curriculum Planning", "Communication", "Phonics", "Classroom Management"]
  },
  {
    id: "sci-teacher",
    title: "معلم علوم وكيمياء/فيزياء",
    department: "القسم التعليمي",
    category: "تعليمي",
    type: "دوام كامل",
    location: "المملكة العربية السعودية",
    license: "مطلوب رخصة ETEC سارية",
    experience: "3+ سنوات",
    description: "تدريس مناهج العلوم العامة والكيمياء والفيزياء، وإدارة الأنشطة المخبرية والتجارب العلمية مع تطبيق أعلى معايير السلامة.",
    requirements: [
      "بكالوريوس علوم (كيمياء أو فيزياء أو أحياء) + تربوي",
      "رخصة مهنية تعليمية سارية (ETEC)",
      "إجادة إدارة معامل العلوم والسلامة المهنية المدرسية",
      "مهارات تصميم المشاريع العلمية ومعارض العلوم",
    ],
    skills: ["تجارب علمية", "فيزياء", "كيمياء", "أحياء", "إدارة المختبر"]
  },
  {
    id: "dev-fullstack",
    title: "مطور برمجيات متكامل (Full-Stack Engineer)",
    department: "تقنية المعلومات",
    category: "تقني",
    type: "دوام كامل / عن بعد",
    location: "المملكة العربية السعودية",
    license: "غير مطلوب",
    experience: "4+ سنوات",
    description: "تطوير وصيانة تطبيقات الويب السحابية باستخدام React و Node.js وقواعد بيانات PostgreSQL، وبناء واجهات برمجية آمنة وعالية الكفاءة.",
    requirements: [
      "بكالوريوس علوم حاسب أو هندسة برمجيات أو ما يعادلها",
      "إتقان React و TypeScript و Tailwind CSS و Next.js",
      "خبرة في Node.js / Deno / Supabase و PostgreSQL",
      "فهم عميق لأمن البرمجيات ومبادئ RESTful APIs & GraphQL",
    ],
    skills: ["React", "TypeScript", "Node.js", "PostgreSQL", "Supabase", "Git", "Tailwind CSS"]
  },
  {
    id: "hr-specialist",
    title: "أخصائي استقطاب وتوظيف (Talent Acquisition Specialist)",
    department: "الموارد البشرية",
    category: "إداري",
    type: "دوام كامل",
    location: "المملكة العربية السعودية",
    license: "شهادة CIPD أو SHRM ميزة إضافية",
    experience: "3+ سنوات",
    description: "إدارة دورة التوظيف الكاملة من نشر الإعلانات وفرز المرشحين والمقابلات الذكية وحتى تقديم العروض ومتابعة مباشرة العمل.",
    requirements: [
      "بكالوريوس إدارة أعمال أو موارد بشرية أو نظم معلومات إدارية",
      "إتقان أنظمة إدارة المتقدمين (ATS) ومنصات التوظيف بالذكاء الاصطناعي",
      "معرفة تامة بنظام العمل السعودي ولوائح الموارد البشرية",
      "مهارات تواصل وتفاوض استثنائية وبناء شبكات علاقات احترافية",
    ],
    skills: ["استقطاب المواهب", "ATS Systems", "مقابلات وظيفية", "نظام العمل السعودي", "عروض وظيفية"]
  },
  {
    id: "accountant",
    title: "محاسب مالي معتمد",
    department: "المالية والمحاسبة",
    category: "مالي",
    type: "دوام كامل",
    location: "المملكة العربية السعودية",
    license: "عضوية SOCPA ميزة إضافية",
    experience: "3+ سنوات",
    description: "تسجيل العمليات المالية وإعداد القوائم المالية الشهرية والسنوية ومتابعة الإقرارات الضريبية لضريبة القيمة المضافة (ZATCA).",
    requirements: [
      "بكالوريوس محاسبة أو مالية معتمد",
      "إتقان العمل على الأنظمة المحاسبية السحابية (ERP)",
      "إلمام كامل بمتطلبات الفوترة الإلكترونية وهيئة الزكاة والضريبة والجمارك",
      "دقة عالية في التحليل المالي والمطابقات البنكية",
    ],
    skills: ["محاسبة مالية", "ZATCA", "SOCPA", "إقرارات ضريبية", "Excel متقدم"]
  },
  {
    id: "marketing-manager",
    title: "مدير التسويق والنمو الرقمي (Growth Marketing Manager)",
    department: "التسويق والمبيعات",
    category: "تسويق",
    type: "دوام كامل",
    location: "المملكة العربية السعودية",
    license: "غير مطلوب",
    experience: "4+ سنوات",
    description: "قيادة استراتيجيات التسويق الرقمي وجذب العملاء المحتملين عبر الحملات الإعلانية وتحسين محركات البحث وإدارة العلامة التجارية.",
    requirements: [
      "بكالوريوس تسويق أو علاقات عامة أو وسائط رقمية",
      "خبرة مثبتة في إدارة ميزانيات الحملات الإعلانية (Meta, Google, LinkedIn)",
      "مهارات قيادة فرق المحتوى والتحليلات التسويقية (ROI & CAC)",
      "شغف بالنمو والابتكار الرقمي والتسويق القائم على البيانات",
    ],
    skills: ["تسويق رقمي", "حملات إعلانية", "SEO", "تحليلات البيانات", "إدارة العلامة التجارية"]
  },
];

/* ───────── Document & Offer Templates ───────── */
const DOCUMENT_TEMPLATES = [
  {
    id: "doc-offer",
    title: "قالب العرض الوظيفي الرقمي المعتمد",
    category: "عروض العمل",
    description: "صيغة عرض وظيفي رسمية موثقة برقم مرجعي، تشتمل على بنود الراتب الأساسي، بدل السكن، بدل النقل، والتأمين الطبي، مع خانة التوقيع الرقمي.",
    tag: "رقمي معتمد SA 🇸🇦",
    fields: ["المسمى الوظيفي", "الراتب الأساسي", "بدل السكن والترحيل", "التأمين الطبي", "فترة التجربة"]
  },
  {
    id: "doc-contract",
    title: "عقد عمل استرشادي متوافق مع منصة قوى",
    category: "عقود رسمية",
    description: "مسودة عقد عمل متوافقة مع نظام العمل السعودي واللوائح المنظمة لمنصة قوى والتأمينات الاجتماعية.",
    tag: "متوافق مع قوى",
    fields: ["بيانات الطرفين", "الأجر والبدلات", "ساعات العمل والإجازات", "فترة الإشعار", "حماية الأسرار"]
  },
  {
    id: "doc-invitation",
    title: "خطاب دعوة المقابلة الشخصية والدرس التجريبي",
    category: "مراسلات التوظيف",
    description: "نموذج دعوة رسمية للمرشح لحضور المقابلة الشخصية أو إجراء درس تجريبي تعليمي عبر غرفة الفيديو المدمجة.",
    tag: "مدمج مع الفيديو",
    fields: ["رابط القاعة الافتراضية", "تاريخ وتوقيت المقابلة", "محاور العرض التجريبي", "تعليمات الحضور"]
  },
  {
    id: "doc-welcome",
    title: "حقيبة الترحيب والمباشرة للموظف الجديد",
    category: "التهيئة والتدريب",
    description: "نموذج إرشادي متكامل لاستقبال المعلم أو الموظف في يومه الأول، يتضمن سياسات المنشأة وكلمات المرور الأولية.",
    tag: "Onboarding Kit",
    fields: ["خطة الأسبوع الأول", "الدليل الإرشادي", "بيانات البريد والحسابات", "مسؤول التدريب"]
  },
];

/* ───────── Pre-Built Email & Automation Templates ───────── */
const EMAIL_TEMPLATES = [
  {
    id: "mail-app-received",
    title: "تأكيد استلام طلب التقديم وتوثيق الرخصة",
    subject: "تم استلام طلب تقديمك بنجاح على شاغر [اسم الوظيفة] - توظيف X",
    body: "مرحباً [اسم المرشح]،\nنشكرك على تقديمك على شاغر [اسم الوظيفة] لدى [اسم المؤسسة]. تم استلام طلبك وتوثيق بياناتك بنجاح.\nكود المتابعة الخاص بك: [كود التتبع]\nيمكنك متابعة حالة طلبك عبر بوابة المرشح المعتمدة.\nمع تمنياتنا لك بالتوفيق،\nفريق الموارد البشرية",
    category: "استلام الطلبات"
  },
  {
    id: "mail-interview-invite",
    title: "دعوة لإجراء المقابلة الشخصية / أونلاين",
    subject: "دعوة لمقابلة شخصية لوظيفة [اسم الوظيفة]",
    body: "عزيزي [اسم المرشح]،\nبناءً على نتائج التقييم المبدئي لسيرتك الذاتية، يسعدنا دعوتك لإجراء مقابلة رسمية:\nالموعد: [تاريخ المقابلة] - [توقيت المقابلة]\nرابط الغرفة الافتراضية: [رابط الغرفة]\nيرجى تأكيد الحضور في الموعد المحدد.\nخالص التحيات،",
    category: "المقابلات"
  },
  {
    id: "mail-offer-sent",
    title: "إشعار إرسال العرض الوظيفي الإلكتروني",
    subject: "عرض وظيفي رسمي من [اسم المؤسسة] - منصة توظيف X",
    body: "يسرنا تقديم هذا العرض الوظيفي الرسمي لانضمامك إلى فريق عملنا كـ [اسم الوظيفة].\nيمكنك الاطلاع على تفاصيل العرض والبدلات واعتماد التوقيع الإلكتروني عبر الرابط التالي:\n[رابط العرض الرقمي]\nيسري هذا العرض حتى تاريخ [تاريخ الصلاحية].\nأهلاً بك معنا!",
    category: "العروض"
  },
  {
    id: "mail-polite-rejection",
    title: "رسالة اعتذار احترافية ولبقة للمرشحين",
    subject: "بشأن طلب تقديمك لوظيفة [اسم الوظيفة] - [اسم المؤسسة]",
    body: "عزيزي [اسم المرشح]،\nنشكرك على الوقت والجهد المبذولين في التقديم والمقابلة. نود إفادتك بأنه نظراً لمحدودية الشواغر ومطابقة المواصفات، تم اختيار مرشح آخر لهذه الدورة.\nتم حفظ ملفك في قاعدة المواهب الخاصة بنا للتواصل معك فور توفر شواغر ملائمة مستقبلاً.\nنتمنى لك كل التوفيق في مسيرتك المهنية.",
    category: "الاعتذار والفرز"
  },
];

export default function SystemLibrary() {
  const { t, dir, locale } = useI18n();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("material");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({ title: "تم نسخ النص إلى الحافظة بنجاح ✅" });
    setTimeout(() => setCopiedId(null), 2500);
  };

  const filteredJobs = useMemo(() => {
    if (!searchQuery.trim()) return JOB_TEMPLATES;
    const q = searchQuery.toLowerCase();
    return JOB_TEMPLATES.filter(
      (job) =>
        job.title.toLowerCase().includes(q) ||
        job.department.toLowerCase().includes(q) ||
        job.category.toLowerCase().includes(q) ||
        job.skills.some((s) => s.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  return (
    <DashboardLayout>
      <AnimatedDashboardBackground />
      <div className="relative p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 min-h-screen" dir={dir}>
        
        {/* Decorative ambient gradients */}
        <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-primary/10 rounded-full filter blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/3 left-1/4 w-[350px] h-[350px] bg-emerald-500/10 rounded-full filter blur-[100px] pointer-events-none" />

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary via-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-lg shadow-primary/20 border border-white/20">
                <LibraryBig className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
                  مكتبة النظام المعتمدة
                  <Badge className="bg-primary/15 text-primary border border-primary/30 text-[10px] font-bold">
                    System Library & Design Kit 📚
                  </Badge>
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  المستودع الشامل لقوالب الوظائف، بنك الأسئلة، نماذج العقود والمراسلات، ونظام تصميم Google Material 3
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link to="/jobs">
              <Button size="sm" variant="outline" className="rounded-xl text-xs gap-1.5 font-bold h-9">
                <Briefcase className="w-4 h-4 text-primary" />
                الوظائف المنشورة
              </Button>
            </Link>
            <Link to="/question-bank">
              <Button size="sm" variant="outline" className="rounded-xl text-xs gap-1.5 font-bold h-9">
                <HelpCircle className="w-4 h-4 text-emerald-600" />
                بنك الأسئلة
              </Button>
            </Link>
          </div>
        </div>

        {/* Main Tabs */}
        <div className="relative z-10 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-card/70 backdrop-blur-xl border border-border/50 p-1.5 rounded-2xl shadow-sm inline-flex w-full sm:w-auto overflow-x-auto gap-1">
              <TabsTrigger value="material" className="gap-2 font-bold rounded-xl text-xs py-2 px-4 transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Palette className="w-4 h-4" />
                مكتبة Google Material 3 🎨
              </TabsTrigger>
              <TabsTrigger value="jobs" className="gap-2 font-bold rounded-xl text-xs py-2 px-4 transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Briefcase className="w-4 h-4" />
                قوالب الوظائف الجاهزة (12+)
              </TabsTrigger>
              <TabsTrigger value="documents" className="gap-2 font-bold rounded-xl text-xs py-2 px-4 transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <FileText className="w-4 h-4" />
                نماذج العروض والمستندات
              </TabsTrigger>
              <TabsTrigger value="emails" className="gap-2 font-bold rounded-xl text-xs py-2 px-4 transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Mail className="w-4 h-4" />
                قوالب المراسلات والأتمتة
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: Google Material Design System & Showcase */}
            <TabsContent value="material" className="space-y-6 focus-visible:outline-none">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="rounded-2xl border-primary/20 bg-card/60 backdrop-blur-sm p-5 space-y-2">
                  <div className="flex items-center gap-2 text-primary font-bold text-sm">
                    <Palette className="w-4 h-4" />
                    <span>رموز وأيقونات Google Material</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    مكتبة أيقونات تفاعلية بنمط خط Google Material Symbols الرسمي مع خيارات Outlined و Rounded والتعبئة الفورية.
                  </p>
                </Card>
                <Card className="rounded-2xl border-emerald-500/20 bg-card/60 backdrop-blur-sm p-5 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                    <Sparkles className="w-4 h-4" />
                    <span>توكنز Material Design 3</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    بطاقات مقسمة (Filled, Elevated, Outlined) مع زوايا ناعمة `rounded-md3-xl` وتدرجات ألوان ذكية متوافقة مع النمطين الداكن والفاتح.
                  </p>
                </Card>
                <Card className="rounded-2xl border-cyan-500/20 bg-card/60 backdrop-blur-sm p-5 space-y-2">
                  <div className="flex items-center gap-2 text-cyan-600 font-bold text-sm">
                    <Layers className="w-4 h-4" />
                    <span>المكونات القابلة لإعادة الاستخدام</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    أزرار تفاعلية، أشرطة تنقل علوية، رقائق ذكية (Assist & Filter Chips)، وتوافق تام مع الخطوط العربية دون أي قص.
                  </p>
                </Card>
              </div>

              {/* Material Icons Showcase Component */}
              <MaterialIconShowcase />
            </TabsContent>

            {/* TAB 2: Pre-Built Job Templates */}
            <TabsContent value="jobs" className="space-y-6 focus-visible:outline-none">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card/50 p-4 rounded-2xl border border-border/60">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="ابحث في قوالب الوظائف (تخصص، قسم، مهارات)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-9 h-10 text-xs rounded-xl"
                  />
                </div>
                <div className="text-xs text-muted-foreground font-medium">
                  تم العثور على <span className="font-bold text-foreground">{filteredJobs.length}</span> قالب جاهز
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredJobs.map((template) => (
                  <Card key={template.id} className="rounded-3xl border-border/80 bg-card/70 backdrop-blur-md shadow-xs hover:border-primary/50 transition-all flex flex-col justify-between overflow-hidden">
                    <CardHeader className="space-y-2 pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/25 text-[10px] mb-1.5">
                            {template.department} · {template.category}
                          </Badge>
                          <CardTitle className="text-base font-black text-foreground">{template.title}</CardTitle>
                        </div>
                        <Badge className="bg-emerald-600 text-white text-[10px] shrink-0 font-bold">
                          {template.experience}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs leading-relaxed line-clamp-2">
                        {template.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-3 pt-0">
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-bold text-foreground">أبرز المتطلبات:</p>
                        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                          {template.requirements.slice(0, 3).map((req, idx) => (
                            <li key={idx} className="truncate">{req}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {template.skills.map((skill, sIdx) => (
                          <span key={sIdx} className="text-[10px] px-2.5 py-0.5 rounded-full bg-secondary/80 text-secondary-foreground font-medium">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </CardContent>

                    <CardFooter className="border-t border-border/50 pt-3 flex items-center justify-between gap-2 bg-muted/20">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopyText(`${template.title}\n\nالوصف:\n${template.description}\n\nالمتطلبات:\n${template.requirements.join("\n")}`, template.id)}
                        className="h-8 text-xs font-bold gap-1 text-muted-foreground hover:text-foreground"
                      >
                        {copiedId === template.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedId === template.id ? "تم النسخ" : "نسخ القالب"}
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => navigate(`/jobs?action=create&title=${encodeURIComponent(template.title)}&department=${encodeURIComponent(template.department)}`)}
                        className="h-8 text-xs font-bold gap-1 bg-primary text-primary-foreground rounded-xl shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        استخدام القالب فوراً
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* TAB 3: Digital Offer & Contract Templates */}
            <TabsContent value="documents" className="space-y-6 focus-visible:outline-none">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {DOCUMENT_TEMPLATES.map((doc) => (
                  <Card key={doc.id} className="rounded-3xl border-border/80 bg-card/70 backdrop-blur-md p-6 space-y-4 flex flex-col justify-between">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
                          {doc.tag}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-bold">{doc.category}</span>
                      </div>
                      <h3 className="text-base font-black text-foreground">{doc.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{doc.description}</p>
                      
                      <div className="pt-2">
                        <p className="text-[11px] font-bold text-foreground mb-1.5">البنود والحقول المضمنة:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {doc.fields.map((f, i) => (
                            <span key={i} className="text-[10px] px-2 py-0.5 rounded-lg bg-card border border-border/60 text-muted-foreground">
                              ✓ {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-border/50 pt-3 flex items-center justify-between">
                      <Link to="/offers">
                        <Button size="sm" variant="outline" className="h-8 text-xs font-bold rounded-xl gap-1.5">
                          <ExternalLink className="w-3.5 h-3.5" />
                          معاينة في بوابة العروض
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        onClick={() => handleCopyText(`${doc.title}\n${doc.description}`, doc.id)}
                        className="h-8 text-xs font-bold rounded-xl gap-1 bg-primary text-primary-foreground"
                      >
                        {copiedId === doc.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedId === doc.id ? "تم النسخ" : "نسخ المسودة"}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* TAB 4: Email & Communication Templates */}
            <TabsContent value="emails" className="space-y-6 focus-visible:outline-none">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {EMAIL_TEMPLATES.map((mail) => (
                  <Card key={mail.id} className="rounded-3xl border-border/80 bg-card/70 backdrop-blur-md p-6 space-y-3.5 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                          {mail.category}
                        </Badge>
                      </div>
                      <h3 className="text-sm font-black text-foreground">{mail.title}</h3>
                      <div className="bg-muted/40 p-2.5 rounded-xl border border-border/40 text-xs">
                        <span className="font-bold text-foreground">عنوان الرسالة: </span>
                        <span className="text-muted-foreground">{mail.subject}</span>
                      </div>
                      <div className="bg-card/90 p-3 rounded-xl border border-border/50 text-xs text-muted-foreground whitespace-pre-line leading-relaxed font-sans">
                        {mail.body}
                      </div>
                    </div>

                    <div className="border-t border-border/50 pt-3 flex items-center justify-end">
                      <Button
                        size="sm"
                        onClick={() => handleCopyText(`الموضوع: ${mail.subject}\n\n${mail.body}`, mail.id)}
                        className="h-8 text-xs font-bold rounded-xl gap-1.5 bg-primary text-primary-foreground"
                      >
                        {copiedId === mail.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedId === mail.id ? "تم النسخ" : "نسخ نص الرسالة"}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>

      </div>
    </DashboardLayout>
  );
}
