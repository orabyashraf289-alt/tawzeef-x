import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
    value: any;
  }>;
  actions: Array<{
    type: "send_email" | "send_whatsapp" | "move_stage" | "assign_reviewer" | "trigger_webhook";
    payload: Record<string, any>;
  }>;
  is_active: boolean;
  created_at?: string;
}

export function useAutomationRules() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const rulesQuery = useQuery({
    queryKey: ["automation-rules", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: memberRows } = await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", user.id);

      if (!memberRows || memberRows.length === 0) return [];
      const companyId = memberRows[0].company_id;

      const { data, error } = await supabase
        .from("automation_rules" as any)
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Automation rules fetch error:", error);
        return [];
      }
      return (data || []) as AutomationRule[];
    },
    enabled: !!user,
  });

  const createRuleMutation = useMutation({
    mutationFn: async (rule: Omit<AutomationRule, "id" | "company_id">) => {
      if (!user) throw new Error("User not authenticated");

      const { data: memberRows } = await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", user.id);

      if (!memberRows || memberRows.length === 0) throw new Error("No active company found");
      const companyId = memberRows[0].company_id;

      const { data, error } = await supabase
        .from("automation_rules" as any)
        .insert({
          ...rule,
          company_id: companyId,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-rules", user?.id] });
      toast({ title: "تم إنشاء قاعدة الأتمتة بنجاح ⚡" });
    },
  });

  const toggleRuleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("automation_rules" as any)
        .update({ is_active })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-rules", user?.id] });
      toast({ title: "تم تحديث حالة الأتمتة بنجاح ✅" });
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("automation_rules" as any)
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-rules", user?.id] });
      toast({ title: "تم حذف قاعدة الأتمتة" });
    },
  });

  return {
    rules: rulesQuery.data || [],
    isLoading: rulesQuery.isLoading,
    createRule: createRuleMutation.mutateAsync,
    toggleRule: toggleRuleMutation.mutate,
    deleteRule: deleteRuleMutation.mutate,
  };
}
