import tawzeefLogo from "@/assets/tawzeef-x-logo.png";
import { Link } from "react-router-dom";
import {
  Users, Bot, ArrowLeft, TrendingUp, Shield, Globe, CheckCircle2, Zap, Star, Briefcase,
  FileText, BarChart3, Video, Sparkles, Award, Play, ArrowUpRight, MousePointerClick, Layout,
  MessageSquare, Calendar, Send, Menu, X, Sun, Moon, ChevronDown, Check, GraduationCap,
  Building2, Phone, Mail, MapPin, Heart, ShieldCheck, CheckSquare, Sparkle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform, AnimatePresence, useInView } from "framer-motion";
import { useRef, useState, useEffect, useCallback } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/integrations/supabase/client";

const features = [
  { icon: GraduationCap, title: "فرز السير بالذكاء الاصطناعي", description: "فلترة وتصنيف طلبات المعلمين تلقائياً حسب المؤهل، التخصص، والخبرة في تدريس المناهج الدولية والأهلية", color: "primary", highlight: "توفير 80% من وقت الفرز" },
  { icon: ShieldCheck, title: "توثيق الرخصة المهنية (ETEC)", description: "تحقق مباشر من الرقم والحالة والاعتماد الرسمي للرخصة المهنية للمعلمين بالمملكة العربية السعودية", color: "accent", highlight: "مطابق للوائح التعليمية" },
  { icon: Video, title: "مقابلات ودروس تجريبية أونلاين", description: "استعراض فيديو الحصة التجريبية للمعلم مع غرف فيديو مدمجة لتنفيذ المقابلات الشخصية", color: "warning", highlight: "فيديو الدرس التجريبي" },
  { icon: Users, title: "لوحة تتبع المرشحين (Kanban)", description: "متابعة المعلمين عبر جميع مراحل الفرز (تقديم الطلب، الحصة التجريبية، المقابلة، العرض الوظيفي)", color: "success", highlight: "مراحل تعليمية مخصصة" },
  { icon: FileText, title: "عقود وعروض تعليمية رقمية", description: "إرسال وتوقيع العروض المعتمدة إلكترونياً وتفاصيل حزمة البدلات (سكن، نقل، تأمين فئة A، وتأشيرة)", color: "info", highlight: "توقيع إلكتروني ملزم" },
  { icon: Shield, title: "سرية تامة وأمان البيانات", description: "تشفير تام لبيانات المعلمين والشهادات الأكاديمية والمدارس الشريكة وفق الأنظمة السعودية", color: "destructive", highlight: "تشفير ورخص موثقة" },
];

const colorMap: Record<string, string> = {
  primary: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  accent: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  success: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  info: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  destructive: "bg-red-500/10 text-red-600 dark:text-red-400",
};

const defaultStats = [
  { value: 1250, suffix: "+", label: "معلم ومدرسة مسجلة", icon: GraduationCap },
  { value: 450, suffix: "+", label: "مدرسة أهلية ودولية", icon: Building2 },
  { value: 8500, suffix: "+", label: "شاغر تعليمي تم شغله", icon: Briefcase },
  { value: 98, suffix: "%", label: "نسبة النجاح والاستقرار", icon: CheckCircle2 },
];

const steps = [
  { num: "01", title: "أنشئ الشاغر التعليمي", description: "حدد المادة، المرحلة، المنهج (سعودي/بريطاني/أمريكي)، ونصاب الحصص وحزمة البدلات", icon: Briefcase },
  { num: "02", title: "استقبل طلبات المعلمين", description: "شارك رابط التقديم المباشر واستقبل طلبات الكوادر الأكاديمية المعتمدة", icon: Globe },
  { num: "03", title: "فرز وتأكيد الرخصة (ETEC)", description: "يقوم الـ AI بفرز السير وتأكيد سريان الرخصة المهنية والشهادات الدولية (IELTS/CELTA)", icon: ShieldCheck },
  { num: "04", title: "الدرس التجريبي والعقد", description: "شاهد فيديو الحصة التجريبية، نفذ المقابلة، وأرسل العقد التعليمي الرقمي بنقرة", icon: Award },
];

