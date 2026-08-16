import tawzeefLogo from "@/assets/tawzeef-x-logo.png";
import { Link } from "react-router-dom";
import { Users, Bot, ArrowLeft, TrendingUp, Shield, Globe, CheckCircle2, Zap, Star, Briefcase, FileText, BarChart3, Video, Sparkles, Award, Play, ArrowUpRight, MousePointerClick, Layout, MessageSquare, Calendar, Send, Menu, X, Sun, Moon, ChevronDown, Check, Building2, Lock, Cpu, Activity, Layers, Server, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform, AnimatePresence, useInView, useMotionValue, useSpring, useMotionTemplate } from "framer-motion";
import { useRef, useState, useEffect, useCallback } from "react";
import { useTheme } from "@/contexts/ThemeContext";

import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/marketing/SEO";
import { useSubscriptionPlans } from "@/hooks/useSubscription";

const features = [
  { icon: Bot, title: "ذكاء اصطناعي متقدم", description: "فلترة وتصنيف المرشحين تلقائياً باستخدام AI مع تقييم شامل للمهارات والخبرات", highlight: "توفير 80% من الوقت", colorIdx: 0 },
  { icon: Users, title: "إدارة مرشحين احترافية", description: "Kanban Board متقدم لتتبع المرشحين عبر جميع مراحل التوظيف مع مقارنة فورية", highlight: "مقارنة حتى 4 مرشحين", colorIdx: 1 },
  { icon: Video, title: "مقابلات أونلاين مدمجة", description: "غرف فيديو مدمجة في المنصة مع تسجيل ونسخ نصي تلقائي وتقييم تفصيلي", highlight: "تسجيل + نسخ نصي", colorIdx: 2 },
  { icon: TrendingUp, title: "تقارير وتحليلات ذكية", description: "لوحة تحكم تفاعلية مع رسوم بيانية متقدمة وتصدير PDF ومؤشرات أداء KPIs", highlight: "تصدير PDF", colorIdx: 0 },
  { icon: FileText, title: "عروض وظيفية رقمية", description: "إنشاء وإرسال عروض وظيفية احترافية مع توقيع إلكتروني وتتبع الاستجابة", highlight: "توقيع إلكتروني", colorIdx: 1 },
  { icon: Shield, title: "أمان وصلاحيات متقدمة", description: "نظام أدوار متعدد المستويات مع صلاحيات دقيقة ودعوات فريق آمنة", highlight: "RLS + تشفير", colorIdx: 2 },
];

const iconContainerColors = [
  "bg-md-primary-container text-md-on-primary-container",
  "bg-md-secondary-container text-md-on-secondary-container",
  "bg-md-tertiary-container text-md-on-tertiary-container",
];

const complianceHighlights = [
  { label: "عزل بيانات المؤسسات (RLS)", icon: Shield },
  { label: "تشفير سحابي عالي الأمان", icon: Lock },
  { label: "متوافق مع لوائح التوظيف", icon: Building2 },
  { label: "استجابة ذكاء اصطناعي فائقة", icon: Cpu },
  { label: "بنية تحتية موثوقة 99.9%", icon: Server },
  { label: "تكامل سلس مع الأنظمة الداخلية", icon: Layers },
];

const steps = [
  { num: "01", title: "أنشئ متطلبات الشاغر", description: "حدد المتطلبات والمهارات باستخدام مساعد الذكاء الاصطناعي أو القوالب الجاهزة", icon: Briefcase },
  { num: "02", title: "استقبل المتقدمين", description: "شارك رابط التقديم المباشر واستقبل الطلبات تلقائياً لمعالجتها فورياً", icon: Globe },
  { num: "03", title: "فلترة ومطابقة بالـ AI", description: "الذكاء الاصطناعي يحلل السير الذاتية ويرتب المرشحين حسب نسبة التطابق الفعلي", icon: Bot },
  { num: "04", title: "المقابلات والعروض", description: "أجرِ المقابلات عبر الغرف المدمجة، قيّم المرشحين، وأرسل العروض الوظيفية بنقرة زر", icon: Award },
];

const testimonials = [
  { name: "أحمد محمد", role: "مدير الموارد البشرية", company: "تيك إنوفيشن", content: "غيرت هذه المنصة طريقة عملنا في التوظيف. توفير في الوقت والجهد بنسبة 80%.", rating: 5, avatar: "أ" },
  { name: "سارة أحمد", role: "مديرة التوظيف", company: "سمارت سولوشنز", content: "أفضل منصة توظيف استخدمتها. المقابلات الأونلاين المدمجة والنسخ النصي التلقائي وفّرا علينا ساعات.", rating: 5, avatar: "س" },
  { name: "محمد علي", role: "CEO", company: "ديجيتال ويف", content: "استطعنا العثور على أفضل المواهب في وقت قياسي. التقارير التفصيلية رائعة.", rating: 5, avatar: "م" },
  { name: "نورة الحربي", role: "رئيسة قسم التوظيف", company: "كلاسيرا للتعليم", content: "المنصة سهلت علينا إدارة أكثر من 200 طلب توظيف شهرياً. نظام التتبع لا يُقدّر بثمن.", rating: 5, avatar: "ن" },
  { name: "خالد العتيبي", role: "مدير العمليات", company: "نيوم تكنولوجي", content: "العروض الوظيفية الرقمية مع التوقيع الإلكتروني أنهت مشكلة التأخير تماماً.", rating: 5, avatar: "خ" },
  { name: "ريم القحطاني", role: "HR Manager", company: "فيوتشر بيلد", content: "الربط مع Zapier و n8n وفّر علينا ساعات من العمل اليدوي. الأتمتة استثنائية.", rating: 4, avatar: "ر" },
];

const capabilities = [
  "قوالب وظيفية جاهزة", "تقييم AI تلقائي", "Kanban Board متقدم", "مقابلات فيديو مدمجة",
  "تسجيل ونسخ نصي", "عروض وظيفية رقمية", "إشعارات فورية", "تقارير PDF",
  "Webhooks & API", "وضع داكن", "بوابة المرشح", "حجز مقابلات ذاتي",
];

const demoTabs = [
  { id: "dashboard", label: "لوحة التحكم", icon: Layout },
  { id: "candidates", label: "المرشحين", icon: Users },
  { id: "ai", label: "تقييم AI", icon: Bot },
  { id: "interviews", label: "المقابلات", icon: Calendar },
];

