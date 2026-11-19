import { lazy, Suspense, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Settings2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { SettingsReadinessBar } from "@/components/settings/SettingsReadinessBar";
import { SettingsSidebar } from "@/components/settings/SettingsSidebar";
import {
  buildSettingsGroups,
  buildSettingsTabs,
  type SettingsTabId,
} from "@/components/settings/settingsTabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/contexts/I18nContext";
import { useUserRole } from "@/hooks/useUserRole";

// Lazy-load every settings section so opening /settings only downloads the active tab.
const PublicContactSettings = lazy(() => import("@/components/PublicContactSettings"));
const CompanySettingsManager = lazy(() => import("@/components/CompanySettingsManager"));
const CompanyTaxonomyManager = lazy(() => import("@/components/CompanyTaxonomyManager"));
const EmailSettings = lazy(() => import("@/components/EmailSettings"));
const NotificationTemplatesSection = lazy(() => import("@/components/NotificationTemplatesSection"));
const PermissionsMatrixManager = lazy(() => import("@/components/PermissionsMatrixManager"));
const PipelineStagesManager = lazy(() => import("@/components/PipelineStagesManager"));
const SavedFiltersManager = lazy(() => import("@/components/SavedFiltersManager"));
const WebhookSettings = lazy(() => import("@/components/WebhookSettings"));
const EnterpriseHrisHub = lazy(() => import("@/components/settings/EnterpriseHrisHub"));
const DeveloperApiHub = lazy(() => import("@/components/settings/DeveloperApiHub"));
const RegionalSettingsSection = lazy(() => import("@/components/settings/RegionalSettingsSection"));
const IntegrationsMarketplaceHub = lazy(() => import("@/components/settings/IntegrationsMarketplaceHub"));
const AccountSettingsSection = lazy(() =>
  import("@/components/settings/AccountSettingsSection").then((m) => ({
    default: m.AccountSettingsSection,
  })),
);
const HiringGoalsSettingsSection = lazy(() =>
  import("@/components/settings/HiringGoalsSettingsSection").then((m) => ({
    default: m.HiringGoalsSettingsSection,
  })),
);
const LinkedInSettingsSection = lazy(() =>
  import("@/components/settings/LinkedInSettingsSection").then((m) => ({
    default: m.LinkedInSettingsSection,
  })),
);
const NotificationsSettingsSection = lazy(() =>
  import("@/components/settings/NotificationsSettingsSection").then((m) => ({
    default: m.NotificationsSettingsSection,
  })),
);
const PreferencesSettingsSection = lazy(() =>
  import("@/components/settings/PreferencesSettingsSection").then((m) => ({
    default: m.PreferencesSettingsSection,
  })),
);
const SecuritySettingsSection = lazy(() =>
  import("@/components/settings/SecuritySettingsSection").then((m) => ({
    default: m.SecuritySettingsSection,
  })),
);
const SubscriptionSettingsSection = lazy(() =>
  import("@/components/settings/SubscriptionSettingsSection").then((m) => ({
    default: m.SubscriptionSettingsSection,
  })),
);

function SettingsTabSkeleton() {
  return (
    <div className="space-y-5 py-2">
      <div className="space-y-2">
        <Skeleton className="h-6 w-52 rounded-lg" />
        <Skeleton className="h-4 w-80 max-w-full rounded-md" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
      <Skeleton className="h-36 w-full rounded-xl" />
    </div>
  );
}

export default function SettingsPage() {
  const { t, locale } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const { role, isPlatformSuperAdmin } = useUserRole();
  const [settingsSearch, setSettingsSearch] = useState("");

  const handleTabChange = (tabId: SettingsTabId) => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set("tab", tabId);
      return next;
    });
  };

  const settingsTabs = useMemo(
    () => buildSettingsTabs({ t, locale, isPlatformSuperAdmin, role }),
    [t, locale, isPlatformSuperAdmin, role],
  );
  const settingsGroups = useMemo(
    () => buildSettingsGroups({ locale, isPlatformSuperAdmin }),
    [locale, isPlatformSuperAdmin],
  );
  const availableTabIds = useMemo(
    () => new Set(settingsTabs.map((tab) => tab.id)),
    [settingsTabs],
  );

  const matchedTab = settingsTabs.find((tab) => tab.id === tabParam);
  const activeTabConfig = matchedTab ?? settingsTabs.find((tab) => tab.id === "account") ?? settingsTabs[0];
  const activeTab: SettingsTabId = activeTabConfig ? activeTabConfig.id : "account";
  const ActiveIcon = activeTabConfig?.icon ?? Settings2;

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-md3-xl bg-md-primary flex items-center justify-center text-md-on-primary shadow-md3-2 shrink-0">
              <Settings2 className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md3-full bg-md-primary-container text-md-on-primary-container text-xs font-bold mb-1">
                <span>
                  {locale === "en"
                    ? "Workspace Customization & Governance"
                    : "تخصيص المنصة وصلاحيات النظام"}
                </span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-black text-foreground">
                {t("settings.title")}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">{t("settings.subtitle")}</p>
            </div>
          </div>
        </motion.div>

        <SettingsReadinessBar
          locale={locale}
          availableTabIds={availableTabIds}
          activeTab={activeTab}
          onSelectTab={handleTabChange}
        />

        <div className="flex flex-col lg:flex-row gap-6">
          <SettingsSidebar
            tabs={settingsTabs}
            groups={settingsGroups}
            activeTab={activeTab}
            searchQuery={settingsSearch}
            onSearchChange={setSettingsSearch}
            onTabChange={handleTabChange}
            locale={locale}
          />

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1 min-w-0"
          >
            <div className="bg-card rounded-md3-2xl border border-md-outline-variant p-5 sm:p-7 w-full max-w-full shadow-xs">
              {activeTabConfig && (
                <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-border/60">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <ActiveIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-black text-foreground truncate">
                      {activeTabConfig.label}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {activeTabConfig.description}
                    </p>
                  </div>
                </div>
              )}

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.16 }}
                >
                  <Suspense fallback={<SettingsTabSkeleton />}>
                    {activeTab === "public-contact" && isPlatformSuperAdmin && (
                      <PublicContactSettings />
                    )}
                    {activeTab === "account" && <AccountSettingsSection />}
                    {activeTab === "company" && <CompanySettingsManager />}
                    {activeTab === "regional" && <RegionalSettingsSection />}
                    {activeTab === "subscription" && <SubscriptionSettingsSection />}
                    {activeTab === "preferences" && (
                      <PreferencesSettingsSection
                        onOpenRegional={
                          availableTabIds.has("regional")
                            ? () => handleTabChange("regional")
                            : undefined
                        }
                      />
                    )}
                    {activeTab === "pipeline" && <PipelineStagesManager />}
                    {activeTab === "taxonomy" && <CompanyTaxonomyManager />}
                    {activeTab === "filters" && <SavedFiltersManager />}
                    {activeTab === "security" && <SecuritySettingsSection />}
                    {activeTab === "permissions_matrix" && <PermissionsMatrixManager />}
                    {activeTab === "goals" && <HiringGoalsSettingsSection />}
                    {activeTab === "notifications" && <NotificationsSettingsSection />}
                    {activeTab === "email" && <EmailSettings />}
                    {activeTab === "templates" && <NotificationTemplatesSection />}
                    {activeTab === "marketplace" && (
                      <IntegrationsMarketplaceHub onNavigateTab={handleTabChange} />
                    )}
                    {activeTab === "linkedin" && <LinkedInSettingsSection />}
                    {activeTab === "webhooks" && <WebhookSettings />}
                    {activeTab === "hris" && <EnterpriseHrisHub />}
                    {activeTab === "api" && <DeveloperApiHub />}
                  </Suspense>
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
