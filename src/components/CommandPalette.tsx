import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard, Briefcase, Users, Calendar, FileText, BarChart3, Bot, Settings, Bell, Kanban, Target, Star, BookOpen, GitBranch, Shield, UserCog, Search, Clock, X, History, User, Building2, Trash2, LibraryBig, Sparkles,
} from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { useSearchHistory, useRecordSearch, useClearSearchHistory, useDeleteSearchEntry } from "@/hooks/useSearchHistory";
import { useJobs, useCandidates } from "@/hooks/useJobs";
import { Badge } from "@/components/ui/badge";

const commandItems = [
  { icon: LayoutDashboard, labelKey: "nav.dashboard", path: "/dashboard", keywords: "dashboard لوحة التحكم رئيسية home" },
  { icon: Sparkles, labelKey: "nav.screenGuide", path: "#open-guide", keywords: "screen guide كيف تعمل هذه الشاشة خطوات العمل مساعدة الشاشة دليل الشاشة" },
  { icon: Briefcase, labelKey: "nav.jobs", path: "/jobs", keywords: "jobs وظائف وظيفة" },
  { icon: Users, labelKey: "nav.candidates", path: "/candidates", keywords: "candidates مرشحين" },
  { icon: Kanban, labelKey: "nav.pipeline", path: "/pipeline", keywords: "pipeline مراحل" },
  { icon: Calendar, labelKey: "nav.interviews", path: "/interviews", keywords: "interviews مقابلات" },
  { icon: FileText, labelKey: "nav.offers", path: "/offers", keywords: "offers عروض" },
  { icon: BarChart3, labelKey: "nav.reports", path: "/reports", keywords: "reports تقارير" },
  { icon: Target, labelKey: "nav.hiringPlan", path: "/hiring-plan", keywords: "hiring plan خطة التوظيف" },
  { icon: Bot, labelKey: "nav.aiAssistant", path: "/ai-assistant", keywords: "ai assistant مساعد ذكي" },
  { icon: LibraryBig, labelKey: "nav.systemLibrary", path: "/library", keywords: "library مكتبة النظام قوالب تصميم material" },
  { icon: Star, labelKey: "nav.talentPool", path: "/talent-pool", keywords: "talent pool مجمع مواهب" },
  { icon: BookOpen, labelKey: "nav.questionBank", path: "/question-bank", keywords: "questions أسئلة اختبارات" },
  { icon: GitBranch, labelKey: "nav.workflow", path: "/workflow", keywords: "workflow سير عمل" },
  { icon: Bell, labelKey: "nav.notifications", path: "/notifications", keywords: "notifications إشعارات" },
  { icon: UserCog, labelKey: "nav.team", path: "/team", keywords: "team فريق" },
  { icon: Shield, labelKey: "nav.auditLog", path: "/audit-log", keywords: "audit سجل أمني" },
  { icon: BookOpen, labelKey: "nav.tutorial", path: "/tutorial", keywords: "tutorial guide help دليل النظام بالكامل الشامل شرح مساعدة توثيق" },
  { icon: Settings, labelKey: "nav.settings", path: "/settings", keywords: "settings إعدادات" },
];

const slashCommands = [
  { trigger: "/guide", labelAr: "دليل النظام بالكامل", labelEn: "System Guide", path: "/tutorial", icon: BookOpen },
  { trigger: "/job", labelAr: "إنشاء وظيفة", labelEn: "Create job", path: "/jobs?action=create", icon: Briefcase },
  { trigger: "/library", labelAr: "مكتبة النظام", labelEn: "System Library", path: "/library", icon: LibraryBig },
  { trigger: "/candidate", labelAr: "بحث في المرشحين", labelEn: "Search candidates", path: "/candidates", icon: Users },
  { trigger: "/interview", labelAr: "جدولة مقابلة", labelEn: "Schedule interview", path: "/interviews?action=create", icon: Calendar },
  { trigger: "/offer", labelAr: "إنشاء عرض", labelEn: "Create offer", path: "/offers?action=create", icon: FileText },
  { trigger: "/ai", labelAr: "المساعد الذكي", labelEn: "AI Assistant", path: "/ai-assistant", icon: Bot },
  { trigger: "/report", labelAr: "التقارير", labelEn: "Reports", path: "/reports", icon: BarChart3 },
  { trigger: "/screen", labelAr: "دليل وخطوات تشغيل الشاشة الحالية", labelEn: "Screen Guide & Steps", path: "#open-guide", icon: Sparkles },
  { trigger: "/help", labelAr: "المساعدة ودليل النظام", labelEn: "Help & Guide", path: "/tutorial", icon: BookOpen },
];

