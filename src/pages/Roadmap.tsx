
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { generateRoadmapPdf } from "@/lib/roadmapPdf";
import { useI18n } from "@/contexts/I18nContext";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CheckCircle2, Circle, Clock, Rocket, Shield, Brain, Building2, Globe,
  Wrench, ChevronDown, ChevronUp, Zap, TrendingUp, Target, Star, Bell,
  Mail, FileQuestion, Lock, Sparkles, Link2, Users, BarChart3,
  Building, KeyRound, Cog, Smartphone, Scale, LineChart, Store, Languages,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface TaskItem {
  key: string;
  title: string;
  titleEn: string;
  defaultDone: boolean;
  icon: React.ElementType;
}

interface SubSection {
  title: string;
  titleEn: string;
  icon: React.ElementType;
  tasks: TaskItem[];
}

interface Phase {
  id: string;
  title: string;
  titleEn: string;
  subtitle: string;
  subtitleEn: string;
  icon: React.ElementType;
  color: string;
  badgeColor: string;
  timeline: string;
  timelineEn: string;
  startDate: string;
  endDate: string;
  sections: SubSection[];
}

const phases: Phase[] = [
  {
    id: "phase1",
    title: "المرحلة الأولى — الأساسيات",
    titleEn: "Phase 1 — Foundations",
    subtitle: "البنية التحتية الأساسية للنظام",
    subtitleEn: "Core system infrastructure",
    icon: Rocket,
    color: "from-emerald-500 to-green-600",
    badgeColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    timeline: "مكتملة ✅",
    timelineEn: "Completed ✅",
    startDate: "2025-06",
    endDate: "2026-03",
    sections: [
      {
        title: "المصادقة والأمان", titleEn: "Auth & Security", icon: Shield,
        tasks: [
          { key: "p1-auth-otp", title: "نظام مصادقة متعدد الأدوار مع OTP", titleEn: "Multi-role auth with OTP", defaultDone: true, icon: Shield },
          { key: "p1-roles", title: "نظام صلاحيات ديناميكي", titleEn: "Dynamic role permissions", defaultDone: true, icon: KeyRound },
          { key: "p1-audit", title: "سجل مراجعة أمني", titleEn: "Security audit log", defaultDone: true, icon: Lock },
        ],
      },
      {
        title: "إدارة التوظيف", titleEn: "Recruitment Management", icon: Users,
        tasks: [
          { key: "p1-jobs", title: "إدارة الوظائف (إنشاء، تعديل، نشر، أرشفة)", titleEn: "Job management (create, edit, publish, archive)", defaultDone: true, icon: Target },
          { key: "p1-candidates", title: "إدارة المرشحين مع تحليل السيرة الذاتية بالذكاء الاصطناعي", titleEn: "Candidate management with AI resume parsing", defaultDone: true, icon: Brain },
          { key: "p1-pipeline", title: "نظام مراحل التوظيف مع سحب وإفلات", titleEn: "Pipeline stages with drag & drop", defaultDone: true, icon: Cog },
          { key: "p1-interviews", title: "إدارة المقابلات مع حجز ذاتي وتذكيرات", titleEn: "Interview management with self-booking", defaultDone: true, icon: Clock },
          { key: "p1-offers", title: "العروض الوظيفية مع توقيع إلكتروني", titleEn: "Job offers with e-signature", defaultDone: true, icon: FileQuestion },
        ],
      },
      {
        title: "الميزات المتقدمة", titleEn: "Advanced Features", icon: Sparkles,
        tasks: [
          { key: "p1-ai-chat", title: "مساعد ذكاء اصطناعي (AI Chat)", titleEn: "AI Assistant (Chat)", defaultDone: true, icon: Brain },
          { key: "p1-assessments", title: "بنك أسئلة واختبارات تقييم مع تصحيح آلي", titleEn: "Question bank & assessments with auto-grading", defaultDone: true, icon: FileQuestion },
          { key: "p1-reports", title: "تقارير وإحصائيات متقدمة", titleEn: "Advanced reports & analytics", defaultDone: true, icon: BarChart3 },
          { key: "p1-webhooks", title: "تكامل Webhooks مع LinkedIn/Zapier", titleEn: "Webhook integration with LinkedIn/Zapier", defaultDone: true, icon: Link2 },
          { key: "p1-careers", title: "صفحة وظائف عامة مع SEO/OG", titleEn: "Public careers page with SEO/OG", defaultDone: true, icon: Globe },
          { key: "p1-i18n", title: "دعم ثنائي اللغة مع وضع داكن/فاتح", titleEn: "Bilingual support with dark/light mode", defaultDone: true, icon: Languages },
          { key: "p1-pwa", title: "تطبيق PWA قابل للتثبيت", titleEn: "Installable PWA", defaultDone: true, icon: Smartphone },
        ],
      },
    ],
  },
  {
    id: "phase2",
    title: "المرحلة الثانية — تحسينات الجودة",
    titleEn: "Phase 2 — Quality Improvements",
    subtitle: "تحسين تجربة المستخدم والأداء",
    subtitleEn: "UX improvements and performance",
    icon: Zap,
    color: "from-blue-500 to-indigo-600",
    badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    timeline: "Q2 2026",
    timelineEn: "Q2 2026",
    startDate: "2026-04",
    endDate: "2026-06",
    sections: [
      {
        title: "تحسين تجربة المستخدم", titleEn: "UX Improvements", icon: Sparkles,
        tasks: [
          { key: "p2-animations", title: "أنيميشن انتقالية بين الصفحات", titleEn: "Page transition animations", defaultDone: true, icon: Zap },
          { key: "p2-perf", title: "تحسين أداء التحميل الأولي", titleEn: "Optimize initial load performance", defaultDone: true, icon: TrendingUp },
          { key: "p2-compact", title: "وضع عرض مدمج للجداول", titleEn: "Compact table view mode", defaultDone: true, icon: Target },
          { key: "p2-mobile-nav", title: "تحسين التنقل في الهاتف المحمول", titleEn: "Improved mobile navigation", defaultDone: true, icon: Smartphone },
          { key: "p2-shortcuts", title: "اختصارات لوحة مفاتيح متقدمة", titleEn: "Advanced keyboard shortcuts", defaultDone: true, icon: Cog },
        ],
      },
      {
        title: "تحسين نظام البريد الإلكتروني", titleEn: "Email System Enhancement", icon: Mail,
        tasks: [
          { key: "p2-email-templates", title: "قوالب بريد قابلة للتخصيص", titleEn: "Customizable email templates", defaultDone: true, icon: Mail },
          { key: "p2-email-schedule", title: "جدولة إرسال البريد", titleEn: "Scheduled email sending", defaultDone: true, icon: Clock },
          { key: "p2-email-analytics", title: "إحصائيات شاملة للبريد", titleEn: "Comprehensive email analytics", defaultDone: true, icon: BarChart3 },
          { key: "p2-email-attach", title: "دعم المرفقات في البريد", titleEn: "Email attachment support", defaultDone: true, icon: Link2 },
        ],
      },
      {
        title: "تحسين نظام الاختبارات", titleEn: "Assessment System Enhancement", icon: FileQuestion,
        tasks: [
          { key: "p2-q-types", title: "أنواع أسئلة جديدة (سحب وإفلات، مطابقة)", titleEn: "New question types (drag & drop, matching)", defaultDone: false, icon: FileQuestion },
          { key: "p2-q-shared", title: "بنك أسئلة مشترك بين الفريق", titleEn: "Shared question bank across team", defaultDone: false, icon: Users },
          { key: "p2-q-analytics", title: "تقارير تحليلية متقدمة للاختبارات", titleEn: "Advanced assessment analytics", defaultDone: false, icon: BarChart3 },
          { key: "p2-proctor", title: "مراقبة الغش أساسي", titleEn: "Basic proctoring (tab change)", defaultDone: true, icon: Shield },
        ],
      },
      {
        title: "تحسين الأمان", titleEn: "Security Enhancement", icon: Lock,
        tasks: [
          { key: "p2-e2e", title: "تشفير البيانات الحساسة end-to-end", titleEn: "End-to-end encryption", defaultDone: false, icon: Lock },
          { key: "p2-sessions", title: "سجل جلسات تسجيل الدخول", titleEn: "Login session log", defaultDone: true, icon: Shield },
          { key: "p2-pw-policy", title: "سياسة كلمة مرور قابلة للتخصيص", titleEn: "Customizable password policy", defaultDone: true, icon: KeyRound },
          { key: "p2-suspicious", title: "تنبيهات أمنية عند تسجيل دخول مشبوه", titleEn: "Suspicious login alerts", defaultDone: true, icon: Shield },
        ],
      },
    ],
  },
  {
    id: "phase3",
    title: "المرحلة الثالثة — ميزات متقدمة",
    titleEn: "Phase 3 — Advanced Features",
    subtitle: "ذكاء اصطناعي متقدم وتكاملات",
    subtitleEn: "Advanced AI and integrations",
    icon: Brain,
    color: "from-purple-500 to-violet-600",
    badgeColor: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    timeline: "Q3 2026",
    timelineEn: "Q3 2026",
    startDate: "2026-07",
    endDate: "2026-09",
    sections: [
      {
        title: "ذكاء اصطناعي متقدم", titleEn: "Advanced AI", icon: Brain,
        tasks: [
          { key: "p3-video-ai", title: "تحليل فيديو المقابلات", titleEn: "Interview video analysis", defaultDone: false, icon: Brain },
          { key: "p3-q-gen", title: "توليد أسئلة مقابلة بناءً على السيرة", titleEn: "Resume-based interview questions", defaultDone: true, icon: Sparkles },
          { key: "p3-matching", title: "توصيات مرشحين ذكية", titleEn: "Smart candidate matching", defaultDone: false, icon: Star },
          { key: "p3-summarize", title: "ملخص تلقائي للمقابلات", titleEn: "Auto-summarize interviews", defaultDone: false, icon: FileQuestion },
          { key: "p3-predict", title: "تنبؤ بمعدل قبول العرض", titleEn: "Offer acceptance prediction", defaultDone: false, icon: TrendingUp },
        ],
      },
      {
        title: "تكاملات خارجية", titleEn: "External Integrations", icon: Link2,
        tasks: [
          { key: "p3-linkedin", title: "ربط مباشر مع LinkedIn Recruiter API", titleEn: "LinkedIn Recruiter API integration", defaultDone: false, icon: Link2 },
          { key: "p3-indeed", title: "ربط مع Indeed و Bayt.com", titleEn: "Indeed & Bayt.com integration", defaultDone: false, icon: Globe },
          { key: "p3-hr", title: "تكامل مع أنظمة HR", titleEn: "HR system integration (SAP, Oracle)", defaultDone: false, icon: Building },
          { key: "p3-slack", title: "تكامل مع Slack/Teams", titleEn: "Slack/Teams integration", defaultDone: false, icon: Zap },
          { key: "p3-calendar", title: "ربط مع Google Calendar و Outlook", titleEn: "Google Calendar & Outlook integration", defaultDone: false, icon: Clock },
        ],
      },
      {
        title: "بوابة مرشح متقدمة", titleEn: "Advanced Candidate Portal", icon: Users,
        tasks: [
          { key: "p3-chatbot", title: "دردشة ذكية للمرشحين", titleEn: "AI Chatbot for candidates", defaultDone: true, icon: Brain },
          { key: "p3-tracking", title: "تتبع حي لحالة الطلب", titleEn: "Live application tracking", defaultDone: true, icon: TrendingUp },
          { key: "p3-self-schedule", title: "إمكانية جدولة المقابلة ذاتياً", titleEn: "Self-schedule interviews", defaultDone: true, icon: Clock },
          { key: "p3-review", title: "تقييم الشركة من المرشح", titleEn: "Candidate company review", defaultDone: false, icon: Star },
          { key: "p3-sms", title: "إشعارات SMS للمرشحين", titleEn: "SMS notifications for candidates", defaultDone: false, icon: Smartphone },
        ],
      },
      {
        title: "تقارير متقدمة", titleEn: "Advanced Reports", icon: BarChart3,
        tasks: [
          { key: "p3-cost", title: "تقرير تكلفة التوظيف", titleEn: "Cost per Hire report", defaultDone: false, icon: BarChart3 },
          { key: "p3-ttf", title: "تقرير الوقت المستغرق للتوظيف", titleEn: "Time to Fill report", defaultDone: false, icon: Clock },
          { key: "p3-source", title: "تقرير مصادر التوظيف", titleEn: "Sourcing channels report", defaultDone: false, icon: TrendingUp },
          { key: "p3-export", title: "تصدير تقارير PDF/Excel مجدولة", titleEn: "Scheduled PDF/Excel export", defaultDone: true, icon: FileQuestion },
          { key: "p3-kpi", title: "لوحة مؤشرات KPI تنفيذية", titleEn: "Executive KPI dashboard", defaultDone: true, icon: Target },
        ],
      },
    ],
  },
  {
    id: "phase4",
    title: "المرحلة الرابعة — مؤسسية",
    titleEn: "Phase 4 — Enterprise",
    subtitle: "ميزات للمؤسسات الكبيرة",
    subtitleEn: "Enterprise-grade features",
    icon: Building2,
    color: "from-amber-500 to-orange-600",
    badgeColor: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    timeline: "Q4 2026",
    timelineEn: "Q4 2026",
    startDate: "2026-10",
    endDate: "2026-12",
    sections: [
      {
        title: "تعدد الشركات", titleEn: "Multi-tenancy", icon: Building2,
        tasks: [
          { key: "p4-isolation", title: "عزل بيانات كل شركة بالكامل", titleEn: "Full data isolation per tenant", defaultDone: false, icon: Shield },
          { key: "p4-super-admin", title: "لوحة إدارة مركزية", titleEn: "Super Admin dashboard", defaultDone: false, icon: Building },
          { key: "p4-branding", title: "إعدادات مخصصة لكل شركة", titleEn: "Custom branding per company", defaultDone: false, icon: Star },
          { key: "p4-billing", title: "فوترة منفصلة لكل شركة", titleEn: "Per-company billing", defaultDone: false, icon: BarChart3 },
        ],
      },
      {
        title: "نظام صلاحيات متقدم", titleEn: "Advanced Permissions", icon: KeyRound,
        tasks: [
          { key: "p4-field-perms", title: "صلاحيات على مستوى الحقول", titleEn: "Field-level permissions", defaultDone: false, icon: Lock },
          { key: "p4-dept-perms", title: "صلاحيات مخصصة لكل وظيفة/قسم", titleEn: "Per-job/department permissions", defaultDone: false, icon: KeyRound },
          { key: "p4-approvals", title: "سير عمل موافقات", titleEn: "Approval workflows", defaultDone: false, icon: Cog },
          { key: "p4-compliance", title: "تدقيق متقدم مع تقارير امتثال", titleEn: "Advanced audit with compliance", defaultDone: false, icon: Shield },
        ],
      },
      {
        title: "أتمتة متقدمة", titleEn: "Advanced Automation", icon: Cog,
        tasks: [
          { key: "p4-workflow", title: "محرر سير عمل مرئي", titleEn: "Visual workflow builder", defaultDone: true, icon: Cog },
          { key: "p4-multi-step", title: "أتمتة مشروطة متعددة الخطوات", titleEn: "Multi-step conditional automation", defaultDone: false, icon: Zap },
          { key: "p4-bulk", title: "إجراءات مجمّعة", titleEn: "Bulk actions", defaultDone: false, icon: Target },
          { key: "p4-smart-rules", title: "قواعد ذكية بناءً على أنماط البيانات", titleEn: "Data pattern-based smart rules", defaultDone: false, icon: Brain },
        ],
      },
      {
        title: "تطبيق الهاتف", titleEn: "Mobile App", icon: Smartphone,
        tasks: [
          { key: "p4-pwa-enhanced", title: "تطبيق PWA محسّن", titleEn: "Enhanced PWA app", defaultDone: true, icon: Smartphone },
          { key: "p4-push", title: "إشعارات Push", titleEn: "Push notifications", defaultDone: false, icon: Bell },
          { key: "p4-qr", title: "مسح QR للسير الذاتية", titleEn: "QR scan for resumes", defaultDone: false, icon: Target },
          { key: "p4-offline", title: "وضع عدم الاتصال", titleEn: "Offline mode", defaultDone: false, icon: Globe },
        ],
      },
    ],
  },
  {
    id: "phase5",
    title: "المرحلة الخامسة — التوسع",
    titleEn: "Phase 5 — Expansion",
    subtitle: "التوسع الإقليمي والامتثال العالمي",
    subtitleEn: "Regional expansion and global compliance",
    icon: Globe,
    color: "from-rose-500 to-pink-600",
    badgeColor: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
    timeline: "Q1 2027",
    timelineEn: "Q1 2027",
    startDate: "2027-01",
    endDate: "2027-03",
    sections: [
      {
        title: "الامتثال والأمان", titleEn: "Compliance & Security", icon: Scale,
        tasks: [
          { key: "p5-soc2", title: "امتثال SOC 2 Type II", titleEn: "SOC 2 Type II compliance", defaultDone: false, icon: Shield },
          { key: "p5-gdpr", title: "امتثال GDPR / نظام حماية البيانات السعودي", titleEn: "GDPR / Saudi data protection", defaultDone: false, icon: Scale },
          { key: "p5-compliance-reports", title: "تقارير امتثال تلقائية", titleEn: "Automated compliance reports", defaultDone: false, icon: BarChart3 },
          { key: "p5-retention", title: "حذف بيانات المرشح التلقائي", titleEn: "Auto data retention & deletion", defaultDone: false, icon: Lock },
        ],
      },
      {
        title: "تحليلات متقدمة", titleEn: "Advanced Analytics", icon: LineChart,
        tasks: [
          { key: "p5-bi", title: "لوحة BI مدمجة", titleEn: "Embedded BI dashboard", defaultDone: false, icon: LineChart },
          { key: "p5-trends", title: "تحليل اتجاهات سوق العمل", titleEn: "Labor market trend analysis", defaultDone: false, icon: TrendingUp },
          { key: "p5-benchmark", title: "مقارنة معيارية مع القطاع", titleEn: "Industry benchmarking", defaultDone: false, icon: BarChart3 },
          { key: "p5-forecast", title: "توقعات احتياجات التوظيف", titleEn: "Predictive hiring forecasts", defaultDone: false, icon: Brain },
        ],
      },
      {
        title: "سوق التكاملات", titleEn: "Integration Marketplace", icon: Store,
        tasks: [
          { key: "p5-marketplace", title: "متجر إضافات", titleEn: "Plugins Marketplace", defaultDone: false, icon: Store },
          { key: "p5-api", title: "API عامة موثقة للمطورين", titleEn: "Documented public API", defaultDone: false, icon: Link2 },
          { key: "p5-webhooks-adv", title: "Webhooks متقدمة مع إعادة المحاولة", titleEn: "Advanced webhooks with retries", defaultDone: true, icon: Zap },
          { key: "p5-sdk", title: "SDK للمطورين", titleEn: "Developer SDK", defaultDone: false, icon: Cog },
        ],
      },
      {
        title: "دعم اللغات والمناطق", titleEn: "Localization", icon: Languages,
        tasks: [
          { key: "p5-langs", title: "دعم اللغة الفرنسية والأردية", titleEn: "French and Urdu support", defaultDone: false, icon: Languages },
          { key: "p5-hijri", title: "تخصيص حسب المنطقة (تقويم هجري)", titleEn: "Regional customization (Hijri)", defaultDone: false, icon: Globe },
          { key: "p5-currency", title: "عملات متعددة مع تحويل آلي", titleEn: "Multi-currency with auto conversion", defaultDone: false, icon: BarChart3 },
          { key: "p5-contracts", title: "قوالب عقود حسب القوانين المحلية", titleEn: "Region-specific contract templates", defaultDone: false, icon: FileQuestion },
        ],
      },
    ],
  },
];

