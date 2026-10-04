import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyMembers } from "@/hooks/useCompanies";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export default function CandidateReviewerBadge({ candidateId, companyId }: { candidateId: string; companyId?: string | null }) {
  const { user } = useAuth();
  const members = useCompanyMembers(companyId || undefined);
  const assignment = useQuery({
    queryKey: ["candidate-reviewer", user?.id, companyId, candidateId],
    enabled: !!user && !!companyId && !!candidateId,
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase.from("candidate_reviewer_assignments")
        .select("reviewer_id").eq("company_id", companyId!).eq("candidate_id", candidateId).maybeSingle();
      if (error) throw error;
      return data as unknown as { reviewer_id: string } | null;
    },
  });
  if (assignment.error) return <span className="text-xs text-destructive">تعذر تحميل المراجع المعيّن</span>;
  if (!assignment.data) return null;
  const member = members.data?.find(item => item.user_id === assignment.data?.reviewer_id);
  return <Badge variant="outline">المراجع المعيّن: {member?.profiles?.full_name || assignment.data.reviewer_id}</Badge>;
}
