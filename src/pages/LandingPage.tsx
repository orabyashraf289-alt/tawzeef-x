import tawzeefLogo from "@/assets/tawzeef-x-logo.png";
import { Link } from "react-router-dom";
import { Users, Bot, ArrowLeft, TrendingUp, Shield, Globe, CheckCircle2, Zap, Star, Briefcase, FileText, BarChart3, Video, Sparkles, Award, Play, ArrowUpRight, MousePointerClick, Layout, MessageSquare, Calendar, Send, Menu, X, Sun, Moon, ChevronDown, Check, GraduationCap, Building2, MapPin, Phone, Mail, Clock, BookOpen, Award as BadgeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform, AnimatePresence, useInView, useMotionValue, useSpring, useMotionTemplate } from "framer-motion";
import { useRef, useState, useEffect, useCallback } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Icons8StyleIcon } from "@/components/ui/animated-icons";

import { supabase } from "@/integrations/supabase/client";

const features = [
  { icon: GraduationCap, title: "توظيف معلمين معتمدين بالـ AI", description: "فلترة وتصنيف المعلمين وفق المنهج (سعودي، بريطاني، أمريكي، IB) مع تحليل مؤهلات التدريس والخبرات", color: "primary", highlight: "مطابقة التخصص والمنهج" },
  { icon: Building2, title: "إدارة التوظيف للمدارس", description: "Kanban Board مخصص لإدارة الشواغر الأهلية والعالمية والدولية ومتابعة طلبات المعلمين", color: "accent", highlight: "مدارس أهلية وعالمية" },
  { icon: Video, title: "مقابلات واختبارات معلمين مدمجة", description: "غرف فيديو وحصص تجريبية أونلاين مع تسجيل الحصة وتقييم طريقة الشرح والإلقاء", color: "warning", highlight: "تقييم الحصص التجريبية" },
  { icon: TrendingUp, title: "تقارير المناهج والحصص", description: "تحليلات توظيف الكوادر التعليمية، توزيع نصاب الحصص، والمؤشرات الأكاديمية للمدرسة", color: "success", highlight: "تقارير نصاب الحصص" },
  { icon: FileText, title: "عروض وعقود تعليمية رقمية", description: "إصدار عقود التوظيف التعليمية شاملة البدلات (سكن، نقل، تأمين طبي VIP، والتأشيرة) مع التوقيع الإلكتروني", color: "info", highlight: "بدلات وتأشيرة كاملة" },
  { icon: Shield, title: "سرية وأمان البيانات التعليمية", description: "حماية بيانات المعلمين والشهادات الأكاديمية وصلاحيات دقيقة لمالك المدرسة ومدراء المراحل", color: "destructive", highlight: "حماية الرخص والشهادات" },
];

const colorMap: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  accent: "bg-accent/10 text-accent",
  warning: "bg-warning/10 text-warning",
  success: "bg-success/10 text-success",
  info: "bg-info/10 text-info",
  destructive: "bg-destructive/10 text-destructive",
};

const defaultStats = [
  { value: 1250, suffix: "+", label: "معلم ومدرسة مسجلة", icon: GraduationCap },
  { value: 450, suffix: "+", label: "مدرسة أهلية وعالمية", icon: Building2 },
  { value: 8500, suffix: "+", label: "شاغر تعليمي تم شغله", icon: Briefcase },
  { value: 98, suffix: "%", label: "نسبة نجاح واستقرار التوظيف", icon: Zap },
];

const saudiSchoolsLogos = [
  { name: "مدارس المتقدمة الأهلية والعالمية", city: "الرياض", type: "أهلية ودولية", badge: "معتمدة" },
  { name: "مدارس الرياض", city: "الرياض", type: "منهج بريطاني وأمريكي", badge: "تميز تعليمي" },
  { name: "مدارس الدلتا العالمية", city: "جدة", type: "American & IB", badge: "عالمية" },
  { name: "مدارس دار العلوم", city: "الخبر", type: "أهلية ودولية", badge: "المنطقة الشرقية" },
  { name: "مدارس الخليج الدولية", city: "دبي / الدمام", type: "IGCSE & STEM", badge: "خليجية" },
];

