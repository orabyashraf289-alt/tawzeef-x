import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Bookmark,
  Building2,
  Code2,
  Crown,
  FileText,
  GitBranch,
  Globe,
  Globe2,
  KeyRound,
  Layers,
  Linkedin,
  Mail,
  Network,
  Palette,
  Shield,
  Store,
  Target,
  User,
  Webhook,
} from "lucide-react";

export type SettingsTabId =
  | "public-contact"
  | "account"
  | "company"
  | "regional"
  | "subscription"
  | "preferences"
  | "pipeline"
  | "taxonomy"
  | "filters"
  | "security"
  | "permissions_matrix"
  | "goals"
  | "notifications"
  | "linkedin"
  | "email"
  | "templates"
  | "marketplace"
  | "webhooks"
  | "hris"
  | "api";

export type SettingsAccessLevel = "all" | "recruiter" | "admin" | "super_admin";

export interface SettingsTabConfig {
  id: SettingsTabId;
  label: string;
  description: string;
  keywords: string[];
  icon: LucideIcon;
  access?: SettingsAccessLevel;
}

export interface SettingsGroupConfig {
  id: string;
  title: string;
  ids: SettingsTabId[];
}

export function canAccessSettingsTab(
  access: SettingsAccessLevel | undefined,
  role: string | undefined,
  isPlatformSuperAdmin: boolean,
): boolean {
  if (!access || access === "all") return true;
  if (isPlatformSuperAdmin) return true;
  if (access === "super_admin") return false;
  if (access === "admin") return role === "admin";
  if (access === "recruiter") return role === "admin" || role === "recruiter";
  return true;
}

export function matchesSettingsQuery(tab: SettingsTabConfig, rawQuery: string): boolean {
  const q = rawQuery.trim().toLocaleLowerCase();
  if (!q) return true;
  if (tab.label.toLocaleLowerCase().includes(q)) return true;
  if (tab.description.toLocaleLowerCase().includes(q)) return true;
  return tab.keywords.some((kw) => kw.toLocaleLowerCase().includes(q));
}

