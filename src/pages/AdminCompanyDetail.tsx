import { useParams, Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Building2, Briefcase, Users, Calendar, FileText, Handshake, Activity, Power } from "lucide-react";
import { useCompany, useCompanyStats, useCompanyMembers, useToggleCompanyStatus } from "@/hooks/useCompanies";
import { useAgencyAssignments } from "@/hooks/useAgencies";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import CompanyInvitationsPanel from "@/components/CompanyInvitationsPanel";


export default function AdminCompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: company, isLoading } = useCompany(id);
  const { data: stats } = useCompanyStats(id);
  const { data: members = [] } = useCompanyMembers(id);
  const { data: assignments = [] } = useAgencyAssignments(undefined, id);
  const toggleStatus = useToggleCompanyStatus();

  // Recent jobs + recent candidates summary
  const { data: recentJobs = [] } = useQuery({
    queryKey: ["company-recent-jobs", id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("jobs")
        .select("id,title,status,created_at")
        .eq("company_id", id)
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!id,
  });

  const { data: stagesBreakdown = [] } = useQuery({
    queryKey: ["company-stages-breakdown", id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("candidates")
        .select("stage")
        .eq("company_id", id);
      const counts: Record<string, number> = {};
      (data || []).forEach((c: any) => {
        const s = c.stage || "غير محدد";
        counts[s] = (counts[s] || 0) + 1;
      });
      return Object.entries(counts).map(([stage, count]) => ({ stage, count }));
    },
    enabled: !!id,
  });

  if (isLoading) {
    return <DashboardLayout><div className="p-6 max-w-6xl mx-auto"><p className="text-sm text-muted-foreground">جارٍ التحميل...</p></div></DashboardLayout>;
  }
  if (!company) {
    return <DashboardLayout><div className="p-6 max-w-6xl mx-auto"><p className="text-sm text-muted-foreground">الشركة غير موجودة</p></div></DashboardLayout>;
  }

  const statCards = [
    { label: "الوظائف", value: stats?.jobsTotal ?? 0, sub: `${stats?.jobsActive ?? 0} نشطة`, icon: Briefcase, color: "bg-blue-500/10 text-blue-600" },
    { label: "المرشحون", value: stats?.candidatesTotal ?? 0, sub: "إجمالي", icon: Users, color: "bg-violet-500/10 text-violet-600" },
    { label: "المقابلات", value: stats?.interviewsTotal ?? 0, sub: "مجدولة وسابقة", icon: Calendar, color: "bg-amber-500/10 text-amber-600" },
    { label: "العروض", value: stats?.offersTotal ?? 0, sub: `${stats?.offersAccepted ?? 0} مقبولة`, icon: FileText, color: "bg-emerald-500/10 text-emerald-600" },
  ];

  const totalCandidates = stagesBreakdown.reduce((s, x) => s + x.count, 0);

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <Link to="/admin/companies" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground gap-1">
          <ChevronRight className="w-4 h-4" />العودة للقائمة
        </Link>

        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              {company.logo_url ? (
                <img src={company.logo_url} alt={company.name} className="w-full h-full object-contain rounded-2xl" />
              ) : (
                <Building2 className="w-8 h-8 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h1 className="text-2xl font-black truncate">{company.name}</h1>
                <Badge variant={company.status === "active" ? "default" : "secondary"}>
                  {company.status === "active" ? "نشطة" : "معطلة"}
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                <div>📧 {company.contact_email || "—"}</div>
                <div>📞 {company.contact_phone || "—"}</div>
                <div>🏢 {company.industry || "—"}</div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className={company.status === "active" ? "text-amber-600" : "text-emerald-600"}
              onClick={() => toggleStatus.mutate({ id: company.id, status: company.status === "active" ? "inactive" : "active" })}
            >
              <Power className="w-3.5 h-3.5 ml-1.5" />
              {company.status === "active" ? "تعطيل" : "تفعيل"}
            </Button>
          </div>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                <Card className="p-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="text-2xl font-black">{s.value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
                  <div className="text-[10px] text-muted-foreground/70 mt-1">{s.sub}</div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Stage breakdown */}
          <Card className="p-5">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              توزيع المرشحين حسب المرحلة
            </h3>
            {stagesBreakdown.length === 0 ? (
              <p className="text-xs text-muted-foreground">لا توجد بيانات</p>
            ) : (
              <div className="space-y-2.5">
                {stagesBreakdown.map((s) => {
                  const pct = totalCandidates > 0 ? Math.round((s.count / totalCandidates) * 100) : 0;
                  return (
                    <div key={s.stage}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium">{s.stage}</span>
                        <span className="text-muted-foreground">{s.count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Recent jobs */}
          <Card className="p-5">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-primary" />
              أحدث الوظائف
            </h3>
            {recentJobs.length === 0 ? (
              <p className="text-xs text-muted-foreground">لا توجد وظائف</p>
            ) : (
              <div className="space-y-2">
                {recentJobs.map((j: any) => (
                  <div key={j.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                    <span className="text-sm font-medium truncate">{j.title}</span>
                    <Badge variant={j.status === "نشطة" ? "default" : "secondary"} className="text-[10px] shrink-0">
                      {j.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Linked agencies activity */}
        <Card className="p-5">
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
            <Handshake className="w-4 h-4 text-primary" />
            مكاتب التوظيف المرتبطة ({assignments.length})
          </h3>
          {assignments.length === 0 ? (
            <p className="text-xs text-muted-foreground">لا توجد مكاتب مرتبطة بعد</p>
          ) : (
            <div className="space-y-2">
              {assignments.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2 min-w-0">
                    <Handshake className="w-4 h-4 text-accent shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{a.agency?.name || "مكتب"}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {a.scope === "candidate"
                          ? `مرشح: ${a.candidate?.name || "—"} (${a.candidate?.stage || "—"})`
                          : "نطاق: شركة كاملة"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-[10px]">{a.scope === "candidate" ? "مرشح" : "شركة"}</Badge>
                    <Badge variant={a.status === "active" ? "default" : "secondary"} className="text-[10px]">
                      {a.status === "active" ? "نشط" : "موقوف"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            أعضاء الشركة ({members.length})
          </h3>
          {members.length === 0 ? (
            <p className="text-xs text-muted-foreground">لا يوجد أعضاء</p>
          ) : (
            <div className="space-y-2">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <span className="text-sm font-mono text-muted-foreground truncate">{m.user_id}</span>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {m.member_role === "owner" ? "مالك" : m.member_role === "hr" ? "HR" : "مشاهد"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <CompanyInvitationsPanel companyId={id!} />
      </div>
    </DashboardLayout>
  );
}

