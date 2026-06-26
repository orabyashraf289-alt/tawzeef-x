import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Building, Trash2, Link2, X, Users } from "lucide-react";
import {
  useAllAgencies,
  useCreateAgency,
  useDeleteAgency,
  useCreateAssignment,
  useDeleteAssignment,
  useAgencyAssignments,
} from "@/hooks/useAgencies";
import { useAllCompanies } from "@/hooks/useCompanies";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

export default function AdminAgencies() {
  const { data: agencies = [], isLoading } = useAllAgencies();
  const { data: companies = [] } = useAllCompanies();
  const { data: allAssignments = [] } = useAgencyAssignments();
  const createAgency = useCreateAgency();
  const deleteAgency = useDeleteAgency();
  const createAssignment = useCreateAssignment();
  const deleteAssignment = useDeleteAssignment();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [license, setLicense] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [linkOpen, setLinkOpen] = useState<string | null>(null);
  const [linkCompany, setLinkCompany] = useState("");
  const [linkScope, setLinkScope] = useState<"company" | "candidate">("company");
  const [linkCandidate, setLinkCandidate] = useState("");

  // candidates of selected company (for candidate-scoped link)
  const { data: companyCandidates = [] } = useQuery({
    queryKey: ["company-candidates-for-link", linkCompany],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("candidates")
        .select("id,name,stage")
        .eq("company_id", linkCompany)
        .order("created_at", { ascending: false })
        .limit(100);
      return data || [];
    },
    enabled: !!linkCompany && linkScope === "candidate",
  });

  const resetLink = () => {
    setLinkOpen(null);
    setLinkCompany("");
    setLinkScope("company");
    setLinkCandidate("");
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black">مكاتب التوظيف</h1>
            <p className="text-sm text-muted-foreground mt-1">المكاتب الخارجية المتعاونة مع المنصة</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" />مكتب جديد</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>إضافة مكتب توظيف</DialogTitle></DialogHeader>
              <div className="space-y-3 py-2">
                <Input placeholder="اسم المكتب *" value={name} onChange={(e) => setName(e.target.value)} />
                <Input placeholder="رقم الترخيص" value={license} onChange={(e) => setLicense(e.target.value)} />
                <Input placeholder="البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)} />
                <Input placeholder="الهاتف" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <DialogFooter>
                <Button
                  onClick={async () => {
                    if (!name.trim()) return;
                    await createAgency.mutateAsync({
                      name,
                      license_number: license || null,
                      contact_email: email || null,
                      contact_phone: phone || null,
                    });
                    setName(""); setLicense(""); setEmail(""); setPhone("");
                    setOpen(false);
                  }}
                  disabled={!name || createAgency.isPending}
                >
                  إنشاء
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">جارٍ التحميل...</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agencies.map((a, i) => {
            const assignedCompanies = allAssignments.filter((x) => x.agency_id === a.id && x.scope === "company");
            const assignedCandidates = allAssignments.filter((x) => x.agency_id === a.id && x.scope === "candidate");
            return (
              <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                      <Building className="w-6 h-6 text-accent" />
                    </div>
                    <Badge variant={a.status === "active" ? "default" : "secondary"} className="text-[10px]">
                      {a.status === "active" ? "نشط" : "غير نشط"}
                    </Badge>
                  </div>
                  <h3 className="font-bold text-base mb-1 truncate">{a.name}</h3>
                  <p className="text-xs text-muted-foreground truncate mb-1">{a.contact_email || "—"}</p>
                  <p className="text-xs text-muted-foreground mb-3">ترخيص: {a.license_number || "—"}</p>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-muted/30 rounded-lg p-2 text-center">
                      <div className="text-base font-bold">{assignedCompanies.length}</div>
                      <div className="text-[10px] text-muted-foreground">شركة</div>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-2 text-center">
                      <div className="text-base font-bold">{assignedCandidates.length}</div>
                      <div className="text-[10px] text-muted-foreground">مرشح</div>
                    </div>
                  </div>

                  {/* Assignments list */}
                  {(assignedCompanies.length > 0 || assignedCandidates.length > 0) && (
                    <div className="space-y-1 mb-3 max-h-32 overflow-y-auto">
                      {[...assignedCompanies, ...assignedCandidates].map((x: any) => (
                        <div key={x.id} className="flex items-center justify-between text-[11px] p-1.5 rounded bg-muted/20">
                          <span className="truncate">
                            {x.scope === "candidate" ? <Users className="inline w-3 h-3 ml-1" /> : <Building className="inline w-3 h-3 ml-1" />}
                            {x.company?.name}
                            {x.scope === "candidate" && ` — ${x.candidate?.name || "—"}`}
                          </span>
                          <button
                            className="text-destructive hover:opacity-70 shrink-0"
                            onClick={() => deleteAssignment.mutate(x.id)}
                            title="إلغاء الربط"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => setLinkOpen(a.id)}>
                      <Link2 className="w-3.5 h-3.5" />ربط
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive"
                      onClick={() => { if (confirm(`حذف مكتب "${a.name}"؟`)) deleteAgency.mutate(a.id); }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Link agency dialog */}
        <Dialog open={!!linkOpen} onOpenChange={(o) => !o && resetLink()}>
          <DialogContent>
            <DialogHeader><DialogTitle>ربط المكتب</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">نطاق الربط</label>
                <Select value={linkScope} onValueChange={(v) => { setLinkScope(v as any); setLinkCandidate(""); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company">شركة كاملة (كل المرشحين)</SelectItem>
                    <SelectItem value="candidate">مرشح محدد فقط</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">الشركة</label>
                <Select value={linkCompany} onValueChange={(v) => { setLinkCompany(v); setLinkCandidate(""); }}>
                  <SelectTrigger><SelectValue placeholder="اختر شركة" /></SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {linkScope === "candidate" && linkCompany && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">المرشح</label>
                  <Select value={linkCandidate} onValueChange={setLinkCandidate}>
                    <SelectTrigger><SelectValue placeholder="اختر مرشح" /></SelectTrigger>
                    <SelectContent>
                      {companyCandidates.length === 0 && <div className="px-2 py-1.5 text-xs text-muted-foreground">لا يوجد مرشحون</div>}
                      {companyCandidates.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.name} — {c.stage || "—"}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                onClick={async () => {
                  if (!linkOpen || !linkCompany) return;
                  if (linkScope === "candidate" && !linkCandidate) return;
                  await createAssignment.mutateAsync({
                    agency_id: linkOpen,
                    company_id: linkCompany,
                    scope: linkScope,
                    candidate_id: linkScope === "candidate" ? linkCandidate : null,
                  });
                  resetLink();
                }}
                disabled={!linkCompany || (linkScope === "candidate" && !linkCandidate)}
              >
                ربط
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
