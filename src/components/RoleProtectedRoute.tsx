import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole, AppRole } from "@/hooks/useUserRole";
import { useScreenPermissions } from "@/hooks/useScreenPermissions";
import { PageSkeleton } from "@/components/Skeletons";
import Unauthorized from "@/pages/Unauthorized";

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
  superAdminOnly?: boolean;
  screenPath?: string;
}

export default function RoleProtectedRoute({ children, allowedRoles, superAdminOnly, screenPath }: RoleProtectedRouteProps) {
  const { user, loading } = useAuth();
  const { role, isSuperAdmin, isLoading: roleLoading } = useUserRole();
  const { hasScreenAccess, isLoading: permLoading } = useScreenPermissions();
  const location = useLocation();

  useEffect(() => {
    let el = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute("name", "robots");
      document.head.appendChild(el);
    }
    el.setAttribute("content", "noindex, nofollow");
  }, []);

  if (loading || roleLoading || permLoading) return <PageSkeleton />;
  if (!user) return <Navigate to="/auth" replace />;

  // 1) Super Admin Only Check
  if (superAdminOnly && !isSuperAdmin) {
    return <Unauthorized />;
  }

  // 2) Check static allowed roles
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Unauthorized />;
  }

  // 3) Check DB permissions
  const pathToCheck = screenPath || location.pathname.replace(/\/[^/]+$/, "") || location.pathname;
  if (!hasScreenAccess(pathToCheck) && !hasScreenAccess(location.pathname)) {
    return <Unauthorized />;
  }

  return <>{children}</>;
}