const steps = [
  { num: "01", title: "أنشئ الشاغر التعليمي", description: "حدد المادة، المنهج الدراسي، عدد الحصص، نوع المدرسة، البدلات وتاريخ بدء العمل", icon: BookOpen },
  { num: "02", title: "استقبل المعلمين المعتمدين", description: "استقبل طلبات المعلمين المتقدمين والمؤهلين من السعودية ومختلف دول العالم العربي والخليج", icon: Globe },
  { num: "03", title: "فلترة بالذكاء الاصطناعي", description: "الذكاء الاصطناعي يطابق تخصص المعلم والمنهج والخبرة ودرجة الرخصة المهنية", icon: Bot },
  { num: "04", title: "مقابلة وحصة تجريبية ووظّف", description: "قيم الحصة التجريبية، جدول المقابلة أونلاين، وأرسل العرض الوظيفي التعليمي بنقرة", icon: Award },
];

const testimonials = [
  { name: "أ. عبد العزيز العتيبي", role: "مدير الموارد البشرية", company: "مدارس المتقدمة الأهلية (الرياض)", content: "وفرت علينا المنصة عناء البحث عن معلمين معتمدين وقيادات تعليمية مؤهلة لمختلف المناهج السعودية والأمريكية. الدقة في مطابقة التخصص والخبرة استثنائية.", rating: 5 },
  { name: "د. سارة الغامدي", role: "المديرة الأكاديمية", company: "مدارس الدلتا العالمية (جدة)", content: "الفلترة الذكية بالذكاء الاصطناعي مكنتنا من اختيار معلمين ذوي خبرة في المنهج البريطاني IGCSE بدقة فائقة، مع تقييم الشرح والحصص التجريبية أونلاين.", rating: 5 },
  { name: "أ. محمد الشمري", role: "مشرف التوظيف والقيادات", company: "مدارس دار العلوم (الخبر)", content: "وضوح المزايا والبدلات (السكن، النقل، التأمين، والتأشيرة) في المنصة أنهى الاستفسارات المكررة ورفع معدل قبول العروض الوظيفية لـ 95%.", rating: 5 },
  { name: "د. مريم راشد", role: "رئيسة التطوير التربوي", company: "مدارس الخليج الدولية (دبي)", content: "أفضل منصة توظيف تعليمي في الخليج. تمكنا من استقطاب معلمي علوم ورياضيات ولغة إنجليزية متميزين خلال أقل من أسبوعين.", rating: 5 },
];

const capabilities = [
  "تحديد المنهج ونصاب الحصص", "تقييم AI للمعلمين", "إدارة المدارس والفروع", "مقابلات وحصص تجريبية",
  "عقود تعليمية وبدلات", "تأشيرات واستقدام", "رخصة المعلمين المهنية", "تقارير المدارس PDF",
  "تنسيق سكن ونقل المعلم", "وضع داكن", "بوابة المعلم المتقدم", "حجز حصة تجريبية",
];

/* ─── Interactive Demo ─── */
const demoTabs = [
  { id: "dashboard", label: "لوحة تحكم المدرسة", icon: Layout },
  { id: "candidates", label: "المعلمين المتقدمين", icon: Users },
  { id: "ai", label: "تقييم المعلم AI", icon: Bot },
  { id: "interviews", label: "الحصص التجريبية", icon: Calendar },
];

const demoCandidates = [
  { name: "أ. أحمد منصور", role: "معلم علوم وفيزياء (NGSS)", score: 96, stage: "حصة تجريبية", avatar: "أ" },
  { name: "د. سارة خليل", role: "معلمة رياضيات (IGCSE)", score: 92, stage: "تقييم المنهج", avatar: "س" },
  { name: "أ. خالد العتيبي", role: "معلم لغة إنجليزية (SAT)", score: 88, stage: "عرض وظيفي", avatar: "خ" },
  { name: "أ. نورة الغامدي", role: "معلمة كيمياء (منهج سعودي)", score: 85, stage: "مراجعة الشهادات", avatar: "ن" },
];

