import React, { useState } from "react";
import { useAutomationRules, type AutomationRule } from "@/hooks/useAutomation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, Plus, Trash2, ArrowLeft, Mail, MessageSquare, UserCheck, Play, Sparkles, CheckCircle2, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AutomationBuilder() {
  const { rules, isLoading, createRule, toggleRule, deleteRule } = useAutomationRules();
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [triggerEvent, setTriggerEvent] = useState<AutomationRule["trigger_event"]>("candidate.stage_changed");
  const [actionType, setActionType] = useState<"send_email" | "send_whatsapp" | "move_stage" | "assign_reviewer">("send_email");
  const [actionDetail, setActionDetail] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await createRule({
        title: title.trim(),
        trigger_event: triggerEvent,
        conditions: [],
        actions: [{ type: actionType, payload: { details: actionDetail } }],
        is_active: true,
      });
      setTitle("");
      setActionDetail("");
      setIsOpen(false);
    } catch (err: any) {
      console.error("Automation rule create error:", err);
    } finally {
      setSaving(false);
    }
  };

  const getTriggerLabel = (t: string) => {
    switch (t) {
      case "candidate.stage_changed": return "تغيير مرحلة المرشح في الكانبان";
      case "application.created": return "تقديم طلب توظيف جديد";
      case "offer.sent": return "إرسال عرض عمل للمرشح";
      case "sla.expired": return "تجاوز المدة الزمنية المحددة (SLA)";
      default: return t;
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case "send_email": return <Mail className="w-4 h-4 text-emerald-500" />;
      case "send_whatsapp": return <MessageSquare className="w-4 h-4 text-green-500" />;
      case "assign_reviewer": return <UserCheck className="w-4 h-4 text-blue-500" />;
      default: return <Zap className="w-4 h-4 text-amber-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Add Trigger */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-amber-500/10 via-primary/5 to-transparent border border-amber-500/20 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
            <Zap className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-base text-foreground">محرك الأتمتة والسيناريوهات الذكية (Automation Builder)</h3>
              <Badge className="bg-amber-500 text-white text-[10px] px-2 font-bold">Smart Workflows</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">أتمتة إرسال التنبيهات والرسائل وتعيين المسؤولين تلقائياً دون أي تدخل يدوي.</p>
          </div>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl font-bold text-xs gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md">
              <Plus className="w-4 h-4" /> إنشاء قاعدة أتمتة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] rounded-3xl" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-lg font-black flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" /> إضافة سيناريو أتمتة جديد
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div>
                <Label className="text-xs font-bold text-muted-foreground mb-1 block">عنوان السيناريو والقاعدة</Label>
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="مثال: إرسال إيميل ترحيبي عند نقل المرشح للمقابلة"
                  className="rounded-xl h-11 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-muted-foreground mb-1 block">المحفز الذكي (Trigger Event)</Label>
                <Select value={triggerEvent} onValueChange={(val: any) => setTriggerEvent(val)}>
                  <SelectTrigger className="rounded-xl h-11 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="candidate.stage_changed">عند تغيير مرحلة المرشح في الكانبان</SelectItem>
                    <SelectItem value="application.created">عند تقديم طلب جديد عبر بوابة التوظيف</SelectItem>
                    <SelectItem value="offer.sent">عند إرسال عرض وظيفي للمرشح</SelectItem>
                    <SelectItem value="sla.expired">عند تجاوز زمن المرحلة المحامي (SLA)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-bold text-muted-foreground mb-1 block">الإجراء التلقائي (Action)</Label>
                <Select value={actionType} onValueChange={(val: any) => setActionType(val)}>
                  <SelectTrigger className="rounded-xl h-11 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="send_email">إرسال بريد إلكتروني تلقائي للمرشح</SelectItem>
                    <SelectItem value="send_whatsapp">إرسال رسالة واتساب تفاعلية</SelectItem>
                    <SelectItem value="assign_reviewer">تعيين مسؤول مراجعة أوتوماتيكياً</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-bold text-muted-foreground mb-1 block">تفاصيل وتعديل الرسالة والإجراء</Label>
                <Input
                  value={actionDetail}
                  onChange={e => setActionDetail(e.target.value)}
                  placeholder="مثال: مرحباً بك، يسعدنا دعوتك للمقابلة الشخصية..."
                  className="rounded-xl h-11 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setIsOpen(false)} className="rounded-xl text-xs">إلغاء</Button>
              <Button onClick={handleCreate} disabled={saving || !title.trim()} className="rounded-xl text-xs font-bold bg-primary gap-1">
                <Sparkles className="w-3.5 h-3.5" /> حفظ وتفعيل الأتمتة
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Rules List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">جاري تحميل قواعد الأتمتة...</div>
        ) : rules.length === 0 ? (
          <Card className="p-8 text-center rounded-3xl border-dashed border-border/80 space-y-3">
            <Zap className="w-10 h-10 text-muted-foreground mx-auto opacity-40" />
            <h4 className="font-bold text-sm">لا توجد قواعد أتمتة نشطة حالياً</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">قم بإنشاء أول قاعدة أتمتة لتسهيل وتلقائية التواصل مع المرشحين ومتابعة المراحل.</p>
          </Card>
        ) : (
          rules.map((rule) => (
            <Card key={rule.id} className="p-4 rounded-2xl border-border/60 hover:border-amber-500/40 transition-all flex items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 font-bold border border-amber-500/20">
                  {getActionIcon(rule.actions[0]?.type)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-sm text-foreground truncate">{rule.title}</h4>
                    <Badge variant="outline" className="text-[9px] px-2 py-0.5 bg-muted text-muted-foreground font-semibold">
                      {getTriggerLabel(rule.trigger_event)}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {rule.actions[0]?.payload?.details || "إجراء تلقائي منفذ بواسطة المحرك الذكي"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-2 border-r border-border pr-3">
                  <span className="text-[11px] font-bold text-muted-foreground">{rule.is_active ? "نشط" : "معطل"}</span>
                  <Switch
                    checked={rule.is_active}
                    onCheckedChange={(checked) => toggleRule({ id: rule.id, is_active: checked })}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteRule(rule.id)}
                  className="h-8 w-8 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
