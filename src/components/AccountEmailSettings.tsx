import { useState } from "react";
import { Mail } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type EmailChangeProblem = "session" | "delivery" | "rate_limit" | "email_in_use" | "invalid_email" | "network" | "server" | "unknown";

export function emailChangeProblem(error: unknown): EmailChangeProblem {
  if (!error || typeof error !== "object") return "unknown";
  const details = error as { code?: string; name?: string; status?: number; message?: string };
  const code = details.code || "";
  if (details.status === 401 || details.name === "AuthSessionMissingError"
    || ["session_not_found", "session_expired", "refresh_token_not_found", "refresh_token_already_used", "bad_jwt", "user_not_found"].includes(code)) return "session";
  if (details.status === 429 || ["over_email_send_rate_limit", "over_request_rate_limit"].includes(code)) return "rate_limit";
  if (["email_exists", "user_already_exists"].includes(code)) return "email_in_use";
  if (code === "email_address_invalid") return "invalid_email";
  if (code === "email_address_not_authorized"
    || ((details.status || 0) >= 500 && /sending.*(?:email|mail)|smtp|mail.*delivery/i.test(details.message || ""))) return "delivery";
  if (details.name === "AuthRetryableFetchError" && !details.status
    || details instanceof TypeError && /fetch|network/i.test(details.message || "")) return "network";
  if ((details.status || 0) >= 500 || code === "unexpected_failure") return "server";
  return "unknown";
}

const emailChangeErrors: Record<EmailChangeProblem, { ar: string; en: string }> = {
  session: { ar: "انتهت جلسة الدخول أو لم تعد صالحة. سجّل الدخول من جديد ثم أعد طلب تغيير البريد.", en: "Your sign-in session is no longer valid. Sign in again before requesting the email change." },
  delivery: { ar: "تعذّر إرسال رسالة تأكيد تغيير البريد بسبب مشكلة في خدمة إرسال البريد بالمنصة. يلزم أن يراجع مسؤول المنصة إعدادات الإرسال؛ تسجيل الدخول مرة أخرى لن يحل مشكلة الإرسال.", en: "The platform could not send the email-change confirmation. An administrator needs to check the email delivery settings; signing in again will not fix delivery." },
  rate_limit: { ar: "تم تجاوز حد طلبات إرسال البريد مؤقتًا. انتظر قليلًا قبل إعادة المحاولة.", en: "The email request limit was reached. Wait before trying again." },
  email_in_use: { ar: "الإيميل الجديد مستخدم بالفعل في حساب آخر. استخدم إيميلًا مختلفًا.", en: "The new email is already used by another account. Use a different email." },
  invalid_email: { ar: "صيغة الإيميل الجديد غير مقبولة. راجع كتابته ثم أعد المحاولة.", en: "The new email address is not valid. Check it and try again." },
  network: { ar: "تعذّر الاتصال بخدمة تسجيل الدخول. تحقق من اتصالك، وراجع حالة الطلب قبل المحاولة مرة أخرى.", en: "Could not reach the authentication service. Check your connection and the request status before trying again." },
  server: { ar: "حدث خطأ في خدمة تسجيل الدخول أثناء طلب تغيير البريد. يحتاج مسؤول المنصة إلى مراجعة الخدمة؛ لم يتم تأكيد التغيير.", en: "The authentication service failed while requesting the email change. An administrator needs to check the service; the change has not been confirmed." },
  unknown: { ar: "تعذّر طلب تغيير البريد. احتفظنا بالإيميل الذي أدخلته؛ إذا استمرت المشكلة، تواصل مع مسؤول المنصة.", en: "Could not request the email change. Your entered email has been kept; contact an administrator if the problem continues." },
};

export default function AccountEmailSettings() {
  const { user } = useAuth();
  const { locale } = useI18n();
  const en = locale === "en";
  const [email, setEmail] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<EmailChangeProblem | null>(null);
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
    setSaving(true); setError(null); setUpdated(false); setRequested("");
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
    } catch (failure) { setError(emailChangeProblem(failure)); }
    finally { setSaving(false); }
  }}>
    <h3 className="font-semibold flex items-center gap-2"><Mail className="w-4 h-4 text-primary" />{en ? "Change login email" : "تغيير إيميل تسجيل الدخول"}</h3>
    <p className="text-sm text-muted-foreground">{en ? "Your account, password and permissions stay the same. Complete any verification requested in your current and new inboxes before using the new email." : "حسابك وكلمة السر وصلاحياتك تظل كما هي. أكمل التأكيد المطلوب في بريدك الحالي والجديد قبل استخدام الإيميل الجديد للدخول."}</p>
    <div className="space-y-2">
      <Label htmlFor="login-new-email">{en ? "New login email" : "إيميل الدخول الجديد"}</Label>
      <Input id="login-new-email" type="email" autoComplete="email" dir="ltr" maxLength={254} required disabled={saving}
        value={email} onChange={event => { setEmail(event.target.value); setError(null); setUpdated(false); }} />
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
    {error && <p role="alert" className="text-sm text-destructive">{emailChangeErrors[error][en ? "en" : "ar"]}</p>}
    <Button type="submit" disabled={!canSave || saving}>{saving ? (en ? "Submitting…" : "جارٍ إرسال الطلب…") : (en ? "Request email change" : "طلب تغيير الإيميل")}</Button>
  </form>;
}
