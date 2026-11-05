import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
export default function InterviewAvailability() {
  const { activeCompanyId } = useCompany();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
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
