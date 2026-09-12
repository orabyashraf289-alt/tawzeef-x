import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import {
  type PermissionRow,
  evaluateScreenAccess,
  evaluateActionPermission,
  SCREEN_PERMISSIONS,
  PUBLIC_ROUTES,
  PLATFORM_ADMIN_ROUTES,
} from "@/lib/permissionsRegistry";

export type { PermissionRow };

// Backward-compatibility export of route maps
export const ROUTE_PERMISSION_MAP: Record<string, string> = Object.entries(
  SCREEN_PERMISSIONS
).reduce((acc, [path, cfg]) => {
  acc[path] = cfg.key;
  return acc;
}, {} as Record<string, string>);

export const SUB_ROUTE_MAP: Record<string, string> = {
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
        admin: Boolean(d.admin),
        recruiter: Boolean(d.recruiter),
        reviewer: Boolean(d.reviewer),
      })) as PermissionRow[];
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Hook for screen and action permissions implementing strict DENY-BY-DEFAULT
 */
export function useScreenPermissions() {
  const { role, isSuperAdmin, isPlatformSuperAdmin, isLoading: roleLoading } = useUserRole();
  const { data: permissions, isLoading: permLoading, isError } = useAllPermissions();

  const isLoading = roleLoading || permLoading;

  const hasScreenAccess = (path: string): boolean => {
    return evaluateScreenAccess({
      pathname: path,
      role,
      isPlatformSuperAdmin: isPlatformSuperAdmin ?? isSuperAdmin,
      isCandidate: role === "job_seeker",
      permissions,
      isLoading,
      isError,
    });
  };

  const hasActionPermission = (actionKey: string): boolean => {
    if (isLoading) return false; // Fail-closed while loading
    return evaluateActionPermission({
      actionKey,
      role,
      isPlatformSuperAdmin: isPlatformSuperAdmin ?? isSuperAdmin,
      permissions,
    });
  };

  const getScreenPermissions = () => {
    return (permissions || []).filter((p) => p.permission_key.startsWith("screen."));
  };

  const getActionPermissions = () => {
    return (permissions || []).filter((p) => p.permission_key.startsWith("action."));
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
