import tawzeefLogo from "@/assets/tawzeef-x-logo.png";
import { Link } from "react-router-dom";
import { Users, Bot, ArrowLeft, TrendingUp, Shield, Globe, CheckCircle2, Zap, Star, Briefcase, FileText, BarChart3, Video, Sparkles, Award, Play, ArrowUpRight, MousePointerClick, Layout, MessageSquare, Calendar, Send, Menu, X  } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform, AnimatePresence, useInView, useMotionValue, useSpring, useMotionTemplate } from "framer-motion";
import { useRef, useState, useEffect, useCallback } from "react";

import { supabase } from "@/integrations/supabase/client";

const features = [
  { icon: Bot, title: "ذكاء اصطناعي متقدم", description: "فلترة وتصنيف المرشحين تلقائياً باستخدام AI مع تقييم شامل للمهارات والخبرات", color: "primary", highlight: "توفير 80% من الوقت" },
  { icon: Users, title: "إدارة مرشحين احترافية", description: "Kanban Board متقدم لتتبع المرشحين عبر جميع مراحل التوظيف مع مقارنة فورية", color: "accent", highlight: "مقارنة حتى 4 مرشحين" },
  { icon: Video, title: "مقابلات أونلاين مدمجة", description: "غرف فيديو مدمجة في المنصة مع تسجيل ونسخ نصي تلقائي وتقييم تفصيلي", color: "warning", highlight: "تسجيل + نسخ نصي" },
  { icon: TrendingUp, title: "تقارير وتحليلات ذكية", description: "لوحة تحكم تفاعلية مع رسوم بيانية متقدمة وتصدير PDF ومؤشرات أداء KPIs", color: "success", highlight: "تصدير PDF" },
  { icon: FileText, title: "عروض وظيفية رقمية", description: "إنشاء وإرسال عروض وظيفية احترافية مع توقيع إلكتروني وتتبع الاستجابة", color: "info", highlight: "توقيع إلكتروني" },
  { icon: Shield, title: "أمان وصلاحيات متقدمة", description: "نظام أدوار متعدد المستويات مع صلاحيات دقيقة ودعوات فريق آمنة", color: "destructive", highlight: "RLS + تشفير" },
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
  { value: 50, suffix: "+", label: "دولة مدعومة", icon: Globe },
  { value: 0, suffix: "", label: "وظيفة نشطة", icon: Briefcase },
  { value: 0, suffix: "", label: "مرشح مسجل", icon: Users },
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
  { name: "نورة الحربي", role: "رئيسة قسم التوظيف", company: "كلاسيرا للتعليم", content: "المنصة سهلت علينا إدارة أكثر من 200 طلب توظيف شهرياً. نظام التتبع والإشعارات الفورية لا يُقدّر بثمن.", rating: 5 },
  { name: "خالد العتيبي", role: "مدير العمليات", company: "نيوم تكنولوجي", content: "العروض الوظيفية الرقمية مع التوقيع الإلكتروني أنهت مشكلة التأخير في إتمام عمليات التوظيف تماماً.", rating: 5 },
  { name: "ريم القحطاني", role: "HR Manager", company: "فيوتشر بيلد", content: "الربط مع Zapier و n8n وفّر علينا ساعات من العمل اليدوي. الأتمتة في هذه المنصة استثنائية.", rating: 4 },
];

const capabilities = [
  "قوالب وظيفية جاهزة", "تقييم AI تلقائي", "Kanban Board متقدم", "مقابلات فيديو مدمجة",
  "تسجيل ونسخ نصي", "عروض وظيفية رقمية", "إشعارات فورية", "تقارير PDF",
  "Webhooks & API", "وضع داكن", "بوابة المرشح", "حجز مقابلات ذاتي",
];

