import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { automationMessages, useAutomationRules, useAutomationStages, type AutomationRule } from "@/hooks/useAutomation";
import { useCompany } from "@/contexts/CompanyContext";
import { useCompanyMembers } from "@/hooks/useCompanies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, Plus, Trash2, Pencil, Play, Pause } from "lucide-react";

const triggerLabels: Record<string, string> = {
  "candidate.stage_changed": "عند تغيير مرحلة المرشح",
  "application.created": "عند وصول طلب توظيف جديد",
  "offer.sent": "عند تسجيل إرسال عرض عمل",
  "sla.expired": "عند تجاوز مهلة المرحلة",
};
const fieldLabels: Record<string, string> = { stage: "المرحلة", status: "الحالة", source: "المصدر", job_id: "الوظيفة", ai_score: "درجة التقييم" };
const operatorLabels: Record<string, string> = { equals: "تساوي", contains: "تحتوي على", greater_than: "أكبر من", less_than: "أقل من" };
const statusLabels: Record<string, string> = { success: "تم التنفيذ", failed: "تعذر التنفيذ", skipped: "لم تتحقق الشروط", running: "جارٍ التنفيذ" };

function activationBlock(rule: AutomationRule): string | null {
  if (!["candidate.stage_changed", "application.created", "offer.sent", "sla.expired"].includes(rule.trigger_event)) return automationMessages.unsupported_event;
  if (rule.trigger_event === "sla.expired" && rule.conditions.filter(condition => condition.field === "stage" && condition.operator === "equals" && typeof condition.value === "string" && condition.value).length !== 1) return automationMessages.sla_stage_required;
  if (!rule.actions.length) return "اختر إجراءً من خلال تعديل المسودة";
  for (const action of rule.actions) {
    if (!["move_stage", "assign_reviewer"].includes(action.type)) return automationMessages.unsupported_action;
    const key = action.type === "move_stage" ? "stage_id" : "reviewer_id";
    if (typeof action.payload?.[key] !== "string" || !action.payload[key]) return "حدّد المرحلة أو المراجع من خلال تعديل المسودة";
  }
  return null;
}

