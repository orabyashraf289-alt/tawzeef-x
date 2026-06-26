import { useMemo } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Briefcase, Users, FileText, Mail, Loader2 } from "lucide-react";
import { useMyCompanies, useCompanyStats, useMyCompanyRole } from "@/hooks/useCompanies";
import { useMyPendingInvitations, useAcceptInvitation, useDeclineInvitation } from "@/hooks/useCompanyInvitations";
import CompanyInvitationsPanel from "@/components/CompanyInvitationsPanel";
import { motion } from "framer-motion";

export default function CompanyPortal() {
  const { data: companies = [], isLoading } = useMyCompanies();
  const { data: pendingInvites = [] } = useMyPendingInvitations();
  const accept = useAcceptInvitation();
  const decline = useDeclineInvitation();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 max-w-6xl mx-auto">
          <p className="text-sm text-muted-foreground">جارٍ التحميل...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-black">بوابة الشركة</h1>
          <p className="text-sm text-muted-foreground mt-1">الشركات التي أنت عضو فيها</p>
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
          companies.map((c) => (
            <CompanyBlock key={c.id} companyId={c.id} name={c.name} role={c.member_role} />
          ))
        )}
      </div>
    </DashboardLayout>
  );
}

function CompanyBlock({ companyId, name, role }: { companyId: string; name: string; role: string }) {
  const { data: stats } = useCompanyStats(companyId);
  const { data: myRole } = useMyCompanyRole(companyId);

  const cards = useMemo(
    () => [
      { label: "الوظائف", value: stats?.jobsTotal ?? 0, icon: Briefcase, color: "bg-blue-500/10 text-blue-600", to: "/jobs" },
      { label: "المرشحون", value: stats?.candidatesTotal ?? 0, icon: Users, color: "bg-violet-500/10 text-violet-600", to: "/candidates" },
      { label: "العروض", value: stats?.offersTotal ?? 0, icon: FileText, color: "bg-emerald-500/10 text-emerald-600", to: "/offers" },
    ],
    [stats]
  );

  return (
    <Card className="p-5 space-y-5">
      <div className="flex items-center justify-between">
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
      </div>

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

      {/* Invitations panel only for owners */}
      {myRole === "owner" && <CompanyInvitationsPanel companyId={companyId} />}
    </Card>
  );
}