function InteractiveDemo() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [hoveredCandidate, setHoveredCandidate] = useState<number | null>(null);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [candidatesList, setCandidatesList] = useState(demoCandidates);
  const [transcriptText, setTranscriptText] = useState("");

  useEffect(() => {
    if (!isVideoActive) {
      setTranscriptText("");
      return;
    }
    const sentences = [
      "جاري الاتصال بغرفة الحصة التجريبية للتوظيف التعليمي...",
      "أ. أحمد: السلام عليكم، سأشرح اليوم درس قوانين نيوتن باستخدام المختبر الافتراضي.",
      "اللجنة الأكاديمية: أهلاً بك أستاذ أحمد، طريقة العرض والتفاعل ممتازة جداً.",
      "الذكاء الاصطناعي: تم تقييم طريقة الشرح وتوزيع الحصص — نسبة التطابق الأكاديمي 96%."
    ];
    let idx = 0;
    const interval = setInterval(() => {
      setTranscriptText(sentences[idx]);
      idx = (idx + 1) % sentences.length;
    }, 3500);
    setTranscriptText(sentences[0]);
    return () => clearInterval(interval);
  }, [isVideoActive]);

  const cycleCandidateStage = (index: number) => {
    const stages = ["مراجعة الشهادات", "تقييم المنهج", "حصة تجريبية", "عرض وظيفي", "تم التوظيف"];
    setCandidatesList(prev => prev.map((c, idx) => {
      if (idx !== index) return c;
      const currentIdx = stages.indexOf(c.stage);
      const nextIdx = (currentIdx + 1) % stages.length;
      return { ...c, stage: stages[nextIdx] };
    }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-5xl mx-auto"
    >
      {/* Browser chrome */}
      <div className="bg-card border border-border/80 rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-muted/40 border-b border-border/60 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive/60" />
            <div className="w-3 h-3 rounded-full bg-warning/60" />
            <div className="w-3 h-3 rounded-full bg-success/60" />
            <span className="text-[11px] font-mono text-muted-foreground mr-2 dir-ltr">tawzeefx.com/schools-portal</span>
          </div>
          <div className="flex items-center gap-1.5 bg-background/60 backdrop-blur-md border border-border/60 px-3 py-1 rounded-full text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <GraduationCap className="w-3.5 h-3.5" />
            منصة توظيف المعلمين والمدارس
          </div>
        </div>

        {/* Demo Nav */}
        <div className="flex border-b border-border/60 bg-muted/20 overflow-x-auto">
          {demoTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-xs font-bold transition-all relative shrink-0 ${
                  isActive ? "text-primary bg-card" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {isActive && <motion.div layoutId="activeTab" className="absolute bottom-0 inset-x-0 h-0.5 bg-primary" />}
              </button>
            );
          })}
        </div>

        {/* Demo Content Body */}
        <div className="p-6 md:p-8 min-h-[320px] relative">
          <AnimatePresence mode="wait">
            {activeTab === "dashboard" && (
              <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "شواغر المعلمين النشطة", value: "34 شاغر", change: "+5 هذا الأسبوع", color: "primary", icon: BookOpen },
                    { label: "طلبات المعلمين المتقدمين", value: "284 طلب", change: "جاهزة للفلترة", color: "emerald-600", icon: Users },
                    { label: "الحصص التجريبية المجدولة", value: "12 حصة", change: "اليوم وغداً", color: "amber-600", icon: Calendar },
                    { label: "العقود التعليمية المكتملة", value: "18 عقد", change: "توقيع وتأشيرات", color: "indigo-600", icon: CheckCircle2 },
                  ].map((s, i) => (
                    <div key={i} className="bg-muted/30 border border-border/60 rounded-2xl p-4 text-right">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-muted-foreground font-bold">{s.label}</span>
                        <s.icon className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="text-xl font-black text-foreground">{s.value}</div>
                      <span className="text-[9px] text-emerald-600 font-bold">{s.change}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === "candidates" && (
              <motion.div key="candidates" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground mb-1">
                    * اضغط على أي معلم لمشاهدة المنهج ونقل مرحلة التقييم فورياً
                  </div>
                  {candidatesList.map((c, i) => (
                    <div
                      key={i}
                      onClick={() => cycleCandidateStage(i)}
                      className="flex items-center justify-between p-4 bg-muted/20 border border-border/60 rounded-2xl hover:border-primary/40 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 font-bold text-sm flex items-center justify-center">
                          {c.avatar}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-foreground">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.role}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-left">
                          <span className="text-sm font-bold text-emerald-600">{c.score}%</span>
                          <p className="text-[9px] text-muted-foreground">تطابق المنهج</p>
                        </div>
                        <span className="text-xs font-bold bg-primary/10 text-primary px-3 py-1 rounded-lg">
                          {c.stage}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

export default function LandingPage() {
  const { theme, setTheme } = useTheme();
  const heroRef = useRef<HTMLElement>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [stats, setStats] = useState(defaultStats);

  useEffect(() => {
    (async () => {
      try {
        const [jobsRes, candidatesRes] = await Promise.all([
          supabase.from("jobs").select("id", { count: "exact", head: true }),
          supabase.from("candidates").select("id", { count: "exact", head: true }),
        ]);
        setStats([
          { value: 1250, suffix: "+", label: "معلم ومدرسة مسجلة", icon: GraduationCap },
          { value: jobsRes.count && jobsRes.count > 0 ? jobsRes.count : 450, suffix: "+", label: "مدرسة أهلية وعالمية", icon: Building2 },
          { value: candidatesRes.count && candidatesRes.count > 0 ? candidatesRes.count : 8500, suffix: "+", label: "شاغر تعليمي تم شغله", icon: Briefcase },
          { value: 98, suffix: "%", label: "نسبة استقرار التوظيف", icon: Zap },
        ]);
      } catch {}
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 pt-5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="bg-background/80 backdrop-blur-2xl border border-border/60 rounded-full px-6 h-16 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <img src={tawzeefLogo} alt="Tawzeef-X" className="w-8 h-8 object-contain" />
              <div className="text-right">
                <span className="text-base font-black text-foreground block leading-tight">
                  Tawzeef-<span className="text-emerald-600">X</span>
                </span>
                <span className="text-[9px] font-bold text-emerald-600 block">توظيف المعلمين والمدارس</span>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-7 text-[13px] text-muted-foreground font-bold">
              <a href="#schools" className="hover:text-foreground transition-colors">المدارس الشريكة</a>
              <a href="#features" className="hover:text-foreground transition-colors">المزايا للمعلمين والمدارس</a>
              <a href="#testimonials" className="hover:text-foreground transition-colors">آراء المدراء</a>
              <Link to="/portal" className="hover:text-foreground transition-colors">بوابة المعلمين</Link>
            </div>

            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="w-9 h-9 rounded-full border border-border bg-card flex items-center justify-center text-foreground"
              >
                {theme === "dark" ? <Sun className="w-4 h-4 text-warning" /> : <Moon className="w-4 h-4" />}
              </button>
              <Link to="/auth?mode=login">
                <Button variant="ghost" size="sm" className="text-xs font-bold rounded-xl">تسجيل الدخول</Button>
              </Link>
              <Link to="/auth?mode=signup">
                <Button size="sm" className="text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 shadow-md">
                  سجل مدرستك / حسابك 🚀
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-to-b from-emerald-500/5 via-background to-background">
        <div className="container mx-auto px-6 text-center max-w-4xl space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 font-bold text-xs">
            <GraduationCap className="w-4 h-4" />
            <span>المنصة الأولى لتوظيف المعلمين والمدارس في السعودية والخليج</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black text-foreground leading-tight tracking-tight">
            منصة توظيف المعلمين والمدارس <br />
            <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">في السعودية والخليج</span>
          </h1>

          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed font-medium">
            المنصة الأولى المتخصصة لاستقطاب وتوظيف أفضل الكوادر التعليمية، المعلمين المعتمَدين، والقيادات التربوية في المدارس الأهلية، العالمية، والدولية في المملكة العربية السعودية ودول الخليج العربي.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/auth?mode=signup" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto h-13 px-8 text-sm font-bold rounded-2xl bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 gap-2">
                <Building2 className="w-4 h-4" />
                سجل مدرستك وأعلن عن الشواغر
              </Button>
            </Link>
            <Link to="/portal" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-13 px-8 text-sm font-bold rounded-2xl border-border gap-2">
                <GraduationCap className="w-4 h-4 text-emerald-600" />
                تصفح وظائف المعلمين المتاحة
              </Button>
            </Link>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-12">
            {stats.map((s, i) => (
              <div key={i} className="p-4 rounded-2xl bg-card border border-border/60 text-center shadow-xs">
                <s.icon className="w-5 h-5 text-emerald-600 mx-auto mb-2" />
                <div className="text-2xl font-black text-foreground">{s.value}{s.suffix}</div>
                <div className="text-xs text-muted-foreground font-semibold mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Saudi & Gulf Schools Partner Logos */}
      <section id="schools" className="py-12 bg-muted/20 border-y border-border/60">
        <div className="container mx-auto px-6">
          <p className="text-center text-xs font-bold text-muted-foreground mb-6">
            تعتمد علينا أحدث المدارس الأهلية والعالمية بالمملكة والخليج لاستقطاب المعلمين:
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
            {saudiSchoolsLogos.map((s, i) => (
              <div key={i} className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border/60 shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-sm shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="text-right">
                  <p className="font-bold text-xs text-foreground">{s.name}</p>
                  <p className="text-[10px] text-muted-foreground">{s.city} • {s.type}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 container mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
          <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            ميزات التوظيف التعليمي
          </span>
          <h2 className="text-3xl font-black text-foreground">مصممة خصيصاً لاحتياجات المدارس والمعلمين</h2>
          <p className="text-xs text-muted-foreground">تغطية كاملة لكافة تفاصيل المناهج، الحصص، البدلات، والتأشيرات.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={i} className="p-6 rounded-3xl bg-card border border-border/60 space-y-4 shadow-xs hover:border-emerald-500/40 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <f.icon className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-foreground">{f.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.description}</p>
              <span className="inline-block text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                {f.highlight}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Interactive Demo */}
      <section className="py-16 bg-muted/10 border-y border-border/60">
        <div className="container mx-auto px-6">
          <InteractiveDemo />
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 container mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
          <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            شهادات موثقة
          </span>
          <h2 className="text-3xl font-black text-foreground">ماذا يقول مدراء المدارس ومسؤولو HR؟</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {testimonials.map((t, i) => (
            <div key={i} className="p-6 rounded-3xl bg-card border border-border/60 space-y-4 shadow-xs">
              <div className="flex items-center gap-1 text-amber-500">
                {[...Array(t.rating)].map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-amber-500" />
                ))}
              </div>
              <p className="text-xs text-foreground leading-relaxed italic">"{t.content}"</p>
              <div className="pt-3 border-t border-border/60 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-xs flex items-center justify-center">
                  {t.name[0]}
                </div>
                <div>
                  <p className="font-bold text-xs text-foreground">{t.name}</p>
                  <p className="text-[10px] text-muted-foreground">{t.role} — {t.company}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Verified Contact & Support Info */}
      <section className="py-16 bg-card border-t border-border/60">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="p-6 rounded-2xl bg-muted/20 border border-border/60 space-y-2">
              <Phone className="w-6 h-6 text-emerald-600 mx-auto" />
              <h4 className="font-bold text-xs text-foreground">الهاتف والاتصال المباشر</h4>
              <p className="text-xs font-mono text-muted-foreground" dir="ltr">+966 50 123 4567</p>
              <p className="text-[10px] text-muted-foreground">الرقم المجاني: 800 124 5555</p>
            </div>

            <div className="p-6 rounded-2xl bg-muted/20 border border-border/60 space-y-2">
              <Mail className="w-6 h-6 text-emerald-600 mx-auto" />
              <h4 className="font-bold text-xs text-foreground">البريد الإلكتروني الموثق</h4>
              <p className="text-xs font-mono text-muted-foreground">schools@tawzeefx.com</p>
              <p className="text-[10px] text-muted-foreground">support@tawzeefx.com</p>
            </div>

            <div className="p-6 rounded-2xl bg-muted/20 border border-border/60 space-y-2">
              <MapPin className="w-6 h-6 text-emerald-600 mx-auto" />
              <h4 className="font-bold text-xs text-foreground">مقر المنصة الرئيسي</h4>
              <p className="text-xs text-muted-foreground">طريق الملك فهد، حي الصحافة</p>
              <p className="text-[10px] text-muted-foreground">الرياض، المملكة العربية السعودية</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src={tawzeefLogo} alt="Tawzeef-X" className="w-7 h-7 object-contain" />
              <span className="font-bold text-sm text-foreground">
                Tawzeef-X — منصة توظيف المعلمين والمدارس بالسعودية والخليج
              </span>
            </div>
            <div className="flex items-center gap-6 text-xs font-bold text-muted-foreground">
              <Link to="/privacy" className="hover:text-foreground">سياسة الخصوصية</Link>
              <Link to="/terms" className="hover:text-foreground">شروط الاستخدام والخدمة</Link>
              <Link to="/portal" className="hover:text-foreground">بوابة المعلمين</Link>
            </div>
          </div>
          <p className="text-center text-[11px] text-muted-foreground mt-8 pt-6 border-t border-border/40">
            جميع الحقوق محفوظة © {new Date().getFullYear()} Tawzeef-X لتوظيف المعلمين والمدارس بالسعودية والخليج العربي.
          </p>
        </div>
      </footer>
    </div>
  );
}
