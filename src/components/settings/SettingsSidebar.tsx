import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type {
  SettingsGroupConfig,
  SettingsTabConfig,
  SettingsTabId,
} from "./settingsTabs";

interface SettingsSidebarProps {
  tabs: SettingsTabConfig[];
  groups: SettingsGroupConfig[];
  activeTab: SettingsTabId;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onTabChange: (tabId: SettingsTabId) => void;
  locale: string;
}

export function SettingsSidebar({
  tabs,
  groups,
  activeTab,
  searchQuery,
  onSearchChange,
  onTabChange,
  locale,
}: SettingsSidebarProps) {
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase();

  return (
    <motion.nav
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.05 }}
      className="lg:w-64 shrink-0"
    >
      <div className="lg:sticky lg:top-24 bg-md-surface-container rounded-md3-2xl border border-md-outline-variant p-3 space-y-3 shadow-xs">
        <Input
          type="search"
          aria-label={locale === "en" ? "Search settings" : "بحث في الإعدادات"}
          placeholder={locale === "en" ? "Search settings..." : "ابحث عن إعداد..."}
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          className="h-9 text-xs"
        />
        <nav
          aria-label={locale === "en" ? "Settings sections" : "أقسام الإعدادات"}
          className="max-h-[70vh] overflow-y-auto space-y-3"
        >
          {groups.map((group) => {
            const matchingTabs = tabs.filter(
              (tab) =>
                group.ids.includes(tab.id) &&
                (!normalizedSearch ||
                  tab.label.toLocaleLowerCase().includes(normalizedSearch)),
            );
            if (!matchingTabs.length) return null;
            return (
              <div key={group.title} className="space-y-1">
                <p className="px-3.5 pt-1 text-[11px] font-bold text-muted-foreground">
                  {group.title}
                </p>
                {matchingTabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      aria-current={isActive ? "page" : undefined}
                      onClick={() => onTabChange(tab.id)}
                      className={cn(
                        "relative w-full flex items-center gap-3 px-3.5 py-2.5 rounded-md3-full text-xs font-bold transition-all text-right",
                        isActive
                          ? "bg-md-primary text-md-on-primary shadow-sm"
                          : "text-muted-foreground hover:bg-md-surface-container-high hover:text-foreground",
                      )}
                    >
                      <tab.icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
          {normalizedSearch &&
            !tabs.some((tab) =>
              tab.label.toLocaleLowerCase().includes(normalizedSearch),
            ) && (
              <p className="px-3.5 py-4 text-xs text-muted-foreground">
                {locale === "en" ? "No matching settings" : "لا توجد إعدادات مطابقة"}
              </p>
            )}
        </nav>
      </div>
    </motion.nav>
  );
}
