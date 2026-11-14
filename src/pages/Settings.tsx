import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Settings2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import CompanySettingsManager from "@/components/CompanySettingsManager";
import CompanyTaxonomyManager from "@/components/CompanyTaxonomyManager";
import DashboardLayout from "@/components/DashboardLayout";
import EmailSettings from "@/components/EmailSettings";
import NotificationTemplatesSection from "@/components/NotificationTemplatesSection";
import PermissionsMatrixManager from "@/components/PermissionsMatrixManager";
import PipelineStagesManager from "@/components/PipelineStagesManager";
import PublicContactSettings from "@/components/PublicContactSettings";
import SavedFiltersManager from "@/components/SavedFiltersManager";
import WebhookSettings from "@/components/WebhookSettings";
import { AccountSettingsSection } from "@/components/settings/AccountSettingsSection";
import { HiringGoalsSettingsSection } from "@/components/settings/HiringGoalsSettingsSection";
import { LinkedInSettingsSection } from "@/components/settings/LinkedInSettingsSection";
import { NotificationsSettingsSection } from "@/components/settings/NotificationsSettingsSection";
import { PreferencesSettingsSection } from "@/components/settings/PreferencesSettingsSection";
import { SecuritySettingsSection } from "@/components/settings/SecuritySettingsSection";
import { SettingsSidebar } from "@/components/settings/SettingsSidebar";
import { SubscriptionSettingsSection } from "@/components/settings/SubscriptionSettingsSection";
import {
  buildSettingsGroups,
  buildSettingsTabs,
  type SettingsTabId,
} from "@/components/settings/settingsTabs";
import { useI18n } from "@/contexts/I18nContext";
import { useUserRole } from "@/hooks/useUserRole";

export default function SettingsPage() {
  const { t, locale } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const { isPlatformSuperAdmin } = useUserRole();
  const [settingsSearch, setSettingsSearch] = useState("");

  const handleTabChange = (tabId: SettingsTabId) => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set("tab", tabId);
      return next;
    });
  };

  const settingsTabs = buildSettingsTabs({ t, locale, isPlatformSuperAdmin });
  const settingsGroups = buildSettingsGroups({ locale, isPlatformSuperAdmin });
  const matchedTab = settingsTabs.find((tab) => tab.id === tabParam);
  const activeTab: SettingsTabId = matchedTab ? matchedTab.id : "account";

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-md3-xl bg-md-primary flex items-center justify-center text-md-on-primary shadow-md3-2">
              <Settings2 className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md3-full bg-md-primary-container text-md-on-primary-container text-xs font-bold mb-1">
                <span>تخصيص المنصة وصلاحيات النظام</span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-black text-foreground">
                {t("settings.title")}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">{t("settings.subtitle")}</p>
            </div>
          </div>
        </motion.div>

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
            transition={{ delay: 0.1 }}
            className="flex-1 min-w-0"
          >
            <div className="bg-card rounded-md3-2xl border border-md-outline-variant p-5 sm:p-7 w-full max-w-full shadow-xs">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  {activeTab === "public-contact" && isPlatformSuperAdmin && (
                    <PublicContactSettings />
                  )}
                  {activeTab === "account" && <AccountSettingsSection />}
                  {activeTab === "company" && <CompanySettingsManager />}
                  {activeTab === "subscription" && <SubscriptionSettingsSection />}
                  {activeTab === "preferences" && <PreferencesSettingsSection />}
                  {activeTab === "pipeline" && <PipelineStagesManager />}
                  {activeTab === "taxonomy" && <CompanyTaxonomyManager />}
                  {activeTab === "filters" && <SavedFiltersManager />}
                  {activeTab === "security" && <SecuritySettingsSection />}
                  {activeTab === "permissions_matrix" && <PermissionsMatrixManager />}
                  {activeTab === "goals" && <HiringGoalsSettingsSection />}
                  {activeTab === "notifications" && <NotificationsSettingsSection />}
                  {activeTab === "email" && <EmailSettings />}
                  {activeTab === "templates" && <NotificationTemplatesSection />}
                  {activeTab === "linkedin" && <LinkedInSettingsSection />}
                  {activeTab === "webhooks" && <WebhookSettings />}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