const maintenanceTaskItems: TaskItem[] = [
  { key: "maint-security", title: "مراجعة أمنية دورية", titleEn: "Periodic security audit", icon: Shield, defaultDone: false },
  { key: "maint-deps", title: "تحديث المكتبات والتبعيات", titleEn: "Update libraries & dependencies", icon: Cog, defaultDone: false },
  { key: "maint-db", title: "تحسين أداء قاعدة البيانات", titleEn: "Database performance optimization", icon: Zap, defaultDone: false },
  { key: "maint-tests", title: "اختبارات وحدة وتكامل شاملة (>80%)", titleEn: "Unit & integration tests (>80%)", icon: Target, defaultDone: false },
  { key: "maint-monitoring", title: "مراقبة وتنبيهات", titleEn: "Monitoring & alerting", icon: Bell, defaultDone: false },
  { key: "maint-docs", title: "توثيق API والمكونات", titleEn: "API & component documentation", icon: FileQuestion, defaultDone: false },
];

// Collect all task keys with their defaults
function getAllTasks(): TaskItem[] {
  const all = phases.flatMap(p => p.sections.flatMap(s => s.tasks));
  return [...all, ...maintenanceTaskItems];
}

function useRoadmapTasks() {
  const { user } = useAuth();
  const allTasks = useMemo(() => getAllTasks(), []);
  
  // Initialize from defaults
  const defaultState = useMemo(() => {
    const map: Record<string, boolean> = {};
    allTasks.forEach(t => { map[t.key] = t.defaultDone; });
    return map;
  }, [allTasks]);

  const [taskStates, setTaskStates] = useState<Record<string, boolean>>(defaultState);
  const [loaded, setLoaded] = useState(false);

  // Load from DB
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("roadmap_tasks" as any)
        .select("task_key, done")
        .eq("user_id", user.id);
      if (data && (data as any[]).length > 0) {
        const merged = { ...defaultState };
        (data as any[]).forEach((row: any) => { merged[row.task_key] = row.done; });
        setTaskStates(merged);
      }
      setLoaded(true);
    })();
  }, [user, defaultState]);

  const toggleTask = useCallback(async (key: string) => {
    if (!user) return;
    const newVal = !taskStates[key];
    setTaskStates(prev => ({ ...prev, [key]: newVal }));

    const { error } = await supabase
      .from("roadmap_tasks" as any)
      .upsert({ user_id: user.id, task_key: key, done: newVal, updated_at: new Date().toISOString() } as any, { onConflict: "user_id,task_key" });
    
    if (error) {
      setTaskStates(prev => ({ ...prev, [key]: !newVal }));
      toast({ title: "خطأ في حفظ التغيير", variant: "destructive" });
    }
  }, [user, taskStates]);

  return { taskStates, toggleTask, loaded };
}

