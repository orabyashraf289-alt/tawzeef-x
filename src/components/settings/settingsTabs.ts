import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Bookmark,
  Building2,
  Crown,
  FileText,
  GitBranch,
  Globe,
  KeyRound,
  Layers,
  Linkedin,
  Mail,
  Palette,
  Shield,
  Target,
  User,
  Webhook,
  Code2,
} from "lucide-react";

export type SettingsTabId =
  | "public-contact"
  | "account"
  | "company"
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
  | "webhooks"
  | "hris"
  | "api";

export interface SettingsTabConfig {
  id: SettingsTabId;
  label: string;
  icon: LucideIcon;
}

export interface SettingsGroupConfig {
  title: string;
  ids: SettingsTabId[];
}

export function buildSettingsTabs({
  t,
  locale,
  isPlatformSuperAdmin,
}: {
  t: (key: string) => string;
  locale: string;
  isPlatformSuperAdmin: boolean;
}): SettingsTabConfig[] {
  return [
    ...(isPlatformSuperAdmin
      ? [
          {
            id: "public-contact" as const,
            label: locale === "en" ? "Website & contact" : "بيانات الموقع والتواصل",
            icon: Globe,
          },
        ]
      : []),
    { id: "account", label: t("settings.profile"), icon: User },
    { id: "company", label: "الشركة", icon: Building2 },
    {
      id: "subscription",
      label: locale === "en" ? "Subscription & Billing" : "الاشتراك والفواتير",
      icon: Crown,
    },
    {
      id: "preferences",
      label: locale === "en" ? "Preferences" : "تفضيلات المنصة",
      icon: Palette,
    },
    { id: "pipeline", label: "مراحل التوظيف", icon: GitBranch },
    { id: "taxonomy", label: "الأقسام والمواقع والخبرات", icon: Layers },
    { id: "filters", label: "الفلاتر المحفوظة", icon: Bookmark },
    { id: "security", label: t("settings.security"), icon: Shield },
    {
      id: "permissions_matrix",
      label: "مصفوفة الصلاحيات (قراءة/إدخال/تعديل/حذف)",
      icon: KeyRound,
    },
    { id: "goals", label: t("settings.hiringGoals"), icon: Target },
    { id: "notifications", label: t("settings.notifications"), icon: Bell },
    { id: "linkedin", label: t("settings.linkedin"), icon: Linkedin },
    { id: "email", label: t("settings.email"), icon: Mail },
    {
      id: "templates",
      label: locale === "en" ? "Message Automation" : "أتمتة وقوالب الرسائل",
      icon: FileText,
    },
    {
      id: "webhooks",
      label: locale === "en" ? "Slack, Teams & Webhooks" : "تكامل Slack وتيمز والـ Webhooks",
      icon: Webhook,
    },
    {
      id: "hris",
      label: locale === "en" ? "HRIS (SAP & Oracle)" : "أنظمة HR (SAP / Oracle)",
      icon: Building2,
    },
    {
      id: "api",
      label: locale === "en" ? "Developer API & SDK" : "بوابة المطورين والـ API",
      icon: Code2,
    },
  ];
}

export function buildSettingsGroups({
  locale,
  isPlatformSuperAdmin,
}: {
  locale: string;
  isPlatformSuperAdmin: boolean;
}): SettingsGroupConfig[] {
  return [
    ...(isPlatformSuperAdmin
      ? [
          {
            title: locale === "en" ? "Platform administration" : "إدارة توظيف إكس",
            ids: ["public-contact"] as SettingsTabId[],
          },
        ]
      : []),
    {
      title: locale === "en" ? "My account" : "حسابي",
      ids: ["account", "security", "preferences", "notifications", "filters"],
    },
    {
      title: locale === "en" ? "Company & recruitment" : "الشركة والتوظيف",
      ids: ["company", "pipeline", "taxonomy", "goals", "permissions_matrix"],
    },
    {
      title: locale === "en" ? "Messages & integrations" : "الرسائل والتكاملات",
      ids: ["email", "templates", "linkedin", "webhooks", "hris", "api"],
    },
    {
      title: locale === "en" ? "Billing" : "الفواتير",
      ids: ["subscription"],
    },
  ];
}