export function buildSettingsTabs({
  t,
  locale,
  isPlatformSuperAdmin,
  role = "admin",
}: {
  t: (key: string) => string;
  locale: string;
  isPlatformSuperAdmin: boolean;
  role?: string;
}): SettingsTabConfig[] {
  const isEn = locale === "en";

  const allTabs: SettingsTabConfig[] = [
    {
      id: "public-contact",
      label: isEn ? "Website & Contact" : "بيانات الموقع والتواصل",
      description: isEn
        ? "Manage public contact channels and website footer details"
        : "إدارة قنوات التواصل العامة الظاهرة لزوار المنصة",
      keywords: ["website", "contact", "phone", "email", "footer", "تواصل", "الموقع", "الدعم"],
      icon: Globe,
      access: "super_admin",
    },
    {
      id: "account",
      label: t("settings.profile"),
      description: isEn
        ? "Personal details, login email, and profile picture"
        : "الاسم، صورة الحساب، وتحديث بريد تسجيل الدخول",
      keywords: ["profile", "account", "email", "avatar", "ملف", "حساب", "ايميل", "شخصي"],
      icon: User,
      access: "all",
    },
    {
      id: "preferences",
      label: isEn ? "Appearance & Language" : "المظهر واللغة والتفضيلات",
      description: isEn
        ? "Theme mode, brand accent color, interface language, and compact density"
        : "الوضع الفاتح والداكن، لون الهوية، اللغة، كثافة العرض، والاختصارات",
      keywords: ["theme", "dark", "light", "color", "language", "arabic", "english", "compact", "مظهر", "داكن", "فاتح", "لون", "لغة", "اختصارات"],
      icon: Palette,
      access: "all",
    },
    {
      id: "notifications",
      label: t("settings.notifications"),
      description: isEn
        ? "Browser web push alerts and instant recruitment notifications"
        : "تنبيهات المتصفح الفورية وإشعارات المراحل والمقابلات",
      keywords: ["push", "alerts", "notifications", "browser", "إشعارات", "تنبيهات", "متصفح"],
      icon: Bell,
      access: "all",
    },
    {
      id: "filters",
      label: isEn ? "Saved Filters" : "الفلاتر المحفوظة",
      description: isEn
        ? "Manage reusable candidate and job search presets"
        : "إدارة قوالب التصفية والبحث السريع للمرشحين والوظائف",
      keywords: ["filters", "saved", "search", "فلاتر", "تصفية", "بحث"],
      icon: Bookmark,
      access: "all",
    },
    {
      id: "company",
      label: isEn ? "Company Profile" : "هوية وبيانات الشركة",
      description: isEn
        ? "Company name, logo, career page branding, and organization info"
        : "اسم الشركة، الشعار، الهوية البصرية، وإعدادات بوابة التوظيف",
      keywords: ["company", "brand", "logo", "organization", "شركة", "شعار", "هوية", "منشأة"],
      icon: Building2,
      access: "recruiter",
    },
    {
      id: "regional",
      label: isEn ? "Regional (Hijri & Currency)" : "التخصيص الإقليمي (هجري والعملات)",
      description: isEn
        ? "Umm al-Qura Hijri calendar, multi-currency conversion, timezone, and workweek"
        : "تقويم أم القرى الهجري، تعدد العملات مع التحويل الآلي، والمنطقة الزمنية",
      keywords: ["hijri", "calendar", "currency", "sar", "usd", "aed", "timezone", "workweek", "هجري", "تقويم", "أم القرى", "عملة", "ريال", "تحويل", "توقيت"],
      icon: Globe2,
      access: "recruiter",
    },
    {
      id: "pipeline",
      label: isEn ? "Hiring Pipeline Stages" : "مراحل مسار التوظيف",
      description: isEn
        ? "Customize candidate pipeline columns, order, and stage labels"
        : "تخصيص مراحل الفرز والمقابلات والعروض وترتيب لوحة كانبان",
      keywords: ["pipeline", "kanban", "stages", "workflow", "مراحل", "كانبان", "مسار"],
      icon: GitBranch,
      access: "recruiter",
    },
    {
      id: "taxonomy",
      label: isEn ? "Departments & Locations" : "الأقسام والمواقع والخبرات",
      description: isEn
        ? "Maintain company departments, branches, and seniority lists"
        : "إدارة الأقسام، الفروع، المدن، ومستويات الخبرة الوظيفية",
      keywords: ["departments", "locations", "experience", "branches", "أقسام", "فروع", "مواقع", "خبرات"],
      icon: Layers,
      access: "recruiter",
    },
    {
      id: "goals",
      label: t("settings.hiringGoals"),
      description: isEn
        ? "Monthly and quarterly hiring targets and SLA benchmarks"
        : "تحديد مستهدفات التعيين الشهرية ومؤشرات سرعة التوظيف",
      keywords: ["goals", "targets", "kpi", "sla", "أهداف", "مستهدفات", "مؤشرات"],
      icon: Target,
      access: "recruiter",
    },
    {
      id: "security",
      label: t("settings.security"),
      description: isEn
        ? "Password policy, account security, and PDPL/GDPR data retention"
        : "كلمة المرور، سياسة كلمات المرور، والاحتفاظ بالبيانات (PDPL/GDPR)",
      keywords: ["security", "password", "pdpl", "gdpr", "retention", "anonymize", "أمان", "كلمة المرور", "احتفاظ", "خصوصية", "حذف"],
      icon: Shield,
      access: "all",
    },
    {
      id: "permissions_matrix",
      label: isEn ? "Permissions Matrix (RBAC)" : "مصفوفة الصلاحيات (RBAC)",
      description: isEn
        ? "Fine-grained read, create, update, and delete permissions per role"
        : "تخصيص صلاحيات القراءة والإدخال والتعديل والحذف لكل دور وظيفي",
      keywords: ["permissions", "rbac", "roles", "crud", "access", "صلاحيات", "أدوار", "مصفوفة"],
      icon: KeyRound,
      access: "admin",
    },
    {
      id: "email",
      label: t("settings.email"),
      description: isEn
        ? "Custom SMTP mail server configuration and sender verification"
        : "إعداد خادم SMTP المخصص وإرسال البريد بهوية منشأتك",
      keywords: ["email", "smtp", "mail", "sender", "بريد", "ايميل", "خادم"],
      icon: Mail,
      access: "recruiter",
    },
    {
      id: "templates",
      label: isEn ? "Message Automation" : "أتمتة وقوالب الرسائل",
      description: isEn
        ? "Email and WhatsApp candidate message templates and stage triggers"
        : "قوالب رسائل البريد وواتساب والإرسال الآلي عند تغيّر المراحل",
      keywords: ["templates", "automation", "whatsapp", "messages", "قوالب", "رسائل", "واتساب", "أتمتة"],
      icon: FileText,
      access: "recruiter",
    },
    {
      id: "marketplace",
      label: isEn ? "Integrations Marketplace" : "متجر الإضافات والتكاملات",
      description: isEn
        ? "Browse, enable, and manage all recruitment integrations from one hub"
        : "مركز موحّد لاستعراض وتفعيل وإدارة جميع تكاملات التوظيف والإضافات",
      keywords: ["marketplace", "plugins", "apps", "integrations", "متجر", "إضافات", "تكاملات", "ربط"],
      icon: Store,
      access: "recruiter",
    },
    {
      id: "webhooks",
      label: isEn ? "Slack, Teams & Webhooks" : "Slack و Teams و Webhooks",
      description: isEn
        ? "Real-time team channel alerts and event webhook endpoints"
        : "تنبيهات الفرق اللحظية في Slack و Microsoft Teams وروابط Webhooks",
      keywords: ["slack", "teams", "webhooks", "alerts", "سلاك", "تيمز", "ويب هوك"],
      icon: Webhook,
      access: "recruiter",
    },
    {
      id: "linkedin",
      label: t("settings.linkedin"),
      description: isEn
        ? "Connect LinkedIn Recruiter and job publishing workflows"
        : "ربط حساب LinkedIn لنشر الوظائف واستيراد المرشحين",
      keywords: ["linkedin", "sourcing", "jobs", "لينكدإن", "لينكد ان", "استقطاب"],
      icon: Linkedin,
      access: "recruiter",
    },
    {
      id: "hris",
      label: isEn ? "Enterprise HRIS (SAP / Oracle)" : "أنظمة HRIS (SAP / Oracle)",
      description: isEn
        ? "Sync hired employees with SAP SuccessFactors and Oracle HCM Cloud"
        : "مزامنة الموظفين الجدد مع SAP SuccessFactors و Oracle HCM Cloud",
      keywords: ["hris", "sap", "oracle", "erp", "sync", "سأب", "ساب", "أوراكل", "موارد بشرية"],
      icon: Network,
      access: "admin",
    },
    {
      id: "api",
      label: isEn ? "Developer API & SDK" : "بوابة المطورين والـ API",
      description: isEn
        ? "Scoped API keys, OpenAPI 3.1 docs, playground, and TypeScript/Python SDKs"
        : "مفاتيح الـ API المقيدة بالصلاحيات، OpenAPI 3.1، وبيئة التجربة والـ SDK",
      keywords: ["api", "sdk", "developer", "openapi", "rest", "keys", "مطورين", "مفاتيح", "برمجة"],
      icon: Code2,
      access: "admin",
    },
    {
      id: "subscription",
      label: isEn ? "Subscription & Billing" : "الاشتراك والفواتير",
      description: isEn
        ? "Active plan, usage quotas, upgrades, and billing history"
        : "الباقة الحالية، حدود الاستخدام، الترقية، وسجل الفواتير",
      keywords: ["billing", "subscription", "plan", "invoice", "payment", "اشتراك", "باقة", "فواتير", "دفع"],
      icon: Crown,
      access: "admin",
    },
  ];

  return allTabs.filter((tab) => canAccessSettingsTab(tab.access, role, isPlatformSuperAdmin));
}

