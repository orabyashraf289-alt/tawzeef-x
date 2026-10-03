import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "@/hooks/use-toast";

export interface AutomationRule {
  id: string;
  company_id: string;
  title: string;
  description?: string;
  trigger_event: "candidate.stage_changed" | "application.created" | "offer.sent" | "sla.expired";
  conditions: Array<{
    field: string;
    operator: "equals" | "greater_than" | "less_than" | "contains";
    value: unknown;
  }>;
  actions: Array<{
    type: "send_email" | "send_whatsapp" | "move_stage" | "assign_reviewer" | "trigger_webhook";
    payload: Record<string, unknown>;
  }>;
  is_active: boolean;
  created_at?: string;
}

export type AutomationRuleDraft = Omit<AutomationRule, "id" | "company_id" | "is_active" | "created_at">;

export function useAutomationRules() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();

  const ownerQuery = useQuery({
    queryKey: ["automation-owner", user?.id, activeCompanyId],
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_company_owner", { _company_id: activeCompanyId! });
      if (error) throw error;
      return data === true;
    },
    enabled: !!user && !!activeCompanyId,
  });

  const rulesQuery = useQuery({
    queryKey: ["automation-rules", user?.id, activeCompanyId],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("automation_rules" as any)
        .select("*")
        .eq("company_id", activeCompanyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as AutomationRule[];
    },
    enabled: !!user && !!activeCompanyId,
  });

  const createRuleMutation = useMutation({
    mutationFn: async (ruleData: AutomationRuleDraft) => {
      if (!user || !activeCompanyId || ownerQuery.data !== true) {
        throw new Error("حفظ قواعد الأتمتة متاح لمالك الشركة المختارة.");
      }

      const { data, error } = await supabase
        .from("automation_rules" as any)
        .insert({
          company_id: activeCompanyId,
          title: ruleData.title,
          description: ruleData.description || null,
          trigger_event: ruleData.trigger_event,
          conditions: ruleData.conditions,
          actions: ruleData.actions,
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as AutomationRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
      toast({ title: "تم حفظ مسودة قاعدة الأتمتة" });
    },
    onError: (err: Error) => {
      toast({ title: "تعذر حفظ القاعدة", description: err.message, variant: "destructive" });
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user || !activeCompanyId || ownerQuery.data !== true) {
        throw new Error("حذف قواعد الأتمتة متاح لمالك الشركة المختارة.");
      }
      const { data, error } = await supabase
        .from("automation_rules" as any)
        .delete()
        .eq("company_id", activeCompanyId)
        .eq("id", id)
        .select("id");
      if (error) throw error;
      if (!data || data.length !== 1) throw new Error("تعذر العثور على القاعدة في الشركة المختارة.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
      toast({ title: "تم حذف قاعدة الأتمتة" });
    },
    onError: (err: Error) => {
      toast({ title: "تعذر حذف القاعدة", description: err.message, variant: "destructive" });
    },
  });

  return {
    rules: rulesQuery.data || [],
    isLoading: rulesQuery.isLoading,
    error: rulesQuery.error || ownerQuery.error,
    needsCompany: !activeCompanyId,
    canManage: ownerQuery.data === true,
    createRule: createRuleMutation.mutateAsync,
    deleteRule: deleteRuleMutation.mutate,
  };
}
