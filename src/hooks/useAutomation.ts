import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import type { Json } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";

export type AutomationActionType =
  | "send_email"
  | "send_whatsapp"
  | "move_stage"
  | "assign_reviewer"
  | "trigger_webhook";

export type AutomationOutboundQueueStatus =
  | "pending"
  | "dispatched"
  | "failed"
  | "skipped_unconfigured";

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
    type: AutomationActionType;
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
  execution_details: {
    code?: string;
    candidate_id?: string;
    queued_count?: number;
    outbound_status?: string;
    status_code?: number;
  };
}

export interface AutomationOutboundQueueItem {
  id: string;
  company_id: string;
  rule_id: string | null;
  log_id: string | null;
  candidate_id: string | null;
  action_type: "send_email" | "send_whatsapp" | "trigger_webhook";
  action_index: number;
  payload: Record<string, unknown>;
  status: AutomationOutboundQueueStatus;
  attempt_count: number;
  last_error: string | null;
  processed_at: string | null;
  created_at: string;
}

export interface AutomationProviderStatus {
  send_email: {
    configured: boolean;
    mode?: string;
  };
  trigger_webhook: {
    configured: boolean;
    ssrf_protection: boolean;
  };
  send_whatsapp: {
    configured: boolean;
    code: string;
    missing_env?: string[];
  };
}

interface AutomationProviderResponse {
  ok: boolean;
  company_id?: string | null;
  providers: AutomationProviderStatus;
}

interface OutboundDispatchResponse {
  ok: boolean;
  processed: number;
  results?: Array<{
    queueId: string;
    actionType: string;
    status: AutomationOutboundQueueStatus;
    code: string;
    error?: string;
  }>;
  providers?: AutomationProviderStatus;
}

interface OutboundQueueQueryResult {
  data: AutomationOutboundQueueItem[] | null;
  error: { message: string } | null;
}

interface OutboundQueueClient {
  from(table: "automation_outbound_queue"): {
    select(columns: string): {
      eq(column: string, value: string): {
        order(column: string, options: { ascending: boolean }): {
          limit(count: number): Promise<OutboundQueueQueryResult>;
        };
      };
    };
  };
}

export const automationMessages: Record<string, string> = {
  completed: "تم التنفيذ",
  queued_outbound: "تمت جدولة الإجراء الخارجي في قائمة التنفيذ",
  conditions_not_met: "لم تتحقق الشروط",
  company_owner_required: "التفعيل متاح لمالك الشركة فقط",
  company_inactive: "الشركة غير نشطة",
  active_rule_limit: "الحد الأقصى 25 قاعدة مفعّلة لكل شركة",
  unsupported_event: "هذا الحدث متاح كمسودة فقط حاليًا",
  unsupported_action: "هذا الإجراء يحتاج تكامل إرسال قبل تفعيله",
  invalid_configuration: "راجع إعدادات القاعدة",
  invalid_condition: "شرط غير صالح أو وظيفة خارج الشركة",
  invalid_action: "اختر إجراءً قابلًا للتنفيذ",
  invalid_webhook_url: "رابط Webhook غير صالح؛ يلزم رابط HTTPS عام وموثوق",
  webhook_url_blocked: "تم حظر رابط Webhook لأسباب أمنية (SSRF)",
  webhook_delivery_failed: "تعذر تسليم طلب Webhook إلى الرابط المحدد",
  invalid_email_recipient: "البريد الإلكتروني للمستلم غير صالح",
  email_recipient_missing: "لا يوجد بريد إلكتروني صالح للمستلم",
  email_delivery_failed: "تعذر إرسال البريد الإلكتروني التلقائي",
  invalid_whatsapp_recipient: "رقم هاتف واتساب غير صالح",
  whatsapp_recipient_missing: "لا يوجد رقم هاتف صالح للمرشح لإرسال واتساب",
  whatsapp_delivery_failed: "تعذر إرسال رسالة واتساب عبر Meta Cloud API",
  WHATSAPP_PROVIDER_NOT_CONFIGURED: "مزوّد واتساب (Meta Cloud API) غير مهيأ — يلزم إضافة WHATSAPP_ACCESS_TOKEN وWHATSAPP_PHONE_NUMBER_ID",
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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isSafeHttpsWebhookUrl(rawUrl: string): boolean {
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.length > 2000) return false;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  if (parsed.username || parsed.password) return false;

  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (!host) return false;
  if (
    host === "localhost" ||
    host === "metadata" ||
    host === "metadata.google.internal" ||
    host === "instance-data" ||
    host === "0.0.0.0" ||
    host === "::" ||
    host === "::1" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".localdomain")
  ) {
    return false;
  }

  if (
    /^\d+$/.test(host) ||
    /^0x[0-9a-f]+$/i.test(host) ||
    host.split(".").some((label) => /^0x/i.test(label) || /^0[0-9]+$/.test(label))
  ) {
    return false;
  }

  if (
    /^(127\.|10\.|0\.|192\.168\.|169\.254\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\.)/.test(host) ||
    /^(fc|fd|fe80|::ffff:)/i.test(host)
  ) {
    return false;
  }

  return true;
}

