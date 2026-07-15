import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Server, Lock, Loader2, CheckCircle2, Send, Mail, Settings } from "lucide-react";

const CONFIG_TYPES = [
  { id: "general", label: "إعدادات SMTP العامة (الافتراضية)" },
  { id: "otp", label: "رمز التحقق لتسجيل الدخول (OTP)" },
  { id: "password_reset", label: "استعادة كلمة المرور" },
  { id: "hiring", label: "مراسلات التوظيف والعروض (المرشحين)" },
  { id: "welcome", label: "ترحيب بالعميل الجديد (أصحاب الشركات)" },
  { id: "onboarding", label: "ترحيب بالموظف الجديد عند التسجيل" },
  { id: "support", label: "الدعم الفني والشكاوى" },
];

export default function EmailSettingsForm() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [exists, setExists] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [configType, setConfigType] = useState("general");
  const [settings, setSettings] = useState({
    smtp_host: "smtp.gmail.com",
    smtp_port: 465,
    smtp_secure: true,
    smtp_user: "",
    smtp_password: "",
    sender_name: "فريق التوظيف",
    is_active: true,
  });

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("manage-smtp", {
          body: { action: "load", config_type: configType },
        });
        if (data?.settings) {
          setSettings({
            smtp_host: data.settings.smtp_host,
            smtp_port: data.settings.smtp_port,
            smtp_secure: data.settings.smtp_secure,
            smtp_user: data.settings.smtp_user,
            smtp_password: data.settings.smtp_password,
            sender_name: data.settings.sender_name,
            is_active: data.settings.is_active,
          });
          setExists(true);
          setPasswordChanged(false);
        } else {
          // Reset to defaults for new configuration type
          setSettings({
            smtp_host: "smtp.gmail.com",
            smtp_port: 465,
            smtp_secure: true,
            smtp_user: "",
            smtp_password: "",
            sender_name: configType === "support" ? "دعم Tawzeef-X" : "فريق التوظيف",
            is_active: true,
          });
          setExists(false);
          setPasswordChanged(false);
        }
      } catch (err) {
        console.error("Failed to load email settings:", err);
      }
      setLoading(false);
    })();
  }, [user, configType]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    try {
      const payload = { ...settings, config_type: configType };
      if (exists && !passwordChanged) {
        delete (payload as any).smtp_password;
      }

      const { data, error } = await supabase.functions.invoke("manage-smtp", {
        body: { action: "save", settings: payload, config_type: configType },
      });

      if (error) throw error;
      setExists(true);
      setPasswordChanged(false);
      toast({ title: "تم حفظ إعدادات البريد بنجاح ✅" });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleTest = async () => {
    if (!user?.email) return;
    setTesting(true);
    try {
      const typeLabel = CONFIG_TYPES.find(t => t.id === configType)?.label || configType;
      const { error } = await supabase.functions.invoke("send-email", {
        body: {
          to: user.email,
          subject: `اختبار إعدادات البريد الإلكتروني: ${typeLabel}`,
          html: `<div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb;">
            <h2 style="color: #10b981; text-align: center;">✅ تم الاتصال بنجاح</h2>
            <p style="color: #374151; text-align: center;">إعدادات البريد الإلكتروني للنوع (${typeLabel}) تعمل بشكل صحيح.</p>
          </div>`,
          user_id: user.id,
          email_type: configType,
        },
      });
      if (error) throw error;
      toast({ title: "تم إرسال بريد الاختبار بنجاح ✅", description: `تحقق من صندوق الوارد: ${user.email}` });
    } catch (err: any) {
      toast({ title: "فشل الاختبار", description: err.message, variant: "destructive" });
    }
    setTesting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-bold text-foreground">إعدادات SMTP</h3>
        {exists && (
          <div className="flex items-center gap-1.5 text-xs text-green-600">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <Lock className="w-3 h-3" />
            مُهيأ ومشفّر
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1.5">
            <Settings className="w-3.5 h-3.5 text-primary" />
            غرض استخدام خادم البريد (SMTP Configuration Use Case)
          </Label>
          <Select value={configType} onValueChange={setConfigType}>
            <SelectTrigger className="w-full mt-1">
              <SelectValue placeholder="اختر نوع تهيئة البريد" />
            </SelectTrigger>
            <SelectContent>
              {CONFIG_TYPES.map(type => (
                <SelectItem key={type.id} value={type.id}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5" />
              خادم SMTP
            </Label>
            <Input
              value={settings.smtp_host}
              onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
              placeholder="smtp.gmail.com"
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label className="text-xs">المنفذ (Port)</Label>
            <Input
              type="number"
              value={settings.smtp_port}
              onChange={(e) => setSettings({ ...settings, smtp_port: parseInt(e.target.value) || 465 })}
              placeholder="465"
              className="mt-1"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              البريد الإلكتروني
            </Label>
            <Input
              type="email"
              value={settings.smtp_user}
              onChange={(e) => setSettings({ ...settings, smtp_user: e.target.value })}
              placeholder="your@gmail.com"
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label className="text-xs flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              كلمة مرور التطبيق
            </Label>
            <Input
              type="password"
              value={settings.smtp_password}
              onChange={(e) => {
                setSettings({ ...settings, smtp_password: e.target.value });
                setPasswordChanged(true);
              }}
              onFocus={() => {
                if (exists && !passwordChanged) {
                  setSettings({ ...settings, smtp_password: "" });
                  setPasswordChanged(true);
                }
              }}
              placeholder="••••••••••••"
              className="mt-1"
              required={!exists}
            />
            {exists && !passwordChanged && (
              <p className="text-[11px] text-muted-foreground mt-1">🔒 مشفّرة — انقر لتغييرها</p>
            )}
          </div>
        </div>

        <div>
          <Label className="text-xs">اسم المُرسل</Label>
          <Input
            value={settings.sender_name}
            onChange={(e) => setSettings({ ...settings, sender_name: e.target.value })}
            placeholder="فريق التوظيف"
            className="mt-1"
          />
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20">
          <div>
            <p className="text-sm font-medium text-foreground">اتصال آمن (SSL/TLS)</p>
            <p className="text-[11px] text-muted-foreground">مطلوب لمعظم خوادم البريد</p>
          </div>
          <Switch
            checked={settings.smtp_secure}
            onCheckedChange={(v) => setSettings({ ...settings, smtp_secure: v })}
          />
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20">
          <div>
            <p className="text-sm font-medium text-foreground">تفعيل إرسال البريد</p>
            <p className="text-[11px] text-muted-foreground">تشغيل/إيقاف إرسال البريد الإلكتروني</p>
          </div>
          <Switch
            checked={settings.is_active}
            onCheckedChange={(v) => setSettings({ ...settings, is_active: v })}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={saving} size="sm" className="bg-primary text-primary-foreground">
            {saving ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : null}
            {saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
          </Button>
          {exists && (
            <Button type="button" variant="outline" size="sm" onClick={handleTest} disabled={testing}>
              {testing ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <Send className="w-4 h-4 ml-1" />}
              {testing ? "جاري الاختبار..." : "إرسال بريد اختبار"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
