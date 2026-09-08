import { lazy, Suspense } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { DashboardSkeleton } from "@/components/Skeletons";
import { useUserRole } from "@/hooks/useUserRole";
import ReviewerDashboard from "@/components/ReviewerDashboard";

const AdminDashboard = lazy(() => import("@/components/AdminDashboard"));
const RecruiterDashboard = lazy(() => import("@/components/RecruiterDashboard"));

export default function Dashboard() {
  const { isAdmin, isReviewer, isLoading: roleLoading } = useUserRole();

  if (roleLoading) {
    return (
      <DashboardLayout>
        <DashboardSkeleton />
      </DashboardLayout>
    );
  }

  if (isAdmin) return <DashboardLayout><Suspense fallback={<DashboardSkeleton />}><AdminDashboard /></Suspense></DashboardLayout>;
  if (isReviewer) return <DashboardLayout><ReviewerDashboard /></DashboardLayout>;

  return (
    <DashboardLayout>
      <Suspense fallback={<DashboardSkeleton />}>
        <RecruiterDashboard />
      </Suspense>
    </DashboardLayout>
  );
}