export function buildSettingsGroups({
  locale,
  isPlatformSuperAdmin,
}: {
  locale: string;
  isPlatformSuperAdmin: boolean;
}): SettingsGroupConfig[] {
  const isEn = locale === "en";
  return [
    ...(isPlatformSuperAdmin
      ? [
          {
            id: "platform",
            title: isEn ? "Platform Administration" : "إدارة توظيف إكس",
            ids: ["public-contact"] as SettingsTabId[],
          },
        ]
      : []),
    {
      id: "account",
      title: isEn ? "My Account" : "حسابي وتفضيلاتي",
      ids: ["account", "preferences", "notifications", "filters"],
    },
    {
      id: "company",
      title: isEn ? "Company & Regional" : "الشركة والعمل الإقليمي",
      ids: ["company", "regional", "pipeline", "taxonomy", "goals"],
    },
    {
      id: "security",
      title: isEn ? "Security & Governance" : "الأمان والصلاحيات",
      ids: ["security", "permissions_matrix"],
    },
    {
      id: "messaging",
      title: isEn ? "Messaging & Automation" : "البريد وأتمتة الرسائل",
      ids: ["email", "templates"],
    },
    {
      id: "integrations",
      title: isEn ? "Marketplace & Developers" : "سوق التكاملات والمطورين",
      ids: ["marketplace", "webhooks", "linkedin", "hris", "api"],
    },
    {
      id: "billing",
      title: isEn ? "Billing" : "الاشتراك والفواتير",
      ids: ["subscription"],
    },
  ];
}
