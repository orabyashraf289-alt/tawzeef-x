import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock, Loader2, Trash2, Send, Calendar, CheckCircle2, Paperclip, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ScheduledEmail {
  id: string;
  to_email: string;
  subject: string;
  body_html: string;
  scheduled_at: string;
  sent_at: string | null;
  status: string;
  template_id: string | null;
  attachments?: Array<{ filename: string; path: string }> | null;
  created_at: string;
}

interface Template {
  id: string;
  name: string;
  subject: string;
  body_html: string;
}

export default function ScheduledEmails() {
  const { user } = useAuth();
  const [emails, setEmails] = useState<ScheduledEmail[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<Array<{ filename: string; path: string }>>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [form, setForm] = useState({
    to_email: "",
    subject: "",
    body_html: "",
    scheduled_at: "",
    template_id: "none",
  });

  const fetchData = async () => {
    if (!user) return;
    const [emailsRes, templatesRes] = await Promise.all([
      supabase.from("scheduled_emails" as any).select("*").eq("user_id", user.id).order("scheduled_at", { ascending: true }),
      supabase.from("email_templates" as any).select("id, name, subject, body_html").eq("user_id", user.id),
    ]);
    setEmails((emailsRes.data as any) || []);
    setTemplates((templatesRes.data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleTemplateSelect = (id: string) => {
    setForm(f => ({ ...f, template_id: id }));
    if (id !== "none") {
      const tpl = templates.find(t => t.id === id);
      if (tpl) {
        setForm(f => ({ ...f, subject: tpl.subject, body_html: tpl.body_html }));
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "خطأ", description: "حجم الملف لا يجب أن يتجاوز 5 ميجابايت", variant: "destructive" });
      return;
    }

    setUploadingFile(true);
    const cleanFileName = file.name.replace(/[^\w\s.-]/g, "").replace(/\s+/g, "_");
    const uniqueId = Math.random().toString(36).substring(2, 9);
    const filePath = `${user.id}/email-attachments/${uniqueId}_${cleanFileName}`;

    try {
      const { error } = await supabase.storage
        .from("resumes")
        .upload(filePath, file);

      if (error) throw error;

      setAttachedFiles(prev => [...prev, { filename: file.name, path: `resumes/${filePath}` }]);
      toast({ title: "تم رفع الملف بنجاح ✅" });
    } catch (err: any) {
      toast({ title: "خطأ في رفع الملف", description: err.message, variant: "destructive" });
    } finally {
      setUploadingFile(false);
      e.target.value = "";
    }
  };

  const handleRemoveAttachment = async (index: number, path: string) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
    try {
      let cleanPath = path;
      if (cleanPath.startsWith("resumes/")) {
        cleanPath = cleanPath.substring("resumes/".length);
      }
      await supabase.storage.from("resumes").remove([cleanPath]);
    } catch (e) {
      console.error("Failed to delete attachment from storage:", e);
    }
  };

  const handleSchedule = async () => {
    if (!user || !form.to_email || !form.subject || !form.body_html || !form.scheduled_at) return;
    setSaving(true);
    const { error } = await supabase.from("scheduled_emails" as any).insert({
      user_id: user.id,
      to_email: form.to_email,
      subject: form.subject,
      body_html: form.body_html,
      scheduled_at: form.scheduled_at,
      template_id: form.template_id === "none" ? null : form.template_id,
      attachments: attachedFiles,
    } as any);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تمت جدولة الرسالة ✅" });
      setDialogOpen(false);
      setForm({ to_email: "", subject: "", body_html: "", scheduled_at: "", template_id: "none" });
      setAttachedFiles([]);
      fetchData();
    }
    setSaving(false);
  };

  const handleCancel = async (id: string) => {
    await supabase.from("scheduled_emails" as any).delete().eq("id", id);
    toast({ title: "تم إلغاء الرسالة المجدولة" });
    fetchData();
  };

  const handleSendNow = async (email: ScheduledEmail) => {
    try {
      const { error } = await supabase.functions.invoke("send-email", {
        body: {
          to: email.to_email,
          subject: email.subject,
          html: email.body_html,
          user_id: user?.id,
          attachments: email.attachments || [],
        },
      });
      if (error) throw error;
      await supabase.from("scheduled_emails" as any).update({ status: "sent", sent_at: new Date().toISOString() } as any).eq("id", email.id);
      toast({ title: "تم إرسال الرسالة ✅" });
      fetchData();
    } catch (err: any) {
      toast({ title: "فشل الإرسال", description: err.message, variant: "destructive" });
    }
  };

  const pending = emails.filter(e => e.status === "pending");
  const sent = emails.filter(e => e.status === "sent");

  if (loading) {
    return <div className="flex items-center justify-center h-32"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  const statusBadge = (s: string) => {
    if (s === "sent") return <Badge className="bg-green-500/10 text-green-600 border-green-500/30 text-[10px]"><CheckCircle2 className="w-3 h-3 ml-1" />تم الإرسال</Badge>;
    return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]"><Clock className="w-3 h-3 ml-1" />مجدول</Badge>;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            الرسائل المجدولة
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">جدولة رسائل البريد الإلكتروني للإرسال في وقت لاحق</p>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          جدولة رسالة
        </Button>
      </div>

      {/* Pending */}
      {pending.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground">⏳ في الانتظار ({pending.length})</h4>
          <AnimatePresence>
            {pending.map(e => (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-muted/20 rounded-xl p-4 border border-border/40 flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {statusBadge(e.status)}
                    <span className="text-xs text-muted-foreground truncate">{e.to_email}</span>
                  </div>
                  <p className="text-sm font-medium text-foreground truncate">{e.subject}</p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(e.scheduled_at).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                  {e.attachments && e.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {e.attachments.map((file: any, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-[9px] py-0 px-1.5 bg-muted/30 text-muted-foreground gap-1 border-border/40">
                          <Paperclip className="w-2.5 h-2.5" />
                          {file.filename}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1" onClick={() => handleSendNow(e)}>
                    <Send className="w-3 h-3" />إرسال الآن
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive" onClick={() => handleCancel(e.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Sent */}
      {sent.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground">✅ تم الإرسال ({sent.length})</h4>
          {sent.slice(0, 10).map(e => (
            <div key={e.id} className="bg-muted/10 rounded-xl p-3 border border-border/20 flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground truncate">{e.subject}</p>
                <p className="text-[10px] text-muted-foreground">{e.to_email} • {new Date(e.sent_at!).toLocaleDateString("ar-SA", { month: "short", day: "numeric" })}</p>
                {e.attachments && e.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {e.attachments.map((file: any, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-[9px] py-0 px-1 bg-muted/20 text-muted-foreground gap-0.5 border-border/30">
                        <Paperclip className="w-2 h-2" />
                        {file.filename}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {emails.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">لا توجد رسائل مجدولة</p>
        </div>
      )}

      {/* Schedule dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>جدولة رسالة بريد إلكتروني</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {templates.length > 0 && (
              <div>
                <Label className="text-xs">اختيار قالب (اختياري)</Label>
                <Select value={form.template_id} onValueChange={handleTemplateSelect}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="بدون قالب" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون قالب</SelectItem>
                    {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label className="text-xs">البريد الإلكتروني للمستلم</Label>
              <Input type="email" value={form.to_email} onChange={e => setForm({ ...form, to_email: e.target.value })} placeholder="example@email.com" className="mt-1" required />
            </div>
            <div>
              <Label className="text-xs">الموضوع</Label>
              <Input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="موضوع الرسالة" className="mt-1" dir="rtl" required />
            </div>
            <div>
              <Label className="text-xs">المحتوى</Label>
              <Textarea value={form.body_html} onChange={e => setForm({ ...form, body_html: e.target.value })} placeholder="محتوى الرسالة..." className="mt-1 min-h-[120px]" dir="rtl" />
            </div>
            <div>
              <Label className="text-xs">المرفقات</Label>
              <div className="mt-1 border border-dashed rounded-lg p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">أقصى حجم للملف: 5 ميجابايت</span>
                  <Label htmlFor="email-file-upload" className="cursor-pointer">
                    <div className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline">
                      {uploadingFile ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Paperclip className="w-3.5 h-3.5" />
                      )}
                      {uploadingFile ? "جاري الرفع..." : "إضافة ملف"}
                    </div>
                    <input
                      id="email-file-upload"
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={uploadingFile}
                    />
                  </Label>
                </div>

                {attachedFiles.length > 0 && (
                  <div className="space-y-1.5 mt-2">
                    {attachedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-muted/30 rounded px-2 py-1 text-xs">
                        <span className="truncate max-w-[250px] font-medium text-foreground">{file.filename}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveAttachment(idx, file.path)}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div>
              <Label className="text-xs">تاريخ ووقت الإرسال</Label>
              <Input type="datetime-local" value={form.scheduled_at} onChange={e => setForm({ ...form, scheduled_at: e.target.value })} className="mt-1" required />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>إلغاء</Button>
              <Button size="sm" onClick={handleSchedule} disabled={saving} className="gap-1.5">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
                {saving ? "جاري الجدولة..." : "جدولة"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
