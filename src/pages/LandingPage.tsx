import tawzeefLogo from "@/assets/tawzeef-x-logo.png";
import { Link } from "react-router-dom";
import { Users, Bot, ArrowLeft, TrendingUp, Shield, Globe, CheckCircle2, Zap, Star, Briefcase, FileText, BarChart3, Video, Sparkles, Award, Play, ArrowUpRight, MousePointerClick, Layout, MessageSquare, Calendar, Send, Menu, X, Sun, Moon, ChevronDown, Check, ShieldCheck, Lock, Clock, Sparkle, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform, AnimatePresence, useInView, useMotionValue, useSpring, useMotionTemplate } from "framer-motion";
import { useRef, useState, useEffect, useCallback } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Icons8StyleIcon } from "@/components/ui/animated-icons";

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

const trustedBrands = [
  "تيك إنوفيشن", "سمارت سولوشنز", "ديجيتال ويف", "كلاسيرا للتعليم", "نيوم تكنولوجي", "فيوتشر بيلد"
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
      <div className="glass-card shadow-2xl overflow-hidden relative border border-border/80 rounded-3xl">
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
                setIsVideoActive(false);
              }}
              className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {activeTab === tab.id && (
                <motion.div layoutId="activeTab" className="absolute bottom-0 inset-x-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6 min-h-[340px] flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {activeTab === "dashboard" && (
              <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "إجمالي الوظائف", val: "12", change: "+2 هذا الأسبوع", icon: Briefcase, color: "primary" },
                    { label: "المرشحون", val: "148", change: "+24 هذا الأسبوع", icon: Users, color: "accent" },
                    { label: "مقابلات اليوم", val: "5", change: "3 قادمة", icon: Calendar, color: "warning" },
                    { label: "معدل التوظيف", val: "94%", change: "+5% من الفرز الذكي", icon: TrendingUp, color: "success" },
                  ].map((stat, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="bg-muted/30 border border-border/60 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground font-bold">{stat.label}</span>
                        <stat.icon className={`w-4 h-4 text-${stat.color}`} />
                      </div>
                      <div className="text-2xl font-black text-foreground">{stat.val}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">{stat.change}</div>
                    </motion.div>
                  ))}
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
                        className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0"
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
                          className="text-xs font-medium bg-primary/10 text-primary px-3 py-1.5 rounded-lg border border-primary/15 min-w-[70px] text-center"
                        >
                          {c.stage}
                        </motion.span>
                      </div>
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
                      <div className="font-bold text-sm text-foreground">تقييم الذكاء الاصطناعي المباشر</div>
                      <div className="text-xs text-muted-foreground">تحليل شامل ومستخرج لمهارات المرشح</div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {[
                      { label: "المهارات التقنية", value: 96 },
                      { label: "سنوات الخبرة", value: 88 },
                      { label: "التوافق التنظيمي والمالي", value: 82 },
                      { label: "مهارات التواصل الفعال", value: 90 },
                    ].map((skill, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="text-foreground font-medium">{skill.label}</span>
                          <span className="text-primary font-bold">{skill.value}%</span>
                        </div>
                        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-primary"
                            initial={{ width: 0 }}
                            animate={{ width: `${skill.value}%` }}
                            transition={{ delay: 0.2 + i * 0.15, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "interviews" && (
              <motion.div key="interviews" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
                <div className="space-y-3">
                  {[
                    { name: "أحمد محمد", time: "10:00 ص", type: "فيديو", status: "قادمة" },
                    { name: "سارة علي", time: "11:30 ص", type: "تقني", status: "نشطة الآن" },
                    { name: "خالد حسن", time: "02:00 م", type: "نهائية", status: "قادمة" },
                  ].map((interview, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-card border border-border rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary">
                          {interview.name[0]}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-foreground">{interview.name}</div>
                          <div className="text-xs text-muted-foreground">{interview.type} • {interview.time}</div>
                        </div>
                      </div>
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                        {interview.status}
                      </span>
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

/* ─── Hero Dashboard Mockup Card ─── */
function HeroDashboardMockup() {
  const [activeCandidateIndex, setActiveCandidateIndex] = useState(0);
  const candidates = [
    { name: "سارة عبد الرحمن", role: "مطور واجهات React", score: 96, match: "تطابق ممتاز", skills: ["React", "TailwindCSS", "TypeScript"] },
    { name: "أحمد علي الطيار", role: "مهندس بيانات سحابية", score: 88, match: "تطابق قوي", skills: ["Python", "SQL", "Docker"] },
    { name: "خالد بن الوليد", role: "مدير مشاريع تقنية", score: 79, match: "تطابق جيد", skills: ["Agile", "Jira", "Scrum"] }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveCandidateIndex((prev) => (prev + 1) % candidates.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const activeCandidate = candidates[activeCandidateIndex];

  return (
    <div className="relative">
      {/* Floating Badges Around Mockup */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.6 }}
        className="absolute -top-6 -right-6 z-20 hidden sm:flex items-center gap-2 bg-card/90 backdrop-blur-md border border-border p-3 rounded-2xl shadow-xl"
      >
        <Icons8StyleIcon icon={FileText} size="sm" gradient="from-blue-500/20 to-indigo-500/10" iconColor="text-blue-500" />
        <div>
          <div className="text-[11px] font-bold text-foreground">مستندات PDF / Word</div>
          <div className="text-[9px] text-muted-foreground">استخراج فوري لبيانات السيرة</div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.8 }}
        className="absolute -bottom-6 -left-6 z-20 hidden sm:flex items-center gap-2 bg-card/90 backdrop-blur-md border border-border p-3 rounded-2xl shadow-xl"
      >
        <Icons8StyleIcon icon={Video} size="sm" gradient="from-emerald-500/20 to-teal-500/10" iconColor="text-emerald-500" />
        <div>
          <div className="text-[11px] font-bold text-foreground">مقابلة فيديو HD</div>
          <div className="text-[9px] text-muted-foreground">تسجيل ونسخ نصي تلقائي</div>
        </div>
      </motion.div>

      {/* Main Glass Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="glass-card relative overflow-hidden p-6 rounded-3xl border border-border/80 shadow-2xl w-full max-w-md mx-auto bg-card/80 backdrop-blur-xl"
      >
        <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" />
        
        {/* Top Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-border/50 mb-5">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-destructive/60" />
            <div className="w-3 h-3 rounded-full bg-warning/60" />
            <div className="w-3 h-3 rounded-full bg-success/60" />
          </div>
          <div className="text-[11px] font-bold text-muted-foreground bg-muted/40 px-3 py-1 rounded-full flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            AI نتائج السير الذاتية نشط
          </div>
        </div>

        {/* Main Candidate Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCandidateIndex}
            initial={{ opacity: 0, x: -10, y: 5 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 10, y: -5 }}
            transition={{ duration: 0.4 }}
            className="space-y-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center font-bold text-primary text-base border border-primary/20">
                  {activeCandidate.name[0]}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground text-right">{activeCandidate.name}</h4>
                  <p className="text-xs text-muted-foreground text-right mt-0.5">{activeCandidate.role}</p>
                </div>
              </div>
              
              <div className="text-left">
                <div className="text-2xl font-black text-primary leading-none">{activeCandidate.score}%</div>
                <div className="text-[9px] font-bold text-muted-foreground mt-1">{activeCandidate.match}</div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>درجة الملاءمة والمطابقة</span>
                <span className="font-bold text-foreground">{activeCandidate.score}%</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${activeCandidate.score}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="h-full bg-primary rounded-full"
                />
              </div>
            </div>

            <div className="pt-2">
              <p className="text-[10px] font-bold text-muted-foreground text-right mb-2">المهارات المستخرجة بالـ AI:</p>
              <div className="flex flex-wrap gap-1.5 justify-end">
                {activeCandidate.skills.map((skill) => (
                  <span
                    key={skill}
                    className="text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-md"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="mt-5 pt-4 border-t border-border/50 grid grid-cols-3 gap-3 text-center text-xs">
          <div className="bg-muted/20 p-2.5 rounded-xl border border-border/30">
            <div className="text-[10px] text-muted-foreground">المطابقة</div>
            <div className="font-bold text-foreground mt-1">تلقائية</div>
          </div>
          <div className="bg-muted/20 p-2.5 rounded-xl border border-border/30">
            <div className="text-[10px] text-muted-foreground">سرعة التحليل</div>
            <div className="font-bold text-emerald-500 mt-1">1.8s</div>
          </div>
          <div className="bg-muted/20 p-2.5 rounded-xl border border-border/30">
            <div className="text-[10px] text-muted-foreground">الأمان</div>
            <div className="font-bold text-primary mt-1">E2E نشط</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function LandingPage() {
  const { theme, setTheme } = useTheme();
  const heroRef = useRef<HTMLElement>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
          <div className="bg-background/80 backdrop-blur-2xl border border-border/80 rounded-full px-6 h-16 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2.5">
              <img src={tawzeefLogo} alt="Tawzeef-X" className="w-7 h-7 object-contain" />
              <span className="text-base font-black text-foreground">
                Tawzeef-<span className="text-primary">X</span>
              </span>
            </div>
            <div className="hidden md:flex items-center gap-7 text-[13px] text-muted-foreground font-bold">
              <a href="#features" className="hover:text-foreground transition-colors">المميزات</a>
              <a href="#how-it-works" className="hover:text-foreground transition-colors">كيف تعمل</a>
              <a href="#testimonials" className="hover:text-foreground transition-colors">آراء العملاء</a>
              <Link to="/portal" className="hover:text-foreground transition-colors">بوابة المرشح</Link>
              <Link to="/install" className="hover:text-foreground transition-colors">تثبيت التطبيق</Link>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="w-9 h-9 rounded-full border border-border bg-card flex items-center justify-center text-foreground mr-1"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="w-4 h-4 text-warning" /> : <Moon className="w-4 h-4" />}
              </button>

              <Link to="/auth?mode=login">
                <Button variant="ghost" size="sm" className="text-xs font-bold h-9 px-4 rounded-full text-muted-foreground hover:text-foreground">تسجيل الدخول</Button>
              </Link>
              <Link to="/auth?mode=signup">
                <Button size="sm" className="text-xs font-bold h-9 px-5 bg-primary text-primary-foreground rounded-full shadow-sm hover:opacity-90">ابدأ مجاناً</Button>
              </Link>
            </div>
            
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex md:hidden items-center justify-center w-9 h-9 rounded-full border border-border bg-card"
            >
              {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section ref={heroRef} className="relative pt-32 lg:pt-40 pb-20 overflow-hidden min-h-[90vh] flex flex-col justify-center bg-gradient-to-b from-background via-background/95 to-muted/20">
        
        {/* Glow light accents */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-accent/10 blur-[120px] pointer-events-none" />

        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Right Column: Copy text & Action buttons */}
            <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-right">
              
              <div className="inline-flex items-center gap-2.5 rounded-full px-5 py-2.5 text-xs font-bold mb-6 border border-primary/20 bg-primary/10 text-primary shadow-xs">
                <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                منصة توظيف متكاملة مدعومة بالذكاء الاصطناعي
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight text-foreground tracking-tight">
                وظّف أفضل الكفاءات <br />
                <span className="text-primary">بذكاء وسرعة فائقة</span>
              </h1>

              <p className="text-base sm:text-lg text-muted-foreground mt-6 max-w-2xl leading-relaxed font-medium">
                فلترة ذكية ومؤتمتة للسير الذاتية بالذكاء الاصطناعي، مقابلات فيديو مدمجة بنسخ تلقائي، وإدارة كاملة للعروض الوظيفية مع تشفير تام للبيانات الحساسة.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 mt-8 w-full sm:w-auto">
                <Link to="/auth?mode=signup" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto h-13 px-8 text-sm font-bold rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-90 gap-2">
                    <span>ابدأ الآن مجاناً</span>
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                </Link>

                <Link to="/careers" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto h-13 px-7 text-sm font-bold rounded-2xl border-border/80 gap-2">
                    <Briefcase className="w-4 h-4 text-muted-foreground" />
                    <span>تصفح بوابة الوظائف</span>
                  </Button>
                </Link>
              </div>

              {/* Real-time Metrics Bar */}
              <div className="grid grid-cols-3 gap-4 mt-10 pt-8 border-t border-border/60 w-full max-w-xl text-right">
                <div>
                  <div className="text-2xl font-black text-foreground">+10,000</div>
                  <div className="text-xs text-muted-foreground font-bold mt-0.5">سيرة مفروزة بالـ AI</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-primary">99.8%</div>
                  <div className="text-xs text-muted-foreground font-bold mt-0.5">دقة المطابقة الذكية</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-emerald-500">1.8s</div>
                  <div className="text-xs text-muted-foreground font-bold mt-0.5">متوسط سرعة الفرز</div>
                </div>
              </div>
            </div>

            {/* Left Column: Interactive Candidate Matcher Mockup */}
            <div className="lg:col-span-5">
              <HeroDashboardMockup />
            </div>
          </div>
        </div>

        {/* Trusted Partners Ticker Bar */}
        <div className="mt-16 border-y border-border/60 bg-muted/20 py-6 overflow-hidden">
          <div className="container mx-auto px-6 text-center">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">
              تثق بنا أبرز الشركات والمنظمات
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-14 opacity-70">
              {trustedBrands.map((brand, i) => (
                <span key={i} className="text-sm font-black text-foreground/80 tracking-wide hover:opacity-100 transition-opacity">
                  {brand}
                </span>
              ))}
            </div>
          </div>
        </div>

      </section>

      {/* Interactive Platform Demo */}
      <section id="features" className="py-20 bg-card">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-black text-foreground">تجربة حية لمنظومة التوظيف المتكاملة</h2>
            <p className="text-sm text-muted-foreground mt-3">استكشف لوحة التحكم المتقدمة، الفرز الآلي للمرشحين، وغرف المقابلات الذكية</p>
          </div>
          <InteractiveDemo />
        </div>
      </section>
    </div>
  );
}
