import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Building, Trash2, Link2, X, Users, CheckCircle2, TrendingUp } from "lucide-react";
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

  // All candidates that have a direct agency_id set
  const { data: allAgencyCandidates = [] } = useQuery({
    queryKey: ["all-agency-candidates"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("candidates")
        .select("id, name, status, stage, agency_id, created_at")
        .not("agency_id", "is", null);
      return data || [];
    },
  });

  // All active assignment-linked candidates
  const { data: allAssignmentCandidates = [] } = useQuery({
    queryKey: ["assignment-candidates-perf"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("agency_assignments")
        .select("agency_id, candidate_id, candidates:candidate_id(id, name, status, stage)")
        .not("candidate_id", "is", null)
        .eq("status", "active");
      return data || [];
    },
  });

  // Per-agency metrics
  const agencyMetrics = useMemo(() => {
    const metrics: Record<string, { total: number; hired: number; rate: number }> = {};

    // From direct agency_id
    allAgencyCandidates.forEach((c: any) => {
      if (!metrics[c.agency_id]) metrics[c.agency_id] = { total: 0, hired: 0, rate: 0 };
      metrics[c.agency_id].total++;
      if (c.status === "مقبول") metrics[c.agency_id].hired++;
    });

    // From assignments
    allAssignmentCandidates.forEach((a: any) => {
      const candidate = a.candidates;
      if (!candidate) return;
      if (!metrics[a.agency_id]) metrics[a.agency_id] = { total: 0, hired: 0, rate: 0 };
      metrics[a.agency_id].total++;
      if (candidate.status === "مقبول") metrics[a.agency_id].hired++;
    });

    // Compute rates
    Object.values(metrics).forEach((m) => {
      m.rate = m.total > 0 ? Math.round((m.hired / m.total) * 100) : 0;
    });

    return metrics;
  }, [allAgencyCandidates, allAssignmentCandidates]);

  // Platform-wide totals
  const { totalAgencyCandidates, totalAgencyHired, platformRate } = useMemo(() => {
    const vals = Object.values(agencyMetrics);
    const totalAgencyCandidates = vals.reduce((sum, m) => sum + m.total, 0);
    const totalAgencyHired = vals.reduce((sum, m) => sum + m.hired, 0);
    const platformRate =
      totalAgencyCandidates > 0
        ? Math.round((totalAgencyHired / totalAgencyCandidates) * 100)
        : 0;
    return { totalAgencyCandidates, totalAgencyHired, platformRate };
  }, [agencyMetrics]);

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

        {isLoading && <p className="text-sm text-muted-foreground">جاري التحميل...</p>}

        {/* Platform Agency Performance Summary */}
        {agencies.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: "إجمالي المكاتب", value: agencies.length, icon: Building, color: "text-primary", bg: "bg-primary/10" },
              { label: "إجمالي المرشحين", value: totalAgencyCandidates, icon: Users, color: "text-accent", bg: "bg-accent/10" },
              { label: "تم التوظيف", value: totalAgencyHired, icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
              { label: "معدل النجاح الكلي", value: `${platformRate}%`, icon: TrendingUp, color: "text-warning", bg: "bg-warning/10" },
            ].map((m, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.04 }}
                className={`rounded-xl p-4 text-center glass-card-premium ${m.bg}`}
              >
                <m.icon className={`w-5 h-5 mx-auto mb-2 ${m.color}`} />
                <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{m.label}</p>
              </motion.div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agencies.map((a, i) => {
            const assignedCompanies = allAssignments.filter((x) => x.agency_id === a.id && x.scope === "company");
            const assignedCandidates = allAssignments.filter((x) => x.agency_id === a.id && x.scope === "candidate");
            const metrics = agencyMetrics[a.id];
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

                  {/* Performance Metrics */}
                  <div className="border-t border-border pt-3 mt-3">
                    <p className="text-[10px] text-muted-foreground font-semibold mb-2">أداء المكتب</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      <div className="bg-success/5 rounded-lg p-2 text-center">
                        <p className="text-base font-bold text-success">{metrics?.hired || 0}</p>
                        <p className="text-[9px] text-muted-foreground">تم التوظيف</p>
                      </div>
                      <div className="bg-primary/5 rounded-lg p-2 text-center">
                        <p className="text-base font-bold text-primary">{metrics?.total || 0}</p>
                        <p className="text-[9px] text-muted-foreground">إجمالي المرشحين</p>
                      </div>
                      <div className="bg-accent/5 rounded-lg p-2 text-center">
                        <p className="text-base font-bold text-accent">{metrics?.rate || 0}%</p>
                        <p className="text-[9px] text-muted-foreground">معدل النجاح</p>
                      </div>
                    </div>
                    {/* Success rate progress bar */}
                    {(metrics?.total || 0) > 0 && (
                      <div className="mt-2">
                        <div className="flex justify-between text-[9px] text-muted-foreground mb-1">
                          <span>معدل النجاح</span>
                          <span>{metrics?.rate}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${metrics?.rate || 0}%` }}
                            transition={{ type: "spring", stiffness: 100, damping: 15 }}
                            className="h-full rounded-full bg-gradient-to-r from-success to-accent"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-3">
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