/* ─── Interactive Demo ─── */
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
      {/* Browser chrome */}
      <div className="glass-card shadow-2xl overflow-hidden relative">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border/60 bg-muted/40 backdrop-blur-md">
          <div className="flex gap-1.5">
            <div className="w-3.5 h-3.5 rounded-full bg-destructive/70" />
            <div className="w-3.5 h-3.5 rounded-full bg-warning/70" />
            <div className="w-3.5 h-3.5 rounded-full bg-success/70" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="bg-muted/65 rounded-lg px-4 py-1 text-xs text-muted-foreground font-mono flex items-center gap-2">
              <Shield className="w-3 h-3 text-success" />
              tawzeef-x.app/dashboard
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-border bg-muted/10 px-4 gap-1 overflow-x-auto">
          {demoTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                // Auto close video room if switching tabs
                setIsVideoActive(false);
              }}
              className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="demo-tab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Content area */}
        <div className="p-6 min-h-[400px] relative">
          <AnimatePresence mode="wait">
            {activeTab === "dashboard" && (
              <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                {/* Stats row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: "وظائف نشطة", value: "12", change: "+3", icon: Briefcase, color: "primary" },
                    { label: "مرشحين جدد", value: "48", change: "+15", icon: Users, color: "accent" },
                    { label: "مقابلات اليوم", value: "5", change: "+2", icon: Video, color: "warning" },
                    { label: "عروض مرسلة", value: "8", change: "+4", icon: Send, color: "success" },
                  ].map((s, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.08 }}
                      className="bg-muted/30 border border-border rounded-xl p-4 group hover:border-primary/20 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground">{s.label}</span>
                        <s.icon className={`w-4 h-4 text-${s.color}`} />
                      </div>
                      <div className="text-2xl font-bold text-foreground">{s.value}</div>
                      <span className="text-xs text-success font-medium">{s.change} هذا الأسبوع</span>
                    </motion.div>
                  ))}
                </div>
                {/* Mini chart simulation */}
                <div className="bg-muted/20 border border-border rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-bold text-foreground">نشاط التوظيف</span>
                    <span className="text-xs text-muted-foreground">آخر 7 أيام</span>
                  </div>
                  <div className="flex items-end gap-2 h-32">
                    {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                      <motion.div
                        key={i}
                        className="flex-1 rounded-t-lg bg-primary/20 relative overflow-hidden"
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ delay: 0.3 + i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <motion.div
                          className="absolute inset-0 bg-primary/40 rounded-t-lg"
                          initial={{ y: "100%" }}
                          whileHover={{ y: "0%" }}
                          transition={{ duration: 0.2 }}
                        />
                      </motion.div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
                    {["سبت", "أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة"].map((d) => (
                      <span key={d} className="flex-1 text-center">{d}</span>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "candidates" && (
              <motion.div key="candidates" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground mb-1">
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
                      className="flex items-center gap-4 p-4 bg-muted/20 border border-border rounded-xl hover:border-primary/20 transition-all cursor-pointer group"
                    >
                      <motion.div
                        animate={hoveredCandidate === i ? { scale: 1.1, rotate: -5 } : { scale: 1, rotate: 0 }}
                        className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0"
                      >
                        {c.avatar}
                      </motion.div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-foreground">{c.name}</div>
                        <div className="text-xs text-muted-foreground">{c.role}</div>
                      </div>
                      <div className="hidden sm:flex items-center gap-3">
                        <div className="text-center">
                          <div className="text-lg font-bold text-primary">{c.score}%</div>
                          <div className="text-[10px] text-muted-foreground">تطابق AI</div>
                        </div>
                        <motion.span
                          animate={hoveredCandidate === i ? { scale: 1.08 } : { scale: 1 }}
                          className="text-xs font-medium bg-accent/10 text-accent px-3 py-1.5 rounded-lg border border-accent/15 min-w-[70px] text-center"
                        >
                          {c.stage}
                        </motion.span>
                      </div>
                      <motion.div
                        initial={{ opacity: 0, x: 10 }}
                        animate={hoveredCandidate === i ? { opacity: 1, x: 0 } : { opacity: 0, x: 10 }}
                        className="text-primary"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </motion.div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === "ai" && (
              <motion.div key="ai" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                <div className="bg-muted/20 border border-border rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-foreground">تقييم الذكاء الاصطناعي</div>
                      <div className="text-xs text-muted-foreground">تحليل شامل للمرشح</div>
                    </div>
                  </div>
                  {/* AI analysis simulation */}
                  <div className="space-y-4">
                    {[
                      { label: "المهارات التقنية", value: 92 },
                      { label: "الخبرة العملية", value: 85 },
                      { label: "التوافق الثقافي", value: 78 },
                      { label: "مهارات التواصل", value: 90 },
                    ].map((skill, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="text-foreground font-medium">{skill.label}</span>
                          <span className="text-primary font-bold">{skill.value}%</span>
                        </div>
                        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full gradient-primary"
                            initial={{ width: 0 }}
                            animate={{ width: `${skill.value}%` }}
                            transition={{ delay: 0.2 + i * 0.15, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 }}
                    className="mt-5 p-4 bg-success/5 border border-success/15 rounded-xl"
                  >
                    <div className="flex items-center gap-2 text-success text-sm font-bold mb-1">
                      <CheckCircle2 className="w-4 h-4" />
                      توصية: مرشح مناسب جداً
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      يتمتع المرشح بمهارات تقنية عالية وخبرة عملية ممتازة تتوافق مع متطلبات الوظيفة بنسبة 92%.
                    </p>
                  </motion.div>
                </div>
              </motion.div>
            )}

            {activeTab === "interviews" && (
              <motion.div key="interviews" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                <div className="space-y-3">
                  {[
                    { name: "أحمد محمد", time: "10:00 ص", type: "فيديو", status: "قادمة", color: "primary" },
                    { name: "سارة علي", time: "11:30 ص", type: "تقني", status: "الآن", color: "success" },
                    { name: "خالد حسن", time: "02:00 م", type: "نهائية", status: "قادمة", color: "warning" },
                  ].map((interview, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.12 }}
                      className="flex items-center gap-4 p-4 bg-muted/20 border border-border rounded-xl hover:border-primary/20 transition-all"
                    >
                      <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
                        {interview.name[0]}
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-sm text-foreground">{interview.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <Calendar className="w-3 h-3" />
                          {interview.time} — مقابلة {interview.type}
                        </div>
                      </div>
                      <motion.span
                        animate={interview.status === "الآن" ? { scale: [1, 1.05, 1] } : {}}
                        transition={{ duration: 2, repeat: Infinity }}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${
                          interview.status === "الآن"
                            ? "bg-success/10 text-success border-success/20"
                            : "bg-muted/30 text-muted-foreground border-border"
                        }`}
                      >
                        {interview.status === "الآن" && <span className="inline-block w-1.5 h-1.5 rounded-full bg-success ml-1.5 animate-pulse" />}
                        {interview.status}
                      </motion.span>
                      {interview.status === "الآن" && (
                        <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            size="sm"
                            onClick={() => setIsVideoActive(true)}
                            className="gradient-primary border-0 text-primary-foreground text-xs h-8 rounded-lg gap-1 font-bold animate-pulse"
                          >
                            <Video className="w-3 h-3" />
                            انضم
                          </Button>
                        </motion.div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Interactive Video Call Room Overlay */}
          <AnimatePresence>
            {isVideoActive && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute inset-0 bg-background/95 backdrop-blur-md rounded-xl p-6 z-30 flex flex-col justify-between"
              >
                {/* Top Bar */}
                <div className="flex items-center justify-between border-b border-border/80 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
                    <span className="text-[10px] font-bold text-muted-foreground font-mono tracking-wider">LIVE RECORDING & AI TRANSCRIPTION</span>
                  </div>
                  <span className="text-xs font-bold bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">
                    مقابلة تقنية — سارة علي
                  </span>
                </div>

                {/* Video Streams Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4 flex-1 items-stretch">
                  {/* Candidate Feed */}
                  <div className="bg-muted/30 border border-border/80 rounded-xl relative overflow-hidden flex flex-col items-center justify-center p-6 min-h-[180px] group">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-2xl font-bold text-primary shadow-inner relative z-10">
                      س
                      <span className="absolute inset-0 rounded-full border border-primary/30 animate-ping opacity-75" />
                    </div>
                    <span className="text-sm font-bold mt-3 text-foreground z-10">سارة علي (المرشح)</span>
                    <span className="text-xs text-muted-foreground z-10">البث الصوتي والحراري نشط</span>
                    {/* Live transcription subtitles */}
                    <div className="absolute bottom-3 inset-x-3 bg-background/80 backdrop-blur-md border border-border/60 rounded-lg p-2.5 text-center min-h-[46px] flex items-center justify-center">
                      <p className="text-xs text-foreground font-medium leading-relaxed">
                        {transcriptText || "جاري تحميل بث المقابلة..."}
                      </p>
                    </div>
                  </div>

                  {/* Recruiter Feed */}
                  <div className="bg-muted/30 border border-border/80 rounded-xl relative overflow-hidden flex flex-col items-center justify-center p-6 min-h-[180px]">
                    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-2xl font-bold text-muted-foreground shadow-inner">
                      HR
                    </div>
                    <span className="text-sm font-bold mt-3 text-foreground">المقيّم (أنت)</span>
                    <span className="text-xs text-muted-foreground">الكاميرا مغلقة</span>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between border-t border-border/80 pt-3">
                  <div className="text-xs text-success font-semibold flex items-center gap-1.5">
                    <Bot className="w-4 h-4 animate-bounce" />
                    الذكاء الاصطناعي يحلل نبرة الصوت والمحتوى التقني...
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setIsVideoActive(false)}
                      className="text-xs h-9 px-4 rounded-lg font-bold shadow-md hover:shadow-lg transition-shadow"
                    >
                      إنهاء المقابلة
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* CTA under demo */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3 }}
        className="text-center mt-10"
      >
        <Link to="/auth?mode=signup">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
            <Button size="lg" className="gradient-primary border-0 text-primary-foreground h-13 px-8 text-base font-bold rounded-2xl gap-2">
              <MousePointerClick className="w-4 h-4" />
              جرّب المنصة الآن مجاناً
            </Button>
          </motion.div>
        </Link>
      </motion.div>
    </motion.div>
  );
}

/* ─── Animated Counter ─── */
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

/* ─── Stagger container ─── */
const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 30, filter: "blur(4px)" },
  visible: {
    opacity: 1, y: 0, filter: "blur(0px)",
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: {
    opacity: 1, scale: 1,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

/* ─── 3D Tilt Card ─── */
function TiltCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [6, -6]), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-6, 6]), { stiffness: 200, damping: 20 });
  const glareX = useTransform(mouseX, [-0.5, 0.5], [0, 100]);
  const glareY = useTransform(mouseY, [-0.5, 0.5], [0, 100]);
  const glareBackground = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, hsl(var(--primary) / 0.06), transparent 60%)`;

  const handleMouse = useCallback((e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  }, [mouseX, mouseY]);

  const handleLeave = useCallback(() => {
    mouseX.set(0);
    mouseY.set(0);
  }, [mouseX, mouseY]);

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
      style={{ rotateX, rotateY, transformPerspective: 800 }}
      className={`relative ${className}`}
    >
      <motion.div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ background: glareBackground }} />
      {children}
    </motion.div>
  );
}

/* ─── Glow Border Card ─── */
function GlowCard({ children, className = "", glowColor = "hsl(var(--primary) / 0.15)" }: { children: React.ReactNode; className?: string; glowColor?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  }, [mouseX, mouseY]);

  const background = useMotionTemplate`radial-gradient(350px circle at ${mouseX}px ${mouseY}px, ${glowColor}, transparent 80%)`;

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      className={`group relative rounded-2xl bg-border/40 p-[1px] transition-all duration-300 hover:bg-border/10 hover:shadow-2xl ${className}`}
    >
      {/* Dynamic glowing border layer */}
      <motion.div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background }}
      />
      {/* Inner card container */}
      <div className="relative rounded-2xl bg-card h-full w-full overflow-hidden">
        {children}
      </div>
    </div>
  );
}

/* ─── Parallax Section ─── */
function useParallax(offset = 80) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [offset, -offset]);
  return { ref, y };
}

/* ─── Parallax Background Blob ─── */
function ParallaxBlob({ position, size, color, offset = 80 }: { position: string; size: number; color: "primary" | "accent"; offset?: number }) {
  const { ref, y } = useParallax(offset);
  return (
    <motion.div
      ref={ref}
      style={{ y, width: size, height: size, background: `hsl(var(--${color}))` }}
      className={`absolute ${position} rounded-full opacity-[0.04] blur-[120px] pointer-events-none`}
    />
  );
}

/* ─── Typewriter Effect ─── */
function TypewriterText({ text, className = "", delay = 0.5 }: { text: string; className?: string; delay?: number }) {
  const words = text.split(" ");
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <span ref={ref} className={className}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
          animate={inView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
          transition={{
            duration: 0.8,
            delay: delay + i * 0.12,
            ease: [0.16, 1, 0.3, 1]
          }}
          className="inline-block ml-3 last:ml-0"
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}

/* ─── Hero Background ─── */
function HeroBackground() {
  const { scrollYProgress } = useScroll();
  const y1 = useTransform(scrollYProgress, [0, 0.3], [0, -100]);
  const y2 = useTransform(scrollYProgress, [0, 0.3], [0, 60]);
  const y3 = useTransform(scrollYProgress, [0, 0.3], [0, -40]);
  const opacity = useTransform(scrollYProgress, [0, 0.25], [1, 0]);

  return (
    <motion.div className="absolute inset-0 overflow-hidden" style={{ opacity }}>
      {/* Deep teal orb — top right */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 900,
          height: 900,
          top: "-25%",
          right: "-20%",
          y: y1,
          background: "radial-gradient(circle, hsl(var(--primary) / 0.12), hsl(var(--primary) / 0.02) 70%, transparent 100%)",
        }}
      />
      {/* Soft emerald orb — bottom left */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 700,
          height: 700,
          bottom: "-15%",
          left: "-10%",
          y: y2,
          background: "radial-gradient(circle, hsl(var(--accent) / 0.08), hsl(var(--accent) / 0.01) 60%, transparent 100%)",
        }}
      />
      {/* Grid Pattern overlay */}
      <motion.div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          y: y3,
          backgroundImage: "radial-gradient(hsl(var(--primary) / 0.4) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
    </motion.div>
  );
}

/* ─── Section Header ─── */
function SectionHeader({ badge, badgeColor = "primary", title, highlight, description }: {
  badge: string; badgeColor?: string; title: string; highlight: string; description: string;
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
        className={`inline-flex items-center gap-2 text-${badgeColor} text-sm font-semibold tracking-wide bg-${badgeColor}/8 px-4 py-1.5 rounded-full border border-${badgeColor}/15`}
      >
        <Sparkles className="w-3.5 h-3.5" />
        {badge}
      </motion.span>
      <motion.h2 variants={fadeUp} className="text-3xl md:text-5xl font-extrabold mt-5 leading-tight">
        {title} <span className={`text-${badgeColor}`}>{highlight}</span>
      </motion.h2>
      <motion.p variants={fadeUp} className="text-muted-foreground mt-4 max-w-xl mx-auto text-base leading-relaxed">
        {description}
      </motion.p>
    </motion.div>
  );
}

export default function LandingPage() {
  const heroRef = useRef<HTMLElement>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);

  const [stats, setStats] = useState(defaultStats);
  useEffect(() => {
    (async () => {
      try {
        const [jobsRes, candidatesRes] = await Promise.all([
          supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "نشطة"),
          supabase.from("candidates").select("id", { count: "exact", head: true }),
        ]);
        setStats([
          { value: 50, suffix: "+", label: "دولة مدعومة", icon: Globe },
          { value: jobsRes.count || 0, suffix: "", label: "وظيفة نشطة", icon: Briefcase },
          { value: candidatesRes.count || 0, suffix: "", label: "مرشح مسجل", icon: Users },
          { value: 99.9, suffix: "%", label: "وقت التشغيل", icon: Zap },
        ]);
      } catch {}
    })();
  }, []);

  const [currentPage, setCurrentPage] = useState(0);
  const testimonialsPerPage = 3;
  const totalPages = Math.ceil(testimonials.length / testimonialsPerPage);

  useEffect(() => {
    const interval = setInterval(() => setCurrentPage((p) => (p + 1) % totalPages), 6000);
    return () => clearInterval(interval);
  }, [totalPages]);

  const currentTestimonials = testimonials.slice(
    currentPage * testimonialsPerPage,
    (currentPage + 1) * testimonialsPerPage
  );

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Navbar */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 inset-x-0 z-50 pt-5"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="bg-background/55 backdrop-blur-xl border border-border/70 rounded-full px-6 h-16 flex items-center justify-between shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:border-primary/25 hover:shadow-md transition-all duration-300">
            <motion.div className="flex items-center gap-3" whileHover={{ scale: 1.02 }}>
              <img src={tawzeefLogo} alt="Tawzeef-X" className="w-8 h-8 object-contain animate-float" />
              <span className="text-base font-bold text-foreground">
                Tawzeef-X <span className="text-primary font-semibold">منصة التوظيف</span>
              </span>
            </motion.div>
            <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground font-medium">
              {[
                { href: "#features", label: "المميزات" },
                { href: "#how-it-works", label: "كيف تعمل" },
                { href: "#testimonials", label: "آراء العملاء" },
              ].map(link => (
                <a key={link.href} href={link.href} className="relative hover:text-foreground transition-colors group py-1">
                  {link.label}
                  <span className="absolute bottom-0 right-0 w-0 h-0.5 bg-primary rounded-full group-hover:w-full transition-all duration-300" />
                </a>
              ))}
              <Link to="/portal" className="hover:text-foreground transition-colors">بوابة المرشح</Link>
              <Link to="/install" className="hover:text-foreground transition-colors">تثبيت التطبيق</Link>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <Link to="/auth?mode=login">
                <Button variant="ghost" size="sm" className="text-sm h-10 px-4 rounded-full">تسجيل الدخول</Button>
              </Link>
              <Link to="/auth?mode=signup">
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                  <Button size="sm" className="text-sm h-10 px-5 gradient-primary border-0 text-primary-foreground rounded-full shadow-sm hover:shadow-md transition-all duration-300">ابدأ مجاناً</Button>
                </motion.div>
              </Link>
            </div>
            
            {/* Mobile menu toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex md:hidden items-center justify-center w-10 h-10 rounded-full border border-border/70 bg-background/45 backdrop-blur-md hover:bg-muted transition-colors"
              aria-label="Toggle Menu"
            >
              {isMobileMenuOpen ? <X className="w-4 h-4 text-foreground" /> : <Menu className="w-4 h-4 text-foreground" />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-24 inset-x-4 z-40 md:hidden"
          >
            <div className="bg-background/90 backdrop-blur-2xl border border-border/80 rounded-3xl p-6 shadow-2xl flex flex-col gap-6">
              <div className="flex flex-col gap-4 text-right">
                {[
                  { href: "#features", label: "المميزات" },
                  { href: "#how-it-works", label: "كيف تعمل" },
                  { href: "#testimonials", label: "آراء العملاء" },
                ].map(link => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-foreground hover:text-primary text-base font-bold transition-colors py-2.5 border-b border-border/40 last:border-b-0"
                  >
                    {link.label}
                  </a>
                ))}
                <Link to="/portal" onClick={() => setIsMobileMenuOpen(false)} className="text-foreground hover:text-primary text-base font-bold transition-colors py-2.5 border-b border-border/40">بوابة المرشح</Link>
                <Link to="/install" onClick={() => setIsMobileMenuOpen(false)} className="text-foreground hover:text-primary text-base font-bold transition-colors py-2.5">تثبيت التطبيق</Link>
              </div>
              <div className="flex flex-col gap-3 pt-3 border-t border-border">
                <Link to="/auth?mode=login" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full text-sm h-11 rounded-xl">تسجيل الدخول</Button>
                </Link>
                <Link to="/auth?mode=signup" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button className="w-full text-sm h-11 gradient-primary border-0 text-primary-foreground rounded-xl shadow-md">ابدأ مجاناً</Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero */}
      <section ref={heroRef} className="relative pt-28 overflow-hidden min-h-[92vh] flex items-center bg-gradient-to-b from-background via-background/95 to-background/50">
        <HeroBackground />
        <motion.div style={{ opacity: heroOpacity, y: heroY, scale: heroScale }} className="relative container mx-auto px-6 py-20 md:py-28">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex items-center gap-2.5 rounded-full px-5 py-2 text-sm font-semibold mb-10 border border-primary/15 bg-primary/5 text-primary shadow-sm"
            >
              <motion.div animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 3, repeat: Infinity }}>
                <Sparkles className="w-4 h-4" />
              </motion.div>
              منصة توظيف مدعومة بالذكاء الاصطناعي المتقدم
              <motion.div
                className="w-2 h-2 rounded-full bg-success"
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.div>

            {/* Title with typewriter */}
            <div className="overflow-hidden">
              <motion.h1
                initial={{ opacity: 0, y: 60 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="text-5xl md:text-7xl lg:text-8xl font-black leading-[1.2] text-foreground tracking-tight"
              >
                <TypewriterText text="وظّف أفضل الكفاءات" delay={0.6} />
              </motion.h1>
            </div>
            <div className="overflow-hidden mt-2">
              <motion.div
                initial={{ opacity: 0, y: 60 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="text-5xl md:text-7xl lg:text-8xl font-black leading-[1.2] tracking-tight"
              >
                <span className="text-gradient">
                  <TypewriterText text="بذكاء وسرعة فائقة" delay={1.8} />
                </span>
              </motion.div>
            </div>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 24, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-lg md:text-xl text-muted-foreground mt-8 max-w-2xl mx-auto leading-relaxed"
            >
              منصة توظيف متكاملة تستخدم الذكاء الاصطناعي لتقييم المرشحين، جدولة المقابلات الأونلاين،
              وإدارة العروض الوظيفية — كل ذلك من مكان واحد
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.55 }}
              className="flex flex-col sm:flex-row gap-3 mt-12 justify-center"
            >
              <Link to="/auth?mode=signup">
                <motion.div whileHover={{ scale: 1.05, y: -3 }} whileTap={{ scale: 0.97 }}>
                  <Button size="lg" className="border-0 text-primary-foreground px-10 h-14 text-base font-bold w-full sm:w-auto rounded-2xl relative overflow-hidden group bg-gradient-to-r from-primary via-primary/95 to-accent hover:from-primary/95 hover:to-accent/95 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25">
                    <motion.div
                      className="absolute inset-0"
                      style={{ background: "linear-gradient(90deg, transparent, hsl(0 0% 100% / 0.1), transparent)" }}
                      animate={{ x: ["-100%", "200%"] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                    />
                    <span className="relative flex items-center gap-2">
                      ابدأ الآن مجاناً
                      <ArrowLeft className="w-4 h-4" />
                    </span>
                  </Button>
                </motion.div>
              </Link>
              <Link to="/careers">
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button variant="outline" size="lg" className="h-14 text-base px-8 w-full sm:w-auto gap-2 rounded-2xl border-2">
                    <Briefcase className="w-4 h-4" />
                    تصفح الوظائف
                  </Button>
                </motion.div>
              </Link>
              <Link to="/pricing">
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button variant="ghost" size="lg" className="h-14 text-base px-8 w-full sm:w-auto rounded-2xl">
                    عرض الأسعار
                  </Button>
                </motion.div>
              </Link>
            </motion.div>

            {/* Social proof */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75, duration: 0.5 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-16"
            >
              <div className="flex -space-x-3 space-x-reverse">
                {["أ", "م", "س", "خ", "ن"].map((l, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0, rotate: -30 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    transition={{ delay: 0.85 + i * 0.08, type: "spring", stiffness: 300, damping: 15 }}
                    className="w-10 h-10 rounded-full gradient-primary border-[3px] border-background flex items-center justify-center text-xs text-primary-foreground font-bold shadow-md"
                  >
                    {l}
                  </motion.div>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <motion.div key={i} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1 + i * 0.05, type: "spring" }}>
                      <Star className="w-4 h-4 fill-warning text-warning" />
                    </motion.div>
                  ))}
                </div>
                <span className="text-foreground text-sm font-bold">4.9/5</span>
                <span className="text-muted-foreground text-sm">من مستخدمي المنصة</span>
              </div>
            </motion.div>

            {/* Scroll indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="mt-16 flex justify-center"
            >
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="w-8 h-12 rounded-full border-2 border-border flex items-start justify-center pt-2"
              >
                <motion.div
                  className="w-1.5 h-3 rounded-full bg-primary/40"
                  animate={{ y: [0, 12, 0], opacity: [1, 0.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Stats with parallax */}
      <section className="py-20 border-y border-border relative overflow-hidden bg-muted/10 backdrop-blur-sm">
        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(hsl(var(--primary) / 0.4) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        {/* Soft theme-aware decorative glow orbs */}
        <div className="absolute -left-1/4 top-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-primary/5 blur-[100px] pointer-events-none" />
        <div className="absolute -right-1/4 top-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-accent/5 blur-[100px] pointer-events-none" />

        <div className="container mx-auto px-6 relative">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={staggerContainer}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {stats.map((stat, i) => (
              <motion.div key={i} variants={fadeUp} className="text-center group">
                <motion.div
                  whileHover={{ scale: 1.12, rotate: -3, backgroundColor: "hsl(var(--primary) / 0.12)" }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  className="w-16 h-16 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto mb-4 border border-primary/10 transition-colors duration-200"
                >
                  <stat.icon className="w-7 h-7 text-primary" />
                </motion.div>
                <div className="text-4xl md:text-5xl font-black text-foreground tabular-nums tracking-tight">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-muted-foreground text-sm mt-2 font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section id="features" className="py-28 container mx-auto px-6 relative">
        {/* Parallax background blobs */}
        <ParallaxBlob position="top-20 right-0" size={500} color="accent" />
        <ParallaxBlob position="bottom-20 left-0" size={400} color="primary" offset={-60} />
        <SectionHeader
          badge="المميزات"
          title="كل ما تحتاجه في"
          highlight="منصة واحدة"
          description="أدوات احترافية متكاملة لإدارة دورة التوظيف بالكامل — من نشر الوظيفة حتى التعيين"
        />
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={staggerContainer}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {features.map((f, i) => (
            <motion.div key={i} variants={fadeUp}>
              <GlowCard glowColor={`hsl(var(--${f.color}) / 0.18)`} className="h-full">
                <div className="p-7 h-full group relative overflow-hidden flex flex-col justify-between">
                  {/* Top accent line */}
                  <motion.div
                    className="absolute top-0 left-0 right-0 h-px"
                    style={{ background: `linear-gradient(90deg, transparent, hsl(var(--${f.color}) / 0.3), transparent)` }}
                    initial={{ scaleX: 0 }}
                    whileHover={{ scaleX: 1 }}
                    transition={{ duration: 0.4 }}
                  />
                  {/* Corner glow on hover */}
                  <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full bg-primary/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                  <div className="relative flex items-start gap-4">
                    <motion.div
                      whileHover={{ scale: 1.12, rotate: -8 }}
                      transition={{ type: "spring", stiffness: 300 }}
                      className={`w-13 h-13 rounded-2xl ${colorMap[f.color]} flex items-center justify-center shrink-0 border border-current/10`}
                    >
                      <f.icon className="w-6 h-6" />
                    </motion.div>
                    <div className="flex-1">
                      <h3 className="font-bold text-[17px] mb-2 text-foreground group-hover:text-primary transition-colors">{f.title}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{f.description}</p>
                      <motion.span
                        className={`inline-flex items-center gap-1.5 mt-4 text-[11px] font-bold text-${f.color} bg-${f.color}/8 px-3 py-1.5 rounded-lg`}
                        whileHover={{ scale: 1.05 }}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        {f.highlight}
                      </motion.span>
                    </div>
                  </div>
                </div>
              </GlowCard>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Capabilities marquee */}
      <section className="py-8 border-y border-border overflow-hidden" style={{ background: "linear-gradient(90deg, hsl(var(--primary) / 0.04), hsl(var(--accent) / 0.03), hsl(var(--primary) / 0.04))" }}>
        <div className="flex animate-[marquee_35s_linear_infinite] gap-3 w-max">
          {[...capabilities, ...capabilities].map((cap, i) => (
            <motion.span
              key={i}
              whileHover={{ scale: 1.05, borderColor: "hsl(var(--primary) / 0.3)" }}
              className="flex items-center gap-2 bg-card border border-border/70 rounded-xl px-4 py-2.5 text-sm text-foreground whitespace-nowrap transition-colors font-medium"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
              {cap}
            </motion.span>
          ))}
        </div>
      </section>

      {/* How it works — with parallax cards */}
      <section id="how-it-works" className="py-28 relative overflow-hidden" style={{ background: "linear-gradient(180deg, hsl(var(--primary) / 0.02) 0%, hsl(var(--background)) 50%, hsl(var(--accent) / 0.015) 100%)" }}>
        <ParallaxBlob position="top-10 left-1/4" size={600} color="primary" offset={60} />
        <div className="absolute top-0 inset-x-0 h-px" style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.15), hsl(var(--accent) / 0.1), transparent)" }} />
        <div className="container mx-auto px-6 relative">
          <SectionHeader
            badge="آلية العمل"
            badgeColor="accent"
            title="أربع خطوات نحو"
            highlight="التوظيف المثالي"
            description="عملية مبسطة وفعّالة لتوظيف أفضل الكفاءات"
          />
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
            className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto relative"
          >
            {/* Connecting line */}
            <div className="hidden md:block absolute top-16 right-[12.5%] left-[12.5%] h-px">
              <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="h-full origin-right"
                style={{ background: "linear-gradient(90deg, hsl(var(--primary) / 0.3), hsl(var(--accent) / 0.3))" }}
              />
            </div>
            {steps.map((step, i) => (
              <motion.div key={i} variants={fadeUp} className="relative">
                <GlowCard glowColor="hsl(var(--accent) / 0.15)" className="h-full">
                  <div className="p-7 text-center group relative overflow-hidden h-full flex flex-col justify-between items-center">
                    {/* Step number background */}
                    <div className="absolute top-3 left-3 text-[60px] font-black text-primary/[0.04] leading-none select-none">{step.num}</div>
                    
                    <div>
                      <motion.div
                        whileHover={{ scale: 1.12, rotate: -8 }}
                        className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/15 to-accent/10 flex items-center justify-center mx-auto mb-5 group-hover:shadow-lg group-hover:shadow-primary/10 transition-shadow border border-primary/10"
                      >
                        <step.icon className="w-7 h-7 text-primary" />
                      </motion.div>
                      <span className="text-xs font-black text-primary/40 tracking-widest">{step.num}</span>
                      <h3 className="font-bold text-lg mt-2 mb-3 text-foreground">{step.title}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                </GlowCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Interactive Demo */}
      <section id="demo" className="py-28 container mx-auto px-6">
        <SectionHeader
          badge="شاهد بنفسك"
          badgeColor="accent"
          title="تجربة تفاعلية"
          highlight="للمنصة"
          description="اكتشف كيف تعمل المنصة من خلال عرض تفاعلي حي لأهم الشاشات"
        />
        <InteractiveDemo />
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-28 container mx-auto px-6 relative">
        <ParallaxBlob position="top-0 right-1/4" size={500} color="primary" offset={50} />
        <ParallaxBlob position="bottom-10 left-10" size={400} color="accent" offset={-40} />
        <SectionHeader
          badge="آراء العملاء"
          title="ماذا يقول"
          highlight="عملاؤنا"
          description="آلاف الشركات تعتمد على Tawzeef-X في عمليات التوظيف"
        />
        
        <div className="max-w-5xl mx-auto relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, x: 50, filter: "blur(4px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, x: -50, filter: "blur(4px)" }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="grid md:grid-cols-3 gap-5"
            >
              {currentTestimonials.map((t, i) => (
                <motion.div
                  key={`${currentPage}-${i}`}
                  initial={{ opacity: 0, y: 24, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: i * 0.1, duration: 0.45 }}
                >
                  <GlowCard glowColor="hsl(var(--primary) / 0.1)" className="h-full">
                    <div className="p-7 relative overflow-hidden h-full flex flex-col justify-between min-h-[260px] group">
                      <div>
                        {/* Quote mark */}
                        <div className="absolute top-4 left-4 text-5xl font-serif text-primary/[0.06] leading-none select-none">"</div>
                        
                        <div className="flex items-center gap-0.5 mb-5">
                          {[...Array(t.rating)].map((_, j) => (
                            <Star key={j} className="w-4 h-4 fill-warning text-warning" />
                          ))}
                        </div>
                        <blockquote className="text-foreground text-sm leading-[1.8] mb-6 relative">
                          "{t.content}"
                        </blockquote>
                      </div>
                      <div className="flex items-center gap-3 pt-5 border-t border-border">
                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm shadow-sm"
                        >
                          {t.name[0]}
                        </motion.div>
                        <div>
                          <p className="font-bold text-sm text-foreground">{t.name}</p>
                          <p className="text-xs text-muted-foreground">{t.role} — {t.company}</p>
                        </div>
                      </div>
                    </div>
                  </GlowCard>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>

          <div className="flex justify-center mt-10 gap-2">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className="relative h-2.5 focus:outline-none"
                aria-label={`Go to slide ${i + 1}`}
              >
                <motion.div
                  animate={{
                    width: i === currentPage ? 32 : 10,
                    backgroundColor: i === currentPage ? "hsl(var(--primary))" : "hsl(var(--border))"
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 22 }}
                  className="h-full rounded-full"
                />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-28">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-3xl p-14 md:p-20 text-center text-primary-foreground relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)" }}
          >
            {/* Animated rings */}
            <motion.div className="absolute inset-0" animate={{ rotate: 360 }} transition={{ duration: 120, repeat: Infinity, ease: "linear" }}>
              <div className="absolute top-10 right-20 w-48 h-48 rounded-full border border-white/10" />
              <div className="absolute bottom-10 left-10 w-72 h-72 rounded-full border border-white/5" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full border border-white/[0.03]" />
            </motion.div>
            {/* Floating sparkles */}
            {[...Array(4)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-white/20"
                style={{ left: `${20 + i * 20}%`, top: `${15 + i * 15}%` }}
                animate={{ y: [0, -20, 0], opacity: [0.2, 0.8, 0.2] }}
                transition={{ duration: 3 + i, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }}
              />
            ))}
            <div className="relative">
              <motion.h2
                className="text-4xl md:text-6xl font-black mb-5 leading-tight"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
              >
                جاهز لتحوّل عملية التوظيف؟
              </motion.h2>
              <motion.p
                className="text-primary-foreground/75 text-lg mb-10 max-w-2xl mx-auto"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                انضم لأكثر من 10,000 شركة تستخدم Tawzeef-X لإيجاد وتوظيف أفضل المواهب بذكاء وكفاءة
              </motion.p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/auth?mode=signup">
                  <motion.div whileHover={{ scale: 1.06, y: -3 }} whileTap={{ scale: 0.97 }}>
                    <Button size="lg" className="bg-background text-foreground hover:bg-background/90 h-14 px-10 text-base font-bold w-full sm:w-auto rounded-2xl shadow-xl">
                      ابدأ الآن مجاناً
                      <ArrowLeft className="w-4 h-4 mr-2" />
                    </Button>
                  </motion.div>
                </Link>
                <Link to="/portal">
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    <Button size="lg" variant="outline" className="border-primary-foreground/25 text-primary-foreground hover:bg-primary-foreground/10 h-14 px-10 text-base w-full sm:w-auto rounded-2xl">
                      بوابة المرشحين
                    </Button>
                  </motion.div>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-16" style={{ background: "linear-gradient(180deg, hsl(var(--primary) / 0.02), hsl(var(--background)))" }}>
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-10 items-start">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img src={tawzeefLogo} alt="Tawzeef-X" className="w-8 h-8 object-contain" />
                <span className="font-bold text-lg text-foreground">Tawzeef-X <span className="text-primary">منصة التوظيف</span></span>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
                منصة التوظيف الذكية المدعومة بالذكاء الاصطناعي. نساعد الشركات على إيجاد أفضل المواهب بسرعة وكفاءة.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-sm text-foreground mb-4">روابط سريعة</h4>
              <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
                <Link to="/portal" className="hover:text-foreground transition-colors">بوابة المرشح</Link>
                <a href="#features" className="hover:text-foreground transition-colors">المميزات</a>
                <a href="#how-it-works" className="hover:text-foreground transition-colors">كيف تعمل</a>
                <a href="#testimonials" className="hover:text-foreground transition-colors">آراء العملاء</a>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-sm text-foreground mb-4">تواصل معنا</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>support@tawzeef-x.com</p>
                <p>+966 50 XXX XXXX</p>
              </div>
            </div>
          </div>
          <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-muted-foreground text-sm">جميع الحقوق محفوظة © {new Date().getFullYear()} Tawzeef-X</p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link to="#" className="hover:text-foreground transition-colors">الخصوصية</Link>
              <Link to="#" className="hover:text-foreground transition-colors">الشروط</Link>
              <Link to="#" className="hover:text-foreground transition-colors">الدعم</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
