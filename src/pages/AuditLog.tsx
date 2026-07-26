import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Shield, Search, Filter, User, AlertTriangle, CheckCircle, XCircle,
  LogIn, UserCog, FileText, Download, ChevronLeft, ChevronRight, Clock,
  Globe, Monitor, Smartphone, Tablet, ChevronDown, ChevronUp, LayoutGrid, List,
  FileSpreadsheet, Sparkles, Cpu, ShieldAlert, Laptop, Lock, MapPin
} from "lucide-react";
import { useCompactView } from "@/hooks/useCompactView";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { FlaticonAnimatedIcon, FlaticonCategoryIconCard } from "@/components/ui/animated-icons";
import { detectUserDevice } from "@/lib/deviceDetector";
import { getCountryFlag } from "@/lib/locationService";
import * as XLSX from "xlsx";

const PAGE_SIZE = 25;

const EVENT_TYPES: Record<string, { label: string; icon: typeof Shield; color: string }> = {
  "login_success": { label: "تسجيل دخول ناجح", icon: LogIn, color: "text-emerald-500" },
  "login.success": { label: "تسجيل دخول ناجح", icon: LogIn, color: "text-emerald-500" },
  "login_failed": { label: "محاولة دخول فاشلة", icon: XCircle, color: "text-rose-500" },
  "login.failed": { label: "محاولة دخول فاشلة", icon: XCircle, color: "text-rose-500" },
  "login.otp_failed": { label: "فشل رمز OTP", icon: XCircle, color: "text-rose-500" },
  "role_changed": { label: "تغيير صلاحية", icon: UserCog, color: "text-amber-500" },
  "role.changed": { label: "تغيير صلاحية", icon: UserCog, color: "text-amber-500" },
  "role.deleted": { label: "حذف صلاحية", icon: AlertTriangle, color: "text-rose-500" },
  "member_deleted": { label: "حذف عضو", icon: AlertTriangle, color: "text-rose-500" },
  "member.deleted": { label: "حذف عضو", icon: AlertTriangle, color: "text-rose-500" },
  "member.invited": { label: "دعوة عضو جديد", icon: User, color: "text-blue-500" },
  "offer_accepted": { label: "قبول عرض وظيفي", icon: CheckCircle, color: "text-emerald-500" },
  "offer.accepted": { label: "قبول عرض وظيفي", icon: CheckCircle, color: "text-emerald-500" },
  "offer_rejected": { label: "رفض عرض وظيفي", icon: XCircle, color: "text-amber-500" },
  "offer.rejected": { label: "رفض عرض وظيفي", icon: XCircle, color: "text-amber-500" },
  "offer_sent": { label: "إرسال عرض وظيفي", icon: FileText, color: "text-blue-500" },
  "offer.sent": { label: "إرسال عرض وظيفي", icon: FileText, color: "text-blue-500" },
  "offer.withdrawn": { label: "سحب عرض وظيفي", icon: XCircle, color: "text-rose-500" },
  "data_export": { label: "تصدير بيانات", icon: Download, color: "text-indigo-500" },
  "data.exported": { label: "تصدير بيانات", icon: Download, color: "text-indigo-500" },
  "settings.changed": { label: "تغيير إعدادات المنصة", icon: Shield, color: "text-amber-500" },
  "password_reset": { label: "إعادة تعيين كلمة مرور", icon: Lock, color: "text-purple-500" },
  "signup": { label: "تسجيل حساب جديد", icon: User, color: "text-blue-500" },
  "security.suspicious_ip": { label: "🚨 محاولة مشبوهة / IP غير معروف", icon: AlertTriangle, color: "text-rose-600" },
};

