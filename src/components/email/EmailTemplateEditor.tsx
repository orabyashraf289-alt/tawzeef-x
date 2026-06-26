import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Pencil, Trash2, Copy, Loader2, Eye, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  category: string;
  is_default: boolean;
  variables: string[];
  created_at: string;
}

const CATEGORIES = [
  { value: "general", label: "عام" },
  { value: "interview", label: "مقابلات" },
  { value: "offer", label: "عروض" },
  { value: "rejection", label: "رفض" },
  { value: "welcome", label: "ترحيب" },
  { value: "followup", label: "متابعة" },
];

const DEFAULT_TEMPLATES: Partial<EmailTemplate>[] = [
  {
    name: "دعوة مقابلة",
    subject: "دعوة لإجراء مقابلة - {{position}}",
    body_html: `<div dir="rtl" style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background: #ffffff; border-radius: 12px;">
  <h2 style="color: #148358;">دعوة لإجراء مقابلة</h2>
  <p>عزيزي/عزيزتي {{name}}،</p>
  <p>نود إبلاغك بأنه تم اختيارك لإجراء مقابلة لوظيفة <strong>{{position}}</strong>.</p>
  <p>📅 التاريخ: {{date}}<br/>⏰ الوقت: {{time}}</p>
  <p>نتطلع للقائك!</p>
  <p>مع أطيب التحيات،<br/>فريق التوظيف</p>
</div>`,
    category: "interview",
    variables: ["name", "position", "date", "time"],
  },
  {
    name: "رسالة رفض",
    subject: "بخصوص طلبك لوظيفة {{position}}",
    body_html: `<div dir="rtl" style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background: #ffffff; border-radius: 12px;">
  <h2 style="color: #374151;">شكراً لاهتمامك</h2>
  <p>عزيزي/عزيزتي {{name}}،</p>
  <p>شكراً لتقديمك على وظيفة <strong>{{position}}</strong>. بعد مراجعة دقيقة، قررنا المضي قدماً مع مرشحين آخرين.</p>
  <p>نقدر وقتك واهتمامك، ونتمنى لك التوفيق.</p>
  <p>مع أطيب التحيات،<br/>فريق التوظيف</p>
</div>`,
    category: "rejection",
    variables: ["name", "position"],
  },
  {
    name: "ترحيب بموظف جديد",
    subject: "أهلاً وسهلاً {{name}} - مرحباً في الفريق! 🎉",
    body_html: `<div dir="rtl" style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background: #ffffff; border-radius: 12px;">
  <h2 style="color: #148358;">🎉 أهلاً وسهلاً في الفريق!</h2>
  <p>عزيزي/عزيزتي {{name}}،</p>
  <p>يسعدنا انضمامك إلينا في قسم <strong>{{department}}</strong>.</p>
  <p>📅 تاريخ البدء: {{start_date}}</p>
  <p>نتطلع للعمل معك!</p>
  <p>مع أطيب التحيات،<br/>فريق الموارد البشرية</p>
</div>`,
    category: "welcome",
    variables: ["name", "department", "start_date"],
  },
];