export default function AutomationBuilder() {
  const { rules, logs, logsError, logsLoading, isLoading, error, needsCompany, canManage,
    createRule, updateRule, deleteRule, setRuleActive, changingState } = useAutomationRules();
  const { activeCompanyId } = useCompany();
  const stagesQuery = useAutomationStages();
  const membersQuery = useCompanyMembers(activeCompanyId || undefined);
  const stages = stagesQuery.data || [];
  const members = (membersQuery.data || []).filter(member => ["owner", "hr"].includes(member.member_role));
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [triggerEvent, setTriggerEvent] = useState<AutomationRule["trigger_event"]>("application.created");
  const [actionType, setActionType] = useState("move_stage");
  const [targetId, setTargetId] = useState("");
  const [conditionStage, setConditionStage] = useState("__any");
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState<AutomationRule | null>(null);

  useEffect(() => { setIsOpen(false); setActivating(null); }, [activeCompanyId]);

  const reviewerName = (id: unknown) => members.find(member => member.user_id === id)?.profiles?.full_name || String(id || "مراجع غير محدد");
  const actionDetails = (rule: AutomationRule) => rule.actions.map(action => {
    if (action.type === "move_stage") return `نقل إلى: ${stages.find(stage => stage.id === action.payload.stage_id)?.name || action.payload.stage_id || "غير محدد"}`;
    if (action.type === "assign_reviewer") return `المراجع: ${reviewerName(action.payload.reviewer_id)}`;
    return String(action.payload.details || "مسودة إجراء تحتاج تكاملًا");
  }).join("، ");

  const openEditor = (rule?: AutomationRule) => {
    setEditingId(rule?.id || null);
    setTitle(rule?.title || "");
    setTriggerEvent(rule?.trigger_event || "application.created");
    const action = rule?.actions[0];
    setActionType(action && ["move_stage", "assign_reviewer"].includes(action.type) ? action.type : "move_stage");
    setTargetId(String(action?.payload.stage_id || action?.payload.reviewer_id || ""));
    setConditionStage(String(rule?.conditions[0]?.value || "__any"));
    setIsOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !targetId || (triggerEvent === "sla.expired" && conditionStage === "__any")) return;
    setSaving(true);
    try {
      const draft = {
        title: title.trim(), trigger_event: triggerEvent, description: rules.find(rule => rule.id === editingId)?.description,
        conditions: conditionStage === "__any" ? [] : [{ field: "stage", operator: "equals" as const, value: conditionStage }],
        actions: [{ type: actionType as "move_stage" | "assign_reviewer", payload: actionType === "move_stage" ? { stage_id: targetId } : { reviewer_id: targetId } }],
      };
      if (editingId) await updateRule({ id: editingId, draft });
      else await createRule(draft);
      setIsOpen(false);
    } catch { /* The mutation displays the database error and leaves the form open. */ }
    finally { setSaving(false); }
  };

  const toggleRule = async (rule: AutomationRule, active: boolean) => {
    try {
      await setRuleActive({ id: rule.id, active });
      setActivating(null);
    } catch { /* Keep the current state; the mutation displays the error. */ }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <Card className="p-6 rounded-3xl flex flex-wrap items-center justify-between gap-4 border-amber-500/20">
        <div>
          <h3 className="font-black flex items-center gap-2"><Zap className="w-5 h-5 text-amber-500" /> قواعد الأتمتة</h3>
          <p className="text-xs text-muted-foreground mt-2">نقل المراحل وتعيين المراجعين تلقائيًا. تُحفظ القاعدة كمسودة ويُفعّلها مالك الشركة بعد مراجعتها.</p>
          <p className="text-xs text-muted-foreground mt-1">تدعم الأحداث تسجيل إرسال العروض وتجاوز مهلة المرحلة. إرسال البريد وواتساب وWebhooks غير مدعوم حاليًا.</p>
        </div>
        <Button disabled={!canManage || needsCompany} onClick={() => openEditor()} className="gap-2 rounded-xl"><Plus className="w-4 h-4" /> إنشاء قاعدة</Button>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent dir="rtl" className="sm:max-w-lg rounded-2xl">
          <DialogHeader><DialogTitle>{editingId ? "مراجعة قاعدة الأتمتة" : "قاعدة أتمتة جديدة"}</DialogTitle><DialogDescription>راجع الحدث والشروط والإجراء داخل الشركة الحالية.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label htmlFor="automation-title">اسم القاعدة</Label><Input id="automation-title" value={title} maxLength={255} onChange={event => setTitle(event.target.value)} placeholder="مثال: تعيين مراجع للطلبات الجديدة" /></div>
            <div className="space-y-2"><Label>الحدث</Label>
              <Select value={triggerEvent} onValueChange={value => setTriggerEvent(value as AutomationRule["trigger_event"])}>
                <SelectTrigger aria-label="الحدث"><SelectValue /></SelectTrigger><SelectContent>
                  <SelectItem value="application.created">عند وصول طلب توظيف جديد</SelectItem>
                  <SelectItem value="candidate.stage_changed">عند تغيير مرحلة المرشح</SelectItem>
                  <SelectItem value="offer.sent">عند تسجيل إرسال عرض عمل</SelectItem>
                  <SelectItem value="sla.expired">عند تجاوز مهلة المرحلة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>مرحلة المرشح عند وقوع الحدث</Label>
              <Select value={conditionStage} onValueChange={setConditionStage}>
                <SelectTrigger aria-label="شرط المرحلة"><SelectValue /></SelectTrigger><SelectContent>
                  <SelectItem value="__any" disabled={triggerEvent === "sla.expired"}>{triggerEvent === "sla.expired" ? "اختر مرحلة محددة" : "أي مرحلة"}</SelectItem>
                  {Array.from(new Set(stages.map(stage => stage.name))).map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                  {conditionStage !== "__any" && !stages.some(stage => stage.name === conditionStage) && <SelectItem value={conditionStage}>{conditionStage}</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            {triggerEvent === "sla.expired" && <p className="text-xs text-muted-foreground">اختر مرحلة لها مهلة بين ساعة و8760 ساعة في إعدادات المراحل. تُحسب المدة بالساعات المتصلة وتُراجع كل دقيقة. تطبق القاعدة على دخول المرحلة بعد تفعيلها فقط.</p>}
            {triggerEvent === "offer.sent" && <p className="text-xs text-muted-foreground">ينفذ الحدث مرة واحدة عند تسجيل العرض كمرسل، ولا يعد تأكيدًا لوصول البريد إلى المرشح.</p>}
            <div className="space-y-2"><Label>الإجراء</Label>
              <Select value={actionType} onValueChange={value => { setActionType(value); setTargetId(""); }}>
                <SelectTrigger aria-label="الإجراء"><SelectValue /></SelectTrigger><SelectContent>
                  <SelectItem value="move_stage">نقل المرشح إلى مرحلة</SelectItem>
                  <SelectItem value="assign_reviewer">تعيين مراجع للمرشح</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>{actionType === "move_stage" ? "المرحلة المستهدفة" : "المراجع"}</Label>
              <Select value={targetId} onValueChange={setTargetId}>
                <SelectTrigger aria-label="هدف الإجراء"><SelectValue placeholder="اختر من الشركة الحالية" /></SelectTrigger><SelectContent>
                  {actionType === "move_stage" ? stages.map(stage => <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>) : members.map(member => <SelectItem key={member.user_id} value={member.user_id}>{reviewerName(member.user_id)}</SelectItem>)}
                </SelectContent>
              </Select>
              {(stagesQuery.error || membersQuery.error) && <p role="alert" className="text-xs text-destructive">تعذر تحميل بعض الخيارات. أعد المحاولة قبل الحفظ.</p>}
              {actionType === "move_stage" && stages.length === 0 && !stagesQuery.isLoading && <p className="text-xs text-muted-foreground">أنشئ مرحلة نشطة مرتبطة بهذه الشركة أولًا.</p>}
              {actionType === "assign_reviewer" && members.length === 0 && !membersQuery.isLoading && <p className="text-xs text-muted-foreground">لا يوجد مراجع متاح في هذه الشركة.</p>}
            </div>
            <p className="text-xs text-muted-foreground">تغيير الحدث أو الشروط أو الإجراءات يوقف القاعدة حتى مراجعتها وتفعيلها مجددًا. شروط المقابلة والتقييم والاختبار تظل مطلوبة عند النقل.</p>
            <Button onClick={handleSave} disabled={saving || !canManage || !title.trim() || !targetId || (triggerEvent === "sla.expired" && conditionStage === "__any")} className="w-full">{saving ? "جارٍ الحفظ…" : "حفظ للمراجعة"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!activating} onOpenChange={open => { if (!open) setActivating(null); }}>
        <DialogContent dir="rtl"><DialogHeader><DialogTitle>تفعيل القاعدة</DialogTitle><DialogDescription>راجع الحدث والشروط والإجراء داخل الشركة الحالية.</DialogDescription></DialogHeader>
          {activating && <div className="space-y-3">
            <p className="font-bold">{activating.title}</p><p>{triggerLabels[activating.trigger_event]}</p>
            <p>{actionDetails(activating)}</p>
            <p className="text-sm">{activating.conditions.length ? `الشروط: ${activating.conditions.map(condition => `${fieldLabels[condition.field] || condition.field} ${operatorLabels[condition.operator]} ${String(condition.value)}`).join("، ")}` : "تطبق على جميع الأحداث المطابقة داخل الشركة."}</p>
            <p className="text-xs text-muted-foreground">يبدأ التنفيذ مع الأحداث الجديدة فقط. النقل الناتج عن الأتمتة لا يشغّل قواعد أخرى.</p>
            {activating.trigger_event === "sla.expired" && <p className="text-xs text-muted-foreground">لن تُعالج مدد المراحل التي بدأت قبل هذا التفعيل. تُحتسب المهلة بالساعات المتصلة وتُراجع كل دقيقة.</p>}
            <Button disabled={changingState} onClick={() => toggleRule(activating, true)}>تأكيد التفعيل</Button>
          </div>}
        </DialogContent>
      </Dialog>

      {needsCompany ? <p>اختر شركة لعرض قواعد الأتمتة.</p> : error ? <p role="alert" className="text-destructive">تعذر تحميل القواعد: {error.message}</p> : isLoading ? <p>جارٍ تحميل القواعد…</p> : rules.length === 0 ? <Card className="p-8 text-center border-dashed">لا توجد قواعد أتمتة محفوظة</Card> : rules.map(rule => {
        const blocked = activationBlock(rule);
        const editable = rule.actions.length <= 1 && (rule.conditions.length === 0 || (rule.conditions.length === 1 && rule.conditions[0].field === "stage" && rule.conditions[0].operator === "equals"));
        return <Card key={rule.id} className="p-4 rounded-2xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h4 className="font-bold">{rule.title}</h4><p className="text-xs text-muted-foreground mt-1">{triggerLabels[rule.trigger_event]}</p></div>
            <Badge variant={rule.is_active ? "default" : "outline"}>{rule.is_active ? "مفعّلة" : "مسودة / متوقفة"}</Badge>
          </div>
          <p className="text-sm break-words">{actionDetails(rule)}</p>
          {blocked && <p className="text-xs text-amber-700 dark:text-amber-400">{blocked}</p>}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={!canManage || changingState || (!rule.is_active && !!blocked)} onClick={() => rule.is_active ? toggleRule(rule, false) : setActivating(rule)} className="gap-1">{rule.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}{rule.is_active ? "إيقاف" : "مراجعة وتفعيل"}</Button>
            <Button size="sm" variant="ghost" disabled={!canManage || !editable} onClick={() => openEditor(rule)} className="gap-1"><Pencil className="w-4 h-4" /> تعديل</Button>
            <Button size="sm" variant="ghost" disabled={!canManage} onClick={() => deleteRule(rule.id)} aria-label={`حذف ${rule.title}`}><Trash2 className="w-4 h-4" /></Button>
          </div>
        </Card>;
      })}

      {!needsCompany && <Card className="p-5 rounded-2xl space-y-3">
        <h4 className="font-bold">آخر عمليات التنفيذ</h4>
        {logsError ? <p role="alert" className="text-destructive text-sm">تعذر تحميل سجل التنفيذ</p> : logsLoading ? <p className="text-sm">جارٍ تحميل السجل…</p> : logs.length === 0 ? <p className="text-sm text-muted-foreground">لم تُنفّذ قواعد بعد.</p> : logs.map(log => <div key={log.id} className="border-t pt-3 flex flex-wrap justify-between gap-2 text-sm">
          <div><p className="font-semibold">{rules.find(rule => rule.id === log.rule_id)?.title || "قاعدة أتمتة"}</p><p className={log.status === "failed" ? "text-destructive" : "text-muted-foreground"}>{automationMessages[log.execution_details.code || ""] || statusLabels[log.status] || "نتيجة غير متاحة"}</p>
            {log.execution_details.candidate_id && <Link className="text-primary underline text-xs" to={`/candidates/${log.execution_details.candidate_id}`}>فتح ملف المرشح</Link>}
          </div><time className="text-xs text-muted-foreground">{new Date(log.executed_at).toLocaleString("ar-SA")}</time>
        </div>)}
      </Card>}
    </div>
  );
}
