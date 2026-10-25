import { useQuery, useQueryClient } from "@tanstack/react-query";
import { accountHome, checkCompanyStatus } from "@/lib/accountAccess";
import { Button } from "@/components/ui/button";
import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useLocation } from "react-router-dom";
import { PageSkeleton } from "@/components/Skeletons";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const location = useLocation();
  const client = useQueryClient();
  const wasWaiting = useRef(false);
  const access = useQuery({
    queryKey: ["account-access", user?.id],
    queryFn: () => checkCompanyStatus(user),
    enabled: !!user,
    staleTime: 0,
    refetchInterval: 30000,
    retry: false,
  });

  useEffect(() => {
    if (wasWaiting.current && access.data?.allowed && !access.data.registrationRequired && !access.data.onboardingRequired) {
      void client.invalidateQueries({ queryKey: ["my-companies", user?.id] });
      void client.invalidateQueries({ queryKey: ["agency-tenant-watchdog", user?.id] });
    }
    wasWaiting.current = access.data?.registrationRequired === true;
  }, [access.data, client, user?.id]);

  useEffect(() => {
    let el = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute("name", "robots");
      document.head.appendChild(el);
    }
    el.setAttribute("content", "noindex, nofollow");
  }, []);

  if (loading) return <PageSkeleton />;
  if (!user) return <Navigate to="/auth" replace />;

  if (access.isPending) return <PageSkeleton />;
  if (access.isError || !access.data?.allowed) return <main dir="rtl" className="p-8 space-y-4">
    <p role="alert">{access.data?.reason || "تعذر التحقق من صلاحية الحساب."}</p>
    <Button onClick={() => access.refetch()}>إعادة المحاولة</Button>
    <Button variant="outline" onClick={signOut}>تسجيل الخروج</Button>
  </main>;
  const home = accountHome(access.data);
  const limited = access.data.registrationRequired || access.data.onboardingRequired || access.data.isApplicant;
  if (limited && location.pathname !== home && !(access.data.isApplicant && location.pathname === "/seeker-dashboard")) {
    return <Navigate to={home} replace />;
  }
  if (!limited && ["/company-registration", "/onboarding"].includes(location.pathname)) return <Navigate to={home} replace />;
  return <>{children}</>;
}
