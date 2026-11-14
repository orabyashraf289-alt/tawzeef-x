import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  automationMessages,
  isSafeHttpsWebhookUrl,
  useAutomationRules,
  useAutomationStages,
  validateAutomationActionConfig,
  type AutomationActionType,
  type AutomationOutboundQueueStatus,
  type AutomationRule,
  type AutomationRuleDraft,
} from "@/hooks/useAutomation";
import { useCompany } from "@/contexts/CompanyContext";
import { useCompanyMembers } from "@/hooks/useCompanies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, Plus, Trash2, Pencil, Play, Pause, RefreshCw, AlertTriangle } from "lucide-react";

const triggerLabels: Record<string, string> = {
  "candidate.stage_changed": "عند تغيير مرحلة المرشح",
  "application.created": "عند وصول طلب توظيف جديد",
  "offer.sent": "عند تسجيل إرسال عرض عمل",
  "sla.expired": "عند تجاوز مهلة المرحلة",
};
const fieldLabels: Record<string, string> = {
  stage: "المرحلة",
  status: "الحالة",
  source: "المصدر",
  job_id: "الوظيفة",
  ai_score: "درجة التقييم",
};
const operatorLabels: Record<string, string> = {
  equals: "تساوي",
  contains: "تحتوي على",
  greater_than: "أكبر من",
  less_than: "أقل من",
};
const statusLabels: Record<string, string> = {
  success: "تم التنفيذ",
  failed: "تعذر التنفيذ",
  skipped: "لم تتحقق الشروط",
  running: "جارٍ التنفيذ",
};
const queueStatusLabels: Record<AutomationOutboundQueueStatus, string> = {
  pending: "قيد الانتظار",
  dispatched: "تم الإرسال",
  failed: "فشل الإرسال",
  skipped_unconfigured: "متجاوز — مزود غير مهيأ",
};
const actionTypeLabels: Record<string, string> = {
  move_stage: "نقل مرحلة",
  assign_reviewer: "تعيين مراجع",
  send_email: "بريد إلكتروني",
  trigger_webhook: "Webhook خارجي",
  send_whatsapp: "واتساب",
};

function activationBlock(rule: AutomationRule): string | null {
  if (!["candidate.stage_changed", "application.created", "offer.sent", "sla.expired"].includes(rule.trigger_event)) {
    return automationMessages.unsupported_event;
  }
  if (
    rule.trigger_event === "sla.expired" &&
    rule.conditions.filter(
      (condition) =>
        condition.field === "stage" &&
        condition.operator === "equals" &&
        typeof condition.value === "string" &&
        condition.value,
    ).length !== 1
  ) {
    return automationMessages.sla_stage_required;
  }
  if (!rule.actions.length) return "اختر إجراءً من خلال تعديل المسودة";
  for (const action of rule.actions) {
    const actionError = validateAutomationActionConfig(action);
    if (actionError) return actionError;
  }
  return null;
}