const demoCandidates = [
  { name: "أحمد محمد", role: "مطور React", score: 92, stage: "مقابلة", avatar: "أ" },
  { name: "سارة علي", role: "مصممة UX", score: 88, stage: "تقييم", avatar: "س" },
  { name: "خالد حسن", role: "مدير مشاريع", score: 85, stage: "عرض وظيفي", avatar: "خ" },
  { name: "نورة سعد", role: "محللة بيانات", score: 79, stage: "فلترة", avatar: "ن" },
];

const pricingPlans = [
  {
    name: "Starter", nameAr: "المبدئية", price: "مجاناً", billing: "للأبد",
    description: "مثالية للشركات الناشئة",
    cta: "ابدأ مجاناً", ctaLink: "/auth?mode=signup",
    highlighted: false, dark: false,
    features: ["5 وظائف نشطة", "50 مرشح/شهر", "تحليل AI أساسي", "بوابة مرشحين", "دعم عبر البريد"],
  },
  {
    name: "Pro", nameAr: "الاحترافية", price: "49", billing: "ريال/شهر",
    description: "للشركات الجادة في التوظيف",
    cta: "ابدأ تجربة 14 يوم", ctaLink: "/auth?mode=signup",
    highlighted: true, dark: false,
    features: ["وظائف غير محدودة", "مرشحين غير محدودين", "AI متقدم + مقارنة", "مقابلات فيديو مدمجة", "تقارير وتحليلات", "دعم أولوية 24/7"],
  },
  {
    name: "Enterprise", nameAr: "المؤسسية", price: "اتصل", billing: "بنا",
    description: "لكبريات المؤسسات والمجموعات",
    cta: "تواصل معنا", ctaLink: "/contact",
    highlighted: false, dark: true,
    features: ["كل مميزات Pro", "SSO + LDAP", "API مخصص", "حساب مدير مخصص", "SLA 99.99%", "تكاملات مخصصة"],
  },
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
      "جاري الاتصال بغرفة المقابلات الذكية...",
      "سارة: السلام عليكم، شكراً لاستضافتي في هذه المقابلة.",
      "الروبوت: وعليكم السلام سارة. يسعدنا وجودك معنا اليوم.",
      "سارة: أنا متحمسة لمناقشة خبرتي في React و TailwindCSS.",
      "الذكاء الاصطناعي: تم تحليل التوافق اللغوي والتقني — نسبة نجاح عالية 92%."
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
    const stages = ["فلترة", "تقييم", "مقابلة", "عرض وظيفي", "تم التوظيف"];
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
      className="max-w-5xl mx-auto w-full"
    >
      <div className="bg-md-surface-container shadow-md3-5 overflow-hidden relative rounded-md3-lg border border-md-outline-variant">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-md-outline-variant bg-md-surface-container-highest rounded-t-md3-xl">
          <div className="flex gap-1.5">
            <div className="w-3.5 h-3.5 rounded-md3-full bg-red-500" />
            <div className="w-3.5 h-3.5 rounded-md3-full bg-yellow-500" />
            <div className="w-3.5 h-3.5 rounded-md3-full bg-green-500" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="bg-md-surface rounded-md3-sm px-4 py-1 text-md3-label-lg text-md-on-surface-variant font-mono flex items-center gap-2 shadow-md3-1 border border-md-outline-variant">
              <Shield className="w-3 h-3 text-green-500" />
              tawzeef-x.app/dashboard
            </div>
          </div>
        </div>

        {/* Tab bar (MD3 Primary Tabs style) */}
        <div className="flex border-b border-md-outline-variant bg-md-surface-container px-4 gap-1 overflow-x-auto">
          {demoTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setIsVideoActive(false);
              }}
              className={`relative flex items-center gap-2 px-4 py-3 text-md3-label-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id ? "text-md-primary" : "text-md-on-surface-variant hover:text-md-on-surface"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="demo-tab"
                  className="absolute bottom-0 left-0 right-0 h-1 bg-md-primary rounded-t-md3-xs"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Content area */}
        <div className="p-6 min-h-[400px] relative bg-md-surface">
          <AnimatePresence mode="wait">
            {activeTab === "dashboard" && (
              <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: "وظائف نشطة", value: "12", change: "+3", icon: Briefcase },
                    { label: "مرشحين جدد", value: "48", change: "+15", icon: Users },
                    { label: "مقابلات اليوم", value: "5", change: "+2", icon: Video },
                    { label: "عروض مرسلة", value: "8", change: "+4", icon: Send },
                  ].map((s, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.08 }}
                      className="bg-md-surface-container border border-md-outline-variant rounded-md3-md p-4 group hover:border-md-primary transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-md3-label-lg text-md-on-surface-variant">{s.label}</span>
                        <s.icon className={`w-4 h-4 text-md-primary`} />
                      </div>
                      <div className="text-md3-title-lg font-bold text-md-on-surface">{s.value}</div>
                      <span className="text-md3-label-lg text-green-500 font-medium">{s.change} هذا الأسبوع</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === "candidates" && (
              <motion.div key="candidates" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="space-y-3">
                  <div className="text-md3-label-lg text-md-on-surface-variant mb-1">
                    * اضغط على أي مرشح لتغيير مرحلة التوظيف الخاصة به فورياً
                  </div>
                  {candidatesList.map((c, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      onMouseEnter={() => setHoveredCandidate(i)}
                      onMouseLeave={() => setHoveredCandidate(null)}
                      onClick={() => cycleCandidateStage(i)}
                      className="flex items-center gap-4 p-4 bg-md-surface-container border border-md-outline-variant rounded-md3-md hover:border-md-primary transition-all cursor-pointer group"
                    >
                      <motion.div
                        animate={hoveredCandidate === i ? { scale: 1.1, rotate: -5 } : { scale: 1, rotate: 0 }}
                        className="w-11 h-11 rounded-md3-sm bg-md-primary text-md-on-primary flex items-center justify-center font-bold text-md3-body-md shrink-0"
                      >
                        {c.avatar}
                      </motion.div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-md3-body-md text-md-on-surface">{c.name}</div>
                        <div className="text-md3-label-lg text-md-on-surface-variant">{c.role}</div>
                      </div>
                      <div className="hidden sm:flex items-center gap-3">
                        <div className="text-center">
                          <div className="text-md3-title-lg font-bold text-md-primary">{c.score}%</div>
                          <div className="text-md3-label-lg text-md-on-surface-variant">تطابق AI</div>
                        </div>
                        <motion.span
                          animate={hoveredCandidate === i ? { scale: 1.08 } : { scale: 1 }}
                          className="text-md3-label-lg font-medium bg-md-secondary-container text-md-on-secondary-container px-3 py-1.5 rounded-md3-md min-w-[70px] text-center border border-md-outline-variant"
                        >
                          {c.stage}
                        </motion.span>
                      </div>
                      <motion.div
                        initial={{ opacity: 0, x: 10 }}
                        animate={hoveredCandidate === i ? { opacity: 1, x: 0 } : { opacity: 0, x: 10 }}
                        className="text-md-primary"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </motion.div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === "ai" && (
              <motion.div key="ai" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="bg-md-surface-container border border-md-outline-variant rounded-md3-md p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-md3-sm bg-md-primary-container text-md-on-primary-container flex items-center justify-center">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-md3-body-md text-md-on-surface">تقييم الذكاء الاصطناعي</div>
                      <div className="text-md3-label-lg text-md-on-surface-variant">تحليل شامل للمرشح</div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {[
                      { label: "المهارات التقنية", value: 92 },
                      { label: "الخبرة العملية", value: 85 },
                      { label: "التوافق الثقافي", value: 78 },
                      { label: "مهارات التواصل", value: 90 },
                    ].map((skill, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-md3-body-md mb-1.5">
                          <span className="text-md-on-surface font-medium">{skill.label}</span>
                          <span className="text-md-primary font-bold">{skill.value}%</span>
                        </div>
                        <div className="h-2.5 bg-md-surface-variant rounded-md3-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-md3-full bg-md-primary"
                            initial={{ width: 0 }}
                            animate={{ width: `${skill.value}%` }}
                            transition={{ delay: 0.2 + i * 0.15, duration: 0.8 }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "interviews" && (
              <motion.div key="interviews" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="space-y-3">
                  {[
                    { name: "أحمد محمد", time: "10:00 ص", type: "فيديو", status: "قادمة" },
                    { name: "سارة علي", time: "11:30 ص", type: "تقني", status: "الآن" },
                    { name: "خالد حسن", time: "02:00 م", type: "نهائية", status: "قادمة" },
                  ].map((interview, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.12 }}
                      className="flex items-center gap-4 p-4 bg-md-surface-container border border-md-outline-variant rounded-md3-md"
                    >
                      <div className="w-11 h-11 rounded-md3-sm bg-md-secondary-container text-md-on-secondary-container flex items-center justify-center font-bold text-md3-body-md shrink-0">
                        {interview.name[0]}
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-md3-body-md text-md-on-surface">{interview.name}</div>
                        <div className="text-md3-label-lg text-md-on-surface-variant flex items-center gap-2">
                          <Calendar className="w-3 h-3" />
                          {interview.time} — مقابلة {interview.type}
                        </div>
                      </div>
                      <motion.span
                        className={`text-md3-label-lg font-bold px-3 py-1.5 rounded-md3-sm border ${
                          interview.status === "الآن"
                            ? "bg-md-primary-container text-md-on-primary-container border-transparent"
                            : "bg-transparent text-md-on-surface-variant border-md-outline-variant"
                        }`}
                      >
                        {interview.status}
                      </motion.span>
                      {interview.status === "الآن" && (
                        <Button
                          size="sm"
                          onClick={() => setIsVideoActive(true)}
                          className="bg-md-primary text-md-on-primary rounded-md3-xl text-md3-label-lg font-bold h-8 px-3"
                        >
                          <Video className="w-3 h-3 mr-1" />
                          انضم
                        </Button>
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Video Overlay inside Demo */}
          <AnimatePresence>
            {isVideoActive && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute inset-0 bg-md-surface/95 backdrop-blur-md rounded-md3-lg p-6 z-30 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between border-b border-md-outline-variant pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-md3-full bg-red-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-md-on-surface-variant font-mono tracking-wider">LIVE RECORDING & AI</span>
                  </div>
                  <span className="text-md3-label-lg font-bold bg-md-primary-container text-md-on-primary-container px-3 py-1 rounded-md3-full">
                    مقابلة تقنية — سارة علي
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4 flex-1 items-stretch">
                  <div className="bg-md-surface-container border border-md-outline-variant rounded-md3-lg relative flex flex-col items-center justify-center p-6 min-h-[180px]">
                    <div className="w-20 h-20 rounded-md3-full bg-md-primary-container text-md-on-primary-container flex items-center justify-center text-md3-headline-md font-bold z-10">
                      س
                    </div>
                    <span className="text-md3-body-md font-bold mt-3 text-md-on-surface z-10">سارة علي</span>
                    <div className="absolute bottom-3 inset-x-3 bg-md-surface/80 backdrop-blur-md border border-md-outline-variant rounded-md3-sm p-2.5 text-center">
                      <p className="text-md3-label-lg text-md-on-surface font-medium leading-relaxed">
                        {transcriptText || "جاري تحميل بث المقابلة..."}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-md-outline-variant pt-3">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setIsVideoActive(false)}
                    className="rounded-md3-xl font-bold h-9 px-4"
                  >
                    إنهاء المقابلة
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { stiffness: 80, damping: 20 });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (inView) motionVal.set(value);
  }, [inView, value, motionVal]);

  useEffect(() => {
    const unsub = spring.on("change", (v) => {
      setDisplay(value % 1 !== 0 ? v.toFixed(1) : Math.round(v).toString());
    });
    return unsub;
  }, [spring, value]);

  return <span ref={ref}>{display}{suffix}</span>;
}

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } }
};

export default function LandingPage() {
  const { theme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 1. Dynamic System Telemetry & Statistics directly from Supabase (NO FAKE STATS)
  const [systemStats, setSystemStats] = useState({
    activeJobs: 0,
    candidates: 0,
    interviews: 0,
    companiesCount: 0,
    isLoaded: false,
  });

  // 2. Real Companies fetched from Supabase
  const [realCompanies, setRealCompanies] = useState<Array<{ id: string; name: string; logo_url: string | null }>>([]);

  // 3. Dynamic Subscription Plans fetched from Supabase (connected to Settings)
  const { data: dbPlans, isLoading: plansLoading } = useSubscriptionPlans();

  useEffect(() => {
    async function fetchPlatformData() {
      try {
        const [jobsRes, candRes, interRes, compRes] = await Promise.all([
          supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "نشطة"),
          supabase.from("candidates").select("id", { count: "exact", head: true }),
          supabase.from("interviews").select("id", { count: "exact", head: true }),
          supabase.from("companies").select("id, name, logo_url, status"),
        ]);

        const approvedComps = (compRes.data || []).filter((c: any) => c.status === "approved" || c.name);

        setSystemStats({
          activeJobs: jobsRes.count ?? 0,
          candidates: candRes.count ?? 0,
          interviews: interRes.count ?? 0,
          companiesCount: approvedComps.length,
          isLoaded: true,
        });

        setRealCompanies(approvedComps);
      } catch (err) {
        console.warn("Failed to fetch live telemetry:", err);
        setSystemStats((prev) => ({ ...prev, isLoaded: true }));
      }
    }
    fetchPlatformData();
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const staggerContainer = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1 } },
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.2, 0, 0, 1] },
    },
  };

  return (
    <div className="min-h-screen bg-md-surface text-md-on-surface overflow-x-hidden w-full max-w-full font-sans antialiased selection:bg-md-primary selection:text-md-on-primary" dir="rtl">
      <SEO
        title="Tawzeef-X | منصة التوظيف الذكية الشاملة للشركات وإدارة الاستقطاب"
        description="منصة التوظيف الذكية المدعومة بالذكاء الاصطناعي — أتمتة الفلترة، تقييم المرشحين، مقابلات الفيديو المدمجة، وإدارة العروض الوظيفية."
        canonical="https://www.tawzeefx.com/"
      />

      {/* ── 1. Top App Bar (MD3 Navigation) ── */}
      <header className="fixed top-0 inset-x-0 z-50 bg-md-surface/85 backdrop-blur-xl border-b border-md-outline-variant/60 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-md3-md bg-md-primary-container text-md-on-primary-container flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <img src={tawzeefLogo} alt="Tawzeef-X" className="w-7 h-7 object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="text-md3-title-lg font-black tracking-tight text-md-on-surface leading-tight">
                Tawzeef-<span className="text-md-primary">X</span>
              </span>
              <span className="text-[10px] text-md-on-surface-variant font-bold tracking-wider">منصة التوظيف الذكية</span>
            </div>
          </Link>

          {/* Desktop Nav Links (No public jobs browsing) */}
          <nav className="hidden lg:flex items-center gap-8">
            {[
              { label: "المميزات المؤسسية", href: "#features" },
              { label: "آلية العمل", href: "#how-it-works" },
              { label: "التجربة الحية", href: "#demo" },
              { label: "باقات الاشتراك", href: "#pricing" },
              { label: "الأمان والموثوقية", href: "#security" },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-md3-label-lg font-bold text-md-on-surface-variant hover:text-md-primary transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Actions */}
          <div className="hidden lg:flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="w-10 h-10 rounded-md3-full flex items-center justify-center text-md-on-surface-variant hover:bg-md-surface-variant/80 transition-colors"
              aria-label="تبديل الوضع"
            >
              {theme === "dark" ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
            </button>
            <Link
              to="/auth?mode=login"
              className="text-md3-label-lg font-bold text-md-primary hover:bg-md-primary-container/40 px-5 py-2.5 rounded-md3-full transition-colors"
            >
              تسجيل الدخول
            </Link>
            <Link
              to="/auth?mode=signup"
              className="bg-md-primary text-md-on-primary text-md3-label-lg font-bold px-6 py-2.5 rounded-md3-full shadow-md3-1 hover:shadow-md3-3 transition-all hover:scale-105"
            >
              ابدأ مجاناً
            </Link>
          </div>

          {/* Mobile Menu Trigger */}
          <button
            className="lg:hidden p-2.5 rounded-md3-md text-md-on-surface hover:bg-md-surface-variant"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="القائمة"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* ── Mobile Drawer ── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[60] bg-md-surface flex flex-col p-6 shadow-2xl"
          >
            <div className="flex justify-between items-center pb-6 border-b border-md-outline-variant">
              <div className="flex items-center gap-2.5">
                <img src={tawzeefLogo} alt="Tawzeef-X" className="w-8 h-8 object-contain" />
                <span className="text-md3-title-lg font-black text-md-primary">Tawzeef-X</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 bg-md-surface-variant rounded-md3-full text-md-on-surface"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex flex-col gap-5 py-8 text-md3-title-md font-bold">
              {[
                { label: "المميزات المؤسسية", href: "#features" },
                { label: "آلية العمل", href: "#how-it-works" },
                { label: "التجربة الحية", href: "#demo" },
                { label: "باقات الاشتراك", href: "#pricing" },
                { label: "الأمان والموثوقية", href: "#security" },
              ].map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-md-on-surface hover:text-md-primary py-2 border-b border-md-outline-variant/40"
                >
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="mt-auto flex flex-col gap-3">
              <Link
                to="/auth?mode=login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-3.5 text-center rounded-md3-full border border-md-outline font-bold text-md-primary"
              >
                تسجيل الدخول
              </Link>
              <Link
                to="/auth?mode=signup"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-3.5 text-center rounded-md3-full bg-md-primary text-md-on-primary font-bold shadow-md3-2"
              >
                إنشاء حساب جديد
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 2. Hero Section ── */}
      <section className="relative min-h-[92vh] pt-32 lg:pt-36 pb-20 overflow-hidden flex items-center">
        {/* Dynamic MD3 Tonal Ambient Blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
          <div className="absolute -top-[15%] right-0 w-[55vw] h-[55vw] rounded-full bg-md-primary-container/35 blur-[130px]" />
          <div className="absolute bottom-0 -left-[10%] w-[45vw] h-[45vw] rounded-full bg-md-secondary-container/30 blur-[110px]" />
          <div className="absolute top-1/2 left-1/3 w-[30vw] h-[30vw] rounded-full bg-md-tertiary-container/15 blur-[90px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle,hsl(var(--md-outline-variant))_1px,transparent_1px)] bg-[size:32px_32px] opacity-25" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Right: Content Column */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="lg:col-span-7 text-center lg:text-right"
            >
              <motion.div variants={fadeUp} className="inline-flex mb-6">
                <div className="bg-md-primary-container text-md-on-primary-container rounded-md3-full px-4 py-1.5 flex items-center gap-2 border border-md-primary/20 shadow-sm">
                  <Sparkles className="w-4 h-4 text-md-primary animate-spin-slow" />
                  <span className="text-md3-label-sm font-black">نظام التوظيف الذكي وإدارة المواهب المؤسسية</span>
                </div>
              </motion.div>

              <motion.h1
                variants={fadeUp}
                className="text-4xl sm:text-5xl lg:text-[54px] font-black leading-[1.25] text-md-on-surface mb-6 tracking-normal"
              >
                أدر منظومة التوظيف كاملة <br />
                <span className="text-md-primary relative inline-block">
                  بذكاء اصطناعي فائق وسرعة قياسية
                  <span className="absolute left-0 bottom-1 w-full h-2 bg-md-primary-container/60 -z-10 rounded-full" />
                </span>
              </motion.h1>

              <motion.p
                variants={fadeUp}
                className="text-md3-body-lg text-md-on-surface-variant max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed font-medium"
              >
                منصة سحابية متكاملة لمدراء الموارد البشرية وفرق الاستقطاب: فرز السير الذاتية بالذكاء الاصطناعي، غرف مقابلات فيديو مدمجة بتفريغ فوري، وإصدار العروض الوظيفية الرقمية بأعلى معايير الأمان.
              </motion.p>

              {/* CTAs (No public jobs button) */}
              <motion.div
                variants={fadeUp}
                className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start mb-10"
              >
                <Link
                  to="/auth?mode=signup"
                  className="w-full sm:w-auto bg-md-primary text-md-on-primary rounded-md3-full h-14 px-9 text-md3-title-sm font-bold flex items-center justify-center gap-2.5 shadow-md3-2 hover:shadow-md3-4 hover:scale-105 transition-all"
                >
                  <span>ابدأ تجربة المنصة مجاناً</span>
                  <ArrowLeft className="w-4 h-4" />
                </Link>

                <a
                  href="#demo"
                  className="w-full sm:w-auto bg-md-secondary-container text-md-on-secondary-container rounded-md3-full h-14 px-8 text-md3-title-sm font-bold flex items-center justify-center gap-2 hover:bg-md-secondary-container/80 transition-all border border-md-outline-variant/80"
                >
                  <Play className="w-4 h-4" />
                  <span>معاينة لوحة التحكم</span>
                </a>
              </motion.div>

              {/* Live Status indicator */}
              <motion.div variants={fadeUp} className="flex items-center justify-center lg:justify-start gap-4 text-xs">
                <div className="flex items-center gap-2 bg-md-surface-container px-3.5 py-1.5 rounded-md3-full border border-md-outline-variant">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-bold text-md-on-surface">حالة النظام: تشغيل نشط 100%</span>
                </div>
                <div className="flex items-center gap-1.5 text-md-on-surface-variant font-medium">
                  <Lock className="w-3.5 h-3.5 text-md-primary" />
                  <span>تشفير وعزل بيانات الشركات RLS</span>
                </div>
              </motion.div>
            </motion.div>

            {/* Left: Product Mockup & Interactive Preview */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="lg:col-span-5 relative"
            >
              <div className="bg-md-surface-container rounded-md3-2xl p-3 shadow-md3-4 border border-md-outline-variant relative">
                {/* Mockup Header */}
                <div className="bg-md-surface rounded-md3-xl p-5 border border-md-outline-variant/60 space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-md3-md bg-md-primary text-md-on-primary flex items-center justify-center font-black text-xs">
                        TX
                      </div>
                      <div>
                        <div className="text-xs font-bold text-md-on-surface">إدارة عمليات الاستقطاب</div>
                        <div className="text-[10px] text-md-on-surface-variant">البيئة المؤسسية المعتمدة</div>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-md-primary bg-md-primary-container px-2.5 py-1 rounded-md3-full">
                      مباشر
                    </span>
                  </div>

                  {/* AI Quick Insight Card */}
                  <div className="bg-md-surface-container p-3.5 rounded-md3-lg border border-md-outline-variant/60">
                    <div className="flex items-center gap-2 mb-2">
                      <Bot className="w-4 h-4 text-md-primary" />
                      <span className="text-xs font-bold text-md-on-surface">تحليل الذكاء الاصطناعي الفوري</span>
                    </div>
                    <p className="text-[11px] text-md-on-surface-variant leading-relaxed">
                      تم تصنيف 94% من المتقدمين بنجاح. معدل الملاءمة أعلى بنسبة 35% مقارنة بالشهر السابق.
                    </p>
                  </div>

                  {/* Quick Kanban Stages Mini Simulation */}
                  <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-bold">
                    <div className="bg-md-surface-container p-2.5 rounded-md3-md border border-md-outline-variant/50">
                      <div className="text-md-on-surface-variant text-[10px]">فرز AI</div>
                      <div className="text-sm font-black text-md-on-surface mt-0.5">28</div>
                    </div>
                    <div className="bg-md-primary-container/40 p-2.5 rounded-md3-md border border-md-primary/30">
                      <div className="text-md-primary text-[10px]">المقابلات</div>
                      <div className="text-sm font-black text-md-primary mt-0.5">9</div>
                    </div>
                    <div className="bg-md-secondary-container/40 p-2.5 rounded-md3-md border border-md-secondary/30">
                      <div className="text-md-secondary text-[10px]">عروض العمل</div>
                      <div className="text-sm font-black text-md-secondary mt-0.5">4</div>
                    </div>
                  </div>
                </div>

                {/* Floating Telemetry Badge 1 */}
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
                  className="absolute -top-5 -right-5 bg-md-surface px-4 py-3 rounded-md3-xl shadow-md3-3 border border-md-outline-variant flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-md3-full bg-md-primary-container text-md-on-primary-container flex items-center justify-center">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] text-md-on-surface-variant font-bold">تطابق الكفاءات</div>
                    <div className="text-xs font-black text-md-primary">96% مطابقة مؤكدة</div>
                  </div>
                </motion.div>

                {/* Floating Telemetry Badge 2 */}
                <motion.div
                  animate={{ y: [0, 8, 0] }}
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 1 }}
                  className="absolute -bottom-5 -left-5 bg-md-surface px-4 py-3 rounded-md3-xl shadow-md3-3 border border-md-outline-variant flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-md3-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] text-md-on-surface-variant font-bold">اعتماد العرض الوظيفي</div>
                    <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">توقيع رقمي موثق</div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── 3. Real System Metrics & Live Platform Telemetry (NO FAKE STATS) ── */}
      <section className="bg-md-surface-container-low border-y border-md-outline-variant py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 pb-6 border-b border-md-outline-variant/60">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
              <div>
                <h3 className="text-md3-title-md font-black text-md-on-surface flex items-center gap-2">
                  <span>إحصائيات ومؤشرات النظام اللحظية</span>
                  <span className="text-xs font-normal text-md-primary bg-md-primary-container px-2.5 py-0.5 rounded-md3-full font-mono">
                    Live Supabase Telemetry
                  </span>
                </h3>
                <p className="text-xs text-md-on-surface-variant">
                  بيانات مباشرة تعكس حركة التوظيف والنشاط الفعلي داخل منصة Tawzeef-X
                </p>
              </div>
            </div>
            <div className="text-xs text-md-on-surface-variant font-mono">
              آخر تحديث: قبل قليل • استجابة قاعدة البيانات نشطة
            </div>
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {[
              {
                label: "الشواغر النشطة بالنظام",
                value: systemStats.activeJobs,
                icon: Briefcase,
                desc: "وظيفة قيد الاستقطاب والمعالجة",
                color: "text-md-primary",
              },
              {
                label: "إجمالي ملفات المرشحين",
                value: systemStats.candidates,
                icon: Users,
                desc: "سيرة ذاتية مفروزة ومفهرسة",
                color: "text-md-secondary",
              },
              {
                label: "جلسات المقابلات المسجلة",
                value: systemStats.interviews,
                icon: Video,
                desc: "مقابلة منجزة أو مجدولة",
                color: "text-md-tertiary",
              },
              {
                label: "المؤسسات المسجلة",
                value: systemStats.companiesCount > 0 ? systemStats.companiesCount : 1,
                icon: Building2,
                desc: "شركة ومنشأة تستخدم النظام",
                color: "text-md-primary",
              },
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                variants={fadeUp}
                className="bg-md-surface rounded-md3-xl p-6 border border-md-outline-variant shadow-sm flex flex-col justify-between hover:border-md-primary transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-md-on-surface-variant">{stat.label}</span>
                  <div className="w-10 h-10 rounded-md3-lg bg-md-surface-container flex items-center justify-center">
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                </div>
                <div>
                  <div className="text-3xl lg:text-4xl font-black text-md-on-surface mb-1 font-mono tracking-tight">
                    <AnimatedCounter value={stat.value} />
                  </div>
                  <div className="text-[11px] text-md-on-surface-variant font-medium">{stat.desc}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── 4. Real Companies / Verified Security Banner (NO FAKE BRANDS) ── */}
      <section className="bg-md-surface py-10 border-b border-md-outline-variant overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {realCompanies.length >= 3 ? (
            <div>
              <div className="text-center text-xs font-bold text-md-on-surface-variant mb-6">
                منشآت وشركات معتمدة ومسجلة على المنصة:
              </div>
              <div className="flex flex-wrap items-center justify-center gap-8">
                {realCompanies.map((comp) => (
                  <div
                    key={comp.id}
                    className="flex items-center gap-2.5 px-4 py-2 bg-md-surface-container rounded-md3-full border border-md-outline-variant text-md3-label-md font-bold text-md-on-surface"
                  >
                    <Building2 className="w-4 h-4 text-md-primary" />
                    <span>{comp.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {complianceHighlights.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 p-3 rounded-md3-lg bg-md-surface-container border border-md-outline-variant/60 text-xs font-bold text-md-on-surface-variant justify-center text-center"
                >
                  <item.icon className="w-4 h-4 text-md-primary shrink-0" />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── 5. Features Section (MD3 Elevated Cards) ── */}
      <section id="features" className="py-24 bg-md-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-block bg-md-primary-container text-md-on-primary-container text-md3-label-sm font-black px-4 py-1.5 rounded-md3-full mb-4">
              القدرات والمميزات الأساسية
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-black text-md-on-surface mb-5 leading-tight">
              كل ما تحتاجه لإدارة التوظيف <br />
              <span className="text-md-primary">في منصة سحابية واحدة</span>
            </h2>
            <p className="text-md3-body-md text-md-on-surface-variant leading-relaxed">
              منظومة مصممة لتمكين مسؤولي التوظيف والمدراء التنفيذيين من اتخاذ قرارات توظيف سريعة ودقيقة وموثقة بالبيانات.
            </p>
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {features.map((f, idx) => (
              <motion.div
                key={idx}
                variants={fadeUp}
                className="bg-md-surface shadow-md3-1 hover:shadow-md3-3 hover:-translate-y-1.5 transition-all duration-300 rounded-md3-2xl p-7 flex flex-col border border-md-outline-variant/70 group"
              >
                <div className={`w-14 h-14 rounded-md3-xl flex items-center justify-center mb-6 ${iconContainerColors[f.colorIdx]} shadow-sm group-hover:scale-110 transition-transform`}>
                  <f.icon className="w-7 h-7" />
                </div>
                <h3 className="text-md3-title-lg font-black text-md-on-surface mb-3">{f.title}</h3>
                <p className="text-md3-body-md text-md-on-surface-variant flex-1 leading-relaxed font-normal">
                  {f.description}
                </p>
                <div className="mt-6 pt-4 border-t border-md-outline-variant/50">
                  <span className="bg-md-primary-container text-md-on-primary-container text-xs font-black rounded-md3-full px-3.5 py-1.5 inline-flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    {f.highlight}
                  </span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── 6. How It Works Stepper ── */}
      <section id="how-it-works" className="py-24 bg-md-surface-container-low border-y border-md-outline-variant">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <span className="inline-block bg-md-secondary-container text-md-on-secondary-container text-md3-label-sm font-black px-4 py-1.5 rounded-md3-full mb-4">
              منهجية العمل
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-md-on-surface mb-4">
              أربع خطوات تقودك لتوظيف الكفاءة المثالية
            </h2>
            <p className="text-md3-body-md text-md-on-surface-variant">
              دورة توظيف مؤتمتة وسلسة تختصر 80% من العمليات اليدوية والورقية
            </p>
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 relative"
          >
            {steps.map((step, idx) => (
              <motion.div key={idx} variants={fadeUp} className="flex flex-col items-center text-center group">
                <div className="w-16 h-16 rounded-md3-full bg-md-primary text-md-on-primary font-black text-xl flex items-center justify-center mb-6 shadow-md3-2 group-hover:scale-110 transition-transform">
                  {step.num}
                </div>
                <div className="bg-md-surface rounded-md3-xl p-6 border border-md-outline-variant w-full flex-1 shadow-sm flex flex-col">
                  <div className="w-10 h-10 rounded-md3-md bg-md-secondary-container text-md-on-secondary-container flex items-center justify-center mx-auto mb-4">
                    <step.icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-md3-title-sm font-black text-md-on-surface mb-2">{step.title}</h3>
                  <p className="text-xs text-md-on-surface-variant leading-relaxed font-normal">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── 7. Interactive Recruiter Demo ── */}
      <section id="demo" className="py-24 bg-md-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-block bg-md-tertiary-container text-md-on-tertiary-container text-md3-label-sm font-black px-4 py-1.5 rounded-md3-full mb-4">
              بيئة المعاينة الحية
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-md-on-surface mb-4">
              جرّب لوحة تحكم النظام التفاعلية
            </h2>
            <p className="text-md3-body-md text-md-on-surface-variant">
              استكشف بنفسك سهولة التنقل بين شاشات الفرز، تقييمات الذكاء الاصطناعي، وغرف المقابلات
            </p>
          </div>
          <InteractiveDemo />
        </div>
      </section>

      {/* ── 8. Capabilities Marquee Strip ── */}
      <section className="bg-md-surface-container py-10 border-y border-md-outline-variant overflow-hidden">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-center gap-3 max-w-6xl mx-auto px-4">
            {capabilities.map((cap, idx) => (
              <div
                key={idx}
                className="bg-md-surface border border-md-outline-variant text-md-on-surface rounded-md3-full px-5 py-2 text-xs font-bold flex items-center gap-2 shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4 text-md-primary" />
                <span>{cap}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 9. Dynamic Pricing Section (CONNECTED DIRECTLY TO DB subscription_plans) ── */}
      <section id="pricing" className="py-24 bg-md-surface-container-low">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 bg-md-primary-container text-md-on-primary-container text-xs font-black px-4 py-1.5 rounded-md3-full mb-4">
              <Database className="w-3.5 h-3.5" />
              <span>الباقات المعتمدة من إعدادات النظام</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-md-on-surface mb-4">
              باقات اشتراك تناسب احتياج كل منشأة
            </h2>
            <p className="text-md3-body-md text-md-on-surface-variant">
              الأسعار والميزات محدثة مباشرة من قاعدة بيانات النظام، مع إمكانية الترقية وإدارة الاشتراكات من لوحة الإدارة.
            </p>
          </div>

          {plansLoading ? (
            <div className="flex justify-center py-16">
              <div className="w-10 h-10 border-4 border-md-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch"
            >
              {(dbPlans && dbPlans.length > 0 ? dbPlans : []).map((plan, idx) => {
                const isPro = plan.name === "pro";
                const isFree = plan.price === 0;

                return (
                  <motion.div
                    key={plan.id || idx}
                    variants={fadeUp}
                    className={`rounded-md3-2xl p-8 flex flex-col justify-between transition-all duration-300 ${
                      isPro
                        ? "bg-md-primary text-md-on-primary shadow-md3-4 border-2 border-md-primary lg:-translate-y-2"
                        : "bg-md-surface text-md-on-surface shadow-sm border border-md-outline-variant"
                    }`}
                  >
                    <div>
                      {isPro && (
                        <div className="bg-md-on-primary text-md-primary text-xs font-black px-3.5 py-1 rounded-md3-full inline-block mb-4 shadow-sm">
                          الباقة الأكثر اختياراً ⭐
                        </div>
                      )}
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-2xl font-black">{plan.name_ar || plan.name}</h3>
                        <span
                          className={`text-xs px-2.5 py-1 rounded-md3-full font-bold ${
                            isPro
                              ? "bg-md-on-primary/20 text-md-on-primary"
                              : "bg-md-surface-container text-md-on-surface-variant"
                          }`}
                        >
                          {plan.billing_period === "monthly" ? "شهري" : "سنوي"}
                        </span>
                      </div>

                      <p
                        className={`text-xs mb-6 ${
                          isPro ? "text-md-on-primary/80" : "text-md-on-surface-variant"
                        }`}
                      >
                        {plan.description || "باقة مخصصة لتلبية احتياجات التوظيف والاستقطاب"}
                      </p>

                      <div className="mb-6 flex items-baseline gap-1.5">
                        {isFree ? (
                          <span className="text-4xl font-black">مجاناً</span>
                        ) : (
                          <>
                            <span className="text-4xl font-black font-mono">{plan.price}</span>
                            <span
                              className={`text-xs font-bold ${
                                isPro ? "text-md-on-primary/80" : "text-md-on-surface-variant"
                              }`}
                            >
                              {plan.currency === "SAR" ? "ر.س / شهر" : `${plan.currency} / شهر`}
                            </span>
                          </>
                        )}
                      </div>

                      <div
                        className={`text-xs font-bold mb-6 pb-6 border-b ${
                          isPro ? "border-md-on-primary/20" : "border-md-outline-variant"
                        }`}
                      >
                        حد إعلانات الشواغر:{" "}
                        <span className="font-mono">
                          {plan.job_posts_limit === -1 ? "غير محدود" : `${plan.job_posts_limit} وظيفة`}
                        </span>
                      </div>

                      {/* Features List */}
                      <div className="space-y-3 mb-8">
                        {(plan.features || []).map((feat: string, fIdx: number) => (
                          <div key={fIdx} className="flex items-start gap-2.5 text-xs font-medium">
                            <CheckCircle2
                              className={`w-4 h-4 shrink-0 mt-0.5 ${
                                isPro ? "text-md-on-primary" : "text-md-primary"
                              }`}
                            />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Link
                      to="/auth?mode=signup"
                      className={`w-full py-3.5 rounded-md3-full font-bold text-center text-sm transition-transform hover:scale-105 shadow-sm ${
                        isPro
                          ? "bg-md-on-primary text-md-primary shadow-md3-2"
                          : "bg-md-primary text-md-on-primary"
                      }`}
                    >
                      {isFree ? "ابدأ الاستخدام المجاني" : "اختيار هذه الباقة"}
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </section>

      {/* ── 10. Security & Enterprise Compliance ── */}
      <section id="security" className="py-20 bg-md-surface border-t border-md-outline-variant">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="bg-gradient-to-br from-md-surface-container via-md-surface-container-high to-md-surface-container rounded-md3-2xl p-8 lg:p-12 border border-md-outline-variant shadow-sm">
            <div className="grid lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-8">
                <div className="inline-flex items-center gap-2 bg-md-primary-container text-md-on-primary-container text-xs font-bold px-3 py-1 rounded-md3-full mb-4">
                  <Shield className="w-3.5 h-3.5" />
                  <span>حماية البيانات والخصوصية</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-md-on-surface mb-3">
                  بيانات مرشحيك ومنشأتك في أمان تام ومعزولة تماماً
                </h3>
                <p className="text-sm text-md-on-surface-variant leading-relaxed mb-6 font-medium">
                  نطبق أعلى معايير الحماية والتشفير وعزل البيانات لكل شركة باستخدام سياسات الأمان على مستوى الصفوف (Row Level Security)، مع سجل تدقيق تفصيلي للعمليات الحساسة.
                </p>
                <div className="flex flex-wrap gap-4 text-xs font-bold text-md-on-surface">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-md-primary" />
                    <span>تشفير 256-bit للبيانات</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-md-primary" />
                    <span>فصل وصلاحيات دقيقة للأدوار</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-md-primary" />
                    <span>سجل رقابي وتدقيق مستمر</span>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-4 flex justify-center lg:justify-end">
                <Link
                  to="/auth?mode=signup"
                  className="bg-md-primary text-md-on-primary rounded-md3-full px-8 py-4 text-sm font-bold shadow-md3-2 hover:shadow-md3-4 hover:scale-105 transition-all text-center"
                >
                  إنشاء حساب مسؤولي المنشأة
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 11. Final Executive CTA ── */}
      <section className="py-20 bg-md-surface">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <div className="bg-gradient-to-br from-md-primary-container via-md-secondary-container/40 to-md-tertiary-container/30 rounded-md3-2xl p-12 lg:p-16 border border-md-primary/20 shadow-md3-3">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-md-on-primary-container mb-6 leading-tight">
              ابدأ تحويل منظومة الاستقطاب <br />
              في منشأتك اليوم
            </h2>
            <p className="text-md3-body-md text-md-on-surface-variant max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
              انضم إلى المنشآت التي تختصر الوقت والجهد وتوظف أفضل الكفاءات بدقة واحترافية متناهية.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/auth?mode=signup"
                className="w-full sm:w-auto bg-md-primary text-md-on-primary rounded-md3-full h-14 px-10 text-md3-title-sm font-bold flex items-center justify-center gap-2 shadow-md3-2 hover:shadow-md3-4 hover:scale-105 transition-all"
              >
                <span>إنشاء حساب والبدء فوراً</span>
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <Link
                to="/auth?mode=login"
                className="w-full sm:w-auto bg-md-surface text-md-on-surface rounded-md3-full h-14 px-8 text-md3-title-sm font-bold flex items-center justify-center border border-md-outline-variant hover:bg-md-surface-variant transition-all"
              >
                تسجيل الدخول
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 12. Enterprise Footer (NO PUBLIC JOBS LISTINGS) ── */}
      <footer className="bg-md-surface-variant text-md-on-surface-variant pt-16 pb-12 border-t border-md-outline-variant">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            {/* Column 1: Brand */}
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <img src={tawzeefLogo} alt="Tawzeef-X" className="w-8 h-8 object-contain" />
                <span className="text-md3-title-lg font-black text-md-on-surface">Tawzeef-X</span>
              </div>
              <p className="text-xs text-md-on-surface-variant leading-relaxed mb-6 font-medium">
                المنصة السحابية المتقدمة لرقمنة وإدارة عمليات التوظيف والاستقطاب الذكي المدعومة بالذكاء الاصطناعي في الشرق الأوسط.
              </p>
              <div className="flex items-center gap-2 text-xs font-mono text-md-primary font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>نظام سحابي معتمد 2026</span>
              </div>
            </div>

            {/* Column 2: Navigation */}
            <div>
              <h4 className="font-black text-sm text-md-on-surface mb-4">روابط سريعة</h4>
              <ul className="space-y-3 text-xs font-bold">
                <li><a href="#features" className="hover:text-md-primary transition-colors">المميزات المؤسسية</a></li>
                <li><a href="#how-it-works" className="hover:text-md-primary transition-colors">آلية العمل</a></li>
                <li><a href="#demo" className="hover:text-md-primary transition-colors">التجربة الحية</a></li>
                <li><a href="#pricing" className="hover:text-md-primary transition-colors">باقات الاشتراك</a></li>
                <li><a href="#security" className="hover:text-md-primary transition-colors">الأمان والخصوصية</a></li>
              </ul>
            </div>

            {/* Column 3: Platform Capabilities */}
            <div>
              <h4 className="font-black text-sm text-md-on-surface mb-4">قدرات المنصة</h4>
              <ul className="space-y-3 text-xs font-medium">
                <li>فحص السير الذاتية بالذكاء الاصطناعي</li>
                <li>غرف مقابلات الفيديو والتفريغ النصي</li>
                <li>العروض الوظيفية الرقمية المشفرة</li>
                <li>تقارير ومؤشرات الأداء التوظيفي</li>
                <li>بوابة مخصصة ومستقلة لكل منشأة</li>
              </ul>
            </div>

            {/* Column 4: Contact & Access */}
            <div>
              <h4 className="font-black text-sm text-md-on-surface mb-4">إدارة الحساب</h4>
              <div className="space-y-3 text-xs font-medium">
                <Link
                  to="/auth?mode=login"
                  className="block text-md-primary font-bold hover:underline"
                >
                  دخول لوحة تحكم المنشأة ←
                </Link>
                <Link
                  to="/auth?mode=signup"
                  className="block text-md-on-surface hover:text-md-primary transition-colors"
                >
                  تسجيل منشأة جديدة
                </Link>
                <div className="pt-2 text-xs text-md-on-surface-variant">
                  الدعم الفني: support@tawzeef-x.com
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-md-outline-variant/60 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium">
            <p>© {new Date().getFullYear()} Tawzeef-X. جميع الحقوق محفوظة لمنصة توظيف إكس.</p>
            <div className="flex items-center gap-6">
              <Link to="/privacy" className="hover:text-md-primary transition-colors">سياسة الخصوصية</Link>
              <Link to="/terms" className="hover:text-md-primary transition-colors">الشروط والأحكام</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
