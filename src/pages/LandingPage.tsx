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
  { icon: Bot, title: "ذكاء اصطناعي متقدم", description: "فلترة وتصنيف المرشحين تلقائياً باستخدام AI مع تقييم شامل للمهارات والخبرات", color: "primary", highlight: "توفير 80% من الوقت" },
  { icon: Users, title: "إدارة مرشحين احترافية", description: "Kanban Board متقدم لتتبع المرشحين عبر جميع مراحل التوظيف مع مقارنة فورية", color: "accent", highlight: "مقارنة حتى 4 مرشحين" },
  { icon: Video, title: "مقابلات أونلاين مدمجة", description: "غرف فيديو مدمجة في المنصة مع تسجيل ونسخ نصي تلقائي وتقييم تفصيلي", color: "warning", highlight: "تسجيل + نسخ نصي" },
  { icon: TrendingUp, title: "تقارير وتحليلات ذكية", description: "لوحة تحكم تفاعلية مع رسوم بيانية متقدمة وتصدير PDF ومؤشرات أداء KPIs", color: "success", highlight: "تصدير PDF" },
  { icon: FileText, title: "عروض وظيفية رقمية", description: "إنشاء وإرسال عروض وظيفية احترافية مع توقيع إلكتروني وتتبع الاستجابة", color: "info", highlight: "توقيع إلكتروني" },
  { icon: Shield, title: "أمان وصلاحيات متقدمة", description: "نظام أدوار متعدد المستويات مع صلاحيات دقيقة ودعوات فريق آمنة", color: "destructive", highlight: "RLS + تشفير" },
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
  { name: "أحمد محمد", role: "مدير الموارد البشرية", company: "تيك إنوفيشن", content: "غيرت هذه المنصة طريقة عملنا في التوظيف. توفير في الوقت والجهد بنسبة 80%. الذكاء الاصطناعي يوفر تقييمات دقيقة للمرشحين.", rating: 5 },
  { name: "سارة أحمد", role: "مديرة التوظيف", company: "سمارت سولوشنز", content: "أفضل منصة توظيف استخدمتها. المقابلات الأونلاين المدمجة والنسخ النصي التلقائي وفّرا علينا ساعات من العمل اليومي.", rating: 5 },
  { name: "محمد علي", role: "CEO", company: "ديجيتال ويف", content: "استطعنا العثور على أفضل المواهب في وقت قياسي. التقارير التفصيلية ساعدتنا على اتخاذ قرارات توظيف أفضل.", rating: 5 },
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
      className="max-w-5xl mx-auto"
    >
      <div className="bg-md-surface-container shadow-md3-5 overflow-hidden relative rounded-md3-lg border border-md-outline-variant">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-md-outline-variant bg-md-surface-variant/40">
          <div className="flex gap-1.5">
            <div className="w-3.5 h-3.5 rounded-md3-full bg-red-500" />
            <div className="w-3.5 h-3.5 rounded-md3-full bg-yellow-500" />
            <div className="w-3.5 h-3.5 rounded-md3-full bg-green-500" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="bg-md-surface rounded-md3-sm px-4 py-1 text-md3-label-lg text-md-on-surface-variant font-mono flex items-center gap-2 shadow-md3-1">
              <Shield className="w-3 h-3 text-green-500" />
              tawzeef-x.app/dashboard
            </div>
          </div>
        </div>

        {/* Tab bar (MD3 Primary Tabs style) */}
        <div className="flex border-b border-md-outline-variant bg-md-surface px-4 gap-1 overflow-x-auto">
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
                {/* Stats row */}
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
                      className="bg-md-surface-container border border-md-outline-variant rounded-md3-lg p-4 group hover:border-md-primary transition-colors"
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
                      className="flex items-center gap-4 p-4 bg-md-surface-container border border-md-outline-variant rounded-md3-lg hover:border-md-primary transition-all cursor-pointer group"
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
                <div className="bg-md-surface-container border border-md-outline-variant rounded-md3-lg p-6">
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
                      className="flex items-center gap-4 p-4 bg-md-surface-container border border-md-outline-variant rounded-md3-lg"
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
  visible: { transition: { staggerChildren: 0.08 } },
};

