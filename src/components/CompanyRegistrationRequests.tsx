import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

type Request = { id: string; company_name: string; contact_email: string; created_at: string; status: string; review_note?: string };
export default function CompanyRegistrationRequests() {
  const client = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [history, setHistory] = useState(false);
  const requests = useQuery({
    queryKey: ["company-registration-requests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("company_registration_requests" as any)
        .select("id, company_name, contact_email, created_at, status, review_note").order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Request[];
    },
  });
  const review = useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: "approved" | "rejected" }) => {
      const { error } = await supabase.rpc("review_company_registration" as any, {
        _request_id: id, _decision: decision, _note: notes[id]?.trim() || "",
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["company-registration-requests"] });
      await client.invalidateQueries({ queryKey: ["companies"] });
      toast({ title: "تم حفظ قرار مراجعة الشركة" });
    },
    onError: () => toast({ title: "تعذر حفظ القرار", description: "حدّث القائمة ثم حاول مرة أخرى. يجب تأكيد بريد صاحب الطلب قبل الموافقة.", variant: "destructive" }),
  });
  const pending = requests.data?.filter(r => r.status === "pending") || [];
  const rows = history ? requests.data || [] : pending;
  return <Card className="mb-6 border-primary/20">
    <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
      <CardTitle className="text-lg">طلبات إنشاء الشركات {requests.data && `(${pending.length})`}</CardTitle>
      <div className="flex gap-2">
        <Button size="sm" variant="ghost" onClick={() => setHistory(!history)}>{history ? "الطلبات المعلقة" : "سجل القرارات"}</Button>
        <Button size="sm" variant="outline" onClick={() => requests.refetch()} disabled={requests.isFetching}>تحديث الطلبات</Button>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      <p className="text-sm text-muted-foreground">لا تُفعّل الشركة ولا تُمنح عضوية لصاحبها قبل موافقة مسؤول المنصة.</p>
      {requests.isError ? <p role="alert">تعذر تحميل طلبات الشركات. أعد المحاولة.</p> : requests.isLoading ? <p>جاري تحميل الطلبات...</p> : rows.length === 0 ? <p>لا توجد طلبات {history ? "مسجلة" : "بانتظار المراجعة"}.</p> : rows.map(r => <article key={r.id} className="rounded-xl border p-4 space-y-3">
        <h3 className="font-bold">{r.company_name}</h3>
        <p className="text-sm text-muted-foreground">{r.contact_email} · {new Date(r.created_at).toLocaleDateString("ar")}</p>
        {r.status === "pending" ? <>
          <label className="block text-sm" htmlFor={`review-${r.id}`}>ملاحظة المراجعة (مطلوبة للرفض)</label>
          <Textarea id={`review-${r.id}`} maxLength={1000} value={notes[r.id] || ""} onChange={e => setNotes({ ...notes, [r.id]: e.target.value })} />
          <div className="flex gap-3">
            <Button disabled={review.isPending} onClick={() => review.mutate({ id: r.id, decision: "approved" })}>الموافقة وإنشاء الشركة</Button>
            <Button variant="destructive" disabled={review.isPending || !notes[r.id]?.trim()} onClick={() => review.mutate({ id: r.id, decision: "rejected" })}>رفض الطلب</Button>
          </div>
        </> : <p className="text-sm">{r.status === "approved" ? "تمت الموافقة" : "تم الرفض"}{r.review_note ? ` — ${r.review_note}` : ""}</p>}
      </article>)}
    </CardContent>
  </Card>;
}
