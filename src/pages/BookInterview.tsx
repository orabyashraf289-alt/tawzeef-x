import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
interface Slot {
  id: string | null;
  starts_at: string;
  time_zone: string;
  duration_minutes: number;
}
const display = (slot: Slot) =>
  new Date(slot.starts_at).toLocaleString("ar-EG", {
    timeZone: slot.time_zone,
    dateStyle: "full",
    timeStyle: "short",
  });
export default function BookInterview() {
  const { candidateId } = useParams();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [booking, setBooking] = useState<Slot | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const request = async (action: string, slotId?: string) => {
    const { data, error } = await supabase.functions.invoke("book-interview", {
      body: { trackingCode: candidateId, action, slotId },
    });
    if (error || data?.error) {
      throw new Error(
        data?.error ||
          "تعذّر تنفيذ الطلب. تحقق من رابط الحجز، ثم حدّث المواعيد وأعد المحاولة.",
      );
    }
    return data;
  };
  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await request("list");
      setSlots(data.slots || []);
      setBooking(data.booking || null);
      setSelected(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر تحميل المواعيد");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void refresh();
  }, [candidateId]);
  const change = async (action: string, id: string) => {
    setBusy(true);
    setError("");
    try {
      await request(action, id);
      await refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "الموعد لم يعد متاحًا. حدّث القائمة.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="min-h-screen bg-background p-4 sm:p-8" dir="rtl">
      <div className="mx-auto max-w-2xl space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />حجز موعد المقابلة
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              اختر موعدًا أتاحه فريق التوظيف. يظهر توقيت كل موعد بوضوح قبل
              تأكيده.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/30 p-3 text-destructive"
              >
                {error}
              </div>
            )}
            {loading
              ? <Loader2 className="mx-auto animate-spin" />
              : booking
              ? (
                <div className="rounded-lg border p-4 space-y-3">
                  <CheckCircle className="h-8 w-8 text-primary" />
                  <h2 className="font-semibold">موعدك المؤكد</h2>
                  <p>{display(booking)}</p>
                  <p className="text-sm text-muted-foreground">
                    {booking.time_zone} · {booking.duration_minutes} دقيقة
                  </p>
                  <p className="text-sm">
                    {booking.id
                      ? "لتغيير الموعد، ألغِ الحجز الحالي ثم اختر من المواعيد المتاحة."
                      : "رتّب فريق التوظيف هذا الموعد. تواصل معه إذا أردت تغييره."}
                  </p>
                  {booking.id && (
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => change("cancel", booking.id!)}
                    >
                      إلغاء هذا الحجز
                    </Button>
                  )}
                </div>
              )
              : (
                <>
                  {slots.length === 0 && !error && (
                    <p className="rounded-lg bg-muted p-4">
                      لا توجد مواعيد متاحة الآن. تواصل مع مسؤول التوظيف لإتاحة
                      موعد.
                    </p>
                  )}
                  <div className="space-y-2">
                    {slots.map((slot) => (
                      <label
                        key={slot.id}
                        className={`flex items-center gap-3 rounded-lg border p-4 cursor-pointer ${
                          selected === slot.id
                            ? "border-primary bg-primary/5"
                            : ""
                        }`}
                      >
                        <input
                          type="radio"
                          name="slot"
                          disabled={busy}
                          checked={selected === slot.id}
                          onChange={() => setSelected(slot.id)}
                        />
                        <span>
                          <span className="block font-medium">
                            {display(slot)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {slot.time_zone} · {slot.duration_minutes} دقيقة
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                  <Button
                    className="w-full"
                    disabled={busy || !selected}
                    onClick={() => selected && change("book", selected)}
                  >
                    {busy &&
                      <Loader2 className="h-4 w-4 animate-spin me-2" />}تأكيد
                    الحجز
                  </Button>
                </>
              )}
            <Button
              variant="ghost"
              disabled={busy || loading}
              onClick={refresh}
            >
              تحديث المواعيد
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
