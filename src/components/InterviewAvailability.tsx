import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar, Copy, Link2, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Slot {
  id: string;
  starts_at: string;
  time_zone: string;
  duration_minutes: number;
  interview_id: string | null;
  interviewer_id: string;
  interviewer: string;
  withdrawn: boolean;
}

interface CalendarSyncConnection {
  id: string;
  provider: "google" | "outlook" | "ics";
  calendar_email: string | null;
  external_feed_url: string | null;
  sync_direction: "read_only" | "two_way";
  conflict_protection: boolean;
  is_active: boolean;
  last_synced_at: string | null;
}

const PROVIDER_LABELS: Record<CalendarSyncConnection["provider"], string> = {
  google: "Google Calendar",
  outlook: "Microsoft Outlook",
  ics: "رابط تقويم iCal (.ics)",
};

export default function InterviewAvailability() {
  const { activeCompanyId } = useCompany();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mintingFeed, setMintingFeed] = useState(false);
  const [savingSync, setSavingSync] = useState(false);
  const [feedUrl, setFeedUrl] = useState<string | null>(null);
  const [feedExpiresAt, setFeedExpiresAt] = useState<string | null>(null);
  const [syncProvider, setSyncProvider] = useState<"google" | "outlook" | "ics">("google");
  const [calendarEmail, setCalendarEmail] = useState("");
  const [externalFeedUrl, setExternalFeedUrl] = useState("");
  const [conflictProtection, setConflictProtection] = useState(true);
  const [form, setForm] = useState({
    date: "",
    time: "09:00",
    time_zone: "Africa/Cairo",
    duration_minutes: 30,
  });
  const call = async (action: string, payload: object = {}) => {
    const { data, error } = await (supabase.rpc as any)(
      "interview_slot_workflow",
      { _company: activeCompanyId, _action: action, _payload: payload },
    );
    if (error) throw error;
    return data;
  };
  const slots = useQuery({
    queryKey: ["interview-availability", activeCompanyId, user?.id],
    enabled: open && !!activeCompanyId,
    queryFn: async () => (await call("list")).slots as Slot[],
  });
  const syncConnections = useQuery({
    queryKey: ["calendar-sync-connections", activeCompanyId, user?.id],
    enabled: open && !!activeCompanyId && !!user?.id,
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("calendar_sync_connections")
        .select("*")
        .eq("company_id", activeCompanyId!)
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data || []) as CalendarSyncConnection[];
    },
  });

  const mintSignedFeed = async () => {
    if (!activeCompanyId) return;
    setMintingFeed(true);
    try {
      const { data, error } = await supabase.functions.invoke("calendar-ics-feed", {
        body: { companyId: activeCompanyId },
      });
      if (error) throw error;
      if (data?.feedUrl) {
        setFeedUrl(data.feedUrl);
        setFeedExpiresAt(data.expiresAt || null);
        toast({ title: "تم توليد رابط اشتراك التقويم (.ics)" });
      }
    } catch {
      toast({
        title: "تعذّر إنشاء رابط التغذية",
        description: "تأكد من تهيئة خدمة calendar-ics-feed وصلاحياتك في الشركة.",
        variant: "destructive",
      });
    } finally {
      setMintingFeed(false);
    }
  };

  const copyFeedUrl = async () => {
    if (!feedUrl || typeof navigator === "undefined" || !navigator.clipboard) return;
    await navigator.clipboard.writeText(feedUrl);
    toast({ title: "تم نسخ رابط .ics إلى الحافظة" });
  };

  const saveCalendarConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompanyId || !user?.id) return;
    if (syncProvider === "ics" && !externalFeedUrl.trim()) {
      toast({ title: "أدخل رابط .ics الخارجي أولًا", variant: "destructive" });
      return;
    }
    if (syncProvider !== "ics" && !calendarEmail.trim()) {
      toast({ title: "أدخل البريد الإلكتروني للتقويم أولًا", variant: "destructive" });
      return;
    }
    setSavingSync(true);
    try {
      const { error } = await (supabase.from as any)("calendar_sync_connections").upsert(
        {
          company_id: activeCompanyId,
          user_id: user.id,
          provider: syncProvider,
          calendar_email: calendarEmail.trim() || null,
          external_feed_url: externalFeedUrl.trim() || null,
          sync_direction: syncProvider === "ics" ? "read_only" : "two_way",
          conflict_protection: conflictProtection,
          is_active: true,
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: "company_id,user_id,provider" },
      );
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["calendar-sync-connections", activeCompanyId, user.id] });
      toast({ title: "تم حفظ ربط التقويم وحماية التعارض" });
    } catch {
      toast({ title: "تعذّر حفظ ربط التقويم", variant: "destructive" });
    } finally {
      setSavingSync(false);
    }
  };

  const removeCalendarConnection = async (id: string) => {
    if (!user?.id) return;
    const { error } = await (supabase.from as any)("calendar_sync_connections")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      toast({ title: "تعذّر إزالة الربط", variant: "destructive" });
      return;
    }
    await qc.invalidateQueries({ queryKey: ["calendar-sync-connections", activeCompanyId, user.id] });
    toast({ title: "تم فصل التقويم" });
  };

  const change = async (action: string, payload: object) => {
    setBusy(true);
    try {
      await call(action, payload);
      await qc.invalidateQueries({ queryKey: ["interview-availability"] });
      toast({ title: "تم حفظ الموعد المتاح" });
    } catch {
      toast({
        title: "تعذّر حفظ الموعد",
        description:
          "تحقق من صلاحيتك وتاريخ الموعد، ومن عدم تعارضه مع موعد آخر. سحب الموعد المحجوز يتطلب إلغاء المقابلة أولًا.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        مواعيد الحجز الذاتي
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-2xl max-h-[85vh] overflow-y-auto"
          dir="rtl"
        >
          <DialogHeader>
            <DialogTitle>المواعيد التي تتيحها للمرشحين</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            أضف وقتًا تكون متاحًا فيه لإجراء المقابلة بنفسك. يرى المرشحون المواعيد
            غير المحجوزة فقط. تأكد أيضًا من تقويمك الخارجي.
          </p>
          <form
            className="grid grid-cols-2 gap-3 rounded-lg border p-4"
            onSubmit={(e) => {
              e.preventDefault();
              void change("create", form);
            }}
          >
            <div>
              <Label htmlFor="availability-date">التاريخ</Label>
              <Input
                id="availability-date"
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="availability-time">الساعة</Label>
              <Input
                id="availability-time"
                type="time"
                required
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="availability-zone">التوقيت</Label>
              <select
                id="availability-zone"
                className="w-full rounded-md border bg-background p-2"
                value={form.time_zone}
                onChange={(e) =>
                  setForm({ ...form, time_zone: e.target.value })}
              >
                <option value="Africa/Cairo">القاهرة</option>
                <option value="Asia/Riyadh">الرياض</option>
              </select>
            </div>
            <div>
              <Label htmlFor="availability-duration">المدة بالدقائق</Label>
              <Input
                id="availability-duration"
                type="number"
                min={15}
                max={120}
                required
                value={form.duration_minutes}
                onChange={(e) =>
                  setForm({
                    ...form,
                    duration_minutes: Number(e.target.value),
                  })}
              />
            </div>
            <Button
              className="col-span-2"
              disabled={busy || !activeCompanyId}
              type="submit"
            >
              إتاحة الموعد
            </Button>
          </form>

          <div className="rounded-lg border p-4 space-y-3 bg-muted/20">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">مزامنة التقويم وحماية التعارض</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={mintingFeed || !activeCompanyId}
                onClick={mintSignedFeed}
                className="gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${mintingFeed ? "animate-spin" : ""}`} />
                {feedUrl ? "تجديد رابط .ics" : "توليد رابط .ics للاشتراك"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              أضف رابط .ics الموقّع في Google Calendar أو Outlook أو Apple Calendar للاشتراك التلقائي في مواعيد المقابلات، أو اربط حساب التقويم أدناه لتفعيل فحص التعارض.
            </p>
            {feedUrl && (
              <div className="flex items-center gap-2 rounded-md border bg-background p-2">
                <Link2 className="w-4 h-4 text-primary shrink-0" />
                <code className="text-[11px] truncate flex-1" dir="ltr">
                  {feedUrl}
                </code>
                <Button type="button" size="sm" variant="ghost" onClick={copyFeedUrl} aria-label="نسخ رابط .ics">
                  <Copy className="w-3.5 h-3.5" />
                </Button>
                {feedExpiresAt && (
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    صالح حتى {new Date(feedExpiresAt).toLocaleDateString("ar-EG")}
                  </span>
                )}
              </div>
            )}

            <form className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t" onSubmit={saveCalendarConnection}>
              <div>
                <Label htmlFor="calendar-sync-provider" className="text-xs">مزود التقويم</Label>
                <select
                  id="calendar-sync-provider"
                  className="w-full rounded-md border bg-background p-2 text-xs mt-1"
                  value={syncProvider}
                  onChange={(e) => setSyncProvider(e.target.value as "google" | "outlook" | "ics")}
                >
                  <option value="google">Google Calendar</option>
                  <option value="outlook">Microsoft Outlook / 365</option>
                  <option value="ics">رابط تقويم iCal (.ics)</option>
                </select>
              </div>
              {syncProvider === "ics" ? (
                <div>
                  <Label htmlFor="calendar-external-feed" className="text-xs">رابط التغذية الخارجي (.ics)</Label>
                  <Input
                    id="calendar-external-feed"
                    dir="ltr"
                    className="h-9 mt-1 text-xs"
                    value={externalFeedUrl}
                    onChange={(e) => setExternalFeedUrl(e.target.value)}
                    placeholder="https://calendar.google.com/calendar/ical/..."
                  />
                </div>
              ) : (
                <div>
                  <Label htmlFor="calendar-sync-email" className="text-xs">بريد حساب التقويم</Label>
                  <Input
                    id="calendar-sync-email"
                    type="email"
                    dir="ltr"
                    className="h-9 mt-1 text-xs"
                    value={calendarEmail}
                    onChange={(e) => setCalendarEmail(e.target.value)}
                    placeholder="interviewer@company.com"
                  />
                </div>
              )}
              <div className="sm:col-span-2 flex items-center justify-between rounded-md border bg-background px-3 py-2">
                <span className="text-xs">تفعيل منع حجز المقابلات المتداخلة زمنيًا</span>
                <Switch checked={conflictProtection} onCheckedChange={setConflictProtection} />
              </div>
              <Button type="submit" size="sm" variant="secondary" className="sm:col-span-2" disabled={savingSync || !activeCompanyId}>
                {savingSync ? "جارٍ حفظ الربط..." : "حفظ إعدادات ربط التقويم"}
              </Button>
            </form>

            {syncConnections.data && syncConnections.data.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t">
                {syncConnections.data.map((conn) => (
                  <div key={conn.id} className="flex items-center justify-between gap-2 rounded-md border bg-background px-2.5 py-1.5 text-xs">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold">{PROVIDER_LABELS[conn.provider]}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {conn.sync_direction === "two_way" ? "ثنائي / حماية التعارض" : "اشتراك .ics"}
                        </Badge>
                        {conn.conflict_protection && (
                          <Badge variant="secondary" className="text-[10px]">منع التداخل مفعل</Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate" dir="ltr">
                        {conn.calendar_email || conn.external_feed_url || ""}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeCalendarConnection(conn.id)}
                      aria-label={`فصل ${PROVIDER_LABELS[conn.provider]}`}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {slots.isLoading && <p>جارٍ تحميل المواعيد…</p>}
          {slots.isError && (
            <p role="alert">
              تعذّر تحميل المواعيد.{" "}
              <Button variant="link" onClick={() => slots.refetch()}>
                إعادة المحاولة
              </Button>
            </p>
          )}
          {slots.data?.filter((s) => !s.withdrawn).length === 0 && (
            <p className="text-sm text-muted-foreground">
              لا توجد مواعيد متاحة بعد.
            </p>
          )}
          {slots.data?.filter((s) => !s.withdrawn).map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between gap-3 rounded-lg border p-3"
            >
              <div>
                <p>
                  {new Date(s.starts_at).toLocaleString("ar-EG", {
                    timeZone: s.time_zone,
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {s.time_zone} · {s.duration_minutes} دقيقة · {s.interviewer} ·
                  {" "}
                  {s.interview_id ? "محجوز" : "متاح"}
                </p>
              </div>
              {s.interviewer_id === user?.id && !s.interview_id && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => change("withdraw", { id: s.id })}
                >
                  سحب الإتاحة
                </Button>
              )}
            </div>
          ))}
        </DialogContent>
      </Dialog>
    </>
  );
}