export function validateAutomationActionConfig(
  action: AutomationRule["actions"][number],
): string | null {
  const payload = action.payload || {};

  if (action.type === "move_stage") {
    return typeof payload.stage_id === "string" && payload.stage_id.trim()
      ? null
      : "حدّد المرحلة أو المراجع من خلال تعديل المسودة";
  }

  if (action.type === "assign_reviewer") {
    return typeof payload.reviewer_id === "string" && payload.reviewer_id.trim()
      ? null
      : "حدّد المرحلة أو المراجع من خلال تعديل المسودة";
  }

  if (action.type === "send_email") {
    const subject = typeof payload.subject === "string" ? payload.subject.trim() : "";
    const body =
      typeof payload.body_html === "string"
        ? payload.body_html.trim()
        : typeof payload.body === "string"
          ? payload.body.trim()
          : typeof payload.html === "string"
            ? payload.html.trim()
            : "";
    const templateId = typeof payload.template_id === "string" ? payload.template_id.trim() : "";

    if ((!subject || !body) && !templateId) {
      return automationMessages.unsupported_action;
    }
    const recipientType =
      typeof payload.recipient_type === "string" && payload.recipient_type.trim()
        ? payload.recipient_type.trim()
        : "candidate";
    if (!["candidate", "recruiter", "custom"].includes(recipientType)) {
      return automationMessages.invalid_email_recipient;
    }
    if (recipientType === "custom") {
      const toEmail =
        typeof payload.to_email === "string"
          ? payload.to_email.trim()
          : typeof payload.to === "string"
            ? payload.to.trim()
            : "";
      if (!toEmail || !EMAIL_PATTERN.test(toEmail)) {
        return automationMessages.invalid_email_recipient;
      }
    }
    return null;
  }

  if (action.type === "trigger_webhook") {
    const url = typeof payload.url === "string" ? payload.url.trim() : "";
    if (!url) {
      return automationMessages.unsupported_action;
    }
    if (!isSafeHttpsWebhookUrl(url)) {
      return automationMessages.invalid_webhook_url;
    }
    return null;
  }

  if (action.type === "send_whatsapp") {
    const message = typeof payload.message === "string" ? payload.message.trim() : "";
    const templateName = typeof payload.template_name === "string" ? payload.template_name.trim() : "";
    if (!message && !templateName) {
      return automationMessages.unsupported_action;
    }
    const recipientType =
      typeof payload.recipient_type === "string" && payload.recipient_type.trim()
        ? payload.recipient_type.trim()
        : "candidate";
    if (!["candidate", "custom"].includes(recipientType)) {
      return automationMessages.invalid_whatsapp_recipient;
    }
    if (recipientType === "custom") {
      const rawPhone =
        typeof payload.to_phone === "string"
          ? payload.to_phone
          : typeof payload.phone === "string"
            ? payload.phone
            : "";
      const digits = rawPhone.replace(/[^0-9]/g, "");
      if (!/^[0-9]{7,15}$/.test(digits)) {
        return automationMessages.invalid_whatsapp_recipient;
      }
    }
    return null;
  }

  return automationMessages.unsupported_action;
}

