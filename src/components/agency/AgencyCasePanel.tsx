import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { AGENCY_STAGES, AGENCY_DOCUMENTS, AGENCY_CASE_STATUS, nextAgencyStage, type AgencyDocumentKind, type AgencyCaseStatus } from "@/lib/agencyCase";
import { CheckCircle2, FileText, Loader2, UploadCloud } from "lucide-react";

type AgencyCase = { candidate_id: string; agency_id: string; stage_index: number; status: AgencyCaseStatus };
type CaseDocument = { id: string; kind: AgencyDocumentKind; file_name: string; storage_path: string; created_at: string };
type CaseEvent = { id: string; event_type: string; to_stage: number | null; note: string | null; created_at: string };
type Candidate = { id: string; name: string; email: string | null; phone: string | null; role: string | null; resume_url: string | null };

export default function AgencyCasePanel({ candidate, open, onOpenChange }: {
  candidate: Candidate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const [kind, setKind] = useState<AgencyDocumentKind>("passport");
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const caseQuery = useQuery({
    queryKey: ["agency-case", candidate?.id],
    enabled: open && !!candidate,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("agency_cases").select("*")
        .eq("candidate_id", candidate!.id).single();
      if (error) throw error;
      return data as AgencyCase;
    },
  });
  const documentsQuery = useQuery({
    queryKey: ["agency-case-documents", candidate?.id],
    enabled: open && !!candidate,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("agency_case_documents").select("*")
        .eq("candidate_id", candidate!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data as CaseDocument[];
    },
  });
  const eventsQuery = useQuery({
    queryKey: ["agency-case-events", candidate?.id],
    enabled: open && !!candidate,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("agency_case_events").select("*")
        .eq("candidate_id", candidate!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data as CaseEvent[];
    },
  });
  const current = caseQuery.data;
  const docs = documentsQuery.data || [];
  const next = current ? nextAgencyStage(current.stage_index, current.status, docs.map(d => d.kind)) : null;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["agency-case", candidate?.id] });
    qc.invalidateQueries({ queryKey: ["agency-case-list"] });
    qc.invalidateQueries({ queryKey: ["agency-case-documents", candidate?.id] });
    qc.invalidateQueries({ queryKey: ["agency-case-events", candidate?.id] });
    qc.invalidateQueries({ queryKey: ["agency-candidates"] });
    qc.invalidateQueries({ queryKey: ["agency-handoff"] });
  };

  const upload = async () => {
    if (!candidate || !current || !file) return;
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!["pdf", "doc", "docx", "jpg", "jpeg", "png"].includes(ext) || file.size > 10 * 1024 * 1024) {
      toast({ title: "الملف غير مدعوم أو أكبر من 10 ميجابايت", variant: "destructive" });
      return;
    }
    const path = `${current.agency_id}/${candidate.id}/${crypto.randomUUID()}.${ext}`;
    setBusy(true);
    try {
      const { error: uploadError } = await supabase.storage.from("agency-documents").upload(path, file, { upsert: false });
      if (uploadError) throw uploadError;
      const { error: registerError } = await (supabase as any).rpc("register_agency_case_document", {
        p_candidate_id: candidate.id, p_kind: kind, p_storage_path: path, p_file_name: file.name.slice(0, 200),
      });
      if (registerError) {
        await supabase.storage.from("agency-documents").remove([path]);
        throw registerError;
      }
      setFile(null);
      refresh();
      toast({ title: "تم حفظ المرفق في ملف المرشح" });
    } catch (error: any) {
      toast({ title: "تعذر رفع المرفق", description: error.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const openFile = async (path: string, bucket = "agency-documents") => {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60);
    if (error || !data?.signedUrl) {
      toast({ title: "تعذر فتح الملف", variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const changeStage = async (resubmit = false) => {
    if (!candidate || !current || (!resubmit && !next?.canAdvance)) return;
    setBusy(true);
    try {
      const { error } = await (supabase as any).rpc(resubmit ? "resubmit_agency_case" : "advance_agency_case", resubmit
        ? { p_candidate_id: candidate.id, p_note: note.trim() || null }
        : { p_candidate_id: candidate.id, p_next_stage: next!.index, p_note: note.trim() || null });
      if (error) throw error;
      setNote("");
      refresh();
      toast({ title: resubmit ? "أعيد إرسال الملف للإدارة" : next?.index === 7 ? "أرسل الملف للإدارة لمراجعة العقد والعرض" : "تم تحديث مرحلة المرشح" });
    } catch (error: any) {
      toast({ title: "تعذر تحديث المرحلة", description: error.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle>ملف إجراءات {candidate?.name}</DialogTitle>
          <DialogDescription>تابع المراحل والمرفقات حتى تسليم الملف للإدارة. اعتماد العرض والعقد يتم من حساب الإدارة.</DialogDescription>
        </DialogHeader>
        {caseQuery.isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : caseQuery.isError || !current
          ? <p className="text-sm text-destructive">تعذر تحميل ملف المكتب. حاول تحديث الصفحة.</p>
          : <div className="space-y-5 text-right">
            <div className="rounded-xl border p-4 flex flex-wrap justify-between gap-3 text-sm">
              <div><strong>{candidate?.name}</strong><p dir="ltr">{candidate?.email} · {candidate?.phone}</p><p>{candidate?.role}</p></div>
              <Badge variant="outline">{AGENCY_CASE_STATUS[current.status]}</Badge>
            </div>
            <ol className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {AGENCY_STAGES.map((stage, index) => (
                <li key={stage.title} className={`rounded-xl border p-3 text-xs ${index <= current.stage_index ? "bg-emerald-500/10 border-emerald-500/30" : "bg-muted/30"}`}>
                  <span className="font-bold">{index + 1}. {stage.title}</span>
                  {index < current.stage_index && <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-1" />}
                </li>
              ))}
            </ol>
            <div className="rounded-xl border p-4 space-y-3">
              <h3 className="font-bold text-sm">الوثائق والمرفقات</h3>
              {candidate?.resume_url && <Button variant="outline" size="sm" onClick={() => openFile(candidate.resume_url!, "resumes")}>فتح السيرة الذاتية الأصلية</Button>}
              <div className="flex flex-wrap gap-2">
                {docs.map(doc => <Button key={doc.id} variant="outline" size="sm" onClick={() => openFile(doc.storage_path)}>
                  <FileText className="w-4 h-4 ml-1" />{AGENCY_DOCUMENTS.find(item => item.value === doc.kind)?.title}: {doc.file_name}
                </Button>)}
              </div>
              {(current.status === "in_progress" || current.status === "needs_changes") && <div className="grid sm:grid-cols-[180px_1fr_auto] gap-2 items-end">
                <div><Label>نوع المرفق</Label><Select value={kind} onValueChange={value => setKind(value as AgencyDocumentKind)}>
                  <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{AGENCY_DOCUMENTS.map(item => <SelectItem key={item.value} value={item.value}>{item.title}</SelectItem>)}</SelectContent>
                </Select></div>
                <div><Label htmlFor="agency-case-file">PDF أو Word أو صورة، حتى 10 ميجابايت</Label>
                  <Input id="agency-case-file" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={e => setFile(e.target.files?.[0] || null)} /></div>
                <Button onClick={upload} disabled={busy || !file}><UploadCloud className="w-4 h-4 ml-1" />رفع</Button>
              </div>}
            </div>
            {(next || current.status === "needs_changes") && <div className="rounded-xl border p-4 space-y-2">
              <Label htmlFor="agency-stage-note">ملاحظة الإجراء (اختياري)</Label>
              <Textarea id="agency-stage-note" maxLength={2000} value={note} onChange={e => setNote(e.target.value)} />
              {next?.requiredEvidence && !next.canAdvance && <p className="text-xs text-amber-700">ارفع {AGENCY_DOCUMENTS.find(item => item.value === next.requiredEvidence)?.title} قبل الانتقال.</p>}
              {current.status === "needs_changes"
                ? <Button onClick={() => changeStage(true)} disabled={busy}>إعادة إرسال الملف بعد الاستكمال</Button>
                : <Button onClick={() => changeStage()} disabled={busy || !next?.canAdvance}>الانتقال إلى: {next?.title}</Button>}
            </div>}
            <div className="space-y-2">
              <h3 className="font-bold text-sm">سجل الإجراءات</h3>
              {eventsQuery.isError && <p className="text-xs text-destructive">تعذر تحميل السجل.</p>}
              {(eventsQuery.data || []).map(event => <div key={event.id} className="border-r-2 border-primary pr-3 text-xs">
                <strong>{event.event_type === "stage" ? AGENCY_STAGES[event.to_stage || 0]?.title : ({
                  created: "بدء الملف", returned: "أعادته الإدارة للاستكمال", resubmitted: "أعيد إلى الإدارة", accepted: "اعتماد ملف المكتب",
                } as Record<string, string>)[event.event_type]}</strong>
                <span className="text-muted-foreground mr-2">{new Date(event.created_at).toLocaleString("ar-SA")}</span>
                {event.note && <p className="mt-1">{event.note}</p>}
              </div>)}
            </div>
          </div>}
      </DialogContent>
    </Dialog>
  );
}
