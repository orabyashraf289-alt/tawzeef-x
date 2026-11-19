import { motion } from "framer-motion";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  matchesSettingsQuery,
  type SettingsGroupConfig,
  type SettingsTabConfig,
  type SettingsTabId,
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
  const isEn = locale === "en";
  const hasSearch = searchQuery.trim().length > 0;
  const anyMatch = tabs.some((tab) => matchesSettingsQuery(tab, searchQuery));

  return (
    <motion.nav
      initial={{ opacity: 0, x: 14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className="lg:w-72 shrink-0"
    >
      <div className="lg:sticky lg:top-24 bg-md-surface-container rounded-md3-2xl border border-md-outline-variant p-3 space-y-3 shadow-xs">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
          <Input
            type="search"
            aria-label={isEn ? "Search settings" : "بحث في الإعدادات"}
            placeholder={
              isEn
                ? "Search settings, SMTP, Hijri, API..."
                : "ابحث: هجري، عملة، SMTP، صلاحيات..."
            }
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            className="h-9 ps-8 pe-8 text-xs bg-background/80"
          />
          {hasSearch && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label={isEn ? "Clear search" : "مسح البحث"}
              className="absolute top-1/2 -translate-y-1/2 end-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <nav
          aria-label={isEn ? "Settings sections" : "أقسام الإعدادات"}
          className="max-h-[72vh] overflow-y-auto space-y-3.5 pe-0.5"
        >
          {groups.map((group) => {
            const matchingTabs = group.ids
              .map((id) => tabs.find((tab) => tab.id === id))
              .filter((tab): tab is SettingsTabConfig => Boolean(tab && matchesSettingsQuery(tab, searchQuery)));

            if (!matchingTabs.length) return null;

            return (
              <div key={group.id} className="space-y-1">
                <div className="flex items-center justify-between px-3 pt-1">
                  <p className="text-[11px] font-extrabold text-muted-foreground tracking-tight">
                    {group.title}
                  </p>
                  <span className="text-[10px] font-mono text-muted-foreground/70">
                    {matchingTabs.length}
                  </span>
                </div>

                {matchingTabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      aria-current={isActive ? "page" : undefined}
                      onClick={() => onTabChange(tab.id)}
                      className={cn(
                        "relative w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-start",
                        isActive
                          ? "bg-md-primary text-md-on-primary shadow-sm"
                          : "text-muted-foreground hover:bg-md-surface-container-high hover:text-foreground",
                      )}
                    >
                      <tab.icon className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <span className="block truncate leading-snug">{tab.label}</span>
                        {hasSearch && (
                          <span
                            className={cn(
                              "block text-[10px] font-normal truncate mt-0.5",
                              isActive ? "text-md-on-primary/80" : "text-muted-foreground/80",
                            )}
                          >
                            {tab.description}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}

          {hasSearch && !anyMatch && (
            <p className="px-3.5 py-4 text-xs text-muted-foreground text-center">
              {isEn ? "No matching settings found" : "لا توجد إعدادات مطابقة لبحثك"}
            </p>
          )}
        </nav>
      </div>
    </motion.nav>
  );
}
