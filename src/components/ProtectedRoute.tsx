import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { PageSkeleton } from "@/components/Skeletons";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <PageSkeleton />;
  if (!user) return <Navigate to="/auth" replace />;

  return <>{children}</>;
}
