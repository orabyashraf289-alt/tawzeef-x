import { useEffect, useState } from "react";
import { Globe, Mail, Phone, Save } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { useUserRole } from "@/hooks/useUserRole";
import { usePublicContactSettings, useSavePublicContactSettings, type PublicContactSettings as ContactData } from "@/hooks/usePublicContactSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function PublicContactSettings() {
  const { isPlatformSuperAdmin, isLoading } = useUserRole();
  if (isLoading) return <p role="status">…</p>;
  if (!isPlatformSuperAdmin) return null;
  return <ContactEditor />;
}

function ContactEditor() {
  const { locale } = useI18n();
  const en = locale === "en";
  const query = usePublicContactSettings();
  const save = useSavePublicContactSettings();
  const [draft, setDraft] = useState<ContactData | null>(null);
  const [dirty, setDirty] = useState(false);
  useEffect(() => { if (query.data && !dirty) setDraft(query.data); }, [query.data, dirty]);
  const change = (key: keyof ContactData, value: string) => {
    setDraft(previous => previous && ({ ...previous, [key]: value }));
    setDirty(true);
    save.reset();
  };
  if (query.isError && !query.data) return <div role="alert" className="space-y-3">
    <p>{en ? "Contact details could not be loaded." : "تعذّر تحميل بيانات التواصل."}</p>
    <Button onClick={() => query.refetch()}>{en ? "Retry" : "إعادة المحاولة"}</Button>
  </div>;
  if (!draft) return <p role="status">{en ? "Loading contact details…" : "جارٍ تحميل بيانات التواصل…"}</p>;

  const fields: { key: keyof ContactData; ar: string; en: string; type?: string; required?: boolean }[] = [
    { key: "contact_email", ar: "إيميل التواصل", en: "Contact email", type: "email", required: true },
    { key: "support_email", ar: "إيميل الدعم", en: "Support email", type: "email", required: true },
    { key: "contact_phone", ar: "رقم التواصل (اختياري)", en: "Phone number (optional)", type: "tel" },
    { key: "location_ar", ar: "العنوان بالعربية (اختياري)", en: "Address in Arabic (optional)" },
    { key: "location_en", ar: "العنوان بالإنجليزية (اختياري)", en: "Address in English (optional)" },
    { key: "hours_ar", ar: "مواعيد التواصل بالعربية (اختياري)", en: "Contact hours in Arabic (optional)" },
    { key: "hours_en", ar: "مواعيد التواصل بالإنجليزية (اختياري)", en: "Contact hours in English (optional)" },
  ];
  return <form className="space-y-6" onSubmit={async event => {
    event.preventDefault();
    try { await save.mutateAsync(draft); setDirty(false); } catch { /* Keep the draft for retry. */ }
  }}>
    <div className="flex gap-3 items-start">
      <div className="rounded-xl bg-primary/10 p-3 text-primary"><Globe className="w-6 h-6" /></div>
      <div><h2 className="text-xl font-bold">{en ? "Website & contact details" : "بيانات الموقع والتواصل"}</h2>
        <p className="text-sm text-muted-foreground mt-2">{en ? "These details are public. Saving updates the website contact links. Empty optional fields stay hidden." : "هذه البيانات تظهر للزوار. الحفظ يحدّث روابط التواصل في الموقع، والحقول الاختيارية الفارغة لا تظهر."}</p>
      </div>
    </div>
    <div className="grid sm:grid-cols-2 gap-5">
      {fields.map(field => <div key={field.key} className="space-y-2">
        <Label htmlFor={`public-${field.key}`}>{en ? field.en : field.ar}</Label>
        <Input id={`public-${field.key}`} type={field.type || "text"}
          dir={field.key.endsWith("_ar") ? "rtl" : "ltr"}
          required={field.required} disabled={save.isPending}
          maxLength={field.type === "email" ? 254 : field.type === "tel" ? 40 : 240}
          pattern={field.type === "tel" ? "\\+?[0-9][0-9 ()\\-]{4,39}" : undefined}
          value={draft[field.key]} onChange={event => change(field.key, event.target.value)} />
      </div>)}
    </div>
    <div className="rounded-xl border bg-muted/30 p-4 space-y-2 text-sm">
      <p className="font-semibold">{en ? "Public preview" : "معاينة بيانات التواصل"}</p>
      <p className="flex gap-2 items-center"><Mail className="w-4 h-4" /><span dir="ltr">{draft.contact_email}</span></p>
      {draft.contact_phone && <p className="flex gap-2 items-center"><Phone className="w-4 h-4" /><span dir="ltr">{draft.contact_phone}</span></p>}
    </div>
    <p className="text-sm text-muted-foreground">{en ? "Contact emails are separate from your account login email." : "إيميلات التواصل مستقلة عن إيميل تسجيل دخول حسابك."}</p>
    {save.isError && <p role="alert" className="text-destructive">{en ? "Could not save. Check the details and your administrator access, then retry." : "تعذّر الحفظ. راجع البيانات وصلاحية مسؤول النظام ثم أعد المحاولة."}</p>}
    {save.isSuccess && !dirty && <p role="status" className="text-primary">{en ? "Saved. The website now uses these contact details." : "تم الحفظ. الموقع يستخدم بيانات التواصل الجديدة الآن."}</p>}
    <Button type="submit" disabled={!dirty || save.isPending} className="gap-2"><Save className="w-4 h-4" />{save.isPending ? (en ? "Saving…" : "جارٍ الحفظ…") : (en ? "Save contact details" : "حفظ بيانات التواصل")}</Button>
  </form>;
}
