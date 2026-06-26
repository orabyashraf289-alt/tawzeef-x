import DashboardLayout from "@/components/DashboardLayout";
import { DashboardSkeleton } from "@/components/Skeletons";
import { useUserRole } from "@/hooks/useUserRole";
import ReviewerDashboard from "@/components/ReviewerDashboard";
import AdminDashboard from "@/components/AdminDashboard";
import RecruiterDashboard from "@/components/RecruiterDashboard";

export default function Dashboard() {
  const { isAdmin, isReviewer, isLoading: roleLoading } = useUserRole();

  if (roleLoading) {
    return (
      <DashboardLayout>
        <DashboardSkeleton />
      </DashboardLayout>
    );
  }

  if (isAdmin) return <DashboardLayout><AdminDashboard /></DashboardLayout>;
  if (isReviewer) return <DashboardLayout><ReviewerDashboard /></DashboardLayout>;

  return (
    <DashboardLayout>
      <RecruiterDashboard />
    </DashboardLayout>
  );
}
