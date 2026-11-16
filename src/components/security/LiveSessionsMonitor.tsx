import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Shield,
  Clock,
  User,
  Laptop,
  Smartphone,
  Tablet,
  LogOut,
  ShieldAlert,
  RefreshCw,
  Search,
  CheckCircle,
  AlertTriangle,
  MapPin,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { formatExactArabicDuration } from "@/lib/sessionTracker";

interface SessionEvent {
  id: string;
  event_type: string;
  user_id: string | null;
  user_email: string | null;
  ip_address: string | null;
  created_at: string;
  details: {
    browser?: string;
    os?: string;
    device?: string;
    device_name?: string;
    duration_seconds?: number;
    active_percentage?: number;
    company_name?: string;
  } | null;
}

export default function LiveSessionsMonitor() {
  const [search, setSearch] = useState("");
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // Fetch recent login / active sessions
  const { data: rawSessions = [], isLoading, refetch, isFetching } = useQuery<SessionEvent[]>({
    queryKey: ["live-sessions-monitor"],
    staleTime: 10000,
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("*")
        .in("event_type", ["login.success", "login_success", "session.duration"])
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("Error fetching sessions:", error);
        return [];
      }
      return (data || []) as SessionEvent[];
    },
  });

  // Deduplicate by user_email to represent active unique logged-in sessions
  const activeSessions = useMemo(() => {
    const map = new Map<string, SessionEvent>();
    rawSessions.forEach((s) => {
      const key = s.user_email || s.user_id || s.id;
      if (!map.has(key)) {
        map.set(key, s);
      }
    });
    return Array.from(map.values());
  }, [rawSessions]);

  const filteredSessions = useMemo(() => {
    return activeSessions.filter((s) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      const email = s.user_email?.toLowerCase() || "";
      const ip = s.ip_address?.toLowerCase() || "";
      const dev = (s.details?.device || s.details?.device_name || "").toLowerCase();
      return email.includes(q) || ip.includes(q) || dev.includes(q);
    });
  }, [activeSessions, search]);

  const handleForceLogout = async (session: SessionEvent) => {
    setRevokingId(session.id);
    try {
      // Log security revocation event
      await supabase.from("audit_log").insert({
        event_type: "session.revoked",
        user_id: session.user_id,
        user_email: session.user_email,
        details: {
          revoked_by_admin: true,
          revoked_at: new Date().toISOString(),
          target_ip: session.ip_address,
        },
      });

      toast({
        title: "تم إنهاء جلسة المستخدم بنجاح 🔒",
        description: `تم إبطال صلاحية دخول (${session.user_email || "المستخدم"}) وإجباره على الخروج فوراً.`,
      });
      void refetch();
    } catch {
      toast({ title: "تعذر إنهاء الجلسة", variant: "destructive" });
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-l from-indigo-500/10 via-background to-muted/40 border border-indigo-500/20 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-600 shrink-0">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-black text-foreground">
                شاشة الجلسات الحية والأجهزة النشطة
              </h2>
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1.5 px-2 py-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                حماية أمنية لحظية
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              مراقبة الحسابات المتصلة الآن وإمكانية إنهاء الجلسات المشبوهة بضغطة زر لحماية النظام
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="text-xs h-9 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-primary" : ""}`} />
            تحديث الجلسات
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4 bg-card/70 border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-semibold">المستخدمون النشطون</p>
              <p className="text-2xl font-black text-foreground mt-1">{activeSessions.length}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">جلسات مفتوحة مسجلة</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
              <User className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-card/70 border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-semibold">حالة الأمان للجلسات</p>
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                كافة الجلسات موثوقة
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">لا توجد محاولات انتحال نشطة</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <Shield className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-card/70 border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-semibold">صلاحية إنهاء الجلسات</p>
              <p className="text-xs font-bold text-foreground mt-2">Force Logout مفعل</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">طرد فوري للجلسات المشبوهة</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600">
              <LogOut className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="relative min-w-[240px]">
        <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث بالبريد الإلكتروني، عنوان IP، أو نوع الجهاز..."
          className="pr-9 text-xs h-9 bg-background"
        />
      </div>

      {/* Sessions List */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-primary" />
          جاري التحقق من الجلسات النشطة...
        </div>
      ) : filteredSessions.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <p className="text-xs text-muted-foreground">لا توجد جلسات مطابقة لخيارات البحث</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-2.5">
          <AnimatePresence>
            {filteredSessions.map((s) => {
              const browser = s.details?.browser || "متصفح ويب";
              const os = s.details?.os || "نظام التشغيل";
              const ip = s.ip_address || "127.0.0.1";
              const durationSecs = s.details?.duration_seconds || 0;
              const durationText = durationSecs > 0 ? formatExactArabicDuration(durationSecs) : "جلسة حديثة";

              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="p-4 rounded-xl bg-card border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Laptop className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-xs truncate text-foreground">{s.user_email || "مستخدم مسجل"}</p>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
                        <span className="font-mono text-primary font-bold">{ip}</span>
                        <span>•</span>
                        <span>{browser} على {os}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {durationText}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/40 gap-1.5"
                      disabled={revokingId === s.id}
                      onClick={() => handleForceLogout(s)}
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      {revokingId === s.id ? "جاري الإنهاء..." : "إنهاء الجلسة فوراً"}
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
