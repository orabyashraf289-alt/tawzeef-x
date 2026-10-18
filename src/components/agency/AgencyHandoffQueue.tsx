import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AGENCY_DOCUMENTS, AGENCY_CASE_STATUS, type AgencyCaseStatus, type AgencyDocumentKind } from "@/lib/agencyCase";
import { FileText, Loader2 } from "lucide-react";

type Handoff = {
  candidate_id: string;
  company_id: string;
  status: AgencyCaseStatus;
  updated_at: string;
  candidate: { id: string; name: string; email: string | null; role: string | null; resume_url: string | null } | null;
  agency: { name: string } | null;
};
type CaseDocument = { id: string; kind: AgencyDocumentKind; file_name: string; storage_path: string };
type CaseEvent = { id: string; event_type: string; note: string | null; created_at: string };

export default function AgencyHandoffQueue({ companyId }: { companyId?: string | null }) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Handoff | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const casesQuery = useQuery({
    queryKey: ["agency-handoff", companyId],
    enabled: companyId !== null,
    queryFn: async () => {
      let query = (supabase as any).from("agency_cases")
        .select("candidate_id,company_id,status,updated_at,candidate:candidates!agency_cases_candidate_id_fkey(id,name,email,role,resume_url),agency:agencies!agency_cases_agency_id_fkey(name)")
        .in("status", ["awaiting_admin", "needs_changes", "file_accepted"])
        .order("updated_at", { ascending: false });
      if (companyId) query = query.eq("company_id", companyId);
      const { data, error } = await query;
      if (error) throw error;
      return data as Handoff[];
    },
  });
  const docsQuery = useQuery({
    queryKey: ["agency-handoff-documents", selected?.candidate_id],
    enabled: !!selected,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("agency_case_documents").select("*")
        .eq("candidate_id", selected!.candidate_id).order("created_at", { ascending: false });
      if (error) throw error;
      return data as CaseDocument[];
    },
  });
  const eventsQuery = useQuery({
    queryKey: ["agency-handoff-events", selected?.candidate_id],
    enabled: !!selected,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("agency_case_events")
        .select("id,event_type,note,created_at").eq("candidate_id", selected!.candidate_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CaseEvent[];
    },
  });

  const review = async (decision: "accept" | "return") => {
    if (!selected || (decision === "return" && !note.trim())) {
      toast({ title: "اكتب سبب طلب الاستكمال", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const { error } = await (supabase as any).rpc("review_agency_case", {
        p_candidate_id: selected.candidate_id, p_decision: decision, p_note: note.trim() || null,
      });
      if (error) throw error;
      setSelected(null);
      setNote("");
      qc.invalidateQueries({ queryKey: ["agency-handoff"] });
      toast({ title: decision === "accept" ? "تم قبول ملف المكتب للمراجعة التعاقدية" : "أُعيد الملف للمكتب لاستكمال النواقص" });
    } catch (error: any) {
      toast({ title: "تعذرت مراجعة الملف", description: error.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const openDocument = async (path: string, bucket = "agency-documents") => {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60);
    if (error || !data?.signedUrl) {
      toast({ title: "تعذر فتح المستند", variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const cases = casesQuery.data || [];
  return (
    <Card className="p-5 rounded-2xl space-y-4" dir="rtl">
      <div>
        <h2 className="font-bold text-lg">تسليم ملفات مكاتب العمل للإدارة</h2>
        <p className="text-xs text-muted-foreground">بعد اعتماد التأشيرة يراجع المسؤول المرفقات، ثم يتابع العرض الوظيفي والعقد من الشاشات المخصصة.</p>
      </div>
      {casesQuery.isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
      {casesQuery.isError && <p className="text-sm text-destructive">تعذر تحميل الملفات. أعد المحاولة.</p>}
      {!casesQuery.isLoading && !casesQuery.isError && cases.length === 0 && <p className="text-sm text-muted-foreground">لا توجد ملفات مسلّمة للمراجعة الآن.</p>}
      <div className="grid md:grid-cols-2 gap-2">
        {cases.map(item => <button key={item.candidate_id} type="button" onClick={() => setSelected(item)}
          className="text-right border rounded-xl p-3 hover:bg-muted/40 flex items-center justify-between gap-3">
          <span><strong>{item.candidate?.name || "مرشح"}</strong><span className="block text-xs text-muted-foreground">{item.agency?.name} · {item.candidate?.role}</span></span>
          <Badge variant="outline">{AGENCY_CASE_STATUS[item.status]}</Badge>
        </button>)}
      </div>
      <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle>مراجعة ملف {selected?.candidate?.name}</DialogTitle>
            <DialogDescription>{selected?.agency?.name} · {selected?.candidate?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-right">
            <Badge variant="outline">{selected && AGENCY_CASE_STATUS[selected.status]}</Badge>
            <div className="space-y-2">
              <h3 className="font-bold text-sm">المستندات</h3>
              {selected?.candidate?.resume_url && <Button variant="outline" size="sm" className="ml-2"
                onClick={() => openDocument(selected.candidate!.resume_url!, "resumes")}>
                <FileText className="w-4 h-4 ml-1" />السيرة الذاتية الأصلية
              </Button>}
              {docsQuery.isError && <p className="text-sm text-destructive">تعذر تحميل المستندات.</p>}
              {(docsQuery.data || []).map(doc => <Button key={doc.id} variant="outline" size="sm" className="ml-2" onClick={() => openDocument(doc.storage_path)}>
                <FileText className="w-4 h-4 ml-1" />{AGENCY_DOCUMENTS.find(kind => kind.value === doc.kind)?.title}: {doc.file_name}
              </Button>)}
            </div>
            <div className="text-xs space-y-1">
              <h3 className="font-bold text-sm">سجل الإجراء</h3>
              {(eventsQuery.data || []).map(event => <p key={event.id}>{new Date(event.created_at).toLocaleString("ar-SA")} · {event.event_type} {event.note && `— ${event.note}`}</p>)}
            </div>
            {selected?.status === "awaiting_admin" && <>
              <Textarea value={note} maxLength={2000} onChange={e => setNote(e.target.value)}
                placeholder="ملاحظات للمكتب أو سبب إعادة الملف" aria-label="ملاحظات مراجعة الملف" />
              <div className="flex flex-wrap gap-2">
                <Button disabled={busy || docsQuery.isLoading || docsQuery.isError} onClick={() => review("accept")}>قبول ملف المكتب</Button>
                <Button variant="outline" disabled={busy || !note.trim()} onClick={() => review("return")}>إعادة للاستكمال</Button>
              </div>
            </>}
            <div className="flex gap-3 text-sm font-bold text-primary">
              <Link to={`/candidates/${selected?.candidate_id}`}>ملف المرشح</Link>
              <Link to="/offers">العروض والعقود</Link>
            </div>
            <p className="text-xs text-muted-foreground">قبول ملف المكتب لا يعتمد عرضًا وظيفيًا أو عقدًا تلقائيًا.</p>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
