import { ReactNode, useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Briefcase, Users, Bot, Settings, Menu, Calendar, BarChart3, Bell, LogOut, X, Kanban, Crown, UserCog, FileText, Sun, Moon, Monitor, Target, Globe, GraduationCap, Shield, Star, Download, BookOpen, GitBranch, Map, Search, Archive, Building2, Handshake, ClipboardList, ShieldCheck, ChevronDown, CheckSquare, Plus,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useScreenPermissions } from "@/hooks/useScreenPermissions";
import { useTheme } from "@/contexts/ThemeContext";
import { useI18n } from "@/contexts/I18nContext";
import { Badge } from "@/components/ui/badge";
import { FlaticonAnimatedIcon } from "@/components/ui/animated-icons";
import { motion, AnimatePresence } from "framer-motion";
import tawzeefLogo from "@/assets/tawzeef-x-logo.png";
import OnboardingTour, { useOnboardingTour, TourTriggerButton } from "@/components/OnboardingTour";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useBrandSettings } from "@/hooks/useBrandSettings";
import BottomNav from "@/components/BottomNav";
import CommandPalette, { useCommandPalette } from "@/components/CommandPalette";
import CompanySwitcher from "@/components/CompanySwitcher";
import { prefetchRoute, recordNavigation } from "@/lib/routePrefetch";

const tourIdMap: Record<string, string> = {
  "/jobs": "nav-jobs",
  "/candidates": "nav-candidates",
  "/pipeline": "nav-pipeline",
  "/interviews": "nav-interviews",
  "/offers": "nav-offers",
  "/ai-assistant": "nav-ai-assistant",
  "/reports": "nav-reports",
  "/settings": "nav-settings",
};

const navGroups = [
  {
    id: "core",
    labelAr: "الاستقطاب والتوظيف",
    labelEn: "Recruitment Core",
    items: [
      { icon: LayoutDashboard, labelKey: "nav.dashboard", path: "/dashboard", roles: ["admin", "recruiter", "reviewer"], workspaces: ["recruitment", "enterprise"] },
      { icon: Briefcase, labelKey: "nav.jobs", path: "/jobs", roles: ["admin", "recruiter"], workspaces: ["recruitment"] },
      { icon: Users, labelKey: "nav.candidates", path: "/candidates", roles: ["admin", "recruiter", "reviewer"], workspaces: ["recruitment"] },
      { icon: Kanban, labelKey: "nav.pipeline", path: "/pipeline", roles: ["admin", "recruiter"], workspaces: ["recruitment"] },
      { icon: Calendar, labelKey: "nav.interviews", path: "/interviews", roles: ["admin", "recruiter", "reviewer"], workspaces: ["recruitment"] },
      { icon: FileText, labelKey: "nav.offers", path: "/offers", roles: ["admin", "recruiter"], workspaces: ["recruitment"] },
      { icon: CheckSquare, labelKey: "nav.tasks", path: "/tasks", roles: ["admin", "recruiter", "reviewer"], workspaces: ["enterprise"] },
      { icon: Target, labelKey: "nav.evaluation", path: "/evaluation", roles: ["admin", "recruiter", "reviewer"], workspaces: ["enterprise"] },
    ]
  },
  {
    id: "ai_tools",
    labelAr: "الذكاء الاصطناعي والأدوات",
    labelEn: "AI & Intelligence",
    items: [
      { icon: Bot, labelKey: "nav.aiAssistant", path: "/ai-assistant", roles: ["admin", "recruiter"], workspaces: ["recruitment"] },
      { icon: Star, labelKey: "nav.talentPool", path: "/talent-pool", roles: ["admin", "recruiter"], workspaces: ["recruitment"] },
      { icon: Archive, labelKey: "nav.resumeArchive", path: "/resume-archive", roles: ["admin", "recruiter", "reviewer"], workspaces: ["recruitment"] },
      { icon: BookOpen, labelKey: "nav.questionBank", path: "/question-bank", roles: ["admin", "recruiter"], workspaces: ["recruitment", "enterprise"] },
      { icon: GitBranch, labelKey: "nav.workflow", path: "/workflow", roles: ["admin", "recruiter"], workspaces: ["recruitment"] },
      { icon: ClipboardList, labelKey: "nav.checklistTracker", path: "/checklist-tracker", roles: ["admin", "recruiter"], workspaces: ["recruitment"] },
    ]
  },
  {
    id: "analytics_admin",
    labelAr: "التقارير وإدارة المنشأة",
    labelEn: "Analytics & Organization",
    items: [
      { icon: BarChart3, labelKey: "nav.reports", path: "/reports", roles: ["admin", "recruiter"], workspaces: ["recruitment"] },
      { icon: Target, labelKey: "nav.hiringPlan", path: "/hiring-plan", roles: ["admin", "recruiter"], workspaces: ["enterprise"] },
      { icon: Bell, labelKey: "nav.notifications", path: "/notifications", roles: ["admin", "recruiter", "reviewer"], workspaces: ["recruitment", "enterprise"] },
      { icon: Building2, labelKey: "nav.company", path: "/company", roles: ["admin", "recruiter", "reviewer"], workspaces: ["recruitment"] },
      { icon: Handshake, labelKey: "nav.companyAgencies", path: "/company/agencies", roles: ["admin", "recruiter"], workspaces: ["recruitment", "enterprise"] },
      { icon: Handshake, labelKey: "nav.agency", path: "/agency", roles: ["admin", "recruiter", "reviewer"], workspaces: ["recruitment"] },
      { icon: UserCog, labelKey: "nav.team", path: "/team", roles: ["admin"], workspaces: ["enterprise"] },
      { icon: Building2, labelKey: "nav.adminCompanies", path: "/admin/companies", roles: ["admin"], workspaces: ["enterprise"], superAdminOnly: true },
      { icon: Handshake, labelKey: "nav.adminAgencies", path: "/admin/agencies", roles: ["admin"], workspaces: ["enterprise"], superAdminOnly: true },
      { icon: Shield, labelKey: "nav.auditLog", path: "/audit-log", roles: ["admin", "recruiter"], workspaces: ["enterprise"] },
      { icon: ShieldCheck, labelKey: "nav.qualityReport", path: "/admin/quality", roles: ["admin"], workspaces: ["enterprise"], superAdminOnly: true },
      { icon: Map, labelKey: "nav.roadmap", path: "/roadmap", roles: ["admin"], workspaces: ["enterprise"], superAdminOnly: true },
      { icon: Settings, labelKey: "nav.settings", path: "/settings", roles: ["admin", "recruiter", "reviewer"], workspaces: ["recruitment", "enterprise"] },
    ]
  }
];

