import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import type { Json } from "@/integrations/supabase/types";
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
  activated_at?: string | null;
}

export type AutomationRuleDraft = Omit<AutomationRule, "id" | "company_id" | "is_active" | "created_at" | "activated_at">;

export interface AutomationLog {
  id: string;
  rule_id: string | null;
  status: string;
  executed_at: string;
  execution_details: { code?: string; candidate_id?: string };
}

export const automationMessages: Record<string, string> = {
  completed: "تم التنفيذ",
  conditions_not_met: "لم تتحقق الشروط",
  company_owner_required: "التفعيل متاح لمالك الشركة فقط",
  company_inactive: "الشركة غير نشطة",
  active_rule_limit: "الحد الأقصى 25 قاعدة مفعّلة لكل شركة",
  unsupported_event: "هذا الحدث متاح كمسودة فقط حاليًا",
  unsupported_action: "هذا الإجراء يحتاج تكامل إرسال قبل تفعيله",
  invalid_configuration: "راجع إعدادات القاعدة",
  invalid_condition: "شرط غير صالح أو وظيفة خارج الشركة",
  invalid_action: "اختر إجراءً قابلًا للتنفيذ",
  sla_stage_required: "اختر شرطًا يساوي مرحلة محددة لقاعدة المهلة",
  invalid_sla_stage: "يلزم اسم مرحلة نشطة غير مكرر داخل الشركة ومهلة من ساعة إلى 8760 ساعة",
  offer_candidate_mismatch: "العرض والمرشح والوظيفة يجب أن يتبعوا الشركة نفسها",
  invalid_stage: "المرحلة غير نشطة أو لا تتبع الشركة",
  invalid_reviewer: "المراجع يجب أن يكون مالكًا أو مسؤول توظيف في الشركة",
  rule_not_found: "القاعدة غير موجودة في الشركة المختارة",
  candidate_not_found: "تعذر ربط الطلب بمرشح",
  candidate_link_ambiguous: "يوجد أكثر من مرشح مرتبط بالطلب؛ يلزم المراجعة",
  stage_rules_unsupported: "إعدادات المرحلة تحتاج مراجعة قبل النقل التلقائي",
  interview_required: "يلزم إكمال المقابلة أولًا",
  evaluation_required: "يلزم تقييم المرشح أولًا",
  score_required: "التقييم أقل من الحد المطلوب للمرحلة",
  assessment_required: "يلزم إكمال الاختبار المرتبط بالمرحلة",
  execution_failed: "تعذر تنفيذ الإجراء؛ لم تُطبّق تغييرات هذه القاعدة",
};

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
        .from("automation_rules")
        .select("*")
        .eq("company_id", activeCompanyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as AutomationRule[];
    },
    enabled: !!user && !!activeCompanyId,
  });

  const logsQuery = useQuery({
    queryKey: ["automation-logs", user?.id, activeCompanyId],
    enabled: !!user && !!activeCompanyId,
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase.from("automation_logs")
        .select("id, rule_id, status, executed_at, execution_details")
        .eq("company_id", activeCompanyId!).order("executed_at", { ascending: false }).limit(20);
      if (error) throw error;
      return (data || []) as unknown as AutomationLog[];
    },
  });

  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, draft }: { id: string; draft: AutomationRuleDraft }) => {
      if (!user || !activeCompanyId || ownerQuery.data !== true) throw new Error("تعديل القواعد متاح لمالك الشركة.");
      const { data, error } = await supabase.from("automation_rules").update({
        title: draft.title, description: draft.description || null, trigger_event: draft.trigger_event,
        conditions: draft.conditions as Json, actions: draft.actions as Json,
      }).eq("company_id", activeCompanyId).eq("id", id).select().single();
      if (error) throw error;
      return data as unknown as AutomationRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
      toast({ title: "تم حفظ القاعدة؛ راجع حالتها قبل التفعيل" });
    },
    onError: (err: Error) => toast({ title: "تعذر حفظ القاعدة", description: err.message, variant: "destructive" }),
  });

  const setActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      if (!user || !activeCompanyId || ownerQuery.data !== true) throw new Error("التفعيل متاح لمالك الشركة.");
      const { data, error } = await supabase.rpc("set_automation_rule_active", {
        _company_id: activeCompanyId, _rule_id: id, _is_active: active,
      });
      if (error) throw new Error(automationMessages[error.message] || error.message);
      return data as unknown as AutomationRule;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["automation-rules"] }),
    onError: (err: Error) => toast({ title: "تعذر تغيير حالة القاعدة", description: err.message, variant: "destructive" }),
  });

  const createRuleMutation = useMutation({
    mutationFn: async (ruleData: AutomationRuleDraft) => {
      if (!user || !activeCompanyId || ownerQuery.data !== true) {
        throw new Error("حفظ قواعد الأتمتة متاح لمالك الشركة المختارة.");
      }

      const { data, error } = await supabase
        .from("automation_rules")
        .insert({
          company_id: activeCompanyId,
          title: ruleData.title,
          description: ruleData.description || null,
          trigger_event: ruleData.trigger_event,
          conditions: ruleData.conditions as Json,
          actions: ruleData.actions as Json,
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
        .from("automation_rules")
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
    logs: logsQuery.data || [],
    logsError: logsQuery.error,
    logsLoading: logsQuery.isLoading,
    isLoading: rulesQuery.isLoading,
    error: rulesQuery.error || ownerQuery.error,
    needsCompany: !activeCompanyId,
    canManage: ownerQuery.data === true,
    createRule: createRuleMutation.mutateAsync,
    updateRule: updateRuleMutation.mutateAsync,
    setRuleActive: setActiveMutation.mutateAsync,
    changingState: setActiveMutation.isPending,
    deleteRule: deleteRuleMutation.mutate,
  };
}

export function useAutomationStages() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  return useQuery({
    queryKey: ["automation-stages", user?.id, activeCompanyId],
    enabled: !!user && !!activeCompanyId,
    queryFn: async () => {
      const { data, error } = await supabase.from("pipeline_stages").select("id, name")
        .eq("company_id", activeCompanyId!).eq("is_active", true).order("sort_order");
      if (error) throw error;
      return (data || []) as unknown as Array<{ id: string; name: string }>;
    },
  });
}
