import DashboardLayout from "@/components/DashboardLayout";
import { useI18n } from "@/contexts/I18nContext";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  User, Mail, Shield, Bell, Target, Settings2, Webhook,
  Palette, KeyRound, Building2, Linkedin, GitBranch, Bookmark, Crown, FileText, Layers
} from "lucide-react";
import SavedFiltersManager from "@/components/SavedFiltersManager";
import CompanyTaxonomyManager from "@/components/CompanyTaxonomyManager";
import CompanySettingsManager from "@/components/CompanySettingsManager";
import EmailSettings from "@/components/EmailSettings";
import NotificationTemplatesSection from "@/components/NotificationTemplatesSection";
import WebhookSettings from "@/components/WebhookSettings";
import PipelineStagesManager from "@/components/PipelineStagesManager";
import PermissionsMatrixManager from "@/components/PermissionsMatrixManager";
import HiringGoalsSection from "@/components/settings/HiringGoalsSection";
import AccountSection from "@/components/settings/AccountSection";
import SecuritySection from "@/components/settings/SecuritySection";
import NotificationsSection from "@/components/settings/NotificationsSection";
import LinkedInSection from "@/components/settings/LinkedInSection";
import PreferencesSection from "@/components/settings/PreferencesSection";
import SubscriptionSection from "@/components/settings/SubscriptionSection";

/* ─── Main Page ─── */
export default function SettingsPage() {
  const { t, locale } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam || "account");

  // Keep search param in sync with activeTab changes
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  const settingsTabs = [
    { id: "account", label: t("settings.profile"), icon: User },
    { id: "company", label: "الشركة", icon: Building2 },
    { id: "subscription", label: locale === "en" ? "Subscription & Billing" : "الاشتراك والفواتير", icon: Crown },
    { id: "preferences", label: locale === "en" ? "Preferences" : "تفضيلات المنصة", icon: Palette },
    { id: "pipeline", label: "مراحل التوظيف", icon: GitBranch },
    { id: "taxonomy", label: "الأقسام والمواقع والخبرات", icon: Layers },
    { id: "filters", label: "الفلاتر المحفوظة", icon: Bookmark },
    { id: "security", label: t("settings.security"), icon: Shield },
    { id: "permissions_matrix", label: "مصفوفة الصلاحيات (قراءة/إدخال/تعديل/حذف)", icon: KeyRound },
    { id: "goals", label: t("settings.hiringGoals"), icon: Target },
    { id: "notifications", label: t("settings.notifications"), icon: Bell },
    { id: "linkedin", label: t("settings.linkedin"), icon: Linkedin },
    { id: "email", label: t("settings.email"), icon: Mail },
    { id: "templates", label: locale === "en" ? "Message Automation" : "أتمتة وقوالب الرسائل", icon: FileText },
    { id: "webhooks", label: t("settings.webhooks"), icon: Webhook },
  ];

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-md3-xl bg-md-primary flex items-center justify-center text-md-on-primary shadow-md3-2">
              <Settings2 className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md3-full bg-md-primary-container text-md-on-primary-container text-xs font-bold mb-1">
                <span>تخصيص المنصة وصلاحيات النظام</span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-black text-foreground">{t("settings.title")}</h1>
              <p className="text-xs text-muted-foreground mt-0.5">{t("settings.subtitle")}</p>
            </div>
          </div>
        </motion.div>
 
        <div className="flex flex-col lg:flex-row gap-6">
          <motion.nav
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 }}
            className="lg:w-64 shrink-0"
          >
            <div className="lg:sticky lg:top-24 bg-md-surface-container rounded-md3-2xl border border-md-outline-variant p-2 space-y-1 shadow-xs">
              {settingsTabs.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={cn(
                      "relative w-full flex items-center gap-3 px-3.5 py-2.5 rounded-md3-full text-xs font-bold transition-all text-right",
                      isActive
                        ? "bg-md-primary text-md-on-primary shadow-sm"
                        : "text-muted-foreground hover:bg-md-surface-container-high hover:text-foreground"
                    )}
                  >
                    <tab.icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.nav>
 
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
                  {activeTab === "account" && <AccountSection />}
                  {activeTab === "company" && <CompanySettingsManager />}
                  {activeTab === "subscription" && <SubscriptionSection />}
                  {activeTab === "preferences" && <PreferencesSection />}
                  {activeTab === "pipeline" && <PipelineStagesManager />}
                  {activeTab === "taxonomy" && <CompanyTaxonomyManager />}
                  {activeTab === "filters" && <SavedFiltersManager />}
                  {activeTab === "security" && <SecuritySection />}
                  {activeTab === "permissions_matrix" && <PermissionsMatrixManager />}
                  {activeTab === "goals" && <HiringGoalsSection />}
                  {activeTab === "notifications" && <NotificationsSection />}
                  {activeTab === "email" && <EmailSettings />}
                  {activeTab === "templates" && <NotificationTemplatesSection />}
                  {activeTab === "linkedin" && <LinkedInSection />}
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
