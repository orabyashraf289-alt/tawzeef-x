import tawzeefLogo from "@/assets/tawzeef-x-logo.png";
import { Link } from "react-router-dom";
import { Users, Bot, ArrowLeft, TrendingUp, Shield, Globe, CheckCircle2, Zap, Star, Briefcase, FileText, BarChart3, Video, Sparkles, Award, Play, ArrowUpRight, MousePointerClick, Layout, MessageSquare, Calendar, Send, Menu, X, Sun, Moon, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform, AnimatePresence, useInView, useMotionValue, useSpring, useMotionTemplate } from "framer-motion";
import { useRef, useState, useEffect, useCallback } from "react";
import { useTheme } from "@/contexts/ThemeContext";

import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/marketing/SEO";

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

const defaultStats = [
  { value: 10, suffix: "k+", label: "شركة ومؤسسة", icon: Globe },
  { value: 1250, suffix: "+", label: "وظيفة نشطة", icon: Briefcase },
  { value: 85, suffix: "k+", label: "مرشح ومتقدم", icon: Users },
  { value: 99.9, suffix: "%", label: "وقت التشغيل", icon: Zap },
];

const steps = [
  { num: "01", title: "أنشئ وظيفة", description: "حدد المتطلبات والمهارات باستخدام قوالب جاهزة أو أنشئ وظيفة مخصصة", icon: Briefcase },
  { num: "02", title: "استقبل المتقدمين", description: "شارك رابط التقديم المباشر واستقبل الطلبات تلقائياً من جميع أنحاء العالم", icon: Globe },
  { num: "03", title: "فلترة ذكية بالـ AI", description: "الذكاء الاصطناعي يحلل السير الذاتية ويرتب المرشحين حسب التطابق", icon: Bot },
  { num: "04", title: "قابل ووظّف", description: "جدول مقابلات أونلاين، قيّم المرشحين، وأرسل العروض الوظيفية بنقرات", icon: Award },
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
  const { theme, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [stats, setStats] = useState(defaultStats);
  const { scrollYProgress } = useScroll();
  const yBg = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    async function fetchStats() {
      try {
        const { count: companiesCount } = await supabase.from('companies').select('*', { count: 'exact', head: true });
        const { count: jobsCount } = await supabase.from('jobs').select('*', { count: 'exact', head: true });
        const { count: candidatesCount } = await supabase.from('candidates').select('*', { count: 'exact', head: true });
        if (companiesCount && jobsCount && candidatesCount) {
          setStats([
            { value: Math.max(companiesCount, 12), suffix: "+", label: "شركة ومؤسسة", icon: Globe },
            { value: Math.max(jobsCount, 45), suffix: "+", label: "وظيفة نشطة", icon: Briefcase },
            { value: Math.max(candidatesCount, 320), suffix: "+", label: "مرشح ومتقدم", icon: Users },
            { value: 99.9, suffix: "%", label: "وقت التشغيل", icon: Zap },
          ]);
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    }
    fetchStats();
  }, []);

  return (
    <div dir="rtl" className="min-h-screen bg-md-surface text-md-on-surface font-sans selection:bg-md-primary/30 overflow-x-hidden">
      <SEO 
        title="توظيف إكس | مستقبل التوظيف الذكي في المملكة" 
        description="منصة التوظيف الأذكى للمؤسسات الحديثة المدعومة بالذكاء الاصطناعي لإدارة المرشحين والمقابلات بسهولة فائقة."
      />

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(50%); }
        }
        @keyframes marquee-reverse {
          0% { transform: translateX(50%); }
          100% { transform: translateX(0); }
        }
        .animate-marquee {
          animation: marquee 40s linear infinite;
        }
        .animate-marquee-reverse {
          animation: marquee-reverse 40s linear infinite;
        }
      `}} />

      {/* 1. MD3 Top App Bar (Navbar) */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-md-surface/80 backdrop-blur-xl shadow-md3-2 border-b border-md-outline-variant' : 'bg-transparent'}`}>
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10 overflow-hidden rounded-md3-md bg-md-primary-container text-md-on-primary-container flex items-center justify-center">
               <img src={tawzeefLogo} alt="TawzeefX" className="w-8 h-8 object-contain" />
            </div>
            <span className="text-md3-title-lg font-black tracking-tight text-md-on-surface">توظيف <span className="text-md-primary">إكس</span></span>
          </Link>

          <nav className="hidden lg:flex items-center gap-8">
            {['المميزات', 'كيف تعمل', 'التجربة', 'الأسعار', 'آراء العملاء'].map((item) => (
              <a key={item} href={`#${item}`} className="text-md3-label-lg font-medium text-md-on-surface-variant hover:text-md-primary transition-colors">
                {item}
              </a>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-4">
            <button onClick={toggleTheme} className="w-10 h-10 rounded-md3-full flex items-center justify-center text-md-on-surface-variant hover:bg-md-surface-variant transition-colors">
              <AnimatePresence mode="wait">
                {theme === 'dark' ? (
                  <motion.div key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                    <Sun className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <motion.div key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
                    <Moon className="w-5 h-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
            <Link to="/auth?mode=login" className="text-md3-label-lg font-bold text-md-primary hover:bg-md-primary-container/50 px-5 py-2.5 rounded-md3-full transition-colors">
              دخول
            </Link>
            <Link to="/auth?mode=signup" className="bg-md-primary text-md-on-primary text-md3-label-lg font-bold px-6 py-2.5 rounded-md3-full shadow-md3-1 hover:shadow-md3-3 transition-shadow">
              ابدأ مجاناً
            </Link>
          </div>

          <button className="lg:hidden p-2 text-md-on-surface" onClick={() => setMobileMenuOpen(true)}>
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-[60] bg-md-surface flex flex-col p-6"
          >
            <div className="flex justify-between items-center mb-8">
              <span className="text-md3-title-lg font-black text-md-primary">توظيف إكس</span>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 bg-md-surface-variant rounded-md3-full">
                <X className="w-6 h-6" />
              </button>
            </div>
            <nav className="flex flex-col gap-6 text-md3-headline-sm font-bold">
              {['المميزات', 'كيف تعمل', 'التجربة', 'الأسعار', 'آراء العملاء'].map((item) => (
                <a key={item} href={`#${item}`} onClick={() => setMobileMenuOpen(false)} className="text-md-on-surface border-b border-md-outline-variant pb-4">
                  {item}
                </a>
              ))}
            </nav>
            <div className="mt-auto flex flex-col gap-4">
              <Link to="/auth?mode=login" className="bg-md-surface-variant text-center py-4 rounded-md3-full text-md3-title-lg font-bold">
                تسجيل الدخول
              </Link>
              <Link to="/auth?mode=signup" className="bg-md-primary text-md-on-primary text-center py-4 rounded-md3-full text-md3-title-lg font-bold shadow-md3-2">
                ابدأ مجاناً
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Hero Section */}
      <section className="relative min-h-screen pt-32 pb-20 overflow-hidden flex items-center">
        {/* Animated Background Blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            animate={{ y: [0, 50, 0], x: [0, -30, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-[10%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-md-primary-container/40 blur-[140px]"
          />
          <motion.div
            animate={{ y: [0, -40, 0], x: [0, 40, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -bottom-[10%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-md-secondary-container/30 blur-[100px]"
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[30%] left-[30%] w-[30vw] h-[30vw] rounded-full bg-md-tertiary-container/20 blur-[80px]"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle,hsl(var(--md-outline-variant))_1px,transparent_1px)] bg-[size:24px_24px] opacity-30" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Content (Text) */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="text-center lg:text-right"
            >
              <motion.div variants={fadeUp} className="inline-flex mb-8">
                <div className="bg-md-primary-container text-md-on-primary-container rounded-md3-full px-4 py-1.5 flex items-center gap-2 border border-md-primary-container/50 shadow-md3-1">
                  <Sparkles className="w-4 h-4 text-md-primary animate-pulse" />
                  <span className="text-md3-label-lg font-bold">مستقبل التوظيف بدأ الآن</span>
                </div>
              </motion.div>
              
              <motion.h1 variants={fadeUp} className="text-4xl md:text-6xl lg:text-[57px] font-black leading-tight text-md-on-surface mb-6">
                وظّف أفضل المواهب بذكاء، <br className="hidden md:block"/>
                <span className="text-md-primary relative inline-block">
                  سرعة، وكفاءة
                  <svg className="absolute w-full h-3 -bottom-1 left-0 text-md-tertiary-container opacity-50" viewBox="0 0 100 10" preserveAspectRatio="none"><path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none"/></svg>
                </span>
              </motion.h1>

              <motion.p variants={fadeUp} className="text-md3-body-lg text-md-on-surface-variant max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed">
                منصة توظيف متكاملة تعتمد على الذكاء الاصطناعي لاختصار 80% من وقت التوظيف. فلترة، مقابلات فيديو، وعروض وظيفية رقمية في مكان واحد.
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start mb-12">
                <Link to="/auth?mode=signup" className="w-full sm:w-auto bg-md-primary text-md-on-primary rounded-md3-full h-14 px-8 text-md3-title-lg font-bold flex items-center justify-center shadow-md3-2 hover:shadow-md3-4 transition-all">
                  ابدأ مجاناً الآن
                  <ArrowLeft className="mr-2 w-5 h-5" />
                </Link>
                <Link to="#كيف تعمل" className="w-full sm:w-auto bg-md-secondary-container text-md-on-secondary-container rounded-md3-full h-14 px-8 text-md3-title-lg font-bold flex items-center justify-center hover:bg-md-secondary-container/80 transition-all">
                  شاهد العرض التجريبي
                  <Play className="mr-2 w-5 h-5" />
                </Link>
              </motion.div>

              <motion.div variants={fadeUp} className="flex items-center justify-center lg:justify-start gap-4">
                <div className="flex -space-x-3 -space-x-reverse">
                  {['أ', 'س', 'م', 'ن'].map((avatar, i) => (
                    <div key={i} className="w-10 h-10 rounded-md3-full bg-md-surface-container-high border-2 border-md-surface flex items-center justify-center text-md3-label-lg font-bold text-md-on-surface shadow-sm">
                      {avatar}
                    </div>
                  ))}
                </div>
                <div className="text-md3-label-lg text-md-on-surface-variant">
                  <span className="font-bold text-md-on-surface">4.9/5 ⭐</span> من 500+ مدير توظيف
                </div>
              </motion.div>
            </motion.div>

            {/* Right Content (Mockup) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotateY: 10 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative perspective-1000"
            >
              <div className="bg-md-surface rounded-md3-xl shadow-md3-5 border border-md-outline-variant p-2 transform rotate-2 hover:rotate-0 transition-transform duration-500">
                <div className="bg-md-surface-container rounded-md3-lg overflow-hidden border border-md-outline-variant/50">
                  <div className="bg-md-surface-container-highest h-8 flex items-center px-4 gap-1.5 border-b border-md-outline-variant/50">
                     <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                     <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                     <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  </div>
                  <img 
                    src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1000&q=80" 
                    alt="Dashboard Preview" 
                    className="w-full h-[400px] object-cover opacity-90"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-md-surface via-transparent to-transparent" />
                </div>
              </div>

              {/* Floating Elements */}
              <motion.div
                animate={{ y: [0, -12, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                className="absolute -right-6 top-20 bg-md-surface p-4 rounded-md3-lg shadow-md3-4 border border-md-outline-variant flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-md3-full bg-md-primary-container text-md-on-primary-container flex items-center justify-center">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-md3-label-lg text-md-on-surface-variant">تقييم المرشح</div>
                  <div className="text-md3-title-lg font-bold text-md-primary">95% تطابق</div>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, 15, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 1 }}
                className="absolute -left-8 bottom-32 bg-md-surface p-4 rounded-md3-lg shadow-md3-4 border border-md-outline-variant flex flex-col gap-2"
              >
                 <div className="text-md3-label-lg font-bold text-md-on-surface">إشعار توظيف</div>
                 <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span className="text-md3-body-md text-md-on-surface-variant">تم قبول العرض!</span>
                 </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 3. Trusted Brands Marquee Strip */}
      <section className="bg-md-surface-variant/50 border-y border-md-outline-variant py-6 overflow-hidden">
        <div className="flex w-[200%] animate-marquee">
          {[...Array(2)].map((_, idx) => (
             <div key={idx} className="flex w-1/2 justify-around items-center px-4">
                {["تيك إنوفيشن", "سمارت سولوشنز", "نيوم تكنولوجي", "ديجيتال ويف", "كلاسيرا", "فيوتشر بيلد"].map((brand, i) => (
                  <div key={i} className="text-md3-headline-sm font-black text-md-on-surface-variant/40 mx-8 whitespace-nowrap">
                    {brand}
                  </div>
                ))}
             </div>
          ))}
        </div>
      </section>

      {/* 4. Stats Section */}
      <section className="bg-md-primary-container/30 border-y border-md-primary-container/50 py-16">
        <div className="container mx-auto px-4">
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {stats.map((stat, idx) => (
              <motion.div key={idx} variants={fadeUp} className="flex flex-col items-center text-center relative">
                <div className="w-12 h-12 bg-md-primary text-md-on-primary rounded-md3-full flex items-center justify-center mb-4 shadow-md3-2">
                  <stat.icon className="w-6 h-6" />
                </div>
                <div className="text-md3-display-sm font-black text-md-primary mb-1">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-md3-label-lg font-bold text-md-on-surface">{stat.label}</div>
                
                {/* Divider */}
                {idx < stats.length - 1 && (
                  <div className="hidden md:block absolute left-0 top-1/4 bottom-1/4 w-px bg-md-outline-variant" />
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 5. Features Section */}
      <section id="المميزات" className="bg-md-surface py-24">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-block bg-md-primary-container text-md-on-primary-container text-md3-label-lg font-bold px-4 py-1.5 rounded-md3-full mb-4">
              مميزات المنصة
            </span>
            <h2 className="text-md3-display-sm font-black text-md-on-surface mb-6">كل ما تحتاجه للتوظيف <span className="text-md-primary">في مكان واحد</span></h2>
            <p className="text-md3-body-lg text-md-on-surface-variant">
              أدوات متكاملة مصممة خصيصاً لتسهيل عملية التوظيف من البداية وحتى توقيع العرض الوظيفي، مع الاعتماد على أحدث تقنيات الذكاء الاصطناعي.
            </p>
          </div>

          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {features.map((feature, idx) => (
              <motion.div 
                key={idx} variants={fadeUp}
                className="bg-md-surface shadow-md3-2 hover:shadow-md3-4 hover:-translate-y-1 transition-all duration-300 rounded-md3-xl p-7 flex flex-col border border-md-outline-variant/50"
              >
                <div className={`w-14 h-14 rounded-md3-lg flex items-center justify-center mb-5 ${iconContainerColors[feature.colorIdx]}`}>
                  <feature.icon className="w-7 h-7" />
                </div>
                <h3 className="text-md3-title-lg font-bold text-md-on-surface mb-3">{feature.title}</h3>
                <p className="text-md3-body-md text-md-on-surface-variant flex-1 leading-relaxed">
                  {feature.description}
                </p>
                <div className="mt-6">
                  <span className="bg-md-primary-container/50 text-md-on-primary-container text-md3-label-lg font-bold rounded-md3-full px-3 py-1.5 inline-flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    {feature.highlight}
                  </span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 6. How It Works Stepper */}
      <section id="كيف تعمل" className="bg-md-surface-container/40 py-24 relative overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <h2 className="text-md3-display-sm font-black text-md-on-surface mb-6">كيف تعمل المنصة؟</h2>
            <p className="text-md3-body-lg text-md-on-surface-variant">
              خطوات بسيطة تفصلك عن توظيف أفضل الكفاءات لفريقك
            </p>
          </div>

          <div className="relative">
            {/* Connecting Line */}
            <div className="hidden lg:block absolute top-8 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-md-primary via-md-secondary-container to-md-outline-variant -z-10" />

            <motion.div 
              initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}
              className="grid lg:grid-cols-4 gap-12 lg:gap-6"
            >
              {steps.map((step, idx) => (
                <motion.div key={idx} variants={fadeUp} className="relative flex flex-col items-center group">
                  <div className="w-16 h-16 bg-md-primary text-md-on-primary rounded-md3-full text-md3-headline-sm font-black flex items-center justify-center shadow-md3-3 mb-6 transform group-hover:scale-110 transition-transform duration-300">
                    {step.num}
                  </div>
                  <div className="bg-md-surface rounded-md3-xl p-6 shadow-md3-1 border border-md-outline-variant text-center w-full max-w-sm">
                    <div className="w-12 h-12 mx-auto bg-md-secondary-container text-md-on-secondary-container rounded-md3-full flex items-center justify-center mb-4">
                      <step.icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-md3-title-lg font-bold text-md-on-surface mb-3">{step.title}</h3>
                    <p className="text-md3-body-md text-md-on-surface-variant">{step.description}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* 7. Interactive Demo */}
      <section id="التجربة" className="bg-md-surface py-24">
         <div className="container mx-auto px-4">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="inline-block bg-md-tertiary-container text-md-on-tertiary-container text-md3-label-lg font-bold px-4 py-1.5 rounded-md3-full mb-4">
                تجربة حية
              </span>
              <h2 className="text-md3-display-sm font-black text-md-on-surface mb-6">جرّب لوحة التحكم بنفسك</h2>
              <p className="text-md3-body-lg text-md-on-surface-variant">
                تصفح واجهة المستخدم البديهية واستكشف كيف نسهل عليك إدارة عملية التوظيف بالكامل
              </p>
            </div>
            <InteractiveDemo />
         </div>
      </section>

      {/* 8. Capabilities - Scrolling Marquee (Two Rows) */}
      <section className="bg-md-surface-variant/30 border-y border-md-outline-variant py-12 overflow-hidden">
        <div className="flex flex-col gap-6">
          <div className="flex w-[200%] animate-marquee">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex w-1/2 justify-around gap-4 px-4">
                {capabilities.slice(0, 6).map((cap, idx) => (
                  <div key={idx} className="bg-md-surface border border-md-outline-variant text-md-on-surface rounded-md3-full px-6 py-3 text-md3-label-lg font-bold whitespace-nowrap flex items-center gap-2 shadow-sm hover:border-md-primary transition-colors cursor-default">
                    <CheckCircle2 className="w-5 h-5 text-md-primary" />
                    {cap}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="flex w-[200%] animate-marquee-reverse">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex w-1/2 justify-around gap-4 px-4">
                {capabilities.slice(6, 12).map((cap, idx) => (
                  <div key={idx} className="bg-md-surface border border-md-outline-variant text-md-on-surface rounded-md3-full px-6 py-3 text-md3-label-lg font-bold whitespace-nowrap flex items-center gap-2 shadow-sm hover:border-md-primary transition-colors cursor-default">
                    <CheckCircle2 className="w-5 h-5 text-md-primary" />
                    {cap}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. Testimonials Carousel */}
      <section id="آراء العملاء" className="bg-md-surface py-24 relative overflow-hidden">
        <div className="container mx-auto px-4 mb-16 text-center">
          <h2 className="text-md3-display-sm font-black text-md-on-surface mb-6">ماذا يقول عملاؤنا؟</h2>
          <p className="text-md3-body-lg text-md-on-surface-variant max-w-2xl mx-auto">
            انضم إلى مئات الشركات التي تثق في منصتنا لتحسين وتسريع عملية التوظيف لديهم
          </p>
        </div>

        <div className="relative">
          {/* Gradient Edges */}
          <div className="absolute top-0 bottom-0 left-0 w-32 bg-gradient-to-r from-md-surface to-transparent z-10" />
          <div className="absolute top-0 bottom-0 right-0 w-32 bg-gradient-to-l from-md-surface to-transparent z-10" />
          
          <div className="flex w-[300%] animate-marquee hover:[animation-play-state:paused]">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex w-1/2 gap-6 px-4">
                {testimonials.map((test, idx) => (
                  <div key={idx} className="bg-md-surface-container-high rounded-md3-xl p-8 border border-md-outline-variant min-w-[320px] max-w-[360px] flex flex-col hover:border-md-primary transition-colors">
                    <div className="flex gap-1 mb-4">
                      {[...Array(test.rating)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 fill-md-primary text-md-primary" />
                      ))}
                    </div>
                    <p className="text-md3-body-lg text-md-on-surface-variant flex-1 mb-6 leading-relaxed font-medium">"{test.content}"</p>
                    <div className="flex items-center gap-4 mt-auto">
                      <div className="bg-md-primary-container text-md-on-primary-container rounded-md3-full w-12 h-12 flex items-center justify-center font-bold text-md3-title-lg">
                        {test.avatar}
                      </div>
                      <div>
                        <div className="font-bold text-md-on-surface">{test.name}</div>
                        <div className="text-md3-label-lg text-md-on-surface-variant">{test.role} - {test.company}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. Pricing Section */}
      <section id="الأسعار" className="bg-md-surface-container/30 py-24">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-md3-display-sm font-black text-md-on-surface mb-6">أسعار تناسب جميع الشركات</h2>
            <p className="text-md3-body-lg text-md-on-surface-variant">
              اختر الباقة الأنسب لحجم شركتك واحتياجاتك التوظيفية، مع فترة تجريبية مجانية لجميع الباقات المدفوعة.
            </p>
          </div>

          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer}
            className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-center"
          >
            {pricingPlans.map((plan, idx) => (
              <motion.div key={idx} variants={fadeUp} className={`rounded-md3-xl border p-8 flex flex-col ${
                plan.highlighted 
                  ? 'bg-md-primary border-md-primary shadow-md3-5 scale-105 z-10 text-md-on-primary' 
                  : plan.dark 
                    ? 'bg-md-inverse-surface border-transparent shadow-md3-2 text-md-inverse-on-surface'
                    : 'bg-md-surface border-md-outline-variant shadow-md3-1 text-md-on-surface'
              }`}>
                {plan.highlighted && (
                  <div className="bg-md-on-primary text-md-primary text-md3-label-lg font-black px-4 py-1.5 rounded-md3-full self-start mb-6">
                    الأكثر شيوعاً
                  </div>
                )}
                <h3 className="text-md3-headline-md font-black mb-2">{plan.name}</h3>
                <p className={`text-md3-body-md mb-6 ${plan.highlighted ? 'text-md-on-primary/80' : plan.dark ? 'text-md-inverse-on-surface/80' : 'text-md-on-surface-variant'}`}>
                  {plan.description}
                </p>
                <div className="mb-8 flex items-baseline gap-2">
                  <span className="text-md3-display-md font-black">{plan.price}</span>
                  {plan.billing && <span className={`text-md3-label-lg font-medium ${plan.highlighted ? 'text-md-on-primary/80' : plan.dark ? 'text-md-inverse-on-surface/80' : 'text-md-on-surface-variant'}`}>{plan.billing}</span>}
                </div>
                
                <Link to={plan.ctaLink} className={`w-full text-center py-4 rounded-md3-full text-md3-title-lg font-bold mb-8 transition-transform hover:scale-105 ${
                  plan.highlighted
                    ? 'bg-md-on-primary text-md-primary shadow-md3-2'
                    : plan.dark
                      ? 'bg-md-inverse-primary text-md-on-primary shadow-md3-2'
                      : 'bg-md-primary text-md-on-primary shadow-md3-2'
                }`}>
                  {plan.cta}
                </Link>

                <div className="space-y-4 mt-auto">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <CheckCircle2 className={`w-5 h-5 ${plan.highlighted ? 'text-md-on-primary' : plan.dark ? 'text-md-inverse-primary' : 'text-md-primary'}`} />
                      <span className="font-medium">{feature}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 11. CTA Section */}
      <section className="bg-md-surface py-16 px-4">
        <div className="container mx-auto">
          <div className="bg-gradient-to-br from-md-primary-container via-md-secondary-container/50 to-md-tertiary-container/30 rounded-md3-xl p-16 text-center relative overflow-hidden border border-md-primary-container shadow-md3-2">
             <div className="absolute top-0 right-0 w-64 h-64 bg-md-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
             <div className="absolute bottom-0 left-0 w-64 h-64 bg-md-secondary/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
             
             <div className="relative z-10 max-w-3xl mx-auto">
                <h2 className="text-md3-display-sm font-black text-md-on-primary-container mb-6">
                  مستعد للارتقاء بعملية التوظيف في شركتك؟
                </h2>
                <p className="text-md3-body-lg text-md-on-surface-variant mb-10">
                  انضم إلى آلاف الشركات التي تستخدم توظيف إكس يومياً لاكتشاف وتوظيف أفضل الكفاءات بشكل أسرع وأكثر ذكاءً.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link to="/auth?mode=signup" className="w-full sm:w-auto bg-md-primary text-md-on-primary rounded-md3-full h-14 px-10 text-md3-title-lg font-bold flex items-center justify-center shadow-md3-2 hover:shadow-md3-4 transition-all">
                    أنشئ حسابك مجاناً
                  </Link>
                  <Link to="/contact" className="w-full sm:w-auto bg-md-surface text-md-on-surface rounded-md3-full h-14 px-10 text-md3-title-lg font-bold flex items-center justify-center shadow-md3-1 hover:bg-md-surface-variant border border-md-outline-variant transition-all">
                    تواصل مع المبيعات
                  </Link>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* 12. Footer */}
      <footer className="bg-md-surface-variant pt-20 pb-10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            <div>
              <Link to="/" className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-md-primary rounded-md3-md flex items-center justify-center text-md-on-primary font-black text-xl">
                  X
                </div>
                <span className="text-md3-title-lg font-black text-md-on-surface">توظيف إكس</span>
              </Link>
              <p className="text-md-on-surface-variant mb-6 font-medium leading-relaxed">
                المنصة الذكية الأولى للتوظيف في الشرق الأوسط. نجمع بين قوة الذكاء الاصطناعي وسهولة الاستخدام.
              </p>
              <div className="flex items-center gap-3">
                {[...Array(4)].map((_, i) => (
                  <a key={i} href="#" className="w-10 h-10 rounded-full bg-md-surface flex items-center justify-center text-md-on-surface hover:bg-md-primary hover:text-md-on-primary transition-colors border border-md-outline-variant">
                    <span className="block w-4 h-4 bg-current" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-md3-title-lg font-bold text-md-on-surface mb-6">روابط سريعة</h3>
              <ul className="space-y-4">
                {['الرئيسية', 'من نحن', 'المدونة', 'قصص النجاح', 'الوظائف'].map((link) => (
                  <li key={link}><a href="#" className="text-md-on-surface-variant hover:text-md-primary font-medium">{link}</a></li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-md3-title-lg font-bold text-md-on-surface mb-6">المنتج</h3>
              <ul className="space-y-4">
                {['المميزات', 'الأسعار', 'دليل الاستخدام', 'التحديثات', 'API'].map((link) => (
                  <li key={link}><a href="#" className="text-md-on-surface-variant hover:text-md-primary font-medium">{link}</a></li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-md3-title-lg font-bold text-md-on-surface mb-6">تواصل معنا</h3>
              <ul className="space-y-4">
                <li className="text-md-on-surface-variant font-medium">الرياض، المملكة العربية السعودية</li>
                <li className="text-md-on-surface-variant font-medium">hi@tawzeef-x.com</li>
                <li className="text-md-on-surface-variant font-medium">+966 50 000 0000</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-md-outline-variant pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-md-on-surface-variant font-medium">
              © 2026 توظيف إكس. جميع الحقوق محفوظة.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-md-on-surface-variant hover:text-md-primary font-medium">الشروط والأحكام</a>
              <a href="#" className="text-md-on-surface-variant hover:text-md-primary font-medium">سياسة الخصوصية</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
