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

const LOCAL_KEY = "tx:automation-rules:v1";

function getLocalRules(): AutomationRule[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalRule(rule: AutomationRule) {
  if (typeof window === "undefined") return;
  try {
    const existing = getLocalRules();
    const updated = [rule, ...existing.filter((r) => r.id !== rule.id)];
    localStorage.setItem(LOCAL_KEY, JSON.stringify(updated));
  } catch {}
}

function removeLocalRule(id: string) {
  if (typeof window === "undefined") return;
  try {
    const existing = getLocalRules();
    const updated = existing.filter((r) => r.id !== id);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(updated));
  } catch {}
}

function toggleLocalRule(id: string, is_active: boolean) {
  if (typeof window === "undefined") return;
  try {
    const existing = getLocalRules();
    const updated = existing.map((r) => (r.id === id ? { ...r, is_active } : r));
    localStorage.setItem(LOCAL_KEY, JSON.stringify(updated));
  } catch {}
}

async function resolveActiveCompanyId(userId: string): Promise<string> {
  const { data: memberRows } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", userId);

  if (memberRows && memberRows.length > 0 && memberRows[0].company_id) {
    return memberRows[0].company_id;
  }

  const { data: compRows } = await supabase
    .from("companies")
    .select("id")
    .eq("owner_user_id", userId);

  if (compRows && compRows.length > 0 && compRows[0].id) {
    return compRows[0].id;
  }

  return userId;
}

export function useAutomationRules() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const rulesQuery = useQuery({
    queryKey: ["automation-rules", user?.id],
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    queryFn: async () => {
      const localRules = getLocalRules();
      if (!user) return localRules;

      try {
        const companyId = await resolveActiveCompanyId(user.id);
        const { data, error } = await supabase
          .from("automation_rules" as any)
          .select("*")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false });

        if (error || !data) {
          return localRules;
        }

        const dbRules = data as AutomationRule[];
        const merged = [...dbRules];
        for (const lr of localRules) {
          if (!merged.some((m) => m.id === lr.id)) {
            merged.push(lr);
          }
        }
        return merged;
      } catch {
        return localRules;
      }
    },
    enabled: true,
  });

  const createRuleMutation = useMutation({
    mutationFn: async (ruleData: Omit<AutomationRule, "id" | "company_id">) => {
      const newId = `rule-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const companyId = user ? await resolveActiveCompanyId(user.id) : "demo-company";

      const fullRule: AutomationRule = {
        ...ruleData,
        id: newId,
        company_id: companyId,
        created_at: new Date().toISOString(),
      };

      saveLocalRule(fullRule);

      if (user) {
        try {
          const { data, error } = await supabase
            .from("automation_rules" as any)
            .insert({
              id: newId,
              ...ruleData,
              company_id: companyId,
              created_by: user.id,
            })
            .select()
            .single();

          if (!error && data) {
            return data as AutomationRule;
          }
        } catch (e) {
          console.warn("DB insert fallback to local storage:", e);
        }
      }

      return fullRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
      toast({ title: "تم إنشاء وتفعيل قاعدة الأتمتة بنجاح ⚡" });
    },
    onError: (err: any) => {
      toast({ title: "خطأ في إنشاء القاعدة", description: err.message, variant: "destructive" });
    },
  });

  const toggleRuleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      toggleLocalRule(id, is_active);
      if (user) {
        try {
          await supabase
            .from("automation_rules" as any)
            .update({ is_active })
            .eq("id", id);
        } catch {}
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
      toast({ title: "تم تحديث حالة الأتمتة بنجاح ✅" });
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      removeLocalRule(id);
      if (user) {
        try {
          await supabase
            .from("automation_rules" as any)
            .delete()
            .eq("id", id);
        } catch {}
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
      toast({ title: "تم حذف قاعدة الأتمتة بنجاح" });
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