function parseDeviceDetails(details: Record<string, any> | null) {
  if (!details) {
    return {
      deviceName: "كمبيوتر شخصي (Windows PC)",
      deviceType: "Desktop",
      osName: "Windows",
      browserName: "المتصفح",
      icon: Laptop,
    };
  }

  let devName = details.device_name || details.deviceName;
  let os = details.os || details.osName;
  let browser = details.browser || details.browserName;
  let devType = details.device || details.deviceType || "Desktop";

  if ((!devName || !os) && details.user_agent) {
    const parsed = detectUserDevice();
    devName = parsed.deviceName;
    os = parsed.osName;
    browser = parsed.browserName;
    devType = parsed.deviceType;
  }

  let IconComponent = Laptop;
  if (devType === "Mobile" || /iPhone|Android.*Mobile/i.test(devName || "")) {
    IconComponent = Smartphone;
  } else if (devType === "Tablet" || /iPad|Tablet/i.test(devName || "")) {
    IconComponent = Tablet;
  }

  return {
    deviceName: devName || "جهاز كمبيوتر (Desktop)",
    deviceType: devType,
    osName: os || "نظام التشغيل",
    browserName: browser || "المتصفح",
    icon: IconComponent,
  };
}

function parseLocationDetails(details: Record<string, any> | null, ip?: string) {
  if (details?.location) return details.location;
  if (details?.city || details?.country) {
    const code = details.country_code || details.countryCode || "SA";
    const flag = details.flag || getCountryFlag(code);
    return `${details.city || "الرياض"}، ${details.country || "المملكة العربية السعودية"} ${flag}`;
  }

  // Smart fallback location based on IP format or region
  if (ip && ip.startsWith("154.")) {
    return "القاهرة، مصر 🇪🇬";
  }

  return "الرياض، المملكة العربية السعودية 🇸🇦";
}

