import { useMemo, useState } from "react";
import {
  ArrowUpLeft,
  ArrowUpRight,
  Bell,
  Building2,
  Calendar,
  CheckCircle2,
  Code2,
  Globe,
  Linkedin,
  Mail,
  MessageSquare,
  QrCode,
  Search,
  ShieldCheck,
  Store,
  Webhook,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/contexts/I18nContext";
import { toast } from "@/hooks/use-toast";
import { loadDeveloperApiKeys } from "@/lib/developerApiEngine";
import type { SettingsTabId } from "./settingsTabs";
import { cn } from "@/lib/utils";

type MarketplaceCategory = "all" | "communication" | "sourcing" | "enterprise" | "developer";

interface MarketplacePlugin {
  id: string;
  nameAr: string;
  nameEn: string;
  descAr: string;
  descEn: string;
  category: Exclude<MarketplaceCategory, "all">;
  icon: typeof Store;
  targetTab?: SettingsTabId;
  toggleable?: boolean;
  defaultEnabled?: boolean;
  badgeAr?: string;
  badgeEn?: string;
}

const MARKETPLACE_STORAGE_KEY = "tx_marketplace_plugins_v1";

function loadPluginOverrides(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(MARKETPLACE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

const MARKETPLACE_CATALOG: MarketplacePlugin[] = [
  {
    id: "slack-teams",
    nameAr: "Slack و Microsoft Teams",
    nameEn: "Slack & Microsoft Teams",
    descAr: "إرسال تنبيهات لحظية للفرق ببطاقات تفاعلية عند وصول مرشح مميز أو حجز مقابلة.",
    descEn: "Instant interactive Block Kit & Adaptive Card alerts on new top candidates and interviews.",
    category: "communication",
    icon: Webhook,
    targetTab: "webhooks",
    badgeAr: "مدمج",
    badgeEn: "Built-in",
  },
  {
    id: "email-smtp",
    nameAr: "البريد الإلكتروني و SMTP المخصص",
    nameEn: "Custom SMTP & Email Relay",
    descAr: "ربط بريد منشأتك الرسمي لإرسال دعوات المقابلات وعروض العمل بهوية الشركة.",
    descEn: "Send interview invites and digital offers from your company domain.",
    category: "communication",
    icon: Mail,
    targetTab: "email",
    badgeAr: "أساسي",
    badgeEn: "Core",
  },
  {
    id: "whatsapp-alerts",
    nameAr: "إشعارات واتساب للأعمال",
    nameEn: "WhatsApp Business Alerts",
    descAr: "تأكيد مواعيد المقابلات وتذكير المرشحين تلقائياً عبر قوالب واتساب المعتمدة.",
    descEn: "Automated interview reminders and candidate updates via WhatsApp templates.",
    category: "communication",
    icon: MessageSquare,
    targetTab: "templates",
    toggleable: true,
    defaultEnabled: true,
  },
  {
    id: "linkedin-sourcing",
    nameAr: "تكامل LinkedIn واستقطاب المواهب",
    nameEn: "LinkedIn Recruiting Integration",
    descAr: "نشر الوظائف الشاغرة واستيراد ملفات المرشحين مباشرة من LinkedIn.",
    descEn: "Publish openings and import candidate profiles directly from LinkedIn.",
    category: "sourcing",
    icon: Linkedin,
    targetTab: "linkedin",
  },
  {
    id: "google-jobs-feeds",
    nameAr: "خلاصات Google Jobs و Indeed و Bayt",
    nameEn: "Google Jobs, Indeed & Bayt XML Feeds",
    descAr: "توليد تلقائي لخلاصات XML وبيانات JobPosting المنظمة لزيادة الظهور المجاني للوظائف.",
    descEn: "Automatic XML feeds and structured JobPosting schema for organic job reach.",
    category: "sourcing",
    icon: Globe,
    toggleable: true,
    defaultEnabled: true,
    badgeAr: "مفعّل تلقائياً",
    badgeEn: "Auto-active",
  },
  {
    id: "qr-event-checkin",
    nameAr: "تقديم معارض التوظيف عبر QR",
    nameEn: "Career Fair QR Check-In",
    descAr: "تسجيل فوري للمرشحين بالمسح الضوئي مع دعم العمل دون إنترنت والمزامنة اللاحقة.",
    descEn: "Instant QR candidate capture at career fairs with offline sync support.",
    category: "sourcing",
    icon: QrCode,
    toggleable: true,
    defaultEnabled: true,
  },
  {
    id: "sap-oracle-hris",
    nameAr: "أنظمة HRIS (SAP SuccessFactors & Oracle HCM)",
    nameEn: "SAP SuccessFactors & Oracle HCM",
    descAr: "مزامنة بيانات الموظفين الجدد تلقائياً عند توقيع العرض الوظيفي.",
    descEn: "Sync newly hired candidates automatically into SAP or Oracle HRIS upon offer acceptance.",
    category: "enterprise",
    icon: Building2,
    targetTab: "hris",
    badgeAr: "للمؤسسات",
    badgeEn: "Enterprise",
  },
  {
    id: "calendar-ics-sync",
    nameAr: "مزامنة التقويم (Google / Outlook / ICS)",
    nameEn: "Calendar Sync (Google / Outlook / ICS)",
    descAr: "إرسال دعوات تقويم موحدة مع تذكير آلي ودعم التقويم الهجري والميلادي.",
    descEn: "Unified calendar invites with automated reminders and Hijri/Gregorian dates.",
    category: "enterprise",
    icon: Calendar,
    targetTab: "regional",
    toggleable: true,
    defaultEnabled: true,
  },
  {
    id: "etec-compliance-check",
    nameAr: "التحقق من الرخص المهنية والامتثال (ETEC / PDPL)",
    nameEn: "ETEC License & PDPL Compliance Guard",
    descAr: "تنبيهات انتهاء الرخص المهنية وسياسات الإخفاء التلقائي لبيانات المرشحين.",
    descEn: "Professional license expiry alerts and PDPL automated data retention controls.",
    category: "enterprise",
    icon: ShieldCheck,
    targetTab: "security",
    toggleable: true,
    defaultEnabled: true,
  },
  {
    id: "public-api-sdk",
    nameAr: "بوابة المطورين (OpenAPI 3.1 و SDK)",
    nameEn: "Public Developer API & SDKs",
    descAr: "مفاتيح وصول مقيدة بالصلاحيات ومكتبات TypeScript و Python للربط المخصص.",
    descEn: "Scoped API keys and TypeScript/Python SDK snippets for custom workflows.",
    category: "developer",
    icon: Code2,
    targetTab: "api",
    badgeAr: "OpenAPI 3.1",
    badgeEn: "OpenAPI 3.1",
  },
  {
    id: "web-push-notifications",
    nameAr: "إشعارات المتصفح الفورية (Web Push)",
    nameEn: "Browser Web Push Notifications",
    descAr: "استقبال تنبيهات التوظيف العاجلة مباشرة على سطح المكتب والجوال.",
    descEn: "Receive instant recruitment alerts directly on desktop and mobile browsers.",
    category: "developer",
    icon: Bell,
    targetTab: "notifications",
  },
];

interface IntegrationsMarketplaceHubProps {
  onNavigateTab?: (tabId: SettingsTabId) => void;
}

export function IntegrationsMarketplaceHub({ onNavigateTab }: IntegrationsMarketplaceHubProps) {
  const { locale } = useI18n();
  const isAr = locale !== "en";
  const [category, setCategory] = useState<MarketplaceCategory>("all");
  const [query, setQuery] = useState("");
  const [overrides, setOverrides] = useState<Record<string, boolean>>(() => loadPluginOverrides());

  const activeApiKeysCount = useMemo(() => {
    try {
      return loadDeveloperApiKeys().filter((k) => k.status === "active").length;
    } catch {
      return 0;
    }
  }, []);

  const isPluginActive = (plugin: MarketplacePlugin): boolean => {
    if (plugin.id in overrides) return overrides[plugin.id];
    if (plugin.id === "public-api-sdk") return activeApiKeysCount > 0;
    if (plugin.id === "slack-teams" && typeof window !== "undefined") {
      return Boolean(localStorage.getItem("tx_slack_teams_webhooks_v1"));
    }
    if (plugin.id === "sap-oracle-hris" && typeof window !== "undefined") {
      return Boolean(localStorage.getItem("tx_enterprise_hris_config_v1"));
    }
    return Boolean(plugin.defaultEnabled);
  };

  const handleTogglePlugin = (plugin: MarketplacePlugin, checked: boolean) => {
    const next = { ...overrides, [plugin.id]: checked };
    setOverrides(next);
    try {
      localStorage.setItem(MARKETPLACE_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
    toast({
      title: checked
        ? isAr
          ? `تم تفعيل إضافة ${plugin.nameAr}`
          : `${plugin.nameEn} enabled`
        : isAr
        ? `تم إيقاف إضافة ${plugin.nameAr}`
        : `${plugin.nameEn} paused`,
    });
  };

  const categories: Array<{ id: MarketplaceCategory; label: string }> = [
    { id: "all", label: isAr ? "الكل" : "All" },
    { id: "communication", label: isAr ? "التواصل والرسائل" : "Communication" },
    { id: "sourcing", label: isAr ? "الاستقطاب ونشر الوظائف" : "Sourcing & Feeds" },
    { id: "enterprise", label: isAr ? "المؤسسات والامتثال" : "Enterprise & HRIS" },
    { id: "developer", label: isAr ? "المطورون والـ API" : "Developers & API" },
  ];

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredPlugins = MARKETPLACE_CATALOG.filter((p) => {
    if (category !== "all" && p.category !== category) return false;
    if (!normalizedQuery) return true;
    const haystack = `${p.nameAr} ${p.nameEn} ${p.descAr} ${p.descEn}`.toLocaleLowerCase();
    return haystack.includes(normalizedQuery);
  });

  const activeCount = MARKETPLACE_CATALOG.filter(isPluginActive).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Store className="w-5 h-5 text-primary" />
            {isAr ? "متجر الإضافات والتكاملات" : "Integrations & Plugins Marketplace"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isAr
              ? "إدارة مركزية لجميع تكاملات التوظيف، قنوات التواصل، أنظمة الموارد البشرية، وواجهات المطورين."
              : "Centralized hub for recruitment integrations, team notifications, enterprise HRIS, and developer APIs."}
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5 py-1 px-3 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/5">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>
            {isAr
              ? `${activeCount} من ${MARKETPLACE_CATALOG.length} إضافة نشطة`
              : `${activeCount} of ${MARKETPLACE_CATALOG.length} active`}
          </span>
        </Badge>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-bold transition-all",
                category === cat.id
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="relative sm:w-60">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isAr ? "ابحث في التكاملات..." : "Search plugins..."}
            className="h-9 ps-8 text-xs"
          />
        </div>
      </div>

      {/* Plugin Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredPlugins.map((plugin) => {
          const Icon = plugin.icon;
          const active = isPluginActive(plugin);
          return (
            <div
              key={plugin.id}
              className={cn(
                "rounded-xl border p-4 flex flex-col justify-between gap-4 transition-all bg-card",
                active ? "border-primary/30 shadow-xs" : "border-border/60 hover:border-border",
              )}
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                        active
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-foreground truncate">
                        {isAr ? plugin.nameAr : plugin.nameEn}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge
                          variant={active ? "default" : "secondary"}
                          className={cn(
                            "text-[10px] px-2 py-0",
                            active && "bg-emerald-600 hover:bg-emerald-600 text-white",
                          )}
                        >
                          {active
                            ? isAr
                              ? "مفعّل"
                              : "Active"
                            : isAr
                            ? "جاهز للإعداد"
                            : "Ready"}
                        </Badge>
                        {(plugin.badgeAr || plugin.badgeEn) && (
                          <Badge variant="outline" className="text-[10px] px-2 py-0">
                            {isAr ? plugin.badgeAr : plugin.badgeEn}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {plugin.toggleable && (
                    <Switch
                      aria-label={isAr ? `تفعيل ${plugin.nameAr}` : `Toggle ${plugin.nameEn}`}
                      checked={active}
                      onCheckedChange={(checked) => handleTogglePlugin(plugin, checked)}
                    />
                  )}
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {isAr ? plugin.descAr : plugin.descEn}
                </p>
              </div>

              {plugin.targetTab && onNavigateTab && (
                <div className="pt-2 border-t border-border/50 flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => onNavigateTab(plugin.targetTab!)}
                    className="h-8 text-xs font-bold text-primary hover:text-primary hover:bg-primary/10 gap-1"
                  >
                    <span>{isAr ? "فتح الإعدادات" : "Configure"}</span>
                    {isAr ? <ArrowUpLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredPlugins.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
          {isAr ? "لا توجد إضافات مطابقة للبحث الحالي." : "No plugins match your current search."}
        </div>
      )}
    </div>
  );
}

export default IntegrationsMarketplaceHub;
