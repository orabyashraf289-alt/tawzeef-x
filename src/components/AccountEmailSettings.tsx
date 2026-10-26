import { useState } from "react";
import { Mail } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AccountEmailSettings() {
  const { user } = useAuth();
  const { locale } = useI18n();
  const en = locale === "en";
  const [email, setEmail] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [requested, setRequested] = useState("");
  const [updated, setUpdated] = useState(false);
  if (!user) return null;
  const normalized = email.trim().toLowerCase();
  const canSave = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
    && normalized === confirmation.trim().toLowerCase()
    && normalized !== user.email?.toLowerCase();
  const pendingEmail = updated ? "" : requested || user.new_email;

  return <form className="rounded-xl border p-5 space-y-4" onSubmit={async event => {
    event.preventDefault();
    if (!canSave || saving) return;
    setSaving(true); setError(false); setUpdated(false); setRequested("");
    try {
      // Supabase Auth owns verification and updates the same authenticated user.
      // Never change profiles, roles, company contacts or auth.users directly.
      // Use the project's configured Site URL; preview hosts need not be
      // added to the authentication redirect allow-list.
      const { data, error: authError } = await supabase.auth.updateUser({ email: normalized });
      if (authError || !data.user || data.user.id !== user.id) throw authError || new Error("Email update failed");
      if (data.user.email?.toLowerCase() === normalized) setUpdated(true);
      else setRequested(normalized);
      setEmail(""); setConfirmation("");
    } catch { setError(true); }
    finally { setSaving(false); }
  }}>
    <h3 className="font-semibold flex items-center gap-2"><Mail className="w-4 h-4 text-primary" />{en ? "Change login email" : "تغيير إيميل تسجيل الدخول"}</h3>
    <p className="text-sm text-muted-foreground">{en ? "Your account, password and permissions stay the same. Complete any verification requested in your current and new inboxes before using the new email." : "حسابك وكلمة السر وصلاحياتك تظل كما هي. أكمل التأكيد المطلوب في بريدك الحالي والجديد قبل استخدام الإيميل الجديد للدخول."}</p>
    <div className="space-y-2">
      <Label htmlFor="login-new-email">{en ? "New login email" : "إيميل الدخول الجديد"}</Label>
      <Input id="login-new-email" type="email" autoComplete="email" dir="ltr" maxLength={254} required disabled={saving}
        value={email} onChange={event => { setEmail(event.target.value); setError(false); setUpdated(false); }} />
    </div>
    <div className="space-y-2">
      <Label htmlFor="login-confirm-email">{en ? "Confirm new email" : "تأكيد الإيميل الجديد"}</Label>
      <Input id="login-confirm-email" type="email" autoComplete="off" dir="ltr" maxLength={254} required disabled={saving}
        value={confirmation} onChange={event => setConfirmation(event.target.value)} />
    </div>
    {pendingEmail && pendingEmail.toLowerCase() !== user.email?.toLowerCase() && <p role="status" className="text-sm text-primary">
      {en ? "Email change awaiting confirmation: " : "تغيير البريد بانتظار التأكيد: "}<b dir="ltr">{pendingEmail}</b>
    </p>}
    {updated && <p role="status" className="text-sm text-primary">{en ? "Your login email has been updated." : "تم تحديث إيميل تسجيل الدخول."}</p>}
    {error && <p role="alert" className="text-sm text-destructive">{en ? "Could not request the change. Check the email and your session, then retry." : "تعذّر طلب تغيير البريد. راجع الإيميل وصلاحية جلسة الدخول ثم أعد المحاولة."}</p>}
    <Button type="submit" disabled={!canSave || saving}>{saving ? (en ? "Submitting…" : "جارٍ إرسال الطلب…") : (en ? "Request email change" : "طلب تغيير الإيميل")}</Button>
  </form>;
}