// Timeline Chart Component
function TimelineChart({ isAr, taskStates }: { isAr: boolean; taskStates: Record<string, boolean> }) {
  const totalMonths = 22; // Jun 2025 to Mar 2027
  const startMonth = new Date(2025, 5); // Jun 2025
  
  function monthDiff(from: string): number {
    const [y, m] = from.split("-").map(Number);
    return (y - 2025) * 12 + (m - 1) - 5; // offset from Jun 2025
  }

  function getPhaseProgress(phase: Phase): number {
    const tasks = phase.sections.flatMap(s => s.tasks);
    const done = tasks.filter(t => taskStates[t.key] ?? t.defaultDone).length;
    return tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  }

  // Current month marker
  const now = new Date();
  const currentOffset = (now.getFullYear() - 2025) * 12 + now.getMonth() - 5;
  const currentPercent = Math.max(0, Math.min(100, (currentOffset / totalMonths) * 100));

  // Generate month labels
  const labels: { label: string; percent: number }[] = [];
  for (let i = 0; i <= totalMonths; i += 3) {
    const d = new Date(startMonth);
    d.setMonth(d.getMonth() + i);
    const label = `${d.toLocaleString(isAr ? "ar-SA" : "en-US", { month: "short" })} ${d.getFullYear()}`;
    labels.push({ label, percent: (i / totalMonths) * 100 });
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <LineChart className="w-5 h-5 text-primary" />
          {isAr ? "المخطط الزمني" : "Timeline Chart"}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="relative pt-2 pb-8">
          {/* Month labels */}
          <div className="relative h-6 mb-2">
            {labels.map((l, i) => (
              <span
                key={i}
                className="absolute text-[10px] text-muted-foreground -translate-x-1/2"
                style={{ left: `${l.percent}%` }}
              >
                {l.label}
              </span>
            ))}
          </div>

          {/* Main axis */}
          <div className="relative h-1 bg-border rounded-full mb-4">
            {/* Current date marker */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary border-2 border-background z-20 shadow-lg"
              style={{ left: `${currentPercent}%` }}
              title={isAr ? "اليوم" : "Today"}
            />
            {/* Month ticks */}
            {labels.map((l, i) => (
              <div
                key={i}
                className="absolute top-1/2 -translate-y-1/2 w-1 h-3 bg-border rounded-full"
                style={{ left: `${l.percent}%` }}
              />
            ))}
          </div>

          {/* Phase bars */}
          <div className="space-y-2">
            {phases.map(phase => {
              const startPct = (monthDiff(phase.startDate) / totalMonths) * 100;
              const endPct = ((monthDiff(phase.endDate) + 1) / totalMonths) * 100;
              const width = endPct - startPct;
              const progress = getPhaseProgress(phase);
              const Icon = phase.icon;

              return (
                <div key={phase.id} className="relative h-8">
                  {/* Background bar */}
                  <div
                    className="absolute top-0 h-full rounded-lg bg-muted/60 border border-border/40"
                    style={{ left: `${startPct}%`, width: `${width}%` }}
                  >
                    {/* Progress fill */}
                    <div
                      className={cn("h-full rounded-lg bg-gradient-to-r opacity-80 transition-all duration-500", phase.color)}
                      style={{ width: `${progress}%` }}
                    />
                    {/* Label */}
                    <div className="absolute inset-0 flex items-center gap-1.5 px-2 z-10">
                      <Icon className="w-3.5 h-3.5 text-foreground shrink-0" />
                      <span className="text-[11px] font-medium text-foreground truncate">
                        {isAr ? phase.title.split("—")[1]?.trim() : phase.titleEn.split("—")[1]?.trim()}
                      </span>
                      <span className="text-[10px] font-bold text-foreground/70 ms-auto shrink-0">
                        {progress}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PhaseCard({ phase, isAr, taskStates, onToggle }: { phase: Phase; isAr: boolean; taskStates: Record<string, boolean>; onToggle: (key: string) => void }) {
  const [expanded, setExpanded] = useState(phase.id === "phase1" || phase.id === "phase2");
  const allTasks = phase.sections.flatMap(s => s.tasks);
  const doneTasks = allTasks.filter(t => taskStates[t.key] ?? t.defaultDone).length;
  const progress = allTasks.length ? Math.round((doneTasks / allTasks.length) * 100) : 0;
  const Icon = phase.icon;

  return (
    <Card className="overflow-hidden border-border/50">
      <button className="w-full text-start" onClick={() => setExpanded(!expanded)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={cn("flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br text-white shrink-0", phase.color)}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-base font-bold truncate">{isAr ? phase.title : phase.titleEn}</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{isAr ? phase.subtitle : phase.subtitleEn}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge className={cn("text-xs font-medium", phase.badgeColor)}>{isAr ? phase.timeline : phase.timelineEn}</Badge>
              {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </div>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <Progress value={progress} className="flex-1 h-2" />
            <span className="text-xs font-semibold text-muted-foreground w-16 text-end">{doneTasks}/{allTasks.length} ({progress}%)</span>
          </div>
        </CardHeader>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
            <CardContent className="pt-0 space-y-4">
              {phase.sections.map((section, si) => {
                const SIcon = section.icon;
                return (
                  <div key={si} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <SIcon className="w-4 h-4 text-primary" />
                      <h4 className="text-sm font-semibold">{isAr ? section.title : section.titleEn}</h4>
                    </div>
                    <div className="grid gap-1.5 ps-6">
                      {section.tasks.map((task) => {
                        const isDone = taskStates[task.key] ?? task.defaultDone;
                        return (
                          <div
                            key={task.key}
                            className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded-md px-1 py-0.5 transition-colors"
                            onClick={(e) => { e.stopPropagation(); onToggle(task.key); }}
                          >
                            <Checkbox checked={isDone} className="shrink-0" onCheckedChange={() => onToggle(task.key)} onClick={(e) => e.stopPropagation()} />
                            <span className={cn(isDone ? "text-muted-foreground line-through" : "text-foreground")}>
                              {isAr ? task.title : task.titleEn}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

export default function Roadmap() {
  const { locale } = useI18n();
  const isAr = locale === "ar";
  const { taskStates, toggleTask } = useRoadmapTasks();

  const allTasks = useMemo(() => getAllTasks(), []);
  const done = allTasks.filter(t => taskStates[t.key] ?? t.defaultDone).length;
  const total = allTasks.length;
  const overallPercent = Math.round((done / total) * 100);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">{isAr ? "خطة تطوير النظام" : "Development Roadmap"}</h1>
            <p className="text-muted-foreground text-sm">
              {isAr ? "خارطة الطريق الشاملة لتطوير منصة توظيف-إكس عبر 5 مراحل استراتيجية" : "Comprehensive roadmap for Tawzeef-X across 5 strategic phases"}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 gap-2"
            onClick={() => {
              const pdfPhases = phases.map(p => ({
                title: isAr ? p.title : p.titleEn,
                timeline: isAr ? p.timeline : p.timelineEn,
                sections: p.sections.map(s => ({
                  title: isAr ? s.title : s.titleEn,
                  tasks: s.tasks.map(t => ({
                    title: isAr ? t.title : t.titleEn,
                    done: taskStates[t.key] ?? t.defaultDone,
                  })),
                })),
              }));
              const maint = maintenanceTaskItems.map(t => ({
                title: isAr ? t.title : t.titleEn,
                done: taskStates[t.key] ?? t.defaultDone,
              }));
              generateRoadmapPdf({
                phases: pdfPhases,
                maintenanceTasks: maint,
                locale,
                overallStats: { total, done, percent: overallPercent },
              });
            }}
          >
            <Download className="w-4 h-4" />
            {isAr ? "تصدير PDF" : "Export PDF"}
          </Button>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4">
            <div className="text-2xl font-bold text-primary">{total}</div>
            <div className="text-xs text-muted-foreground">{isAr ? "إجمالي المهام" : "Total Tasks"}</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-emerald-500">{done}</div>
            <div className="text-xs text-muted-foreground">{isAr ? "مهام مكتملة" : "Completed"}</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-amber-500">{total - done}</div>
            <div className="text-xs text-muted-foreground">{isAr ? "مهام متبقية" : "Remaining"}</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold">{overallPercent}%</div>
            <div className="text-xs text-muted-foreground">{isAr ? "نسبة الإنجاز" : "Progress"}</div>
            <Progress value={overallPercent} className="mt-2 h-1.5" />
          </Card>
        </div>

        {/* Timeline Chart */}
        <TimelineChart isAr={isAr} taskStates={taskStates} />

        {/* Phases */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="all">{isAr ? "الكل" : "All"}</TabsTrigger>
            {phases.map(p => (
              <TabsTrigger key={p.id} value={p.id} className="text-xs">
                {isAr ? p.title.split("—")[1]?.trim() : p.titleEn.split("—")[1]?.trim()}
              </TabsTrigger>
            ))}
            <TabsTrigger value="maintenance">{isAr ? "صيانة" : "Maintenance"}</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {phases.map(p => <PhaseCard key={p.id} phase={p} isAr={isAr} taskStates={taskStates} onToggle={toggleTask} />)}
          </TabsContent>

          {phases.map(p => (
            <TabsContent key={p.id} value={p.id}>
              <PhaseCard phase={p} isAr={isAr} taskStates={taskStates} onToggle={toggleTask} />
            </TabsContent>
          ))}

          <TabsContent value="maintenance">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-slate-500 to-gray-600 text-white">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{isAr ? "مهام صيانة مستمرة" : "Ongoing Maintenance Tasks"}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">{isAr ? "مهام دورية لضمان جودة واستقرار النظام" : "Periodic tasks for system quality and stability"}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {maintenanceTaskItems.map((task) => {
                  const isDone = taskStates[task.key] ?? task.defaultDone;
                  const TIcon = task.icon;
                  return (
                    <div
                      key={task.key}
                      className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded-md px-1 py-0.5 transition-colors"
                      onClick={() => toggleTask(task.key)}
                    >
                      <Checkbox checked={isDone} onCheckedChange={() => toggleTask(task.key)} onClick={(e) => e.stopPropagation()} />
                      <TIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className={cn(isDone ? "text-muted-foreground line-through" : "")}>
                        {isAr ? task.title : task.titleEn}
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