export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "ك") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return { open, setOpen };
}

export default function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const [query, setQuery] = useState("");
  const { data: history = [] } = useSearchHistory("global", 8);
  const { data: jobs = [] } = useJobs();
  const { data: candidates = [] } = useCandidates();
  const recordSearch = useRecordSearch();
  const clearHistory = useClearSearchHistory();
  const deleteEntry = useDeleteSearchEntry();

  // Reset query when closing
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const isSlash = query.startsWith("/");
  const trimmed = query.trim().toLowerCase();

  // Filter results based on query
  const matchedJobs = useMemo(() => {
    if (!trimmed || isSlash || trimmed.length < 2) return [];
    return (jobs || [])
      .filter((j: any) =>
        j.title?.toLowerCase().includes(trimmed) ||
        j.department?.toLowerCase().includes(trimmed) ||
        j.location?.toLowerCase().includes(trimmed)
      )
      .slice(0, 5);
  }, [jobs, trimmed, isSlash]);

  const matchedCandidates = useMemo(() => {
    if (!trimmed || isSlash || trimmed.length < 2) return [];
    return (candidates || [])
      .filter((c: any) =>
        c.name?.toLowerCase().includes(trimmed) ||
        c.email?.toLowerCase().includes(trimmed) ||
        c.role?.toLowerCase().includes(trimmed)
      )
      .slice(0, 5);
  }, [candidates, trimmed, isSlash]);

  const matchedSlash = useMemo(() => {
    if (!isSlash) return [];
    const q = query.slice(1).toLowerCase();
    return slashCommands.filter(c =>
      c.trigger.includes(query.toLowerCase()) ||
      c.labelAr.includes(q) ||
      c.labelEn.toLowerCase().includes(q)
    );
  }, [query, isSlash]);

  const handleSelect = useCallback((path: string, searchQuery?: string) => {
    onOpenChange(false);
    if (path === "#open-guide") {
      window.dispatchEvent(new CustomEvent("open-screen-guide"));
      return;
    }
    if (searchQuery && searchQuery.trim().length >= 2) {
      const totalResults = matchedJobs.length + matchedCandidates.length;
      recordSearch.mutate({ query: searchQuery, scope: "global", result_count: totalResults });
    }
    navigate(path);
  }, [navigate, onOpenChange, recordSearch, matchedJobs.length, matchedCandidates.length]);

  const handleSelectHistory = useCallback((q: string) => {
    setQuery(q);
  }, []);

  const showHistory = !query && history.length > 0;
  const showResults = !!trimmed && !isSlash;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder={locale === "en" ? "Search anything... try / for commands" : "ابحث عن أي شيء... جرب / للأوامر"}
        value={query}
        onValueChange={setQuery}
      />
      <CommandList className="max-h-[500px]">
        <CommandEmpty>{locale === "en" ? "No results found." : "لا توجد نتائج"}</CommandEmpty>

        {/* Slash Commands */}
        {isSlash && matchedSlash.length > 0 && (
          <CommandGroup heading={locale === "en" ? "Quick Commands" : "أوامر سريعة"}>
            {matchedSlash.map((cmd) => (
              <CommandItem
                key={cmd.trigger}
                value={cmd.trigger + cmd.labelAr + cmd.labelEn}
                onSelect={() => handleSelect(cmd.path)}
                className="gap-3 cursor-pointer"
              >
                <cmd.icon className="w-4 h-4 text-primary" />
                <span className="font-medium">{locale === "en" ? cmd.labelEn : cmd.labelAr}</span>
                <Badge variant="secondary" className="mr-auto text-[10px] font-mono">{cmd.trigger}</Badge>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Recent Searches */}
        {showHistory && (
          <>
            <CommandGroup
              heading={
                <div className="flex items-center justify-between w-full">
                  <span className="flex items-center gap-1.5"><History className="w-3 h-3" />{locale === "en" ? "Recent" : "بحث سابق"}</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); clearHistory.mutate(undefined); }}
                    className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                  >
                    {locale === "en" ? "Clear" : "مسح"}
                  </button>
                </div>
              }
            >
              {history.map((h) => (
                <CommandItem
                  key={h.id}
                  value={`history-${h.id}-${h.query}`}
                  onSelect={() => handleSelectHistory(h.query)}
                  className="gap-3 cursor-pointer group"
                >
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="truncate">{h.query}</span>
                  <span className="text-[10px] text-muted-foreground mr-auto">{h.result_count} {locale === "en" ? "results" : "نتيجة"}</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); deleteEntry.mutate(h.id); }}
                    className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Search Results - Candidates */}
        {showResults && matchedCandidates.length > 0 && (
          <CommandGroup heading={locale === "en" ? "Candidates" : "المرشحون"}>
            {matchedCandidates.map((c: any) => (
              <CommandItem
                key={`cand-${c.id}`}
                value={`cand-${c.id}-${c.name}`}
                onSelect={() => handleSelect(`/candidates/${c.id}`, query)}
                className="gap-3 cursor-pointer"
              >
                <User className="w-4 h-4 text-success" />
                <div className="flex flex-col min-w-0">
                  <span className="truncate font-medium">{c.name}</span>
                  {c.role && <span className="text-[10px] text-muted-foreground truncate">{c.role}</span>}
                </div>
                {c.stage && <Badge variant="outline" className="mr-auto text-[10px]">{c.stage}</Badge>}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Search Results - Jobs */}
        {showResults && matchedJobs.length > 0 && (
          <CommandGroup heading={locale === "en" ? "Jobs" : "الوظائف"}>
            {matchedJobs.map((j: any) => (
              <CommandItem
                key={`job-${j.id}`}
                value={`job-${j.id}-${j.title}`}
                onSelect={() => handleSelect(`/jobs/${j.id}`, query)}
                className="gap-3 cursor-pointer"
              >
                <Building2 className="w-4 h-4 text-primary" />
                <div className="flex flex-col min-w-0">
                  <span className="truncate font-medium">{j.title}</span>
                  <span className="text-[10px] text-muted-foreground truncate">{j.department} · {j.location}</span>
                </div>
                <Badge variant="outline" className="mr-auto text-[10px]">{j.status}</Badge>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Pages */}
        {(showResults || (!query && !showHistory)) && (
          <>
            {showResults && <CommandSeparator />}
            <CommandGroup heading={locale === "en" ? "Pages" : "الصفحات"}>
              {commandItems.map((item) => (
                <CommandItem
                  key={item.path}
                  value={item.keywords}
                  onSelect={() => handleSelect(item.path, query)}
                  className="gap-3 cursor-pointer"
                >
                  <item.icon className="w-4 h-4 text-muted-foreground" />
                  <span>{t(item.labelKey)}</span>
                  <span className="text-[10px] text-muted-foreground mr-auto">{item.path}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Hint */}
        {!query && (
          <div className="px-3 py-2 border-t border-border/50 text-[10px] text-muted-foreground flex items-center gap-3 flex-wrap">
            <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[9px]">/</kbd> {locale === "en" ? "for commands" : "للأوامر"}</span>
            <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[9px]">↵</kbd> {locale === "en" ? "to select" : "للاختيار"}</span>
            <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[9px]">esc</kbd> {locale === "en" ? "to close" : "للإغلاق"}</span>
          </div>
        )}
      </CommandList>
    </CommandDialog>
  );
}
