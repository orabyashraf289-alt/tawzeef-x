import { Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building, Users, ExternalLink } from "lucide-react";
import { useMyAgencies, useAgencyCandidates } from "@/hooks/useAgencies";
import { motion } from "framer-motion";

export default function AgencyPortal() {
  const { data: agencies = [], isLoading } = useMyAgencies();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 max-w-7xl mx-auto">
          <p className="text-sm text-muted-foreground">جارٍ التحميل...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (agencies.length === 0) {
    return (
      <DashboardLayout>
        <div className="p-6 max-w-3xl mx-auto">
          <Card className="p-12 text-center">
            <Building className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <h2 className="text-lg font-bold mb-2">أنت غير منتمٍ لأي مكتب</h2>
            <p className="text-sm text-muted-foreground">تواصل مع مدير النظام لإضافتك إلى مكتب توظيف.</p>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-black">بوابة المكتب</h1>
          <p className="text-sm text-muted-foreground mt-1">المرشحون المُسندون للمكاتب التابعة لك</p>
        </div>

        {agencies.map((agency) => (
          <AgencySection key={agency.id} agencyId={agency.id} agencyName={agency.name} />
        ))}
      </div>
    </DashboardLayout>
  );
}

function AgencySection({ agencyId, agencyName }: { agencyId: string; agencyName: string }) {
  const { data: candidates = [] } = useAgencyCandidates(agencyId);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-lg flex items-center gap-2">
          <Building className="w-5 h-5 text-accent" />
          {agencyName}
        </h2>
        <Badge variant="outline" className="text-xs">
          {candidates.length} مرشح
        </Badge>
      </div>

      {candidates.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">لا يوجد مرشحون مُسندون لهذا المكتب بعد</p>
      ) : (
        <div className="space-y-2">
          {candidates.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Link
                to={`/candidates/${c.id}`}
                className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-card hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.role || c.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className="text-[10px]">
                    {c.stage || c.status}
                  </Badge>
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </Card>
  );
}
