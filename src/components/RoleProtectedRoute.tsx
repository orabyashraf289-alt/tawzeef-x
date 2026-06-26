import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole, AppRole } from "@/hooks/useUserRole";
import { useScreenPermissions } from "@/hooks/useScreenPermissions";
import { PageSkeleton } from "@/components/Skeletons";
import Unauthorized from "@/pages/Unauthorized";

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
  screenPath?: string;
}

export default function RoleProtectedRoute({ children, allowedRoles, screenPath }: RoleProtectedRouteProps) {
  const { user, loading } = useAuth();
  const { role, isLoading: roleLoading } = useUserRole();
  const { hasScreenAccess, isLoading: permLoading } = useScreenPermissions();
  const location = useLocation();

  if (loading || roleLoading || permLoading) return <PageSkeleton />;
  if (!user) return <Navigate to="/auth" replace />;

  // Use DB-driven permissions via screenPath or current pathname
  const pathToCheck = screenPath || location.pathname.replace(/\/[^/]+$/, "") || location.pathname;
  
  // Check DB permissions first
  if (!hasScreenAccess(pathToCheck) && !hasScreenAccess(location.pathname)) {
    // Fallback: also check allowedRoles for backward compatibility
    if (allowedRoles && !allowedRoles.includes(role)) {
      return <Unauthorized />;
    }
    if (!allowedRoles) {
      return <Unauthorized />;
    }
  }

  return <>{children}</>;
}
