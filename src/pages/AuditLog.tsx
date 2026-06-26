import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Shield, Search, Filter, User, AlertTriangle, CheckCircle, XCircle,
  LogIn, UserCog, FileText, Download, ChevronLeft, ChevronRight, Clock,
  Globe, Monitor, Smartphone, Tablet, ChevronDown, ChevronUp, LayoutGrid, List
} from "lucide-react";
import { useCompactView } from "@/hooks/useCompactView";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;

const EVENT_TYPES: Record<string, { label: string; icon: typeof Shield; color: string }> = {
  "login_success": { label: "تسجيل دخول ناجح", icon: LogIn, color: "text-success" },
  "login.success": { label: "تسجيل دخول ناجح", icon: LogIn, color: "text-success" },
  "login_failed": { label: "محاولة دخول فاشلة", icon: XCircle, color: "text-destructive" },
  "login.failed": { label: "محاولة دخول فاشلة", icon: XCircle, color: "text-destructive" },
  "login.otp_failed": { label: "فشل رمز OTP", icon: XCircle, color: "text-destructive" },
  "role_changed": { label: "تغيير صلاحية", icon: UserCog, color: "text-warning" },
  "role.changed": { label: "تغيير صلاحية", icon: UserCog, color: "text-warning" },
  "role.deleted": { label: "حذف صلاحية", icon: AlertTriangle, color: "text-destructive" },
  "member_deleted": { label: "حذف عضو", icon: AlertTriangle, color: "text-destructive" },
  "member.deleted": { label: "حذف عضو", icon: AlertTriangle, color: "text-destructive" },
  "member.invited": { label: "دعوة عضو", icon: User, color: "text-primary" },
  "offer_accepted": { label: "قبول عرض", icon: CheckCircle, color: "text-success" },
  "offer.accepted": { label: "قبول عرض", icon: CheckCircle, color: "text-success" },
  "offer_rejected": { label: "رفض عرض", icon: XCircle, color: "text-warning" },
  "offer.rejected": { label: "رفض عرض", icon: XCircle, color: "text-warning" },
  "offer_sent": { label: "إرسال عرض", icon: FileText, color: "text-primary" },
  "offer.sent": { label: "إرسال عرض", icon: FileText, color: "text-primary" },
  "offer.withdrawn": { label: "سحب عرض", icon: XCircle, color: "text-destructive" },
  "data_export": { label: "تصدير بيانات", icon: Download, color: "text-info" },
  "data.exported": { label: "تصدير بيانات", icon: Download, color: "text-info" },
  "settings.changed": { label: "تغيير إعدادات", icon: Shield, color: "text-warning" },
  "password_reset": { label: "إعادة تعيين كلمة مرور", icon: Shield, color: "text-warning" },
  "signup": { label: "تسجيل حساب جديد", icon: User, color: "text-primary" },
  "security.suspicious_ip": { label: "🚨 IP مشبوه", icon: AlertTriangle, color: "text-destructive" },
};

function getDeviceIcon(device?: string) {
  if (device === "Mobile") return Smartphone;
  if (device === "Tablet") return Tablet;
  return Monitor;
}