export default function AutomationBuilder() {
  const {
    rules,
    logs,
    logsError,
    logsLoading,
    outboundQueue = [],
    outboundQueueLoading = false,
    outboundQueueError = null,
    providerStatus = null,
    isLoading,
    error,
    needsCompany,
    canManage,
    createRule,
    updateRule,
    deleteRule,
    setRuleActive,
    changingState,
    dispatchOutboundQueue,
    dispatchingQueue = false,
  } = useAutomationRules();

  const { activeCompanyId } = useCompany();
  const stagesQuery = useAutomationStages();
  const membersQuery = useCompanyMembers(activeCompanyId || undefined);
  const stages = stagesQuery.data || [];
  const members = (membersQuery.data || []).filter((member) => ["owner", "hr"].includes(member.member_role));

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [triggerEvent, setTriggerEvent] = useState<AutomationRule["trigger_event"]>("application.created");
  const [actionType, setActionType] = useState<AutomationActionType>("move_stage");
  const [targetId, setTargetId] = useState("");
  const [conditionStage, setConditionStage] = useState("__any");

  // Outbound email fields
  const [emailRecipientType, setEmailRecipientType] = useState<"candidate" | "recruiter" | "custom">("candidate");
  const [emailCustomTo, setEmailCustomTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  // Outbound webhook fields
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEventName, setWebhookEventName] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");

  // Outbound WhatsApp fields
  const [whatsappRecipientType, setWhatsappRecipientType] = useState<"candidate" | "custom">("candidate");
  const [whatsappCustomPhone, setWhatsappCustomPhone] = useState("");
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [whatsappTemplateName, setWhatsappTemplateName] = useState("");

  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState<AutomationRule | null>(null);

  useEffect(() => {
    setIsOpen(false);
    setActivating(null);
  }, [activeCompanyId]);

  const reviewerName = (id: unknown) =>
    members.find((member) => member.user_id === id)?.profiles?.full_name || String(id || "مراجع غير محدد");

  const actionDetails = (rule: AutomationRule) =>
    rule.actions
      .map((action) => {
        if (action.type === "move_stage") {
          return `نقل إلى: ${stages.find((stage) => stage.id === action.payload.stage_id)?.name || action.payload.stage_id || "غير محدد"}`;
        }
        if (action.type === "assign_reviewer") {
          return `المراجع: ${reviewerName(action.payload.reviewer_id)}`;
        }
        if (action.type === "send_email") {
          const subject = typeof action.payload.subject === "string" ? action.payload.subject.trim() : "";
          if (!subject) return String(action.payload.details || "مسودة إجراء تحتاج تكاملًا");
          const rec = action.payload.recipient_type === "recruiter"
            ? "مسؤول التوظيف"
            : action.payload.recipient_type === "custom"
              ? String(action.payload.to_email || "")
              : "المرشح";
          return `إرسال بريد (${rec}): ${subject}`;
        }
        if (action.type === "trigger_webhook") {
          const url = typeof action.payload.url === "string" ? action.payload.url.trim() : "";
          if (!url) return String(action.payload.details || "مسودة إجراء تحتاج تكاملًا");
          const hasSecret = typeof action.payload.secret === "string" && action.payload.secret.length > 0;
          return `Webhook: ${url}${hasSecret ? " (موقّع بـ HMAC)" : ""}`;
        }
        if (action.type === "send_whatsapp") {
          const tpl = typeof action.payload.template_name === "string" ? action.payload.template_name.trim() : "";
          const msg = typeof action.payload.message === "string" ? action.payload.message.trim() : "";
          if (!tpl && !msg) return String(action.payload.details || "مسودة إجراء تحتاج تكاملًا");
          return `واتساب: ${tpl || msg.slice(0, 60)}`;
        }
        return String(action.payload.details || "مسودة إجراء تحتاج تكاملًا");
      })
      .join("، ");

  const resetOutboundFields = () => {
    setEmailRecipientType("candidate");
    setEmailCustomTo("");
    setEmailSubject("");
    setEmailBody("");
    setWebhookUrl("");
    setWebhookEventName("");
    setWebhookSecret("");
    setWhatsappRecipientType("candidate");
    setWhatsappCustomPhone("");
    setWhatsappMessage("");
    setWhatsappTemplateName("");
  };

  const openEditor = (rule?: AutomationRule) => {
    setEditingId(rule?.id || null);
    setTitle(rule?.title || "");
    setTriggerEvent(rule?.trigger_event || "application.created");
    const action = rule?.actions[0];
    const resolvedType: AutomationActionType =
      action && ["move_stage", "assign_reviewer", "send_email", "trigger_webhook", "send_whatsapp"].includes(action.type)
        ? action.type
        : "move_stage";
    setActionType(resolvedType);
    setTargetId(String(action?.payload.stage_id || action?.payload.reviewer_id || ""));
    setConditionStage(String(rule?.conditions[0]?.value || "__any"));
    resetOutboundFields();

    if (action && resolvedType === "send_email") {
      const recType = action.payload.recipient_type;
      setEmailRecipientType(recType === "recruiter" || recType === "custom" ? recType : "candidate");
      setEmailCustomTo(String(action.payload.to_email || action.payload.to || ""));
      setEmailSubject(String(action.payload.subject || ""));
      setEmailBody(String(action.payload.body_html || action.payload.body || action.payload.html || ""));
    } else if (action && resolvedType === "trigger_webhook") {
      setWebhookUrl(String(action.payload.url || ""));
      setWebhookEventName(String(action.payload.event_name || ""));
      setWebhookSecret(String(action.payload.secret || ""));
    } else if (action && resolvedType === "send_whatsapp") {
      const recType = action.payload.recipient_type;
      setWhatsappRecipientType(recType === "custom" ? "custom" : "candidate");
      setWhatsappCustomPhone(String(action.payload.to_phone || action.payload.phone || ""));
      setWhatsappMessage(String(action.payload.message || ""));
      setWhatsappTemplateName(String(action.payload.template_name || ""));
    }

    setIsOpen(true);
  };

  const buildDraftAction = (): AutomationRule["actions"][number] => {
    if (actionType === "move_stage") {
      return { type: "move_stage", payload: { stage_id: targetId } };
    }
    if (actionType === "assign_reviewer") {
      return { type: "assign_reviewer", payload: { reviewer_id: targetId } };
    }
    if (actionType === "send_email") {
      return {
        type: "send_email",
        payload: {
          recipient_type: emailRecipientType,
          ...(emailRecipientType === "custom" ? { to_email: emailCustomTo.trim() } : {}),
          subject: emailSubject.trim(),
          body_html: emailBody.trim(),
        },
      };
    }
    if (actionType === "trigger_webhook") {
      return {
        type: "trigger_webhook",
        payload: {
          url: webhookUrl.trim(),
          ...(webhookEventName.trim() ? { event_name: webhookEventName.trim() } : {}),
          ...(webhookSecret.trim() ? { secret: webhookSecret.trim() } : {}),
        },
      };
    }
    return {
      type: "send_whatsapp",
      payload: {
        recipient_type: whatsappRecipientType,
        ...(whatsappRecipientType === "custom" ? { to_phone: whatsappCustomPhone.trim() } : {}),
        ...(whatsappMessage.trim() ? { message: whatsappMessage.trim() } : {}),
        ...(whatsappTemplateName.trim() ? { template_name: whatsappTemplateName.trim() } : {}),
      },
    };
  };

  const draftAction = buildDraftAction();
  const draftActionError = validateAutomationActionConfig(draftAction);
  const canSaveDraft =
    !saving &&
    canManage &&
    Boolean(title.trim()) &&
    !(triggerEvent === "sla.expired" && conditionStage === "__any") &&
    draftActionError === null;

  const handleSave = async () => {
    if (!canSaveDraft) return;
    setSaving(true);
    try {
      const draft: AutomationRuleDraft = {
        title: title.trim(),
        trigger_event: triggerEvent,
        description: rules.find((rule) => rule.id === editingId)?.description,
        conditions: conditionStage === "__any" ? [] : [{ field: "stage", operator: "equals" as const, value: conditionStage }],
        actions: [draftAction],
      };
      if (editingId) await updateRule({ id: editingId, draft });
      else await createRule(draft);
      setIsOpen(false);
    } catch {
      /* The mutation displays the database error and leaves the form open. */
    } finally {
      setSaving(false);
    }
  };

  const toggleRule = async (rule: AutomationRule, active: boolean) => {
    try {
      await setRuleActive({ id: rule.id, active });
      setActivating(null);
    } catch {
      /* Keep the current state; the mutation displays the error. */
    }
  };

  const hasOutboundRules = rules.some((rule) =>
    rule.actions.some((action) => ["send_email", "send_whatsapp", "trigger_webhook"].includes(action.type)),
  );
  const pendingOutboundCount = outboundQueue.filter((item) => item.status === "pending").length;
  const whatsappConfigured = providerStatus ? providerStatus.send_whatsapp.configured : null;

  return (
    <div className="space-y-6" dir="rtl">
      <Card className="p-6 rounded-3xl flex flex-wrap items-center justify-between gap-4 border-amber-500/20">
        <div className="space-y-1.5">
          <h3 className="font-black flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" /> قواعد الأتمتة
          </h3>
          <p className="text-xs text-muted-foreground">
            نقل المراحل وتعيين المراجعين وإرسال البريد وWebhooks تلقائيًا. تُحفظ القاعدة كمسودة ويُفعّلها مالك الشركة بعد مراجعتها.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge variant="secondary" className="text-[11px]">
              البريد الإلكتروني: مدعوم (SMTP / Resend)
            </Badge>
            <Badge variant="secondary" className="text-[11px]">
              Webhooks: مدعوم (HTTPS + حماية SSRF + HMAC)
            </Badge>
            {whatsappConfigured === true ? (
              <Badge variant="default" className="text-[11px]">
                واتساب (Meta Cloud API): مهيأ وجاهز
              </Badge>
            ) : whatsappConfigured === false ? (
              <Badge variant="outline" className="text-[11px] border-amber-500/50 text-amber-700 dark:text-amber-400">
                واتساب (Meta Cloud API): غير مهيأ — WHATSAPP_PROVIDER_NOT_CONFIGURED
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[11px]">
                واتساب: يتطلب تهيئة WHATSAPP_ACCESS_TOKEN و WHATSAPP_PHONE_NUMBER_ID
              </Badge>
            )}
          </div>
        </div>
        <Button disabled={!canManage || needsCompany} onClick={() => openEditor()} className="gap-2 rounded-xl">
          <Plus className="w-4 h-4" /> إنشاء قاعدة
        </Button>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent dir="rtl" className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "مراجعة قاعدة الأتمتة" : "قاعدة أتمتة جديدة"}</DialogTitle>
            <DialogDescription>راجع الحدث والشروط والإجراء داخل الشركة الحالية.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="automation-title">اسم القاعدة</Label>
              <Input
                id="automation-title"
                value={title}
                maxLength={255}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="مثال: تعيين مراجع للطلبات الجديدة"
              />
            </div>

            <div className="space-y-2">
              <Label>الحدث</Label>
              <Select value={triggerEvent} onValueChange={(value) => setTriggerEvent(value as AutomationRule["trigger_event"])}>
                <SelectTrigger aria-label="الحدث">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="application.created">عند وصول طلب توظيف جديد</SelectItem>
                  <SelectItem value="candidate.stage_changed">عند تغيير مرحلة المرشح</SelectItem>
                  <SelectItem value="offer.sent">عند تسجيل إرسال عرض عمل</SelectItem>
                  <SelectItem value="sla.expired">عند تجاوز مهلة المرحلة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>مرحلة المرشح عند وقوع الحدث</Label>
              <Select value={conditionStage} onValueChange={setConditionStage}>
                <SelectTrigger aria-label="شرط المرحلة">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__any" disabled={triggerEvent === "sla.expired"}>
                    {triggerEvent === "sla.expired" ? "اختر مرحلة محددة" : "أي مرحلة"}
                  </SelectItem>
                  {Array.from(new Set(stages.map((stage) => stage.name))).map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                  {conditionStage !== "__any" && !stages.some((stage) => stage.name === conditionStage) && (
                    <SelectItem value={conditionStage}>{conditionStage}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {triggerEvent === "sla.expired" && (
              <p className="text-xs text-muted-foreground">
                اختر مرحلة لها مهلة بين ساعة و8760 ساعة في إعدادات المراحل. تُحسب المدة بالساعات المتصلة وتُراجع كل دقيقة. تطبق القاعدة على دخول المرحلة بعد تفعيلها فقط.
              </p>
            )}
            {triggerEvent === "offer.sent" && (
              <p className="text-xs text-muted-foreground">
                ينفذ الحدث مرة واحدة عند تسجيل العرض كمرسل، ولا يعد تأكيدًا لوصول البريد إلى المرشح.
              </p>
            )}

            <div className="space-y-2">
              <Label>الإجراء</Label>
              <Select
                value={actionType}
                onValueChange={(value) => {
                  setActionType(value as AutomationActionType);
                  setTargetId("");
                }}
              >
                <SelectTrigger aria-label="الإجراء">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="move_stage">نقل المرشح إلى مرحلة</SelectItem>
                  <SelectItem value="assign_reviewer">تعيين مراجع للمرشح</SelectItem>
                  <SelectItem value="send_email">إرسال بريد إلكتروني</SelectItem>
                  <SelectItem value="trigger_webhook">إرسال Webhook خارجي (HTTPS)</SelectItem>
                  <SelectItem value="send_whatsapp">إرسال رسالة واتساب (Meta Cloud API)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(actionType === "move_stage" || actionType === "assign_reviewer") && (
              <div className="space-y-2">
                <Label>{actionType === "move_stage" ? "المرحلة المستهدفة" : "المراجع"}</Label>
                <Select value={targetId} onValueChange={setTargetId}>
                  <SelectTrigger aria-label="هدف الإجراء">
                    <SelectValue placeholder="اختر من الشركة الحالية" />
                  </SelectTrigger>
                  <SelectContent>
                    {actionType === "move_stage"
                      ? stages.map((stage) => (
                          <SelectItem key={stage.id} value={stage.id}>
                            {stage.name}
                          </SelectItem>
                        ))
                      : members.map((member) => (
                          <SelectItem key={member.user_id} value={member.user_id}>
                            {reviewerName(member.user_id)}
                          </SelectItem>
                        ))}
                  </SelectContent>
                </Select>
                {(stagesQuery.error || membersQuery.error) && (
                  <p role="alert" className="text-xs text-destructive">
                    تعذر تحميل بعض الخيارات. أعد المحاولة قبل الحفظ.
                  </p>
                )}
                {actionType === "move_stage" && stages.length === 0 && !stagesQuery.isLoading && (
                  <p className="text-xs text-muted-foreground">أنشئ مرحلة نشطة مرتبطة بهذه الشركة أولًا.</p>
                )}
                {actionType === "assign_reviewer" && members.length === 0 && !membersQuery.isLoading && (
                  <p className="text-xs text-muted-foreground">لا يوجد مراجع متاح في هذه الشركة.</p>
                )}
              </div>
            )}

            {actionType === "send_email" && (
              <div className="space-y-3 rounded-xl border p-3 bg-muted/20">
                <div className="space-y-1.5">
                  <Label>المستلم</Label>
                  <Select
                    value={emailRecipientType}
                    onValueChange={(value) => setEmailRecipientType(value as "candidate" | "recruiter" | "custom")}
                  >
                    <SelectTrigger aria-label="مستلم البريد">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="candidate">المرشح تلقائيًا</SelectItem>
                      <SelectItem value="recruiter">منشئ القاعدة / مسؤول التوظيف</SelectItem>
                      <SelectItem value="custom">بريد إلكتروني مخصص</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {emailRecipientType === "custom" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="automation-email-to">البريد المستهدف</Label>
                    <Input
                      id="automation-email-to"
                      dir="ltr"
                      type="email"
                      value={emailCustomTo}
                      onChange={(event) => setEmailCustomTo(event.target.value)}
                      placeholder="hr@company.com"
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="automation-email-subject">عنوان البريد</Label>
                  <Input
                    id="automation-email-subject"
                    value={emailSubject}
                    maxLength={500}
                    onChange={(event) => setEmailSubject(event.target.value)}
                    placeholder="تحديث حول طلبك لوظيفة {{job_title}}"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="automation-email-body">محتوى الرسالة</Label>
                  <Textarea
                    id="automation-email-body"
                    rows={4}
                    value={emailBody}
                    onChange={(event) => setEmailBody(event.target.value)}
                    placeholder="مرحبًا {{candidate_name}}، تم تحديث حالة طلبك إلى مرحلة {{stage}}."
                  />
                  <p className="text-[11px] text-muted-foreground">
                    المتغيرات المدعومة: {"{{candidate_name}}"}، {"{{job_title}}"}، {"{{stage}}"}، {"{{company_name}}"}، {"{{tracking_code}}"}
                  </p>
                </div>
              </div>
            )}

            {actionType === "trigger_webhook" && (
              <div className="space-y-3 rounded-xl border p-3 bg-muted/20">
                <div className="space-y-1.5">
                  <Label htmlFor="automation-webhook-url">رابط Webhook (HTTPS فقط)</Label>
                  <Input
                    id="automation-webhook-url"
                    dir="ltr"
                    value={webhookUrl}
                    onChange={(event) => setWebhookUrl(event.target.value)}
                    placeholder="https://hooks.zapier.com/hooks/catch/..."
                  />
                  {webhookUrl.trim() && !isSafeHttpsWebhookUrl(webhookUrl) && (
                    <p role="alert" className="text-xs text-destructive">
                      {automationMessages.invalid_webhook_url}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="automation-webhook-event">اسم الحدث في الحمولة (اختياري)</Label>
                  <Input
                    id="automation-webhook-event"
                    dir="ltr"
                    value={webhookEventName}
                    onChange={(event) => setWebhookEventName(event.target.value)}
                    placeholder="candidate.stage_changed"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="automation-webhook-secret">مفتاح التوقيع HMAC SHA-256 (اختياري)</Label>
                  <Input
                    id="automation-webhook-secret"
                    dir="ltr"
                    type="password"
                    autoComplete="new-password"
                    value={webhookSecret}
                    onChange={(event) => setWebhookSecret(event.target.value)}
                    placeholder="whsec_..."
                  />
                  <p className="text-[11px] text-muted-foreground">
                    يُرسل التوقيع في ترويسة X-Tawzeef-Signature ولا يُعرض في السجلات أو البطاقات.
                  </p>
                </div>
              </div>
            )}

            {actionType === "send_whatsapp" && (
              <div className="space-y-3 rounded-xl border p-3 bg-muted/20">
                {whatsappConfigured === false && (
                  <div role="status" className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      مزود واتساب غير مهيأ حاليًا (WHATSAPP_PROVIDER_NOT_CONFIGURED). ستُسجّل التنفيذات كـ skipped_unconfigured حتى إضافة WHATSAPP_ACCESS_TOKEN وWHATSAPP_PHONE_NUMBER_ID في أسرار الخادم.
                    </span>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>المستلم</Label>
                  <Select
                    value={whatsappRecipientType}
                    onValueChange={(value) => setWhatsappRecipientType(value as "candidate" | "custom")}
                  >
                    <SelectTrigger aria-label="مستلم واتساب">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="candidate">رقم هاتف المرشح تلقائيًا</SelectItem>
                      <SelectItem value="custom">رقم هاتف مخصص</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {whatsappRecipientType === "custom" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="automation-whatsapp-phone">رقم الهاتف (بصيغة دولية)</Label>
                    <Input
                      id="automation-whatsapp-phone"
                      dir="ltr"
                      value={whatsappCustomPhone}
                      onChange={(event) => setWhatsappCustomPhone(event.target.value)}
                      placeholder="9665XXXXXXXX"
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="automation-whatsapp-message">نص رسالة واتساب</Label>
                  <Textarea
                    id="automation-whatsapp-message"
                    rows={3}
                    value={whatsappMessage}
                    onChange={(event) => setWhatsappMessage(event.target.value)}
                    placeholder="مرحبًا {{candidate_name}}، تم تحديث طلبك لوظيفة {{job_title}} إلى {{stage}}."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="automation-whatsapp-template">اسم قالب Meta المعتمد (اختياري)</Label>
                  <Input
                    id="automation-whatsapp-template"
                    dir="ltr"
                    value={whatsappTemplateName}
                    onChange={(event) => setWhatsappTemplateName(event.target.value)}
                    placeholder="candidate_stage_update"
                  />
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              تغيير الحدث أو الشروط أو الإجراءات يوقف القاعدة حتى مراجعتها وتفعيلها مجددًا. شروط المقابلة والتقييم والاختبار تظل مطلوبة عند النقل.
            </p>
            <Button onClick={handleSave} disabled={!canSaveDraft} className="w-full">
              {saving ? "جارٍ الحفظ…" : "حفظ للمراجعة"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!activating} onOpenChange={(open) => { if (!open) setActivating(null); }}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تفعيل القاعدة</DialogTitle>
            <DialogDescription>راجع الحدث والشروط والإجراء داخل الشركة الحالية.</DialogDescription>
          </DialogHeader>
          {activating && (
            <div className="space-y-3">
              <p className="font-bold">{activating.title}</p>
              <p>{triggerLabels[activating.trigger_event]}</p>
              <p>{actionDetails(activating)}</p>
              <p className="text-sm">
                {activating.conditions.length
                  ? `الشروط: ${activating.conditions
                      .map((condition) => `${fieldLabels[condition.field] || condition.field} ${operatorLabels[condition.operator]} ${String(condition.value)}`)
                      .join("، ")}`
                  : "تطبق على جميع الأحداث المطابقة داخل الشركة."}
              </p>
              <p className="text-xs text-muted-foreground">
                يبدأ التنفيذ مع الأحداث الجديدة فقط. النقل الناتج عن الأتمتة لا يشغّل قواعد أخرى.
              </p>
              {activating.trigger_event === "sla.expired" && (
                <p className="text-xs text-muted-foreground">
                  لن تُعالج مدد المراحل التي بدأت قبل هذا التفعيل. تُحتسب المهلة بالساعات المتصلة وتُراجع كل دقيقة.
                </p>
              )}
              <Button disabled={changingState} onClick={() => toggleRule(activating, true)}>
                تأكيد التفعيل
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {needsCompany ? (
        <p>اختر شركة لعرض قواعد الأتمتة.</p>
      ) : error ? (
        <p role="alert" className="text-destructive">
          تعذر تحميل القواعد: {error.message}
        </p>
      ) : isLoading ? (
        <p>جارٍ تحميل القواعد…</p>
      ) : rules.length === 0 ? (
        <Card className="p-8 text-center border-dashed">لا توجد قواعد أتمتة محفوظة</Card>
      ) : (
        rules.map((rule) => {
          const blocked = activationBlock(rule);
          const editable =
            rule.actions.length <= 1 &&
            (rule.conditions.length === 0 ||
              (rule.conditions.length === 1 &&
                rule.conditions[0].field === "stage" &&
                rule.conditions[0].operator === "equals"));
          const hasWhatsappAction = rule.actions.some((action) => action.type === "send_whatsapp");
          return (
            <Card key={rule.id} className="p-4 rounded-2xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold">{rule.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{triggerLabels[rule.trigger_event]}</p>
                </div>
                <Badge variant={rule.is_active ? "default" : "outline"}>
                  {rule.is_active ? "مفعّلة" : "مسودة / متوقفة"}
                </Badge>
              </div>
              <p className="text-sm break-words">{actionDetails(rule)}</p>
              {blocked && <p className="text-xs text-amber-700 dark:text-amber-400">{blocked}</p>}
              {!blocked && hasWhatsappAction && whatsappConfigured === false && (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  تنبيه المزود: WHATSAPP_PROVIDER_NOT_CONFIGURED — لن تُرسل رسائل واتساب حتى إعداد مفاتيح Meta Cloud API.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!canManage || changingState || (!rule.is_active && !!blocked)}
                  onClick={() => (rule.is_active ? toggleRule(rule, false) : setActivating(rule))}
                  className="gap-1"
                >
                  {rule.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {rule.is_active ? "إيقاف" : "مراجعة وتفعيل"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!canManage || !editable}
                  onClick={() => openEditor(rule)}
                  className="gap-1"
                >
                  <Pencil className="w-4 h-4" /> تعديل
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={!canManage}
                  onClick={() => deleteRule(rule.id)}
                  aria-label={`حذف ${rule.title}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          );
        })
      )}

      {!needsCompany && (outboundQueue.length > 0 || hasOutboundRules) && (
        <Card className="p-5 rounded-2xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="font-bold">قائمة التنفيذ الخارجي</h4>
              <p className="text-xs text-muted-foreground">
                حالة إرسال البريد الإلكتروني وWebhooks وواتساب للأحداث المشغَّلة.
              </p>
            </div>
            {dispatchOutboundQueue && (
              <Button
                size="sm"
                variant="outline"
                disabled={!canManage || dispatchingQueue}
                onClick={() => void dispatchOutboundQueue()}
                className="gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${dispatchingQueue ? "animate-spin" : ""}`} />
                {dispatchingQueue ? "جارٍ التنفيذ…" : `تشغيل المعلّق (${pendingOutboundCount})`}
              </Button>
            )}
          </div>
          {outboundQueueError ? (
            <p role="alert" className="text-destructive text-sm">
              تعذر تحميل قائمة التنفيذ الخارجي
            </p>
          ) : outboundQueueLoading ? (
            <p className="text-sm">جارٍ تحميل قائمة التنفيذ الخارجي…</p>
          ) : outboundQueue.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد مهام إرسال خارجية مسجلة بعد.</p>
          ) : (
            outboundQueue.map((item) => (
              <div key={item.id} className="border-t pt-3 flex flex-wrap justify-between gap-2 text-sm">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">
                      {rules.find((rule) => rule.id === item.rule_id)?.title || actionTypeLabels[item.action_type] || item.action_type}
                    </span>
                    <Badge
                      variant={
                        item.status === "dispatched"
                          ? "default"
                          : item.status === "failed"
                            ? "destructive"
                            : "outline"
                      }
                      className="text-[11px]"
                    >
                      {queueStatusLabels[item.status] || item.status}
                    </Badge>
                    <Badge variant="secondary" className="text-[11px]">
                      {actionTypeLabels[item.action_type] || item.action_type}
                    </Badge>
                  </div>
                  {item.last_error && (
                    <p className={item.status === "failed" ? "text-xs text-destructive" : "text-xs text-amber-700 dark:text-amber-400"}>
                      {automationMessages[item.last_error] || item.last_error}
                    </p>
                  )}
                </div>
                <time className="text-xs text-muted-foreground">
                  {new Date(item.processed_at || item.created_at).toLocaleString("ar-SA")}
                </time>
              </div>
            ))
          )}
        </Card>
      )}

      {!needsCompany && (
        <Card className="p-5 rounded-2xl space-y-3">
          <h4 className="font-bold">آخر عمليات التنفيذ</h4>
          {logsError ? (
            <p role="alert" className="text-destructive text-sm">
              تعذر تحميل سجل التنفيذ
            </p>
          ) : logsLoading ? (
            <p className="text-sm">جارٍ تحميل السجل…</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">لم تُنفّذ قواعد بعد.</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="border-t pt-3 flex flex-wrap justify-between gap-2 text-sm">
                <div>
                  <p className="font-semibold">
                    {rules.find((rule) => rule.id === log.rule_id)?.title || "قاعدة أتمتة"}
                  </p>
                  <p className={log.status === "failed" ? "text-destructive" : "text-muted-foreground"}>
                    {automationMessages[log.execution_details.code || ""] || statusLabels[log.status] || "نتيجة غير متاحة"}
                  </p>
                  {log.execution_details.candidate_id && (
                    <Link className="text-primary underline text-xs" to={`/candidates/${log.execution_details.candidate_id}`}>
                      فتح ملف المرشح
                    </Link>
                  )}
                </div>
                <time className="text-xs text-muted-foreground">{new Date(log.executed_at).toLocaleString("ar-SA")}</time>
              </div>
            ))
          )}
        </Card>
      )}
    </div>
  );
}
