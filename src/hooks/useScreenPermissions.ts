import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useCompany } from "@/contexts/CompanyContext";
import {
  type PermissionRow,
  evaluateScreenAccess,
  evaluateActionPermission,
  SCREEN_PERMISSIONS,
  PUBLIC_ROUTES,
  PLATFORM_ADMIN_ROUTES,
  isGranularScreenDenied,
  type GranularPermissionRow,
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
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const { role, isSuperAdmin, isPlatformSuperAdmin, isLoading: roleLoading } = useUserRole();
  const { data: permissions, isLoading: permLoading, isError } = useAllPermissions();
  const granular = useQuery({
    queryKey: ["granular-screen-permissions", activeCompanyId, user?.id, role],
    enabled: !!user && !!activeCompanyId && !roleLoading,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("granular_permissions")
        .select("role_key,user_id,module_key,can_read")
        .eq("company_id", activeCompanyId!)
        .in("role_key", [role, `user:${user!.id}`]);
      if (error) throw error;
      return data as GranularPermissionRow[];
    },
    staleTime: 60 * 1000,
  });

  const operations = useQuery({
    queryKey: ["hiring-operation-permissions", activeCompanyId, user?.id],
    enabled: !!user && !!activeCompanyId,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_hiring_permissions", { _company: activeCompanyId });
      if (error) throw error;
      return data as Record<string, Record<string, boolean>>;
    },
    staleTime: 30000,
  });
  const hasHiringPermission = (module: string, action: "read" | "create" | "edit" | "delete") =>
    !!activeCompanyId && !operations.isLoading && !operations.isError && operations.data?.[module]?.[action] === true;

  const isLoading = roleLoading || permLoading || (!!activeCompanyId && granular.isLoading);

  const hasScreenAccess = (path: string): boolean => {
    const baseline = evaluateScreenAccess({
      pathname: path,
      role,
      isPlatformSuperAdmin: isPlatformSuperAdmin ?? isSuperAdmin,
      isCandidate: role === "job_seeker",
      permissions,
      isLoading,
      isError: isError || (!!activeCompanyId && granular.isError),
    });
    if (!baseline || isPlatformSuperAdmin) return baseline;
    return !isGranularScreenDenied(path, role, user?.id, granular.data || []);
  };

  const hasActionPermission = (actionKey: string): boolean => {
    if (isLoading) return false; // Fail-closed while loading
    const baseline = evaluateActionPermission({
      actionKey,
      role,
      isPlatformSuperAdmin: isPlatformSuperAdmin ?? isSuperAdmin,
      permissions,
    });
    const actionMap: Record<string, [string, "create" | "edit" | "delete"]> = {
      "action.edit_jobs": ["jobs", "edit"], "action.delete_jobs": ["jobs", "delete"],
      "action.edit_candidates": ["candidates", "edit"], "action.candidates.delete": ["candidates", "delete"],
      "action.create_interviews": ["interviews", "create"], "action.edit_interviews": ["interviews", "edit"],
    };
    const mapped = actionMap[actionKey];
    return baseline && (!mapped || hasHiringPermission(mapped[0], mapped[1]));
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
    hasHiringPermission,
    getScreenPermissions,
    getActionPermissions,
    permissions,
    isLoading,
    role,
  };
}