export default function EmailTemplateEditor() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState("all");

  const [form, setForm] = useState({
    name: "",
    subject: "",
    body_html: "",
    category: "general",
    variables: [] as string[],
  });

  const fetchTemplates = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("email_templates" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setTemplates((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchTemplates(); }, [user]);

  const extractVariables = (text: string): string[] => {
    const matches = text.match(/\{\{(\w+)\}\}/g) || [];
    return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, "")))];
  };

  const openNew = () => {
    setForm({ name: "", subject: "", body_html: "", category: "general", variables: [] });
    setEditing(null);
    setIsNew(true);
  };

  const openEdit = (t: EmailTemplate) => {
    setForm({ name: t.name, subject: t.subject, body_html: t.body_html, category: t.category, variables: t.variables });
    setEditing(t);
    setIsNew(true);
  };

  const handleSave = async () => {
    if (!user || !form.name || !form.subject || !form.body_html) return;
    setSaving(true);
    const vars = extractVariables(form.subject + form.body_html);
    const payload = { ...form, variables: vars, user_id: user.id };

    if (editing) {
      await supabase.from("email_templates" as any).update(payload as any).eq("id", editing.id);
    } else {
      await supabase.from("email_templates" as any).insert(payload as any);
    }

    toast({ title: editing ? "تم تحديث القالب ✅" : "تم إنشاء القالب ✅" });
    setIsNew(false);
    setEditing(null);
    setSaving(false);
    fetchTemplates();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("email_templates" as any).delete().eq("id", id);
    toast({ title: "تم حذف القالب" });
    fetchTemplates();
  };

  const handleDuplicate = async (t: EmailTemplate) => {
    if (!user) return;
    await supabase.from("email_templates" as any).insert({
      ...t, id: undefined, name: `${t.name} (نسخة)`, is_default: false, user_id: user.id
    } as any);
    toast({ title: "تم نسخ القالب ✅" });
    fetchTemplates();
  };

  const handleLoadDefault = async (tpl: Partial<EmailTemplate>) => {
    if (!user) return;
    await supabase.from("email_templates" as any).insert({
      ...tpl, user_id: user.id, is_default: true
    } as any);
    toast({ title: "تم تحميل القالب الافتراضي ✅" });
    fetchTemplates();
  };

  const filtered = filterCat === "all" ? templates : templates.filter(t => t.category === filterCat);
  const catLabel = (v: string) => CATEGORIES.find(c => c.value === v)?.label || v;

  if (loading) {
    return <div className="flex items-center justify-center h-32"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            قوالب البريد الإلكتروني
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">إنشاء وإدارة قوالب جاهزة للرسائل</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterCat} onValueChange={setFilterCat}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={openNew} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            قالب جديد
          </Button>
        </div>
      </div>

      {/* Default templates prompt */}
      {templates.length === 0 && (
        <div className="bg-muted/30 rounded-xl p-4 border border-border/40">
          <p className="text-sm font-medium text-foreground mb-3">🚀 ابدأ بقوالب جاهزة</p>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_TEMPLATES.map((tpl, i) => (
              <Button key={i} variant="outline" size="sm" onClick={() => handleLoadDefault(tpl)} className="text-xs gap-1.5">
                <Plus className="w-3 h-3" />
                {tpl.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Templates grid */}
      <div className="grid sm:grid-cols-2 gap-3">
        <AnimatePresence>
          {filtered.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-muted/20 rounded-xl p-4 border border-border/40 hover:border-primary/30 transition-colors group"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">{t.name}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">{t.subject}</p>
                </div>
                <Badge variant="outline" className="text-[10px]">{catLabel(t.category)}</Badge>
              </div>
              {t.variables.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {t.variables.map(v => (
                    <span key={v} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono">{`{{${v}}}`}</span>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setPreviewHtml(t.body_html)}>
                  <Eye className="w-3 h-3 ml-1" />معاينة
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => openEdit(t)}>
                  <Pencil className="w-3 h-3 ml-1" />تعديل
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => handleDuplicate(t)}>
                  <Copy className="w-3 h-3 ml-1" />نسخ
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive hover:text-destructive" onClick={() => handleDelete(t.id)}>
                  <Trash2 className="w-3 h-3 ml-1" />حذف
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Editor dialog */}
      <Dialog open={isNew} onOpenChange={setIsNew}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل القالب" : "قالب جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">اسم القالب</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="مثال: دعوة مقابلة" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">التصنيف</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">الموضوع</Label>
              <Input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="موضوع الرسالة — استخدم {{variable}}" className="mt-1" dir="rtl" />
            </div>
            <div>
              <Label className="text-xs">محتوى الرسالة (HTML)</Label>
              <Textarea
                value={form.body_html}
                onChange={e => setForm({ ...form, body_html: e.target.value })}
                placeholder="<div dir='rtl'>...</div>"
                className="mt-1 font-mono text-xs min-h-[200px]"
                dir="ltr"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                💡 استخدم {"{{variable}}"} لإدراج متغيرات ديناميكية
              </p>
            </div>
            {extractVariables(form.subject + form.body_html).length > 0 && (
              <div className="flex flex-wrap gap-1">
                <span className="text-xs text-muted-foreground">المتغيرات المكتشفة:</span>
                {extractVariables(form.subject + form.body_html).map(v => (
                  <Badge key={v} variant="secondary" className="text-[10px] font-mono">{v}</Badge>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setPreviewHtml(form.body_html)}>
                <Eye className="w-3.5 h-3.5 ml-1" />معاينة
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : null}
                {saving ? "جاري الحفظ..." : editing ? "تحديث" : "إنشاء"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview dialog */}
      <Dialog open={!!previewHtml} onOpenChange={() => setPreviewHtml(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>معاينة القالب</DialogTitle>
          </DialogHeader>
          <div className="border rounded-lg p-4 bg-white" dangerouslySetInnerHTML={{ __html: previewHtml || "" }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
