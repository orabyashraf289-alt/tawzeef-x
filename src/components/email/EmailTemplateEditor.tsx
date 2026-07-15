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
  { value: "otp", label: "رمز التحقق (OTP)" },
  { value: "password_reset", label: "استعادة كلمة المرور" },
  { value: "interview", label: "مقابلات العمل" },
  { value: "offer", label: "عروض العمل" },
  { value: "rejection", label: "الاعتذار والرفض" },
  { value: "welcome_company", label: "ترحيب بالشركات" },
  { value: "welcome_employee", label: "ترحيب بالموظفين" },
  { value: "application_confirmation", label: "تأكيد استلام الطلب" },
  { value: "support", label: "الدعم الفني" },
];

const DEFAULT_TEMPLATES: Partial<EmailTemplate>[] = [
  {
    name: "رمز التحقق لتسجيل الدخول (OTP)",
    subject: "رمز التحقق الخاص بك: {{otp_code}}",
    body_html: `<div dir="rtl" style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
  <div style="text-align: center; margin-bottom: 20px;">
    <h2 style="color: #1e40af; margin: 0; font-size: 22px;">رمز التحقق لتسجيل الدخول</h2>
    <p style="color: #6b7280; font-size: 14px; margin-top: 5px;">استخدم الرمز التالي لإكمال عملية تسجيل الدخول إلى Tawzeef-X</p>
  </div>
  <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
    <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1e293b;">{{otp_code}}</span>
  </div>
  <p style="color: #4b5563; font-size: 13px; text-align: center;">هذا الرمز صالح لمدة 10 دقائق فقط. لا تشارك هذا الرمز مع أي شخص أياً كان.</p>
</div>`,
    category: "otp",
    variables: ["otp_code"],
  },
  {
    name: "رابط استعادة كلمة المرور",
    subject: "طلب إعادة تعيين كلمة المرور الخاصة بك",
    body_html: `<div dir="rtl" style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
  <div style="text-align: center; margin-bottom: 20px;">
    <h2 style="color: #1e40af; margin: 0; font-size: 22px;">إعادة تعيين كلمة المرور</h2>
    <p style="color: #6b7280; font-size: 14px; margin-top: 5px;">تلقينا طلباً لإعادة تعيين كلمة مرور حسابك.</p>
  </div>
  <p style="color: #4b5563; font-size: 14px; line-height: 1.6;">إذا قمت بطلب إعادة التعيين بنفسك، يرجى النقر فوق الزر أدناه لتعيين كلمة مرور جديدة:</p>
  <div style="text-align: center; margin: 25px 0;">
    <a href="{{reset_link}}" style="background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 14px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">تعيين كلمة مرور جديدة</a>
  </div>
  <p style="color: #9ca3af; font-size: 11px; text-align: center; margin-top: 20px;">إذا لم تقم بطلب هذا الإجراء، يمكنك تجاهل هذا البريد الإلكتروني بأمان.</p>
</div>`,
    category: "password_reset",
    variables: ["reset_link"],
  },
  {
    name: "تأكيد استلام طلب توظيف",
    subject: "تأكيد استلام طلبك لوظيفة {{job_title}}",
    body_html: `<div dir="rtl" style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb;">
  <h2 style="color: #10b981;">تم استلام طلبك بنجاح!</h2>
  <p>عزيزي/عزيزتي {{candidate_name}}،</p>
  <p>شكراً لاهتمامك بالانضمام إلى <strong>{{company_name}}</strong> وتقديمك على وظيفة <strong>{{job_title}}</strong>.</p>
  <p>نريد تأكيد أننا استلمنا طلب التوظيف والسيرة الذاتية الخاصة بك بنجاح. سيقوم فريق التوظيف بمراجعة ملفك وسنتواصل معك قريباً في حال التوافق.</p>
  <p style="margin-top: 30px;">مع أطيب تمنياتنا لك بالتوفيق،<br/>فريق التوظيف في {{company_name}}</p>
</div>`,
    category: "application_confirmation",
    variables: ["candidate_name", "job_title", "company_name"],
  },
  {
    name: "دعوة لإجراء مقابلة",
    subject: "دعوة لإجراء مقابلة - {{job_title}}",
    body_html: `<div dir="rtl" style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb;">
  <h2 style="color: #2563eb;">دعوة لإجراء مقابلة شخصية</h2>
  <p>عزيزي/عزيزتي {{candidate_name}}،</p>
  <p>يسعدنا إبلاغك بأنه تم ترشيحك لإجراء مقابلة لوظيفة <strong>{{job_title}}</strong> مع شركة <strong>{{company_name}}</strong>.</p>
  <div style="background: #f8fafc; border-radius: 8px; padding: 15px; margin: 20px 0; border-right: 4px solid #2563eb;">
    <p style="margin: 5px 0;">📅 موعد المقابلة: <strong>{{scheduled_at}}</strong></p>
  </div>
  <p>يرجى الانضمام للمقابلة عبر الرابط التالي في الموعد المحدد:</p>
  <div style="text-align: center; margin: 20px 0;">
    <a href="{{interview_link}}" style="background: #2563eb; color: #ffffff; text-decoration: none; padding: 10px 24px; border-radius: 6px; font-weight: bold; display: inline-block;">الانضمام للمقابلة</a>
  </div>
  <p>نتطلع للقائك!</p>
  <p>مع أطيب التحيات،<br/>فريق التوظيف</p>
</div>`,
    category: "interview",
    variables: ["candidate_name", "job_title", "company_name", "scheduled_at", "interview_link"],
  },
  {
    name: "عرض عمل (Offer Letter)",
    subject: "عرض عمل لوظيفة {{job_title}} في {{company_name}}",
    body_html: `<div dir="rtl" style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb;">
  <h2 style="color: #059669;">🎉 تهانينا! عرض عمل جديد</h2>
  <p>عزيزي/عزيزتي {{candidate_name}}،</p>
  <p>يسعدنا تقديم هذا العرض الوظيفي الرسمي لك للانضمام إلى <strong>{{company_name}}</strong> في منصب <strong>{{job_title}}</strong>.</p>
  <p>يرجى الاطلاع على كامل تفاصيل وبنود العرض والموافقة عليه عبر الرابط التالي:</p>
  <div style="text-align: center; margin: 25px 0;">
    <a href="{{offer_link}}" style="background: #059669; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 14px;">عرض وتوقيع العقد</a>
  </div>
  <p>نحن متحمسون جداً لانضمامك إلينا والمساهمة في نجاحاتنا القادمة!</p>
  <p>مع أطيب التحيات،<br/>فريق التوظيف في {{company_name}}</p>
</div>`,
    category: "offer",
    variables: ["candidate_name", "job_title", "company_name", "offer_link"],
  },
  {
    name: "تأكيد تذكرة دعم فني",
    subject: "تم استلام تذكرتك بنجاح #{{ticket_id}}",
    body_html: `<div dir="rtl" style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb;">
  <h2 style="color: #4b5563;">مرحباً {{user_name}}،</h2>
  <p>نود إخطارك بأنه تم فتح تذكرة دعم فني جديدة برقم <strong>#{{ticket_id}}</strong> لمتابعة طلبك.</p>
  <div style="background: #f9fafb; border: 1px solid #f3f4f6; border-radius: 8px; padding: 15px; margin: 20px 0;">
    <strong style="color: #374151;">تفاصيل طلبك:</strong>
    <p style="color: #4b5563; font-size: 13px; margin: 8px 0 0 0;">{{issue_description}}</p>
  </div>
  <p>سيقوم أحد ممثلي الدعم الفني بمراجعة طلبك والرد عليك في أقرب وقت ممكن.</p>
  <p>مع أطيب التحيات،<br/>فريق الدعم الفني</p>
</div>`,
    category: "support",
    variables: ["user_name", "ticket_id", "issue_description"],
  },
  {
    name: "ترحيب بصاحب الشركة الجديد",
    subject: "أهلاً بك في Tawzeef-X! 🎉 حسابك جاهز",
    body_html: `<div dir="rtl" style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb;">
  <h2 style="color: #1e40af; text-align: center;">🎉 مرحباً بك في Tawzeef-X!</h2>
  <p>عزيزي <strong>{{owner_name}}</strong>،</p>
  <p>يسعدنا انضمام شركتكم الموقرة <strong>{{company_name}}</strong> إلى منصتنا.</p>
  <p>تم إعداد حسابك كمدير وصاحب للشركة بنجاح. يمكنك الآن:</p>
  <ul style="color: #4b5563; line-height: 1.8;">
    <li>إضافة وإدارة الوظائف الشاغرة.</li>
    <li>دعوة فريق العمل وإدارة الصلاحيات.</li>
    <li>متابعة طلبات التوظيف وإجراء المقابلات.</li>
  </ul>
  <p style="margin-top: 35px;">مع أطيب التمنيات بالنجاح والتوفيق،<br/>فريق عمل Tawzeef-X</p>
</div>`,
    category: "welcome_company",
    variables: ["owner_name", "company_name"],
  },
  {
    name: "دعوة موظف جديد للانضمام",
    subject: "دعوة للانضمام إلى فريق {{company_name}} على Tawzeef-X",
    body_html: `<div dir="rtl" style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb;">
  <h2 style="color: #2563eb;">دعوة انضمام لفريق العمل</h2>
  <p>مرحباً <strong>{{employee_name}}</strong>،</p>
  <p>لقد تمت دعوتك من قبل مدير النظام للانضمام إلى فريق عمل <strong>{{company_name}}</strong> على منصة التوظيف Tawzeef-X.</p>
  <p>يرجى النقر على الرابط التالي لقبول الدعوة وإنشاء حسابك للبدء في استخدام لوحة التحكم:</p>
  <div style="text-align: center; margin: 25px 0;">
    <a href="{{invitation_link}}" style="background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; display: inline-block;">قبول الدعوة وتفعيل الحساب</a>
  </div>
  <p>نتمنى لك تجربة عمل مميزة معنا!</p>
  <p>مع أطيب التحيات،<br/>إدارة {{company_name}}</p>
</div>`,
    category: "welcome_employee",
    variables: ["employee_name", "company_name", "invitation_link"],
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