function useAuditLogQuery(page: number, eventFilter: string, search: string) {
  return useQuery({
    queryKey: ["audit-log", page, eventFilter, search],
    queryFn: async () => {
      let query = supabase
        .from("audit_log")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (eventFilter && eventFilter !== "all") {
        query = query.eq("event_type", eventFilter);
      }
      if (search.trim()) {
        query = query.or(`user_email.ilike.%${search}%,event_type.ilike.%${search}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: data || [], count: count || 0 };
    },
  });
}

function AuditLogRow({ log, index, isCompact }: { log: any; index: number; isCompact: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const info = EVENT_TYPES[log.event_type] || { label: log.event_type, icon: Shield, color: "text-muted-foreground" };
  const Icon = info.icon;
  const details = log.details as Record<string, any> | null;
  const DeviceIcon = getDeviceIcon(details?.device);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  // Filter out technical fields for display
  const displayDetails = details
    ? Object.entries(details).filter(([k]) => !["user_agent", "browser", "os", "device"].includes(k))
    : [];

  const cellClass = cn("transition-all", isCompact ? "p-1.5 text-xs" : "p-3 text-sm");

  return (
    <>
      <motion.tr
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: index * 0.02 }}
        className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <td className={cellClass}>
          <div className="flex items-center gap-2">
            <Icon className={cn("shrink-0", isCompact ? "w-3.5 h-3.5" : "w-4 h-4", info.color)} />
            <Badge variant="outline" className={isCompact ? "text-[10px] px-1 py-0" : "text-[11px]"}>{info.label}</Badge>
          </div>
        </td>
        <td className={cn(cellClass, "text-muted-foreground")}>{log.user_email || "—"}</td>
        <td className={cellClass}>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Globe className={isCompact ? "w-3 h-3 shrink-0" : "w-3.5 h-3.5 shrink-0"} />
            <span className={isCompact ? "font-mono text-[10px]" : "font-mono text-xs"}>{log.ip_address && log.ip_address !== "unknown" ? log.ip_address : "—"}</span>
          </div>
        </td>
        <td className={cellClass}>
          {details?.browser ? (
            <div className={cn("flex items-center gap-1.5 text-muted-foreground", isCompact ? "text-[10px]" : "text-xs")}>
              <DeviceIcon className={isCompact ? "w-3.5 h-3.5 shrink-0" : "w-3.5 h-3.5 shrink-0"} />
              <span>{details.browser}</span>
              <span className="text-muted-foreground/50">·</span>
              <span>{details.os}</span>
            </div>
          ) : (
            <span className={isCompact ? "text-muted-foreground text-[10px]" : "text-muted-foreground text-xs"}>—</span>
          )}
        </td>
        <td className={cn(cellClass, "text-muted-foreground whitespace-nowrap")}>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDate(log.created_at)}
          </div>
        </td>
        <td className={cellClass}>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </Button>
        </td>
      </motion.tr>
      <AnimatePresence>
        {expanded && (
          <motion.tr
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <td colSpan={6} className="p-0">
              <div className="bg-muted/30 p-4 border-b border-border/50 space-y-2">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <p className="text-muted-foreground/70 mb-0.5">عنوان IP</p>
                    <p className="font-mono font-medium">{log.ip_address || "غير متوفر"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground/70 mb-0.5">المتصفح</p>
                    <p className="font-medium">{details?.browser || "غير متوفر"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground/70 mb-0.5">نظام التشغيل</p>
                    <p className="font-medium">{details?.os || "غير متوفر"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground/70 mb-0.5">الجهاز</p>
                    <p className="font-medium">{details?.device || "غير متوفر"}</p>
                  </div>
                </div>
                {details?.user_agent && (
                  <div className="text-xs">
                    <p className="text-muted-foreground/70 mb-0.5">User Agent</p>
                    <p className="font-mono text-[10px] text-muted-foreground break-all bg-background/50 rounded p-2">{details.user_agent}</p>
                  </div>
                )}
                {displayDetails.length > 0 && (
                  <div className="text-xs">
                    <p className="text-muted-foreground/70 mb-1">تفاصيل إضافية</p>
                    <div className="flex flex-wrap gap-1.5">
                      {displayDetails.map(([k, v]) => (
                        <Badge key={k} variant="secondary" className="text-[10px] font-mono">
                          {k}: {String(v)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </td>
          </motion.tr>
        )}
      </AnimatePresence>
    </>
  );
}

export default function AuditLog() {
  const [page, setPage] = useState(0);
  const [eventFilter, setEventFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const { isCompact, toggleCompact } = useCompactView();

  const { data, isLoading } = useAuditLogQuery(page, eventFilter, search);
  const logs = data?.data || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const stats = useMemo(() => {
    return {
      total: totalCount,
      failed: logs.filter((l: any) => l.event_type?.includes("failed")).length,
      roleChanges: logs.filter((l: any) => l.event_type?.includes("role")).length,
    };
  }, [logs, totalCount]);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(0);
  };

  // Deduplicate event types for filter dropdown (show unique labels)
  const uniqueEventTypes = Object.entries(EVENT_TYPES).reduce((acc, [key, val]) => {
    if (!acc.some(([, v]) => v.label === val.label)) acc.push([key, val]);
    return acc;
  }, [] as [string, typeof EVENT_TYPES[string]][]);

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-8 space-y-6" dir="rtl">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">سجل الأحداث الأمنية</h1>
              <p className="text-sm text-muted-foreground">تتبع جميع الأحداث الحساسة مع عناوين IP وتفاصيل الأجهزة</p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "إجمالي الأحداث", value: stats.total, icon: Shield, color: "bg-primary/10 text-primary" },
            { label: "محاولات فاشلة", value: stats.failed, icon: XCircle, color: "bg-destructive/10 text-destructive" },
            { label: "تغييرات صلاحيات", value: stats.roleChanges, icon: UserCog, color: "bg-warning/10 text-warning" },
          ].map((s, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", s.color)}>
                  <s.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="بحث بالبريد أو نوع الحدث..."
              className="pr-10"
            />
          </div>
          <Select value={eventFilter} onValueChange={v => { setEventFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="نوع الحدث" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الأحداث</SelectItem>
              {uniqueEventTypes.map(([key, val]) => (
                <SelectItem key={key} value={key}>{val.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleSearch} className="gap-1.5">
            <Filter className="w-4 h-4" />تصفية
          </Button>
          <Button variant="outline" size="icon" onClick={toggleCompact} className="gap-1.5 shrink-0" title={isCompact ? "عرض عادي" : "عرض مدمج"}>
            {isCompact ? <LayoutGrid className="w-4 h-4" /> : <List className="w-4 h-4" />}
          </Button>
        </div>

        <Card className="border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className={cn("w-full transition-all", isCompact ? "text-xs" : "text-sm")}>
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className={cn("text-right font-medium text-muted-foreground transition-all", isCompact ? "p-1.5" : "p-3")}>الحدث</th>
                  <th className={cn("text-right font-medium text-muted-foreground transition-all", isCompact ? "p-1.5" : "p-3")}>المستخدم</th>
                  <th className={cn("text-right font-medium text-muted-foreground transition-all", isCompact ? "p-1.5" : "p-3")}>عنوان IP</th>
                  <th className={cn("text-right font-medium text-muted-foreground transition-all", isCompact ? "p-1.5" : "p-3")}>الجهاز</th>
                  <th className={cn("text-right font-medium text-muted-foreground transition-all", isCompact ? "p-1.5" : "p-3")}>التاريخ</th>
                  <th className={cn("text-right font-medium text-muted-foreground transition-all w-10", isCompact ? "p-1.5" : "p-3")}></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className={cn("transition-all", isCompact ? "p-1.5" : "p-3")}><div className="h-4 bg-muted rounded animate-pulse w-20" /></td>
                      ))}
                    </tr>
                  ))
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      <Shield className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
                      لا توجد أحداث مسجلة
                    </td>
                  </tr>
                ) : (
                  logs.map((log: any, i: number) => (
                    <AuditLogRow key={log.id} log={log} index={i} isCompact={isCompact} />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between p-3 border-t border-border bg-muted/20">
              <p className="text-xs text-muted-foreground">
                عرض {page * PAGE_SIZE + 1} - {Math.min((page + 1) * PAGE_SIZE, totalCount)} من {totalCount}
              </p>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 0}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <span className="text-sm px-2">{page + 1} / {totalPages}</span>
                <Button variant="ghost" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
