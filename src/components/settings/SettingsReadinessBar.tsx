import { useMemo } from "react";
import { CheckCircle2, CircleDashed, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useCompany } from "@/contexts/CompanyContext";
import { loadDeveloperApiKeys } from "@/lib/developerApiEngine";
import { loadRegionalSettings } from "@/lib/regionalSettings";
import type { SettingsTabId } from "./settingsTabs";
import { cn } from "@/lib/utils";

interface SettingsReadinessBarProps {
  locale: string;
  availableTabIds: Set<SettingsTabId>;
  activeTab: SettingsTabId;
  onSelectTab: (tabId: SettingsTabId) => void;
}

interface ReadinessStep {
  id: string;
  tabId: SettingsTabId;
  labelAr: string;
  labelEn: string;
  done: boolean;
}

export function SettingsReadinessBar({
  locale,
  availableTabIds,
  activeTab,
  onSelectTab,
}: SettingsReadinessBarProps) {
  const isAr = locale !== "en";
  const { activeCompany, activeCompanyId } = useCompany();

  const steps = useMemo<ReadinessStep[]>(() => {
    const regional = loadRegionalSettings(activeCompanyId);
    let hasApiOrWebhook = false;
    try {
      const apiKeys = loadDeveloperApiKeys().filter((k) => k.status === "active");
      const hasSlack = typeof window !== "undefined" && Boolean(localStorage.getItem("tx_slack_teams_webhooks_v1"));
      const hasHris = typeof window !== "undefined" && Boolean(localStorage.getItem("tx_enterprise_hris_config_v1"));
      hasApiOrWebhook = apiKeys.length > 0 || hasSlack || hasHris;
    } catch {
      hasApiOrWebhook = false;
    }

    const rawSteps: ReadinessStep[] = [
      {
        id: "company-profile",
        tabId: "company",
        labelAr: "هوية الشركة",
        labelEn: "Company identity",
        done: Boolean(activeCompany?.name && activeCompany.name.trim().length > 1),
      },
      {
        id: "regional-setup",
        tabId: "regional",
        labelAr: "التقويم الهجري والعملة",
        labelEn: "Hijri & currency",
        done: Boolean(regional.updatedAt || regional.currency),
      },
      {
        id: "pipeline-setup",
        tabId: "pipeline",
        labelAr: "مراحل التوظيف",
        labelEn: "Hiring pipeline",
        done: Boolean(activeCompanyId),
      },
      {
        id: "security-setup",
        tabId: "security",
        labelAr: "الأمان والخصوصية",
        labelEn: "Security & PDPL",
        done: true,
      },
      {
        id: "integrations-setup",
        tabId: "marketplace",
        labelAr: "التكاملات والربط",
        labelEn: "Integrations",
        done: hasApiOrWebhook,
      },
    ];

    return rawSteps.filter((step) => availableTabIds.has(step.tabId));
  }, [activeCompany?.name, activeCompanyId, availableTabIds]);

  if (steps.length === 0) return null;

  const doneCount = steps.filter((s) => s.done).length;
  const percentage = Math.round((doneCount / steps.length) * 100);

  return (
    <div className="rounded-md3-2xl border border-md-outline-variant bg-card/85 px-4 py-3 shadow-xs flex-1 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-foreground whitespace-nowrap">
                {isAr ? "جاهزية النظام" : "Setup Readiness"}
              </span>
              <span className="text-xs font-mono font-bold text-primary">{percentage}%</span>
            </div>
            <div className="w-32 mt-1">
              <Progress value={percentage} className="h-1.5" />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {steps.map((step) => (
            <button
              key={step.id}
              type="button"
              onClick={() => onSelectTab(step.tabId)}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all",
                activeTab === step.tabId
                  ? "border-primary bg-primary text-primary-foreground"
                  : step.done
                  ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15"
                  : "border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-300 hover:bg-amber-500/15",
              )}
            >
              {step.done ? (
                <CheckCircle2 className="w-3 h-3 shrink-0" />
              ) : (
                <CircleDashed className="w-3 h-3 shrink-0" />
              )}
              <span>{isAr ? step.labelAr : step.labelEn}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SettingsReadinessBar;