const testimonials = [
  { name: "أ. عبد الله العتيبي", role: "مدير الموارد البشرية", company: "مدارس المتقدمة العالمية - الرياض", content: "سردت المنصة علينا وقت فرز معلمي العلوم والفيزياء بالمنهج الأمريكي بشكل مذهل. تأكيد الرخصة المهنية للـ ETEC بنقرة واحدة وفّر أسبوع عمل كامل.", rating: 5 },
  { name: "د. منيرة السديري", role: "المديرة الأكاديمية", company: "مدارس الرياض الأهلية", content: "مشاهدة دروس المعلمين التجريبية أونلاين قبل المقابلة رفعت جودة الاختيارات وحققت استقراراً كبيراً في كادرنا التعليمي.", rating: 5 },
  { name: "أ. طارق الشمري", role: "رئيس قسم التوظيف", company: "مدارس الدلتا العالمية - جدة", content: "أفضل منصة متخصصة لتوظيف المعلمين بالسعودية والخليج. العروض الرقمية والتوقيع الإلكتروني جعلت التعاقد سريعاً جداً.", rating: 5 },
  { name: "أ. هدى الفايز", role: "HR Director", company: "مدارس الخليج الدولية - دبي", content: "دقة مطابقة المناهج (IGCSE & IB) والشهادات الدولية كشفت لنا أفضل الكفاءات في وقت قياسي.", rating: 5 },
];

const capabilities = [
  "توثيق الرخصة المهنية ETEC", "قوالب شواغر تعليمية", "تقييم معلمين بالـ AI", "لوحة Kanban للمدارس",
  "مشاهدة الدرس التجريبي", "مقابلات فيديو مدمجة", "عقود تعليمية رقمية", "تأمين وبدلات مخصصة",
  "بوابة المعلم المعتمد", "تأكيد شهادات IELTS/CELTA", "تصدير تقارير المدارس", "دعم كامل للمناهج الدولية",
];

const partnerSchools = [
  { name: "مدارس المتقدمة العالمية", city: "الرياض", type: "عالمية (American NGSS)" },
  { name: "مدارس الرياض الأهلية", city: "الرياض", type: "أهلية متطورة" },
  { name: "مدارس الدلتا العالمية", city: "جدة", type: "بريطانية (IGCSE)" },
  { name: "مدارس دار العلوم", city: "الخبر", type: "أهلية وعالمية" },
  { name: "مدارس الخليج الدولية", city: "دبي", type: "بكالوريا دولية (IB)" },
];

/* ─── Interactive Demo Component ─── */
const demoTabs = [
  { id: "dashboard", label: "لوحة المدرسة", icon: Layout },
  { id: "candidates", label: "بنك المعلمين", icon: GraduationCap },
  { id: "ai", label: "تقييم AI والرخصة", icon: ShieldCheck },
  { id: "interviews", label: "الدرس التجريبي والمقابلة", icon: Video },
];

const demoCandidates = [
  { name: "أ. أحمد محمود", role: "معلم علوم وفيزياء (NGSS)", score: 96, stage: "الدرس التجريبي", license: "ETEC-9842145-SA", avatar: "أ" },
  { name: "أ. سارة الغامدي", role: "معلمة لغة إنجليزية (IGCSE)", score: 94, stage: "المقابلة النهائية", license: "ETEC-7412589-SA", avatar: "س" },
  { name: "أ. خالد الدوسري", role: "معلم رياضيات (ثانوي)", score: 91, stage: "العرض الوظيفي", license: "ETEC-3698521-SA", avatar: "خ" },
  { name: "أ. نورة الشهري", role: "معلمة رياض الأطفال", score: 88, stage: "مراجعة الملف", license: "ETEC-1597534-SA", avatar: "ن" },
];

