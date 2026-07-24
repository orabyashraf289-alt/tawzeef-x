import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Briefcase, Users, Kanban, Bot,
  CheckSquare, Target, Settings, Map
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useI18n } from "@/contexts/I18nContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useScreenPermissions } from "@/hooks/useScreenPermissions";

export default function BottomNav() {
  const location = useLocation();
  const { t } = useI18n();
  const { isJobSeeker, isAdmin } = useUserRole();
  const { hasScreenAccess } = useScreenPermissions();

  const workspace = localStorage.getItem("active-workspace") || "recruitment";

  // Build items dynamically
  let items: Array<{ icon: any; labelKey: string; path: string }> = [];

  if (isJobSeeker) {
    items = [
      { icon: LayoutDashboard, labelKey: "nav.dashboard", path: "/seeker-dashboard" },
      { icon: Briefcase, labelKey: "nav.jobs", path: "/careers" },
      { icon: Settings, labelKey: "nav.settings", path: "/settings" },
    ];
  } else {
    // Admin, Recruiter, Reviewer
    if (workspace === "enterprise") {
      items = [
        { icon: LayoutDashboard, labelKey: "nav.dashboard", path: "/dashboard" },
        { icon: CheckSquare, labelKey: "nav.tasks", path: "/tasks" },
        { icon: Target, labelKey: "nav.evaluation", path: "/evaluation" },
      ];
      // Admin gets Team Management, Recruiter gets Hiring Plan, others get Settings
      if (isAdmin && hasScreenAccess("/team")) {
        items.push({ icon: Users, labelKey: "nav.team", path: "/team" });
      } else if (hasScreenAccess("/hiring-plan")) {
        items.push({ icon: Target, labelKey: "nav.hiringPlan", path: "/hiring-plan" });
      }
      
      // Super Admin gets Roadmap, others get Settings
      if (isSuperAdmin && hasScreenAccess("/roadmap")) {
        items.push({ icon: Map, labelKey: "nav.roadmap", path: "/roadmap" });
      } else {
        items.push({ icon: Settings, labelKey: "nav.settings", path: "/settings" });
      }
    } else {
      // Recruitment workspace
      items = [
        { icon: LayoutDashboard, labelKey: "nav.dashboard", path: "/dashboard" },
        { icon: Briefcase, labelKey: "nav.jobs", path: "/jobs" },
        { icon: Users, labelKey: "nav.candidates", path: "/candidates" },
        { icon: Kanban, labelKey: "nav.pipeline", path: "/pipeline" },
      ];
      
      if (hasScreenAccess("/ai-assistant")) {
        items.push({ icon: Bot, labelKey: "nav.aiAssistant", path: "/ai-assistant" });
      } else {
        items.push({ icon: Settings, labelKey: "nav.settings", path: "/settings" });
      }
    }
  }

  // Filter items to ensure user actually has permission to visit the path
  const filteredItems = items.filter(item => hasScreenAccess(item.path));

  // If filteredItems is empty (e.g. during auth loading), fallback to basic
  const finalItems = filteredItems.length > 0 ? filteredItems : [
    { icon: LayoutDashboard, labelKey: "nav.dashboard", path: isJobSeeker ? "/seeker-dashboard" : "/dashboard" }
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-card/95 backdrop-blur-xl border-t border-border/50 safe-area-bottom">
      <div className="flex items-center justify-around h-14 px-1">
        {finalItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className="relative flex flex-col items-center justify-center flex-1 h-full"
            >
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-indicator"
                  className="absolute top-0 w-8 h-[3px] bg-primary rounded-b-full"
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                />
              )}
              <item.icon
                className={cn(
                  "w-5 h-5 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              />
              <span
                className={cn(
                  "text-[10px] mt-0.5 font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {t(item.labelKey)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
