import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Mail, Eye, MailCheck, MailX, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TrackingRecord {
  id: string;
  candidate_email: string;
  email_type: string;
  subject: string | null;
  sent_at: string;
  opened_at: string | null;
  opened_count: number;
  tracking_id: string;
}

export default function EmailAnalytics() {
  const { user } = useAuth();
  const [records, setRecords] = useState<TrackingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("email_tracking" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("sent_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setRecords((data as any) || []);
        setLoading(false);
      });
  }, [user]);

  if (loading) {
    return <div className="flex items-center justify-center h-32"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  const total = records.length;
  const opened = records.filter(r => r.opened_count > 0).length;
  const openRate = total > 0 ? Math.round((opened / total) * 100) : 0;
  const totalOpens = records.reduce((a, r) => a + r.opened_count, 0);

  const stats = [
    { label: "إجمالي المرسل", value: total, icon: Mail, color: "text-primary" },
    { label: "تم الفتح", value: opened, icon: Eye, color: "text-green-600" },
    { label: "معدل الفتح", value: `${openRate}%`, icon: TrendingUp, color: "text-amber-600" },
    { label: "إجمالي الفتحات", value: totalOpens, icon: MailCheck, color: "text-blue-600" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          تحليلات البريد الإلكتروني
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">تتبع معدلات الفتح والتفاعل مع الرسائل</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-muted/30 rounded-xl p-3 border border-border/40 text-center"
          >
            <s.icon className={cn("w-5 h-5 mx-auto mb-1", s.color)} />
            <p className="text-lg font-bold text-foreground">{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Open rate bar */}
      {total > 0 && (
        <div className="bg-muted/20 rounded-xl p-4 border border-border/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-foreground">معدل الفتح</span>
            <span className="text-xs font-bold text-primary">{openRate}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${openRate}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full"
            />
          </div>
        </div>
      )}

      {/* Recent emails table */}
      {records.length > 0 ? (
        <div className="border border-border/40 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/30">
                  <th className="text-right p-3 text-muted-foreground font-medium">المستلم</th>
                  <th className="text-right p-3 text-muted-foreground font-medium">النوع</th>
                  <th className="text-right p-3 text-muted-foreground font-medium">الموضوع</th>
                  <th className="text-center p-3 text-muted-foreground font-medium">الحالة</th>
                  <th className="text-center p-3 text-muted-foreground font-medium">الفتحات</th>
                  <th className="text-right p-3 text-muted-foreground font-medium">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {records.slice(0, 20).map(r => (
                  <tr key={r.id} className="border-t border-border/30 hover:bg-muted/10 transition-colors">
                    <td className="p-3 font-medium text-foreground">{r.candidate_email}</td>
                    <td className="p-3 text-muted-foreground">{r.email_type}</td>
                    <td className="p-3 text-muted-foreground truncate max-w-[150px]">{r.subject || "—"}</td>
                    <td className="p-3 text-center">
                      {r.opened_count > 0 ? (
                        <span className="inline-flex items-center gap-1 text-green-600 text-[10px] font-medium bg-green-500/10 px-2 py-0.5 rounded-full">
                          <Eye className="w-3 h-3" />مفتوح
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-muted-foreground text-[10px] font-medium bg-muted/30 px-2 py-0.5 rounded-full">
                          <MailX className="w-3 h-3" />لم يُفتح
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center font-medium text-foreground">{r.opened_count}</td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(r.sent_at).toLocaleDateString("ar-SA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Mail className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">لا توجد بيانات تتبع بعد</p>
        </div>
      )}
    </div>
  );
}
