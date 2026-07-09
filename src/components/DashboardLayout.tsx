import { ReactNode, useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Briefcase, Users, Bot, Settings, Menu, Calendar, BarChart3, Bell, LogOut, X, Kanban, Crown, UserCog, FileText, Sun, Moon, Monitor, Target, Globe, GraduationCap, Shield, Star, Download, BookOpen, GitBranch, Map, Search, Archive, Building2, Handshake, ClipboardList, ShieldCheck, ChevronDown, CheckSquare,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useScreenPermissions } from "@/hooks/useScreenPermissions";
import { useTheme } from "@/contexts/ThemeContext";
import { useI18n } from "@/contexts/I18nContext";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import tawzeefLogo from "@/assets/tawzeef-x-logo.png";
import OnboardingTour, { useOnboardingTour, TourTriggerButton } from "@/components/OnboardingTour";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import BottomNav from "@/components/BottomNav";
import CommandPalette, { useCommandPalette } from "@/components/CommandPalette";
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

const allNavItems = [
  { icon: LayoutDashboard, labelKey: "nav.dashboard", path: "/dashboard", roles: ["admin", "recruiter", "reviewer"], workspaces: ["recruitment", "enterprise"] },
  { icon: CheckSquare, labelKey: "nav.tasks", path: "/tasks", roles: ["admin", "recruiter", "reviewer"], workspaces: ["enterprise"] },
  { icon: Target, labelKey: "nav.evaluation", path: "/evaluation", roles: ["admin", "recruiter", "reviewer"], workspaces: ["enterprise"] },
  { icon: Briefcase, labelKey: "nav.jobs", path: "/jobs", roles: ["admin", "recruiter"], workspaces: ["recruitment"] },
  { icon: Users, labelKey: "nav.candidates", path: "/candidates", roles: ["admin", "recruiter", "reviewer"], workspaces: ["recruitment"] },
  { icon: Kanban, labelKey: "nav.pipeline", path: "/pipeline", roles: ["admin", "recruiter"], workspaces: ["recruitment"] },
  { icon: Calendar, labelKey: "nav.interviews", path: "/interviews", roles: ["admin", "recruiter", "reviewer"], workspaces: ["recruitment"] },
  { icon: FileText, labelKey: "nav.offers", path: "/offers", roles: ["admin", "recruiter"], workspaces: ["recruitment"] },
  { icon: BarChart3, labelKey: "nav.reports", path: "/reports", roles: ["admin", "recruiter"], workspaces: ["recruitment"] },
  { icon: Target, labelKey: "nav.hiringPlan", path: "/hiring-plan", roles: ["admin", "recruiter"], workspaces: ["enterprise"] },
  { icon: Bell, labelKey: "nav.notifications", path: "/notifications", roles: ["admin", "recruiter", "reviewer"], workspaces: ["recruitment", "enterprise"] },
  { icon: Bot, labelKey: "nav.aiAssistant", path: "/ai-assistant", roles: ["admin", "recruiter"], workspaces: ["recruitment"] },
  { icon: Star, labelKey: "nav.talentPool", path: "/talent-pool", roles: ["admin", "recruiter"], workspaces: ["recruitment"] },
  { icon: Archive, labelKey: "nav.resumeArchive", path: "/resume-archive", roles: ["admin", "recruiter", "reviewer"], workspaces: ["recruitment"] },
  { icon: BookOpen, labelKey: "nav.questionBank", path: "/question-bank", roles: ["admin", "recruiter"], workspaces: ["recruitment", "enterprise"] },
  { icon: GitBranch, labelKey: "nav.workflow", path: "/workflow", roles: ["admin", "recruiter"], workspaces: ["recruitment"] },
  { icon: ClipboardList, labelKey: "nav.checklistTracker", path: "/checklist-tracker", roles: ["admin", "recruiter"], workspaces: ["recruitment"] },

  { icon: Building2, labelKey: "nav.company", path: "/company", roles: ["admin", "recruiter", "reviewer"], workspaces: ["recruitment"] },
  { icon: Handshake, labelKey: "nav.agency", path: "/agency", roles: ["admin", "recruiter", "reviewer"], workspaces: ["recruitment"] },
  { icon: UserCog, labelKey: "nav.team", path: "/team", roles: ["admin"], workspaces: ["enterprise"] },
  { icon: Building2, labelKey: "nav.adminCompanies", path: "/admin/companies", roles: ["admin"], workspaces: ["enterprise"] },
  { icon: Handshake, labelKey: "nav.adminAgencies", path: "/admin/agencies", roles: ["admin"], workspaces: ["enterprise"] },
  { icon: Shield, labelKey: "nav.auditLog", path: "/audit-log", roles: ["admin", "recruiter"], workspaces: ["enterprise"] },
  { icon: ShieldCheck, labelKey: "nav.qualityReport", path: "/admin/quality", roles: ["admin"], workspaces: ["enterprise"] },
  { icon: Map, labelKey: "nav.roadmap", path: "/roadmap", roles: ["admin"], workspaces: ["enterprise"] },
  { icon: GraduationCap, labelKey: "nav.tutorial", path: "/tutorial", roles: ["admin", "recruiter", "reviewer"], workspaces: ["recruitment"] },
  { icon: Download, labelKey: "nav.install", path: "/install", roles: ["admin", "recruiter", "reviewer"], workspaces: ["recruitment"] },
  { icon: Settings, labelKey: "nav.settings", path: "/settings", roles: ["admin", "recruiter", "reviewer"], workspaces: ["recruitment", "enterprise"] },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [navLoading, setNavLoading] = useState(false);
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { role, isAdmin } = useUserRole();
  const { hasScreenAccess } = useScreenPermissions();
  const { theme, setTheme } = useTheme();
  const { locale, setLocale, t, dir } = useI18n();
  const { showTour, startTour, endTour } = useOnboardingTour();
  useKeyboardShortcuts();
  const { open: cmdOpen, setOpen: setCmdOpen } = useCommandPalette();
  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name, avatar_url, job_title, company_name, company_logo").eq("user_id", user!.id).maybeSingle();
      return data as { full_name: string | null; avatar_url: string | null; job_title: string | null; company_name: string | null; company_logo: string | null } | null;
    },
    enabled: !!user,
  });
  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "";
  const avatarUrl = profile?.avatar_url || null;
  const jobTitle = (profile as any)?.job_title || null;
  const companyName = profile?.company_name || user?.user_metadata?.company_name || "";
  const companyLogo = profile?.company_logo || "";

  const [workspace, setWorkspace] = useState<"recruitment" | "enterprise">(() => {
    return (localStorage.getItem("active-workspace") as any) || "recruitment";
  });
  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);

  const handleWorkspaceChange = useCallback((w: "recruitment" | "enterprise") => {
    setWorkspace(w);
    localStorage.setItem("active-workspace", w);
  }, []);

  const navItems = allNavItems.filter(item => {
    const workspaces = (item as any).workspaces || ["recruitment"];
    const allowedRoles = (item as any).roles || ["admin", "recruiter", "reviewer"];
    return workspaces.includes(workspace) && allowedRoles.includes(role) && hasScreenAccess(item.path);
  });


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

  // Real-time subscription for live badge updates
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
    const t = setTimeout(() => setNavLoading(false), 500);
    return () => clearTimeout(t);
  }, [location.pathname]);

  const SidebarContent = () => (
    <>
      {/* Logo / Company Branding */}
      <div className="flex items-center justify-between gap-3 px-5 h-16 border-b border-border/60 shrink-0">
        <Link to="/dashboard" className="flex items-center gap-3 group">
          <div>
            {companyLogo ? (
              <img src={companyLogo} alt={companyName || "شعار الشركة"} className="w-9 h-9 object-contain rounded-xl border border-border/30" />
            ) : (
              <img src={tawzeefLogo} alt="Tawzeef-X" className="w-9 h-9 object-contain" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-[15px] font-black text-foreground leading-tight tracking-wide">
              {companyName || "Tawzeef-X"}
            </span>
            <span className="text-[10px] font-semibold text-primary/50 tracking-[0.15em] uppercase">
              {companyName ? "منصة التوظيف" : "منصة التوظيف"}
            </span>
          </div>
        </Link>
        <button onClick={() => setMobileOpen(false)} className="lg:hidden text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Workspace Switcher */}
      <div className="p-3.5 border-b border-border/40 shrink-0 relative z-30">
        <label className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground/80 px-1.5 block mb-1.5">
          {locale === "en" ? "Active Workspace" : "بيئة العمل النشطة"}
        </label>
        <div className="relative">
          <button
            onClick={() => setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen)}
            className="w-full flex items-center justify-between bg-muted/65 hover:bg-muted/90 border border-border/80 text-xs rounded-xl py-2.5 px-3 text-foreground font-semibold transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-primary/40"
          >
            <span className="flex items-center gap-2">
              {workspace === "recruitment" ? (
                <>
                  <Target className="w-4 h-4 text-primary shrink-0" />
                  <span>{locale === "en" ? "Recruitment System" : "نظام التوظيف والتعيين"}</span>
                </>
              ) : (
                <>
                  <ClipboardList className="w-4 h-4 text-accent shrink-0" />
                  <span>{locale === "en" ? "Tasks & Performance" : "إدارة المهام والأداء"}</span>
                </>
              )}
            </span>
            <ChevronDown className={cn(
              "w-4 h-4 text-muted-foreground transition-transform duration-200",
              isWorkspaceDropdownOpen ? "rotate-180" : ""
            )} />
          </button>

          <AnimatePresence>
            {isWorkspaceDropdownOpen && (
              <>
                {/* Backdrop click helper */}
                <div className="fixed inset-0 z-40" onClick={() => setIsWorkspaceDropdownOpen(false)} />
                
                {/* Dropdown Menu */}
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className={cn(
                    "absolute top-full mt-1.5 w-full bg-card/95 backdrop-blur-md border border-border/80 shadow-xl rounded-xl p-1.5 z-50 flex flex-col gap-1",
                    dir === "rtl" ? "right-0" : "left-0"
                  )}
                >
                  <button
                    onClick={() => {
                      handleWorkspaceChange("recruitment");
                      setIsWorkspaceDropdownOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg text-right font-medium transition-colors",
                      workspace === "recruitment"
                        ? "bg-primary/8 text-primary font-bold animate-pulse-subtle"
                        : "text-foreground hover:bg-muted/80"
                    )}
                  >
                    <Target className="w-4 h-4 text-primary shrink-0" />
                    <span className="flex-1 text-right">{locale === "en" ? "Recruitment System" : "نظام التوظيف والتعيين"}</span>
                    {workspace === "recruitment" && <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                  </button>

                  <button
                    onClick={() => {
                      handleWorkspaceChange("enterprise");
                      setIsWorkspaceDropdownOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg text-right font-medium transition-colors",
                      workspace === "enterprise"
                        ? "bg-accent/8 text-accent font-bold animate-pulse-subtle"
                        : "text-foreground hover:bg-muted/80"
                    )}
                  >
                    <ClipboardList className="w-4 h-4 text-accent shrink-0" />
                    <span className="flex-1 text-right">{locale === "en" ? "Tasks & Performance" : "إدارة المهام والأداء"}</span>
                    {workspace === "enterprise" && <div className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />}
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto" data-tour="sidebar">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className="block relative"
              data-tour={tourIdMap[item.path]}
              onMouseEnter={() => prefetchRoute(item.path)}
              onFocus={() => prefetchRoute(item.path)}
              onTouchStart={() => prefetchRoute(item.path)}
            >
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 text-[13px] font-medium relative overflow-hidden",
                  isActive
                    ? "text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeSidebarNav"
                    className="absolute inset-0 bg-primary/8 rounded-xl"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                {isActive && (
                  <motion.div
                    layoutId="activeSidebarBorder"
                    className={cn(
                      "absolute top-1/2 -translate-y-1/2 w-[3px] h-6 bg-primary rounded-full z-10",
                      dir === "rtl" ? "right-0" : "left-0"
                    )}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-3 w-full">
                  <item.icon className={cn(
                    "w-[18px] h-[18px] flex-shrink-0 transition-colors relative z-10",
                    isActive ? "text-primary" : ""
                  )} />
                  <span className="flex-1 relative z-10">{t(item.labelKey)}</span>
                  {item.path === "/notifications" && unreadNotifCount > 0 && (
                    <span className="relative z-10 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold shadow-sm">
                      <span className="absolute inset-0 rounded-full bg-destructive animate-ping opacity-30" />
                      <span className="relative">{unreadNotifCount > 99 ? "99+" : unreadNotifCount}</span>
                    </span>
                  )}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-border/60 space-y-1.5 shrink-0">
        {/* Language Toggle */}
        <div className="flex items-center justify-center gap-1 p-1 bg-muted/40 rounded-xl mx-1 mb-2">
          {([
            { value: "ar" as const, label: "عربي" },
            { value: "en" as const, label: "EN" },
          ]).map(opt => (
            <button key={opt.value} onClick={() => setLocale(opt.value)}
              className="relative flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors flex-1 justify-center"
            >
              {locale === opt.value && (
                <div className="absolute inset-0 bg-card shadow-sm rounded-lg" />
              )}
              <span className={cn("relative z-10 flex items-center gap-1", locale === opt.value ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
                {opt.value === "ar" && <Globe className="w-3.5 h-3.5" />}
                {opt.label}
              </span>
            </button>
          ))}
        </div>

        {/* Theme Toggle */}
        <div className="flex items-center justify-center gap-1 p-1 bg-muted/40 rounded-xl mx-1 mb-2">
          {([
            { value: "light" as const, icon: Sun, labelKey: "theme.light" },
            { value: "dark" as const, icon: Moon, labelKey: "theme.dark" },
            { value: "system" as const, icon: Monitor, labelKey: "theme.system" },
          ]).map(opt => (
            <button key={opt.value} onClick={() => setTheme(opt.value)}
              className="relative flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors flex-1 justify-center"
              title={t(opt.labelKey)}
            >
              {theme === opt.value && (
                <div className="absolute inset-0 bg-card shadow-sm rounded-lg" />
              )}
              <span className={cn("relative z-10 flex items-center gap-1", theme === opt.value ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
                <opt.icon className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">{t(opt.labelKey)}</span>
              </span>
            </button>
          ))}
        </div>

        {user && (
          <div className="px-3.5 py-3 flex items-center gap-3 rounded-2xl bg-gradient-to-br from-card to-muted/20 border border-border/60 shadow-sm relative overflow-hidden group hover:border-primary/20 hover:shadow-md transition-all duration-300">
            <div className="absolute top-0 right-0 w-8 h-8 bg-primary/5 rounded-full blur-xl pointer-events-none" />
            <div className="relative shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-10 h-10 rounded-xl object-cover border border-border/70" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-border/70 flex items-center justify-center">
                  <Users className="w-4.5 h-4.5 text-primary/80" />
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success ring-2 ring-background flex items-center justify-center">
                <span className="absolute inset-0 rounded-full bg-success animate-ping opacity-75" />
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground font-bold truncate tracking-wide">{displayName}</p>
              <p className="text-[9px] text-muted-foreground truncate leading-tight mt-0.5">{jobTitle || t("role.employee")}</p>
              <div className="mt-1">
                <Badge variant="outline" className="text-[8px] px-1.5 py-0 bg-primary/5 border-primary/20 text-primary font-bold">
                  {roleLabels[role] || role}
                </Badge>
              </div>
            </div>
          </div>
        )}
        <TourTriggerButton onClick={startTour} />
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/8 w-full transition-all duration-200 text-[13px] font-medium group"
        >
          <LogOut className="w-[18px] h-[18px] transition-transform group-hover:translate-x-[-2px] rtl:group-hover:translate-x-[2px]" />
          <span>{t("nav.signOut")}</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-muted/30" dir={dir}>
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden lg:flex fixed top-0 z-40 h-screen w-60 flex-col glass-sidebar shadow-md",
        dir === "rtl" ? "right-0 border-l border-border/55" : "left-0 border-r border-border/55"
      )}>
        <SidebarContent />
      </aside>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: dir === "rtl" ? "100%" : "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: dir === "rtl" ? "100%" : "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className={cn(
                "absolute top-0 h-full w-72 glass-sidebar shadow-2xl flex flex-col",
                dir === "rtl" ? "right-0" : "left-0"
              )}
            >
              <SidebarContent />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className={cn("flex-1 min-w-0", dir === "rtl" ? "lg:mr-60" : "lg:ml-60")}>
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between h-14 px-3 bg-card/90 backdrop-blur-xl border-b border-border/50 safe-area-top">
          <div className="flex items-center gap-2.5">
            <img src={tawzeefLogo} alt="Tawzeef-X" className="w-7 h-7 object-contain" />
            <span className="text-sm font-bold text-foreground">Tawzeef-X</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setCmdOpen(true)} className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Search className="w-5 h-5" />
            </button>
            <Link to="/notifications" className="relative p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Bell className="w-5 h-5" />
              {unreadNotifCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full animate-pulse" />
              )}
            </Link>
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </header>
        
        <AnimatePresence>
          {navLoading && (
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: "95%" }}
              exit={{ width: "100%", opacity: 0 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-primary via-accent to-primary z-50 pointer-events-none"
            />
          )}
        </AnimatePresence>

        <div
          data-tour="main-content"
          className="pb-16 lg:pb-0"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Bottom Navigation (Mobile) */}
      <BottomNav />

      {/* Command Palette (Ctrl+K) */}
      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />

      {/* Onboarding Tour */}
      <OnboardingTour active={showTour} onEnd={endTour} />
    </div>
  );
}
