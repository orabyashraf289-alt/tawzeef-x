import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Building2, Briefcase, Users, FileText, Mail, Loader2, GitFork, Plus, MapPin, Phone } from "lucide-react";
import { useMyCompanies, useCompanyStats, useMyCompanyRole, useCompanyBranches, useCreateCompanyBranch } from "@/hooks/useCompanies";
import { useMyPendingInvitations, useAcceptInvitation, useDeclineInvitation } from "@/hooks/useCompanyInvitations";
import CompanyInvitationsPanel from "@/components/CompanyInvitationsPanel";
import { motion, AnimatePresence } from "framer-motion";

export default function CompanyPortal() {
  const { data: companies = [], isLoading } = useMyCompanies();
  const { data: pendingInvites = [] } = useMyPendingInvitations();
  const accept = useAcceptInvitation();
  const decline = useDeclineInvitation();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 max-w-6xl mx-auto flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6" dir="rtl">
        <div>
          <h1 className="text-2xl font-black">بوابة الشركة</h1>
          <p className="text-sm text-muted-foreground mt-1">الشركات العميلة والفروع التي تديرها</p>
        </div>

        {/* Pending invitations */}
        {pendingInvites.length > 0 && (
          <Card className="p-5 border-warning/30 bg-warning/5">
            <div className="flex items-center gap-2 mb-3">
              <Mail className="w-5 h-5 text-warning" />
              <h3 className="font-bold">دعوات بانتظار الرد ({pendingInvites.length})</h3>
            </div>
            <div className="space-y-2">
              {pendingInvites.map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-card border border-border/50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{inv.company?.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        دور: {inv.member_role === "owner" ? "مالك" : inv.member_role === "hr" ? "HR" : "مشاهد"} • تنتهي {new Date(inv.expires_at).toLocaleDateString("ar-SA")}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      disabled={accept.isPending}
                      onClick={() => accept.mutate(inv.token)}
                    >
                      {accept.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "قبول"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={decline.isPending}
                      onClick={() => decline.mutate(inv.token)}
                    >
                      رفض
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {companies.length === 0 && pendingInvites.length === 0 ? (
          <Card className="p-12 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <h2 className="text-lg font-bold mb-2">لست عضواً في أي شركة</h2>
            <p className="text-sm text-muted-foreground">تواصل مع مدير النظام لإضافتك إلى شركة.</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {companies
              // Only render primary companies directly (where parent_company_id is null)
              .filter(c => !c.parent_company_id)
              .map((c) => (
                <CompanyBlock key={c.id} companyId={c.id} name={c.name} role={c.member_role} />
              ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function CompanyBlock({ companyId, name, role }: { companyId: string; name: string; role: string }) {
  const { data: stats } = useCompanyStats(companyId);
  const { data: myRole } = useMyCompanyRole(companyId);
  
  // Branches list query
  const { data: branches = [], isLoading: branchesLoading } = useCompanyBranches(companyId);
  const createBranch = useCreateCompanyBranch();

  // Branch create form state
  const [open, setOpen] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [branchCity, setBranchCity] = useState("");
  const [branchEmail, setBranchEmail] = useState("");
  const [branchPhone, setBranchPhone] = useState("");

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim()) return;

    await createBranch.mutateAsync({
      name: branchName,
      city: branchCity || null,
      contact_email: branchEmail || null,
      contact_phone: branchPhone || null,
      parent_company_id: companyId
    });

    setBranchName("");
    setBranchCity("");
    setBranchEmail("");
    setBranchPhone("");
    setOpen(false);
  };

  const cards = useMemo(
    () => [
      { label: "الوظائف", value: stats?.jobsTotal ?? 0, icon: Briefcase, color: "bg-blue-500/10 text-blue-600", to: "/jobs" },
      { label: "المرشحون", value: stats?.candidatesTotal ?? 0, icon: Users, color: "bg-violet-500/10 text-violet-600", to: "/candidates" },
      { label: "العروض", value: stats?.offersTotal ?? 0, icon: FileText, color: "bg-emerald-500/10 text-emerald-600", to: "/offers" },
    ],
    [stats]
  );

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-border/50 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="font-bold text-lg">{name}</h2>
            <Badge variant="outline" className="text-[10px] mt-1">
              {role === "owner" ? "مالك" : role === "hr" ? "HR" : "مشاهد"}
            </Badge>
          </div>
        </div>

        {/* Add Branch Button for Company Owners */}
        {myRole === "owner" && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 text-xs">
                <Plus className="w-3.5 h-3.5" />
                إضافة فرع للشركة
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md" dir="rtl">
              <DialogHeader>
                <DialogTitle className="text-right">إضافة فرع جديد للشركة</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddBranch} className="space-y-4 py-2">
                <div className="space-y-1.5 text-right">
                  <Label htmlFor="branchName">اسم الفرع *</Label>
                  <Input id="branchName" value={branchName} onChange={e => setBranchName(e.target.value)} placeholder="مثال: فرع الرياض، فرع جدة" required />
                </div>
                <div className="space-y-1.5 text-right">
                  <Label htmlFor="branchCity">المدينة</Label>
                  <Input id="branchCity" value={branchCity} onChange={e => setBranchCity(e.target.value)} placeholder="الرياض، جدة..." />
                </div>
                <div className="space-y-1.5 text-right">
                  <Label htmlFor="branchEmail">البريد الإلكتروني للتواصل</Label>
                  <Input id="branchEmail" type="email" value={branchEmail} onChange={e => setBranchEmail(e.target.value)} placeholder="branch@company.com" />
                </div>
                <div className="space-y-1.5 text-right">
                  <Label htmlFor="branchPhone">رقم هاتف الفرع</Label>
                  <Input id="branchPhone" value={branchPhone} onChange={e => setBranchPhone(e.target.value)} placeholder="05XXXXXXXX" />
                </div>
                <DialogFooter className="flex justify-end gap-2 mt-4">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
                  <Button type="submit" disabled={createBranch.isPending}>
                    {createBranch.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "إضافة الفرع"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Link to={c.to}>
                <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${c.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="text-2xl font-black">{c.value}</div>
                  <div className="text-xs text-muted-foreground">{c.label}</div>
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Branches List for Owners */}
      {myRole === "owner" && (
        <Card className="p-4 bg-muted/20 border-border/40 space-y-3">
          <h3 className="text-sm font-bold flex items-center gap-1.5 text-foreground mb-2">
            <GitFork className="w-4 h-4 text-primary shrink-0" />
            فروع الشركة المعتمدة ({branches.length})
          </h3>
          {branchesLoading ? (
            <p className="text-xs text-muted-foreground">جاري تحميل الفروع...</p>
          ) : branches.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4 bg-background/50 rounded-lg border border-border/30">
              لا توجد فروع مضافة لهذه الشركة بعد.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <AnimatePresence>
                {branches.map((b) => (
                  <motion.div key={b.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="p-3 bg-background border border-border/60 rounded-xl flex items-start gap-2.5 shadow-sm">
                    <Building2 className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="space-y-1 min-w-0">
                      <p className="text-xs font-bold truncate text-foreground">{b.name}</p>
                      <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                        {b.city && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{b.city}</span>}
                        {b.contact_phone && <span className="flex items-center gap-0.5"><Phone className="w-3 h-3" />{b.contact_phone}</span>}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </Card>
      )}

      {/* Invitations panel only for owners */}
      {myRole === "owner" && <CompanyInvitationsPanel companyId={companyId} />}
    </Card>
  );
}