function SectionHeader({ badge, title, highlight, description }: {
  badge: string; title: string; highlight: string; description: string;
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={staggerContainer}
      className="text-center mb-16"
    >
      <motion.span
        variants={fadeUp}
        className="inline-flex items-center gap-2 text-md-on-secondary-container bg-md-secondary-container text-md3-label-lg font-semibold tracking-wide px-4 py-1.5 rounded-md3-full border border-md-outline-variant"
      >
        <Sparkles className="w-3.5 h-3.5" />
        {badge}
      </motion.span>
      <motion.h2 variants={fadeUp} className="text-md3-display-sm font-extrabold mt-5 leading-tight text-md-on-surface">
        {title} <span className="text-md-primary">{highlight}</span>
      </motion.h2>
      <motion.p variants={fadeUp} className="text-md-on-surface-variant mt-4 max-w-xl mx-auto text-md3-body-lg leading-relaxed">
        {description}
      </motion.p>
    </motion.div>
  );
}

export default function LandingPage() {
  const { theme, setTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [stats, setStats] = useState(defaultStats);
  useEffect(() => {
    (async () => {
      try {
        const [jobsRes, candidatesRes] = await Promise.all([
          supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "نشطة"),
          supabase.from("candidates").select("id", { count: "exact", head: true }),
        ]);
        setStats([
          { value: 10, suffix: "k+", label: "شركة ومؤسسة", icon: Globe },
          { value: (jobsRes.count && jobsRes.count > 0) ? jobsRes.count : 1250, suffix: "+", label: "وظيفة نشطة", icon: Briefcase },
          { value: (candidatesRes.count && candidatesRes.count > 0) ? candidatesRes.count : 85, suffix: "k+", label: "مرشح ومتقدم", icon: Users },
          { value: 99.9, suffix: "%", label: "وقت التشغيل", icon: Zap },
        ]);
      } catch {}
    })();
  }, []);

  return (
    <div className="min-h-screen bg-md-surface overflow-x-hidden w-full max-w-full font-sans" dir="rtl">
      <SEO 
        title="Tawzeef-X | منصة التوظيف الذكية الشاملة بالذكاء الاصطناعي" 
        description="منصة توظيف متكاملة ومتقدمة مدعومة بالذكاء الاصطناعي." 
        canonical="https://www.tawzeefx.com/"
      />
      
      {/* 1. MD3 Top App Bar */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="fixed top-0 inset-x-0 z-50 transition-all duration-300 bg-md-surface border-b border-md-outline-variant shadow-md3-2"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="h-16 flex items-center justify-between">
            <motion.div className="flex items-center gap-2.5">
              <img src={tawzeefLogo} alt="Tawzeef-X" className="w-7 h-7 object-contain" />
              <span className="text-md3-title-lg font-black text-md-on-surface">
                Tawzeef-<span className="text-md-primary">X</span>
              </span>
            </motion.div>
            <div className="hidden md:flex items-center gap-7 text-md3-body-md text-md-on-surface font-medium">
              <a href="#features" className="hover:text-md-primary transition-colors">المميزات</a>
              <a href="#how-it-works" className="hover:text-md-primary transition-colors">كيف تعمل</a>
              <a href="#demo" className="hover:text-md-primary transition-colors">التجربة الحية</a>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="w-10 h-10 rounded-md3-full bg-md-surface-variant flex items-center justify-center text-md-on-surface-variant hover:text-md-on-surface transition-colors mr-1"
              >
                {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <Link to="/auth?mode=login">
                <Button variant="ghost" className="text-md-primary font-bold hover:bg-md-primary-container rounded-md3-full">دخول</Button>
              </Link>
              <Link to="/auth?mode=signup">
                <Button className="bg-md-primary text-md-on-primary rounded-md3-full shadow-md3-1">ابدأ مجاناً</Button>
              </Link>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* 2. Hero */}
      <section className="relative pt-32 lg:pt-40 pb-20 bg-md-surface overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] rounded-md3-full bg-md-secondary-container/50 blur-[120px] pointer-events-none" />
        <div className="container mx-auto px-6 relative text-center">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-md3-display-lg font-black text-md-on-surface mb-6 leading-tight"
          >
            وظّف أفضل الكفاءات <br />
            <span className="text-md-primary">بذكاء وسرعة فائقة</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-md3-body-lg text-md-on-surface-variant max-w-2xl mx-auto mb-10"
          >
            فلترة ذكية ومؤتمتة للسير الذاتية بالذكاء الاصطناعي، مقابلات فيديو مدمجة، وإدارة كاملة للمرشحين في واجهة مبسطة بتصميم Material Design 3.
          </motion.p>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex justify-center gap-4">
            <Button size="lg" className="bg-md-primary text-md-on-primary rounded-md3-full h-14 px-8 text-md3-title-lg">
              ابدأ الآن مجاناً <ArrowLeft className="ml-2 w-5 h-5" />
            </Button>
            <Button variant="outline" size="lg" className="border-2 border-md-outline rounded-md3-full text-md-primary bg-transparent h-14 px-8 text-md3-title-lg">
              تصفح الوظائف
            </Button>
          </motion.div>
        </div>
      </section>

      {/* 3. Stats */}
      <section className="py-20 bg-md-surface-variant/30 border-y border-md-outline-variant">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <div key={i} className="bg-md-surface-container rounded-md3-xl p-6 text-center shadow-md3-1 border border-md-outline-variant">
                <div className="w-12 h-12 rounded-md3-full bg-md-primary-container text-md-on-primary-container flex items-center justify-center mx-auto mb-4">
                  <stat.icon className="w-6 h-6" />
                </div>
                <div className="text-md3-display-sm font-black text-md-on-surface mb-2">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-md3-body-md text-md-on-surface-variant">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Features */}
      <section id="features" className="py-24 bg-md-surface">
        <div className="container mx-auto px-6">
          <SectionHeader
            badge="المميزات"
            title="كل ما تحتاجه في"
            highlight="منصة واحدة"
            description="أدوات احترافية متكاملة لإدارة دورة التوظيف بالكامل"
          />
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="bg-md-surface rounded-md3-xl p-6 shadow-md3-2 flex flex-col h-full border border-md-outline-variant">
                <div className="w-14 h-14 rounded-md3-lg bg-md-secondary-container text-md-on-secondary-container flex items-center justify-center mb-6">
                  <f.icon className="w-7 h-7" />
                </div>
                <h3 className="text-md3-title-lg font-bold text-md-on-surface mb-3">{f.title}</h3>
                <p className="text-md3-body-md text-md-on-surface-variant mb-6 flex-1">{f.description}</p>
                <div className="mt-auto">
                  <span className="inline-flex items-center gap-1.5 text-md3-label-lg font-bold text-md-on-tertiary-container bg-md-tertiary-container px-3 py-1.5 rounded-md3-full">
                    <CheckCircle2 className="w-4 h-4" />
                    {f.highlight}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. How It Works */}
      <section id="how-it-works" className="py-24 bg-md-surface-container/50">
        <div className="container mx-auto px-6">
          <SectionHeader
            badge="آلية العمل"
            title="أربع خطوات نحو"
            highlight="التوظيف المثالي"
            description="عملية مبسطة وفعّالة لتوظيف أفضل الكفاءات"
          />
          <div className="grid md:grid-cols-4 gap-6 relative">
            <div className="hidden md:block absolute top-12 left-12 right-12 h-1 bg-md-outline-variant" />
            {steps.map((step, i) => (
              <div key={i} className="relative bg-md-surface p-6 rounded-md3-lg shadow-md3-1 border border-md-outline-variant text-center z-10">
                <div className="w-16 h-16 mx-auto rounded-md3-full bg-md-primary text-md-on-primary flex items-center justify-center text-md3-title-lg font-bold mb-4 shadow-md3-2 border-4 border-md-surface">
                  {step.num}
                </div>
                <h3 className="text-md3-title-lg font-bold text-md-on-surface mb-2">{step.title}</h3>
                <p className="text-md3-body-md text-md-on-surface-variant">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Interactive Demo */}
      <section id="demo" className="py-24 bg-md-surface">
        <div className="container mx-auto px-6">
          <SectionHeader
            badge="شاهد بنفسك"
            title="تجربة تفاعلية"
            highlight="للمنصة"
            description="اكتشف كيف تعمل المنصة من خلال عرض تفاعلي حي لأهم الشاشات"
          />
          <InteractiveDemo />
        </div>
      </section>

      {/* 7. Capabilities (Assist Chips) */}
      <section className="py-12 bg-md-surface border-y border-md-outline-variant">
        <div className="container mx-auto px-6 flex flex-wrap justify-center gap-3">
          {capabilities.map((cap, i) => (
            <span key={i} className="bg-md-surface border border-md-outline text-md-on-surface rounded-md3-full px-4 py-2 text-md3-label-lg flex items-center gap-2 hover:bg-md-surface-variant transition-colors cursor-default">
              <Check className="w-4 h-4 text-md-primary" />
              {cap}
            </span>
          ))}
        </div>
      </section>

      {/* 8. Testimonials */}
      <section id="testimonials" className="py-24 bg-md-surface-container/30">
        <div className="container mx-auto px-6">
          <SectionHeader
            badge="آراء العملاء"
            title="ماذا يقول"
            highlight="عملاؤنا"
            description="آلاف الشركات تعتمد على Tawzeef-X في عمليات التوظيف"
          />
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-transparent border border-md-outline-variant rounded-md3-lg p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(t.rating)].map((_, j) => <Star key={j} className="w-4 h-4 fill-md-primary text-md-primary" />)}
                  </div>
                  <p className="text-md3-body-lg text-md-on-surface mb-6">"{t.content}"</p>
                </div>
                <div className="flex items-center gap-3 border-t border-md-outline-variant pt-4">
                  <div className="w-10 h-10 rounded-md3-full bg-md-primary text-md-on-primary flex items-center justify-center font-bold">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-md3-body-md font-bold text-md-on-surface">{t.name}</p>
                    <p className="text-md3-label-lg text-md-on-surface-variant">{t.role} - {t.company}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. CTA */}
      <section className="py-24 bg-md-surface">
        <div className="container mx-auto px-6">
          <div className="bg-md-primary-container rounded-md3-xl p-12 text-center text-md-on-primary-container shadow-md3-3">
            <h2 className="text-md3-display-sm font-black mb-4">جاهز لتحوّل عملية التوظيف؟</h2>
            <p className="text-md3-body-lg mb-8 max-w-2xl mx-auto">
              انضم لأكثر من 10,000 شركة تستخدم Tawzeef-X لإيجاد وتوظيف أفضل المواهب بذكاء وكفاءة
            </p>
            <Button size="lg" className="bg-md-primary text-md-on-primary rounded-md3-xl h-14 px-8 text-md3-title-lg shadow-md3-2 hover:shadow-md3-3 transition-shadow">
              ابدأ الآن مجاناً <ArrowLeft className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* 10. Footer */}
      <footer className="py-12 bg-md-surface-variant text-md-on-surface-variant">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8 mb-8 border-b border-md-outline-variant pb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src={tawzeefLogo} alt="Tawzeef-X" className="w-6 h-6 object-contain" />
                <span className="font-bold text-md3-title-lg text-md-on-surface">Tawzeef-X</span>
              </div>
              <p className="text-md3-body-md max-w-xs">منصة التوظيف الذكية المدعومة بالذكاء الاصطناعي.</p>
            </div>
            <div>
              <h4 className="font-bold text-md-on-surface mb-4">روابط سريعة</h4>
              <div className="flex flex-col gap-2">
                <a href="#features" className="hover:text-md-primary">المميزات</a>
                <a href="#how-it-works" className="hover:text-md-primary">كيف تعمل</a>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-md-on-surface mb-4">تواصل معنا</h4>
              <p className="text-md3-body-md">support@tawzeef-x.com</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center text-md3-label-lg">
            <p>جميع الحقوق محفوظة © {new Date().getFullYear()} Tawzeef-X</p>
            <div className="flex gap-4">
              <Link to="/privacy" className="hover:text-md-primary">الخصوصية</Link>
              <Link to="/terms" className="hover:text-primary">الشروط</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