export function useAutomationRules() {
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const queryClient = useQueryClient();
  const hasFunctionsClient =
    typeof (supabase as unknown as { functions?: { invoke?: unknown } }).functions?.invoke === "function";

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

  const outboundQueueQuery = useQuery({
    queryKey: ["automation-outbound-queue", user?.id, activeCompanyId],
    enabled: !!user && !!activeCompanyId,
    refetchInterval: 15000,
    queryFn: async () => {
      const queueClient = supabase as unknown as OutboundQueueClient;
      const { data, error } = await queueClient
        .from("automation_outbound_queue")
        .select("id, company_id, rule_id, log_id, candidate_id, action_type, action_index, payload, status, attempt_count, last_error, processed_at, created_at")
        .eq("company_id", activeCompanyId!)
        .order("created_at", { ascending: false })
        .limit(25);
      if (error) throw error;
      return (data || []).filter(
        (item): item is AutomationOutboundQueueItem =>
          typeof item?.id === "string" &&
          typeof item?.action_type === "string" &&
          typeof item?.status === "string",
      );
    },
  });

  const providerStatusQuery = useQuery({
    queryKey: ["automation-provider-status", user?.id, activeCompanyId],
    staleTime: 2 * 60 * 1000,
    enabled: !!user && !!activeCompanyId && ownerQuery.data === true && hasFunctionsClient,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<AutomationProviderResponse>(
        "execute-automation-actions",
        { body: { action: "status", activeCompanyId } },
      );
      if (error) throw error;
      return data?.providers || null;
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

  const dispatchOutboundMutation = useMutation({
    mutationFn: async (ruleId?: string) => {
      if (!user || !activeCompanyId || ownerQuery.data !== true) {
        throw new Error("تنفيذ الإجراءات الخارجية متاح لمالك الشركة فقط.");
      }
      if (!hasFunctionsClient) {
        throw new Error("عميل تنفيذ الدوال غير متاح.");
      }
      const { data, error } = await supabase.functions.invoke<OutboundDispatchResponse>(
        "execute-automation-actions",
        {
          body: {
            action: "process_queue",
            activeCompanyId,
            limit: 25,
            ...(ruleId ? { rule_id: ruleId } : {}),
          },
        },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["automation-outbound-queue"] });
      queryClient.invalidateQueries({ queryKey: ["automation-logs"] });
      queryClient.invalidateQueries({ queryKey: ["automation-provider-status"] });
      const count = result?.processed ?? 0;
      toast({
        title: count > 0 ? `تمت معالجة ${count} من الإجراءات الخارجية` : "لا توجد مهام خارجية معلقة في قائمة الانتظار",
      });
    },
    onError: (err: Error) => {
      toast({ title: "تعذر تشغيل قائمة الإجراءات الخارجية", description: err.message, variant: "destructive" });
    },
  });

  return {
    rules: rulesQuery.data || [],
    logs: logsQuery.data || [],
    logsError: logsQuery.error,
    logsLoading: logsQuery.isLoading,
    outboundQueue: outboundQueueQuery.data || [],
    outboundQueueLoading: outboundQueueQuery.isLoading,
    outboundQueueError: outboundQueueQuery.error,
    providerStatus: providerStatusQuery.data || null,
    providerStatusLoading: providerStatusQuery.isLoading,
    isLoading: rulesQuery.isLoading,
    error: rulesQuery.error || ownerQuery.error,
    needsCompany: !activeCompanyId,
    canManage: ownerQuery.data === true,
    createRule: createRuleMutation.mutateAsync,
    updateRule: updateRuleMutation.mutateAsync,
    setRuleActive: setActiveMutation.mutateAsync,
    changingState: setActiveMutation.isPending,
    deleteRule: deleteRuleMutation.mutate,
    dispatchOutboundQueue: (ruleId?: string) => dispatchOutboundMutation.mutateAsync(ruleId),
    dispatchingQueue: dispatchOutboundMutation.isPending,
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