function InteractiveDemo() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [hoveredCandidate, setHoveredCandidate] = useState<number | null>(null);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [transcriptText, setTranscriptText] = useState("");

  useEffect(() => {
    if (!isVideoActive) {
      setTranscriptText("");
      return;
    }
    const sentences = [
      "جاري الاتصال بغرفة الحصة التجريبية والمقابلة المعيارية...",
      "المعلم: أهلاً بكم، سأعرض تجربة المختبر الافتراضي لمنهج NGSS للفيزياء.",
      "الروبوت: تم التحقق من سريان الرخصة المهنية رقم ETEC-9842145-SA بنجاح 🇸🇦.",
      "الذكاء الاصطناعي: طلاقة كاملة في الإنجليزية C1، تفاعل ممتاز مع الطلاب — التقييم النهائي 96%.",
    ];
    let idx = 0;
    const interval = setInterval(() => {
      setTranscriptText(sentences[idx]);
      idx = (idx + 1) % sentences.length;
    }, 3500);
    setTranscriptText(sentences[0]);
    return () => clearInterval(interval);
  }, [isVideoActive]);

  return (
    <div className="w-full bg-card rounded-3xl border border-border/80 shadow-2xl overflow-hidden relative" dir="rtl">
      {/* Top Header */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 p-4 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-amber-400" />
          <div className="w-3 h-3 rounded-full bg-emerald-400" />
          <span className="text-xs font-bold mr-2 text-white/90">نظام توظيف المعلمين والمدارس — التقييم الحي المباشر</span>
        </div>
        <Badge className="bg-white/20 text-white border-0 text-[10px] font-bold">
          🇸🇦 معتمد باللوائح السعودية
        </Badge>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/60 bg-muted/40 p-2 gap-2 overflow-x-auto">
        {demoTabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0",
                activeTab === t.id ? "bg-card text-emerald-600 dark:text-emerald-400 shadow-xs border border-border/60" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="p-6 min-h-[340px] flex flex-col justify-center">
        {activeTab === "dashboard" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-right">
                <span className="text-[10px] text-emerald-600 font-bold block">المعلمون المتقدمون</span>
                <p className="text-2xl font-black text-emerald-600">1,248</p>
                <span className="text-[9px] text-muted-foreground">رخص سارية 99%</span>
              </div>
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-right">
                <span className="text-[10px] text-indigo-600 font-bold block">الدروس التجريبية المكتملة</span>
                <p className="text-2xl font-black text-indigo-600">312</p>
                <span className="text-[9px] text-muted-foreground">تقييم ممتاز</span>
              </div>
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-right">
                <span className="text-[10px] text-amber-600 font-bold block">المقابلات المنعقدة</span>
                <p className="text-2xl font-black text-amber-600">84</p>
                <span className="text-[9px] text-muted-foreground">أونلاين مدمجة</span>
              </div>
              <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-right">
                <span className="text-[10px] text-teal-600 font-bold block">العقود التعليمية المعروضة</span>
                <p className="text-2xl font-black text-teal-600">42</p>
                <span className="text-[9px] text-muted-foreground">توقيع رقمي</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "candidates" && (
          <div className="space-y-3">
            {demoCandidates.map((c, i) => (
              <div
                key={i}
                onMouseEnter={() => setHoveredCandidate(i)}
                onMouseLeave={() => setHoveredCandidate(null)}
                className="p-3.5 rounded-2xl bg-card border border-border/60 flex items-center justify-between hover:border-emerald-500/40 transition-all shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 font-bold flex items-center justify-center text-xs">
                    {c.avatar}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-xs text-foreground">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground">{c.role} • <span className="font-mono text-emerald-600">{c.license}</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-bold text-emerald-600 bg-emerald-500/5">
                    تطابق الـ AI {c.score}% 🏆
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    مرحلة: {c.stage}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "ai" && (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 text-right space-y-3">
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
              <ShieldCheck className="w-5 h-5" />
              فحص وتحليل ملف المعلم بالذكاء الاصطناعي وتأكيد الرخصة
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              تم التحقق من سريان الرخصة المهنية الصادرة من ETEC لمعلم الفيزياء أ. أحمد محمود. التقييم الأكاديمي للـ AI: <strong>96/100</strong> (خبرة 6 سنوات في المنهج الأمريكي NGSS + شهادة IELTS 7.5).
            </p>
            <div className="flex items-center gap-2 text-[10px] text-emerald-600 font-bold pt-2">
              <CheckCircle2 className="w-4 h-4" /> رخصة مهنية معتمدة وسارية حتى ديسمبر 2028 🇸🇦
            </div>
          </div>
        )}

        {activeTab === "interviews" && (
          <div className="space-y-4 text-center">
            <div className="p-4 rounded-2xl bg-card border border-border/60 space-y-3">
              <div className="flex items-center justify-center gap-2">
                <Video className="w-5 h-5 text-emerald-600 animate-pulse" />
                <h4 className="font-bold text-sm text-foreground">غرفة التقييم والتسجيل للحصة التجريبية والمقابلة</h4>
              </div>
              <p className="text-xs text-muted-foreground">اضغط أدناه لمحاكاة التقييم الفوري المباشر للحصة التجريبية للمعلم:</p>
              <Button
                onClick={() => setIsVideoActive(!isVideoActive)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold gap-2"
              >
                {isVideoActive ? "إيقاف المحاكاة" : "تشغيل محاكاة تقييم الحصة التجريبية 🎬"}
              </Button>
            </div>

            {transcriptText && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-right font-mono text-xs text-emerald-700 dark:text-emerald-300">
                {transcriptText}
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { theme, setTheme } = useTheme();
  const [stats, setStats] = useState(defaultStats);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function fetchStats() {
      try {
        const { count: jobCount } = await supabase.from("jobs").select("*", { count: "exact", head: true });
        const { count: candCount } = await supabase.from("candidates").select("*", { count: "exact", head: true });
        setStats([
          { value: 1250, suffix: "+", label: "معلم ومدرسة مسجلة", icon: GraduationCap },
          { value: jobCount || 450, suffix: "+", label: "شاغر تعليمي نشط", icon: Briefcase },
          { value: candCount || 8500, suffix: "+", label: "معلم وكادر أكاديمي", icon: Users },
          { value: 98, suffix: "%", label: "نسبة النجاح والاستقرار", icon: CheckCircle2 },
        ]);
      } catch (e) {
        console.warn("Stats fetch failed:", e);
      }
    }
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground text-right font-sans overflow-x-hidden" dir="rtl">
      {/* ── Navbar ── */}
      <header className="fixed top-0 inset-x-0 z-50 bg-card/80 backdrop-blur-md border-b border-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={tawzeefLogo} alt="Tawzeef-X" className="w-9 h-9 object-contain" />
            <div>
              <span className="font-black text-base text-foreground block leading-none">توظيف X</span>
              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold block mt-0.5">منصة المدارس والمعلمين بالخليج</span>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-muted-foreground">
            <a href="#features" className="hover:text-emerald-600 transition-colors">مميزات المنصة</a>
            <a href="#steps" className="hover:text-emerald-600 transition-colors">خطوات التوظيف</a>
            <a href="#schools" className="hover:text-emerald-600 transition-colors">المدارس الشريكة</a>
            <a href="#testimonials" className="hover:text-emerald-600 transition-colors">آراء المدراء</a>
            <Link to="/careers" className="hover:text-emerald-600 transition-colors">وظائف المعلمين</Link>
            <Link to="/portal" className="hover:text-emerald-600 transition-colors">بوابة المعلم الموثق</Link>
          </nav>

          {/* Action CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-xl border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link to="/auth?mode=login">
              <Button variant="outline" size="sm" className="rounded-xl text-xs font-bold h-9">دخول المدارس</Button>
            </Link>
            <Link to="/auth?mode=signup">
              <Button size="sm" className="rounded-xl text-xs font-bold h-9 bg-emerald-600 hover:bg-emerald-500 text-white">تسجيل مدرسة جديدة 🚀</Button>
            </Link>
          </div>

          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden p-2 text-foreground">
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* ── Main Hero Section ── */}
      <section className="pt-32 pb-20 px-4 sm:px-6 relative overflow-hidden bg-gradient-to-b from-emerald-500/5 via-teal-500/5 to-transparent">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-12 items-center">
          {/* Right Column: Hero Text */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold">
              <Sparkles className="w-4 h-4 animate-pulse" />
              المنصة الأولى المعتمدة لتوظيف المعلمين والمدارس بالسعودية والخليج 🇸🇦
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-foreground leading-[1.25]">
              منصة توظيف المعلمين والمدارس <br />
              <span className="text-emerald-600 dark:text-emerald-400">في السعودية والخليج</span>
            </h1>

            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl font-medium">
              الربط المباشر والفرز الذكي بين المدارس الأهلية والعالمية وأفضل المعلمين المعتمدين، مع التوثيق الكامل للرخصة المهنية للمعلمين (ETEC) وعرض دروسهم التجريبية بنقرة واحدة.
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <Link to="/auth?mode=signup">
                <Button size="lg" className="rounded-2xl text-sm font-bold h-12 px-8 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 gap-2">
                  ابدأ توظيف المعلمين مجاناً
                  <ArrowLeft className="w-4 h-4 rotate-180" />
                </Button>
              </Link>
              <Link to="/careers">
                <Button variant="outline" size="lg" className="rounded-2xl text-sm font-bold h-12 px-7 gap-2 border-border/80">
                  <GraduationCap className="w-4 h-4 text-emerald-600" />
                  تصفح شواغر المعلمين المتاحة
                </Button>
              </Link>
            </div>

            {/* Quick Proof Pills */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-muted-foreground pt-4">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> توثيق مباشر للرخصة المهنية ETEC</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> مشاهدة فيديو الدرس التجريبي</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> عقود رقمية معتمدة</span>
            </div>
          </div>

          {/* Left Column: Interactive System Preview Component */}
          <div className="lg:col-span-5">
            <InteractiveDemo />
          </div>
        </div>
      </section>

      {/* ── Educational Statistics ── */}
      <section className="py-12 bg-card border-y border-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="text-center space-y-1">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto mb-2 font-bold">
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-3xl font-black text-foreground font-mono">{s.value}{s.suffix}</p>
                <p className="text-xs text-muted-foreground font-bold">{s.label}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Partner School Logos Wall ── */}
      <section id="schools" className="py-16 px-4 sm:px-6 bg-muted/20">
        <div className="max-w-7xl mx-auto text-center space-y-8">
          <div className="space-y-2">
            <Badge className="bg-emerald-600 text-white text-[10px]">شركاء التميز الأكاديمي</Badge>
            <h2 className="text-2xl sm:text-3xl font-black text-foreground">تثق بنا كبرى المدارس الأهلية والعالمية بالسعودية والخليج</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {partnerSchools.map((sch, i) => (
              <div key={i} className="p-4 rounded-2xl bg-card border border-border/60 text-center space-y-1.5 hover:border-emerald-500/40 transition-all shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 font-bold flex items-center justify-center mx-auto">
                  🏫
                </div>
                <p className="font-bold text-xs text-foreground">{sch.name}</p>
                <p className="text-[10px] text-emerald-600 font-semibold">{sch.city} • {sch.type}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section id="features" className="py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <Badge className="bg-emerald-600 text-white text-[10px]">مميزات المنصة الفائقة</Badge>
            <h2 className="text-3xl font-black text-foreground">كل ما تحتاجه المدارس الأهلية والدولية لإدارة التوظيف المعلمي</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              حلول تقنية متكاملة تضمن اختيار الكادر التدريسي المتمكن والالتزام باللوائح والاشتراطات الحكومية.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="p-6 rounded-3xl bg-card border border-border/60 hover:border-emerald-500/40 transition-all space-y-4 shadow-xs group">
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center font-bold transition-transform group-hover:scale-110", colorMap[f.color])}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="font-bold text-base text-foreground">{f.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{f.description}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold text-emerald-600 border-emerald-500/20 bg-emerald-500/5">
                    {f.highlight}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 4 Steps Recruitment Workflow ── */}
      <section id="steps" className="py-20 px-4 sm:px-6 bg-muted/20">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <Badge className="bg-emerald-600 text-white text-[10px]">خطوات بسيطة وسريعة</Badge>
            <h2 className="text-3xl font-black text-foreground">كيف تعمل المنصة في 4 خطوات سهلة؟</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((st, i) => {
              const Icon = st.icon;
              return (
                <div key={i} className="p-6 rounded-3xl bg-card border border-border/60 space-y-4 relative shadow-xs">
                  <span className="text-3xl font-black text-emerald-600/30 font-mono block">{st.num}</span>
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-sm text-foreground">{st.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{st.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Capabilities List ── */}
      <section className="py-16 px-4 sm:px-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 text-white">
        <div className="max-w-7xl mx-auto space-y-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-black">قدرات وأدوات التوظيف الشاملة للمدارس للمعلمين</h2>
          <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
            {capabilities.map((cap, i) => (
              <span key={i} className="px-4 py-2 rounded-2xl bg-white/10 border border-white/20 text-xs font-bold backdrop-blur-md">
                ✓ {cap}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section id="testimonials" className="py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <Badge className="bg-emerald-600 text-white text-[10px]">شهادات وآراء موثوقة</Badge>
            <h2 className="text-3xl font-black text-foreground">ماذا يقول مدراء الموارد البشرية والأكاديميون؟</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="p-6 rounded-3xl bg-card border border-border/60 space-y-4 shadow-xs">
                <div className="flex items-center gap-1 text-amber-400">
                  {Array.from({ length: t.rating }).map((_, idx) => (
                    <Star key={idx} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed italic">"{t.content}"</p>
                <div className="pt-2 border-t border-border/40">
                  <p className="font-bold text-xs text-foreground">{t.name}</p>
                  <p className="text-[10px] text-emerald-600 font-semibold">{t.role} • {t.company}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer & Contact Credentials ── */}
      <footer className="border-t border-border/60 bg-card py-12 px-4 sm:px-6 text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <img src={tawzeefLogo} alt="Tawzeef-X" className="w-8 h-8 object-contain" />
              <span className="font-black text-sm text-foreground">توظيف X للمعلمين والمدارس</span>
            </div>
            <p className="leading-relaxed">المنصة الأولى المعتمدة لتوظيف وتوثيق المعلمين والمدارس بالسعودية والخليج العربي.</p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-sm text-foreground">روابط سريعة</h4>
            <ul className="space-y-1.5">
              <li><Link to="/careers" className="hover:text-emerald-600">وظائف المعلمين</Link></li>
              <li><Link to="/portal" className="hover:text-emerald-600">بوابة المعلم الموثق</Link></li>
              <li><Link to="/auth?mode=signup" className="hover:text-emerald-600">تسجيل مدرسة جديدة</Link></li>
              <li><Link to="/auth?mode=login" className="hover:text-emerald-600">دخول أصحاب المدارس</Link></li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-sm text-foreground">الشروط والخصوصية</h4>
            <ul className="space-y-1.5">
              <li><Link to="/privacy" className="hover:text-emerald-600">سياسة الخصوصية وحماية البيانات</Link></li>
              <li><Link to="/terms" className="hover:text-emerald-600">شروط الاستخدام والخدمة</Link></li>
              <li><span className="text-emerald-600 font-bold">اللوائح: ETEC المعلمين 🇸🇦</span></li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-sm text-foreground">بيانات التواصل والمقر</h4>
            <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-emerald-600" /> +966 50 123 4567 | مجاني: 800 124 5555</p>
            <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-emerald-600" /> schools@tawzeefx.com</p>
            <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-emerald-600" /> طريق الملك فهد، حي الصحافة، الرياض، السعودية</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 mt-8 border-t border-border/40 text-center font-bold">
          © {new Date().getFullYear()} Tawzeef-X — جميع الحقوق محفوظة لمنصة توظيف المعلمين والمدارس.
        </div>
      </footer>
    </div>
  );
}
