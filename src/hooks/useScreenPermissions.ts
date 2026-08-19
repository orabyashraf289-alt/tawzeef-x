import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole, type AppRole } from "@/hooks/useUserRole";

export interface PermissionRow {
  permission_key: string;
  description: string;
  admin: boolean;
  recruiter: boolean;
  reviewer: boolean;
}

// Map route paths to permission keys
const ROUTE_PERMISSION_MAP: Record<string, string> = {
  "/dashboard": "screen.dashboard",
  "/jobs": "screen.jobs",
  "/candidates": "screen.candidates",
  "/pipeline": "screen.pipeline",
  "/interviews": "screen.interviews",
  "/offers": "screen.offers",
  "/reports": "screen.reports",
  "/hiring-plan": "screen.hiring_plan",
  "/notifications": "screen.notifications",
  "/ai-assistant": "screen.ai_assistant",
  "/talent-pool": "screen.talent_pool",
  "/team": "screen.team",
  "/audit-log": "screen.audit_log",
  "/tutorial": "screen.tutorial",
  "/settings": "screen.settings",
  "/roadmap": "screen.roadmap",
  "/tasks": "screen.tasks",
  "/task-board": "screen.tasks",
  "/evaluation": "screen.evaluation",
  "/performance-evaluation": "screen.evaluation",
};

// Sub-routes map to parent screen permission
const SUB_ROUTE_MAP: Record<string, string> = {
  "/jobs/:id": "screen.jobs",
  "/candidates/:id": "screen.candidates",
};

export function useAllPermissions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["role-permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_permissions" as any)
        .select("*")
        .order("permission_key");
      if (error) throw error;
      return (data as any[]).map((d: any) => ({
        permission_key: d.permission_key,
        description: d.description || "",
        admin: d.admin,
        recruiter: d.recruiter,
        reviewer: d.reviewer,
      })) as PermissionRow[];
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useScreenPermissions() {
  const { role, isSuperAdmin } = useUserRole();
  const { data: permissions, isLoading } = useAllPermissions();

  const hasScreenAccess = (path: string): boolean => {
    if (isSuperAdmin) return true; // Super Admin has unhindered access to 100% of all screens
    if (role === "admin") return true; // Admin has full default access to company screens

    if (!permissions) return false;

    const permKey = ROUTE_PERMISSION_MAP[path] || SUB_ROUTE_MAP[path];
    if (!permKey) return true; // Unknown routes are accessible

    const perm = permissions.find(p => p.permission_key === permKey);
    if (!perm) return true; // If no permission row, allow access

    const roleKey = role as "admin" | "recruiter" | "reviewer";
    return perm[roleKey] ?? false;
  };

  const hasActionPermission = (actionKey: string): boolean => {
    if (isSuperAdmin || role === "admin") return true;
    if (!permissions) return false;
    const perm = permissions.find(p => p.permission_key === actionKey);
    if (!perm) return true;
    const roleKey = role as "admin" | "recruiter" | "reviewer";
    return perm[roleKey] ?? false;
  };

  const getScreenPermissions = () => {
    return (permissions || []).filter(p => p.permission_key.startsWith("screen."));
  };

  const getActionPermissions = () => {
    return (permissions || []).filter(p => p.permission_key.startsWith("action."));
  };

  return {
    hasScreenAccess,
    hasActionPermission,
    getScreenPermissions,
    getActionPermissions,
    permissions,
    isLoading,
    role,
  };
}

export { ROUTE_PERMISSION_MAP, SUB_ROUTE_MAP };