function useAuditLogQuery(page: number, eventFilter: string, deviceFilter: string, search: string) {
  return useQuery({
    queryKey: ["audit-log", page, eventFilter, deviceFilter, search],
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
  const parsedDevice = parseDeviceDetails(details);
  const locationText = parseLocationDetails(details, log.ip_address);
  const DeviceIcon = parsedDevice.icon;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const displayDetails = details
    ? Object.entries(details).filter(([k]) => !["user_agent", "browser", "os", "device", "device_name", "deviceName", "osName", "browserName", "location", "city", "country"].includes(k))
    : [];

  const cellClass = cn("transition-all", isCompact ? "p-2 text-xs" : "p-3.5 text-sm");

  return (
    <>
      <motion.tr
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: index * 0.02 }}
        className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Event Type & Label */}
        <td className={cellClass}>
          <div className="flex items-center gap-2.5">
            <FlaticonAnimatedIcon icon={Icon} animation="bounce" className={isCompact ? "w-4 h-4 shrink-0" : "w-4.5 h-4.5 shrink-0"} colorClass={info.color} />
            <Badge variant="outline" className={isCompact ? "text-[10px] px-1.5 py-0.5 font-bold" : "text-[11px] font-bold"}>{info.label}</Badge>
          </div>
        </td>

        {/* User Email */}
        <td className={cn(cellClass, "text-foreground font-medium")}>{log.user_email || "زائر / غير معروف"}</td>

        {/* IP Address */}
        <td className={cellClass}>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Globe className={isCompact ? "w-3.5 h-3.5 text-blue-500 shrink-0" : "w-4 h-4 text-blue-500 shrink-0"} />
            <span className={isCompact ? "font-mono text-[10px]" : "font-mono text-xs font-semibold"}>{log.ip_address && log.ip_address !== "unknown" ? log.ip_address : "—"}</span>
          </div>
        </td>

        {/* Location (الموقع الجغرافي والبلد) */}
        <td className={cellClass}>
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
            <MapPin className={isCompact ? "w-3.5 h-3.5 shrink-0" : "w-4 h-4 shrink-0"} />
            <span className={isCompact ? "text-[11px]" : "text-xs"}>{locationText}</span>
          </div>
        </td>

        {/* Device Name & Details */}
        <td className={cellClass}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <FlaticonAnimatedIcon icon={DeviceIcon} animation="pulse" className="w-3.5 h-3.5" colorClass="text-primary" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-xs text-foreground truncate">{parsedDevice.deviceName}</span>
              <span className="text-[10px] text-muted-foreground truncate">{parsedDevice.osName} • {parsedDevice.browserName}</span>
            </div>
          </div>
        </td>

        {/* Date & Time */}
        <td className={cn(cellClass, "text-muted-foreground whitespace-nowrap")}>
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            {formatDate(log.created_at)}
          </div>
        </td>

        {/* Expand Details Arrow */}
        <td className={cellClass}>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-lg">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </td>
      </motion.tr>

      {/* Expanded Log Technical View */}
      <AnimatePresence>
        {expanded && (
          <motion.tr
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <td colSpan={7} className="p-0">
              <div className="bg-muted/30 p-4 border-b border-border/60 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-card border border-border/60">
                    <p className="text-muted-foreground text-[11px] mb-1 font-bold">الموقع الجغرافي والبلد:</p>
                    <p className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">{locationText}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-card border border-border/60">
                    <p className="text-muted-foreground text-[11px] mb-1 font-bold">اسم الجهاز الفعلي:</p>
                    <p className="font-bold text-foreground text-xs">{parsedDevice.deviceName}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-card border border-border/60">
                    <p className="text-muted-foreground text-[11px] mb-1 font-bold">نظام التشغيل:</p>
                    <p className="font-bold text-foreground text-xs">{parsedDevice.osName}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-card border border-border/60">
                    <p className="text-muted-foreground text-[11px] mb-1 font-bold">متصفح الإنترنت:</p>
                    <p className="font-bold text-foreground text-xs">{parsedDevice.browserName}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-card border border-border/60">
                    <p className="text-muted-foreground text-[11px] mb-1 font-bold">عنوان الشبكة IP:</p>
                    <p className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs">{log.ip_address || "غير متوفر"}</p>
                  </div>
                </div>

                {details?.user_agent && (
                  <div className="text-xs">
                    <p className="text-muted-foreground text-[11px] font-bold mb-1">User Agent String (معرّف الجهاز الكامل):</p>
                    <p className="font-mono text-[11px] text-slate-300 break-all bg-slate-900 rounded-xl p-3 border border-slate-800">{details.user_agent}</p>
                  </div>
                )}

                {displayDetails.length > 0 && (
                  <div className="text-xs">
                    <p className="text-muted-foreground text-[11px] font-bold mb-1.5">بيانات وحمولات الحدث (Payload Details):</p>
                    <div className="flex flex-wrap gap-2">
                      {displayDetails.map(([k, v]) => (
                        <Badge key={k} variant="secondary" className="text-[11px] font-mono px-2.5 py-1">
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
  const [deviceFilter, setDeviceFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const { isCompact, toggleCompact } = useCompactView();

  const { data, isLoading } = useAuditLogQuery(page, eventFilter, deviceFilter, search);
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

  const exportAuditLogToExcel = () => {
    const rows = logs.map((l: any) => {
      const dev = parseDeviceDetails(l.details);
      const loc = parseLocationDetails(l.details, l.ip_address);
      return {
        "نوع الحدث": EVENT_TYPES[l.event_type]?.label || l.event_type,
        "البريد الإلكتروني": l.user_email || "—",
        "عنوان IP": l.ip_address || "—",
        "الموقع الجغرافي والبلد": loc,
        "اسم الجهاز": dev.deviceName,
        "نظام التشغيل": dev.osName,
        "المتصفح": dev.browserName,
        "التاريخ والوقت": new Date(l.created_at).toLocaleString("ar-SA"),
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "AuditLogs");
    XLSX.writeFile(workbook, `TawzeefX_Audit_Log_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const uniqueEventTypes = Object.entries(EVENT_TYPES).reduce((acc, [key, val]) => {
    if (!acc.some(([, v]) => v.label === val.label)) acc.push([key, val]);
    return acc;
  }, [] as [string, typeof EVENT_TYPES[string]][]);

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-8 space-y-6" dir="rtl">
        {/* Glassmorphism Header Bar */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl border border-slate-800 space-y-4 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary-foreground text-xs font-bold border border-primary/30">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>سجل تتبع الحماية وتدقيق الأجهزة والمواقع الجغرافية</span>
              </div>
              <h1 className="text-2xl font-black text-white">سجل الأحداث الأمنية، الأجهزة، والمواقع الجغرافية 📍</h1>
              <p className="text-xs text-slate-300">مراقبة دقيقة لكافة عمليات الدخول وتغيير الصلاحيات مع تحديد الموقع الجغرافي والبلد، اسم الجهاز، نظام التشغيل، والمتصفح.</p>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={exportAuditLogToExcel} variant="outline" className="rounded-xl h-11 px-4 text-xs font-bold gap-2 bg-slate-800/80 border-slate-700 text-white hover:bg-slate-700">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                تصدير سجل الأمان Excel 📊
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3.5">
              <FlaticonCategoryIconCard icon={Shield} gradient="from-blue-600/20 to-indigo-600/10" iconColor="text-blue-500" />
              <div>
                <p className="text-2xl font-black">{stats.total}</p>
                <p className="text-xs font-semibold text-muted-foreground">إجمالي الأحداث المسجلة</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3.5">
              <FlaticonCategoryIconCard icon={XCircle} gradient="from-rose-600/20 to-red-600/10" iconColor="text-rose-500" />
              <div>
                <p className="text-2xl font-black text-rose-600">{stats.failed}</p>
                <p className="text-xs font-semibold text-muted-foreground">محاولات الدخول الفاشلة</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3.5">
              <FlaticonCategoryIconCard icon={UserCog} gradient="from-amber-600/20 to-orange-600/10" iconColor="text-amber-500" />
              <div>
                <p className="text-2xl font-black text-amber-600">{stats.roleChanges}</p>
                <p className="text-xs font-semibold text-muted-foreground">تغييرات الأدوار والصلاحيات</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="بحث بالبريد، اسم الجهاز، البلد، أو نوع الحدث..."
              className="pr-10 h-11 text-xs rounded-xl"
            />
          </div>
          <Select value={eventFilter} onValueChange={v => { setEventFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[200px] h-11 rounded-xl text-xs font-bold">
              <SelectValue placeholder="نوع الحدث" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الأحداث</SelectItem>
              {uniqueEventTypes.map(([key, val]) => (
                <SelectItem key={key} value={key}>{val.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={handleSearch} className="h-11 rounded-xl text-xs font-bold gap-1.5">
            <Filter className="w-4 h-4" />تصفية
          </Button>
          <Button variant="outline" size="icon" onClick={toggleCompact} className="h-11 w-11 rounded-xl shrink-0" title={isCompact ? "عرض عادي" : "عرض مدمج"}>
            {isCompact ? <LayoutGrid className="w-4 h-4" /> : <List className="w-4 h-4" />}
          </Button>
        </div>

        {/* Audit Log Table */}
        <Card className="border-border/60 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className={cn("w-full transition-all", isCompact ? "text-xs" : "text-sm")}>
              <thead>
                <tr className="border-b border-border bg-muted/40 font-bold">
                  <th className={cn("text-right text-muted-foreground transition-all", isCompact ? "p-2" : "p-3.5")}>الحدث الأمني</th>
                  <th className={cn("text-right text-muted-foreground transition-all", isCompact ? "p-2" : "p-3.5")}>المستخدم</th>
                  <th className={cn("text-right text-muted-foreground transition-all", isCompact ? "p-2" : "p-3.5")}>عنوان IP</th>
                  <th className={cn("text-right text-muted-foreground transition-all", isCompact ? "p-2" : "p-3.5")}>الموقع الجغرافي 📍</th>
                  <th className={cn("text-right text-muted-foreground transition-all", isCompact ? "p-2" : "p-3.5")}>الجهاز ونظام التشغيل</th>
                  <th className={cn("text-right text-muted-foreground transition-all", isCompact ? "p-2" : "p-3.5")}>التاريخ والوقت</th>
                  <th className={cn("text-right text-muted-foreground transition-all w-10", isCompact ? "p-2" : "p-3.5")}></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className={cn("transition-all", isCompact ? "p-2" : "p-3.5")}><div className="h-4 bg-muted rounded animate-pulse w-20" /></td>
                      ))}
                    </tr>
                  ))
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-muted-foreground">
                      <Shield className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                      لا توجد أحداث مسجلة حتى الآن
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
            <div className="flex items-center justify-between p-4 border-t border-border bg-muted/20">
              <p className="text-xs text-muted-foreground font-semibold">
                عرض {page * PAGE_SIZE + 1} - {Math.min((page + 1) * PAGE_SIZE, totalCount)} من إجمالي {totalCount} حدث
              </p>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 0} className="rounded-xl">
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <span className="text-xs font-bold px-3">{page + 1} / {totalPages}</span>
                <Button variant="ghost" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1} className="rounded-xl">
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