import { useRealtimeSync } from "@/hooks/useRealtimeSync";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  useRealtimeSync();
  const { data: brandSettings } = useBrandSettings();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [navLoading, setNavLoading] = useState(false);
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { role, isAdmin, isSuperAdmin } = useUserRole();
  const { hasScreenAccess } = useScreenPermissions();
  const { theme, setTheme } = useTheme();
  const { locale, setLocale, t, dir } = useI18n();
  const { showTour, startTour, endTour } = useOnboardingTour();
  useKeyboardShortcuts();
  const { open: cmdOpen, setOpen: setCmdOpen } = useCommandPalette();

  const { data: headerData, isLoading: headerLoading } = useQuery({
    queryKey: ["layout-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, job_title, company_name, company_logo")
        .eq("user_id", user.id)
        .maybeSingle();

      const { data: memberRows } = await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", user.id)
        .order("joined_at", { ascending: true });

      let companyName = "";
      let companyLogo = "";

      if (memberRows && memberRows.length > 0) {
        const { data: company } = await supabase
          .from("companies")
          .select("name, logo_url")
          .eq("id", memberRows[0].company_id)
          .maybeSingle();

        if (company) {
          companyName = company.name || "";
          companyLogo = company.logo_url || "";
        }
      }

      if (!companyName && profile?.company_name) {
        companyName = profile.company_name;
      }
      if (!companyLogo && profile?.company_logo) {
        companyLogo = profile.company_logo;
      }

      return {
        full_name: profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "",
        displayName: profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "",
        avatarUrl: profile?.avatar_url || null,
        jobTitle: profile?.job_title || null,
        companyName,
        companyLogo,
      };
    },
    enabled: !!user,
  });

  const displayName = headerData?.displayName || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "";
  const avatarUrl = headerData?.avatarUrl || null;
  const jobTitle = headerData?.jobTitle || user?.user_metadata?.job_title || null;
  const companyName = headerData?.companyName || user?.user_metadata?.company_name || "";
  const companyLogo = headerData?.companyLogo || user?.user_metadata?.company_logo || "";

  const [workspace, setWorkspace] = useState<"recruitment" | "enterprise">(() => {
    return (localStorage.getItem("active-workspace") as any) || "recruitment";
  });
  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);

  const handleWorkspaceChange = useCallback((w: "recruitment" | "enterprise") => {
    setWorkspace(w);
    localStorage.setItem("active-workspace", w);
  }, []);

  const queryClient = useQueryClient();

  const { data: unreadNotifs } = useQuery({
    queryKey: ["unread-notif-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("read", false);
      return count || 0;
    },
    enabled: !!user,
    staleTime: 60_000,
  });
  const unreadNotifCount = unreadNotifs || 0;

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('sidebar-notif-badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["unread-notif-count", user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  const roleLabels: Record<string, string> = {
    admin: t("role.admin"),
    recruiter: t("role.recruiter"),
    reviewer: t("role.reviewer"),
  };

  useEffect(() => {
    setMobileOpen(false);
    recordNavigation(location.pathname);
    setNavLoading(true);
    const tm = setTimeout(() => setNavLoading(false), 350);
    return () => clearTimeout(tm);
  }, [location.pathname]);

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-md-surface-container border-r border-md-outline-variant/60 text-md-on-surface">
      {/* 1. Header & Organization Identity */}
      <div className="flex items-center justify-between gap-3 px-4 h-16 border-b border-md-outline-variant/60 shrink-0 bg-md-surface/60 backdrop-blur-md">
        <Link to="/dashboard" className="flex items-center gap-3 group flex-1 min-w-0">
          <div className="w-10 h-10 rounded-md3-md bg-md-primary-container text-md-on-primary-container flex items-center justify-center shrink-0 shadow-sm border border-md-primary/10 group-hover:scale-105 transition-transform">
            {headerLoading ? (
              <div className="w-6 h-6 rounded bg-md-surface-variant animate-pulse" />
            ) : companyLogo ? (
              <img src={companyLogo} alt={companyName || "شعار المنشأة"} className="w-7 h-7 object-contain rounded-md" />
            ) : (
              <img src={tawzeefLogo} alt="Tawzeef-X" className="w-7 h-7 object-contain" />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-black text-md-on-surface leading-tight truncate">
              {companyName || "Tawzeef-X"}
            </span>
            <span className="text-[10px] font-bold text-md-primary tracking-wider">
              {workspace === "recruitment" ? "منظومة الاستقطاب" : "إدارة المهام والأداء"}
            </span>
          </div>
        </Link>
        <button onClick={() => setMobileOpen(false)} className="lg:hidden text-md-on-surface-variant hover:text-md-on-surface p-1.5 rounded-md3-md hover:bg-md-surface-variant">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 2. Workspace Switcher Pill */}
      <div className="p-3 border-b border-md-outline-variant/40 shrink-0">
        <div className="relative">
          <button
            onClick={() => setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen)}
            className="w-full flex items-center justify-between bg-md-surface hover:bg-md-surface-variant/80 border border-md-outline-variant text-xs rounded-md3-lg py-2 px-3 text-md-on-surface font-bold transition-all shadow-sm"
          >
            <span className="flex items-center gap-2">
              {workspace === "recruitment" ? (
                <>
                  <Target className="w-4 h-4 text-md-primary shrink-0" />
                  <span className="text-[11px]">{locale === "en" ? "Recruitment System" : "نظام التوظيف والتعيين"}</span>
                </>
              ) : (
                <>
                  <ClipboardList className="w-4 h-4 text-md-secondary shrink-0" />
                  <span className="text-[11px]">{locale === "en" ? "Tasks & Performance" : "إدارة المهام والأداء"}</span>
                </>
              )}
            </span>
            <ChevronDown className={cn("w-3.5 h-3.5 text-md-on-surface-variant transition-transform duration-200", isWorkspaceDropdownOpen ? "rotate-180" : "")} />
          </button>

          <AnimatePresence>
            {isWorkspaceDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsWorkspaceDropdownOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full mt-1.5 w-full bg-md-surface border border-md-outline-variant shadow-md3-3 rounded-md3-xl p-1.5 z-50 flex flex-col gap-1"
                >
                  <button
                    onClick={() => { handleWorkspaceChange("recruitment"); setIsWorkspaceDropdownOpen(false); }}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-xs rounded-md3-md text-right font-bold transition-colors",
                      workspace === "recruitment" ? "bg-md-primary-container text-md-on-primary-container" : "text-md-on-surface hover:bg-md-surface-variant"
                    )}
                  >
                    <Target className="w-4 h-4 text-md-primary shrink-0" />
                    <span className="flex-1">{locale === "en" ? "Recruitment System" : "نظام التوظيف والتعيين"}</span>
                  </button>
                  <button
                    onClick={() => { handleWorkspaceChange("enterprise"); setIsWorkspaceDropdownOpen(false); }}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-xs rounded-md3-md text-right font-bold transition-colors",
                      workspace === "enterprise" ? "bg-md-secondary-container text-md-on-secondary-container" : "text-md-on-surface hover:bg-md-surface-variant"
                    )}
                  >
                    <ClipboardList className="w-4 h-4 text-md-secondary shrink-0" />
                    <span className="flex-1">{locale === "en" ? "Tasks & Performance" : "إدارة المهام والأداء"}</span>
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 3. Navigation Groups (MD3 Drawer) */}
      <nav className="flex-1 py-3 px-2 space-y-4 overflow-y-auto custom-scrollbar" data-tour="sidebar">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) => {
            const itemWorkspaces = item.workspaces || ["recruitment"];
            const allowedRoles = item.roles || ["admin", "recruiter", "reviewer"];
            const isSuperAdminOnly = (item as any).superAdminOnly;
            if (isSuperAdminOnly && !isSuperAdmin) return false;
            return itemWorkspaces.includes(workspace) && allowedRoles.includes(role) && hasScreenAccess(item.path);
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={group.id} className="space-y-1">
              <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-md-on-surface-variant/70">
                {locale === "en" ? group.labelEn : group.labelAr}
              </div>
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className="block relative group"
                      data-tour={tourIdMap[item.path]}
                      onMouseEnter={() => prefetchRoute(item.path)}
                      onFocus={() => prefetchRoute(item.path)}
                      onTouchStart={() => prefetchRoute(item.path)}
                    >
                      <div
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-md3-full transition-all duration-200 text-xs font-bold relative",
                          isActive
                            ? "bg-md-primary text-md-on-primary shadow-sm"
                            : "text-md-on-surface-variant hover:text-md-on-surface hover:bg-md-surface-variant/70"
                        )}
                      >
                        <item.icon
                          className={cn(
                            "w-4 h-4 shrink-0 transition-transform group-hover:scale-110",
                            isActive ? "text-md-on-primary" : "text-md-on-surface-variant group-hover:text-md-primary"
                          )}
                        />
                        <span className="flex-1 truncate">{t(item.labelKey)}</span>

                        {item.path === "/notifications" && unreadNotifCount > 0 && (
                          <span className={cn(
                            "flex items-center justify-center min-w-[18px] h-4 px-1 rounded-full text-[9px] font-black",
                            isActive ? "bg-white text-md-primary" : "bg-destructive text-destructive-foreground shadow-sm"
                          )}>
                            {unreadNotifCount > 99 ? "99+" : unreadNotifCount}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* 4. Footer & Profile Bar */}
      <div className="p-3 border-t border-md-outline-variant/60 space-y-2 shrink-0 bg-md-surface/40">
        {/* Quick Language & Theme Buttons */}
        <div className="flex items-center justify-between gap-1 bg-md-surface rounded-md3-lg p-1 border border-md-outline-variant/50 text-[11px]">
          <button
            onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-md-on-surface font-bold hover:bg-md-surface-variant transition-colors"
          >
            <Globe className="w-3.5 h-3.5 text-md-primary" />
            <span>{locale === "ar" ? "English" : "العربية"}</span>
          </button>

          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-md-on-surface font-bold hover:bg-md-surface-variant transition-colors"
          >
            {theme === "dark" ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-700" />}
            <span>{theme === "dark" ? "فاتح" : "داكن"}</span>
          </button>
        </div>

        {/* User Card */}
        {user && (
          <div className="px-3 py-2.5 flex items-center gap-2.5 rounded-md3-xl bg-md-surface border border-md-outline-variant shadow-sm">
            <div className="relative shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-8 h-8 rounded-md3-md object-cover border border-md-outline-variant" />
              ) : (
                <div className="w-8 h-8 rounded-md3-md bg-md-primary-container text-md-on-primary-container flex items-center justify-center font-bold text-xs">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-md-surface" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-md-on-surface font-black truncate">{displayName}</p>
              <p className="text-[10px] text-md-on-surface-variant truncate">{jobTitle || roleLabels[role] || "مسؤول التوظيف"}</p>
            </div>
            <button
              onClick={signOut}
              title="تسجيل الخروج"
              className="p-1.5 text-md-on-surface-variant hover:text-destructive rounded-md hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className={cn("flex min-h-screen bg-md-surface text-md-on-surface font-sans antialiased selection:bg-md-primary selection:text-md-on-primary", dir === "rtl" ? "text-right" : "text-left")} dir={dir}>
      {/* Desktop Navigation Drawer */}
      <aside className={cn(
        "hidden lg:flex fixed top-0 z-40 h-screen w-64 flex-col",
        dir === "rtl" ? "right-0" : "left-0"
      )}>
        <SidebarContent />
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: dir === "rtl" ? "100%" : "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: dir === "rtl" ? "100%" : "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className={cn(
                "absolute top-0 h-full w-72 shadow-2xl z-50",
                dir === "rtl" ? "right-0" : "left-0"
              )}
            >
              <SidebarContent />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className={cn("flex-1 min-w-0 flex flex-col", dir === "rtl" ? "lg:mr-64" : "lg:ml-64")}>
        {/* Desktop Top App Bar */}
        <header className="sticky top-0 z-30 hidden lg:flex items-center justify-between h-16 px-6 bg-md-surface/85 backdrop-blur-xl border-b border-md-outline-variant/60">
          {/* Quick Search Pill (Command Palette Trigger) + Company Switcher */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCmdOpen(true)}
              className="flex items-center gap-3 bg-md-surface-container hover:bg-md-surface-container-high border border-md-outline-variant text-md-on-surface-variant px-4 py-2 rounded-md3-full text-xs font-medium w-80 transition-all shadow-sm group"
            >
              <Search className="w-4 h-4 text-md-primary group-hover:scale-110 transition-transform" />
              <span className="flex-1 text-right">بحث سريع بالمرشحين والوظائف...</span>
              <kbd className="bg-md-surface px-1.5 py-0.5 rounded text-[10px] font-mono border border-md-outline-variant">⌘K</kbd>
            </button>

            {/* Active Company / Tenant Workspace Switcher */}
            <CompanySwitcher />
          </div>

          {/* Right Action Icons & Status */}
          <div className="flex items-center gap-3">
            <Link
              to="/jobs?action=new"
              className="bg-md-primary text-md-on-primary text-xs font-black px-4 py-2 rounded-md3-full shadow-sm hover:shadow-md3-2 hover:scale-105 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>شاغر جديد</span>
            </Link>

            <Link
              to="/notifications"
              className="relative p-2 rounded-md3-full bg-md-surface-container hover:bg-md-surface-variant text-md-on-surface transition-colors"
              title="الإشعارات"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full animate-pulse" />
              )}
            </Link>

            <button
              onClick={startTour}
              className="px-3 py-1.5 rounded-md3-full bg-md-secondary-container text-md-on-secondary-container text-xs font-bold hover:bg-md-secondary-container/80 transition-colors"
            >
              جولة المنصة
            </button>
          </div>
        </header>

        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-md-surface/90 backdrop-blur-xl border-b border-md-outline-variant">
          <div className="flex items-center gap-2">
            <img src={tawzeefLogo} alt="Tawzeef-X" className="w-7 h-7 object-contain" />
            <CompanySwitcher />
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setCmdOpen(true)} className="p-2 rounded-md3-md text-md-on-surface hover:bg-md-surface-variant">
              <Search className="w-4 h-4" />
            </button>
            <Link to="/notifications" className="relative p-2 rounded-md3-md text-md-on-surface hover:bg-md-surface-variant">
              <Bell className="w-4 h-4" />
              {unreadNotifCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
              )}
            </Link>
            <button onClick={() => setMobileOpen(true)} className="p-2 rounded-md3-md text-md-on-surface hover:bg-md-surface-variant">
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Page Content Container */}
        <div data-tour="main-content" className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto pb-20 lg:pb-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Bottom Nav & Palettes */}
      <BottomNav />
      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
      <OnboardingTour active={showTour} onEnd={endTour} />
    </div>
  );
}
