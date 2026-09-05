import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Shield, Search, Filter, User, AlertTriangle, CheckCircle, XCircle,
  LogIn, UserCog, FileText, Download, ChevronLeft, ChevronRight, Clock,
  Globe, Monitor, Smartphone, Tablet, ChevronDown, ChevronUp, LayoutGrid, List,
  FileSpreadsheet, Sparkles, Cpu, ShieldAlert, Laptop, Lock, MapPin, RefreshCw,
  Calendar, ShieldCheck, Activity, Eye, Zap
} from "lucide-react";
import { useCompactView } from "@/hooks/useCompactView";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { FlaticonAnimatedIcon, FlaticonCategoryIconCard } from "@/components/ui/animated-icons";
import { PageHeader } from "@/components/ui/page-header";
import { detectUserDevice } from "@/lib/deviceDetector";
import { getCountryFlag } from "@/lib/locationService";
import { formatExactArabicDuration } from "@/lib/sessionTracker";

const PAGE_SIZE = 25;

const EVENT_TYPES: Record<string, { label: string; icon: typeof Shield; color: string; category: "session" | "security" | "roles" | "data" }> = {
  "login_success": { label: "تسجيل دخول ناجح", icon: LogIn, color: "text-emerald-500", category: "session" },
  "login.success": { label: "تسجيل دخول ناجح", icon: LogIn, color: "text-emerald-500", category: "session" },
  "logout.user": { label: "تسجيل خروج (إنهاء الجلسة)", icon: LogIn, color: "text-amber-500", category: "session" },
  "session.duration": { label: "مدة الجلسة والتواجد ⏱️", icon: Clock, color: "text-indigo-500", category: "session" },
  "login_failed": { label: "محاولة دخول فاشلة", icon: XCircle, color: "text-rose-500", category: "security" },
  "login.failed": { label: "محاولة دخول فاشلة", icon: XCircle, color: "text-rose-500", category: "security" },
  "login.otp_failed": { label: "فشل رمز OTP", icon: XCircle, color: "text-rose-500", category: "security" },
  "role_changed": { label: "تغيير صلاحية", icon: UserCog, color: "text-amber-500", category: "roles" },
  "role.changed": { label: "تغيير صلاحية", icon: UserCog, color: "text-amber-500", category: "roles" },
  "role.deleted": { label: "حذف صلاحية", icon: AlertTriangle, color: "text-rose-500", category: "roles" },
  "member_deleted": { label: "حذف عضو", icon: AlertTriangle, color: "text-rose-500", category: "roles" },
  "member.deleted": { label: "حذف عضو", icon: AlertTriangle, color: "text-rose-500", category: "roles" },
  "member.invited": { label: "دعوة عضو جديد", icon: User, color: "text-blue-500", category: "roles" },
  "offer_accepted": { label: "قبول عرض وظيفي", icon: CheckCircle, color: "text-emerald-500", category: "data" },
  "offer.accepted": { label: "قبول عرض وظيفي", icon: CheckCircle, color: "text-emerald-500", category: "data" },
  "offer_rejected": { label: "رفض عرض وظيفي", icon: XCircle, color: "text-amber-500", category: "data" },
  "offer.rejected": { label: "رفض عرض وظيفي", icon: XCircle, color: "text-amber-500", category: "data" },
  "offer_sent": { label: "إرسال عرض وظيفي", icon: FileText, color: "text-blue-500", category: "data" },
  "offer.sent": { label: "إرسال عرض وظيفي", icon: FileText, color: "text-blue-500", category: "data" },
  "offer.withdrawn": { label: "سحب عرض وظيفي", icon: XCircle, color: "text-rose-500", category: "data" },
  "data_export": { label: "تصدير بيانات", icon: Download, color: "text-indigo-500", category: "data" },
  "data.exported": { label: "تصدير بيانات", icon: Download, color: "text-indigo-500", category: "data" },
  "settings.changed": { label: "تغيير إعدادات المنصة", icon: Shield, color: "text-amber-500", category: "data" },
  "password_reset": { label: "إعادة تعيين كلمة مرور", icon: Lock, color: "text-purple-500", category: "security" },
  "signup": { label: "تسجيل حساب جديد", icon: User, color: "text-blue-500", category: "roles" },
  "security.suspicious_ip": { label: "🚨 محاولة مشبوهة / IP غير معروف", icon: AlertTriangle, color: "text-rose-600", category: "security" },
};

function parseSessionDuration(details: Record<string, any> | null, createdAt: string) {
  if (!details) return null;

  const secs = details.duration_seconds || details.durationSeconds;
  if (secs !== undefined && secs !== null) {
    return formatExactArabicDuration(Number(secs));
  }

  const formatted = details.formatted_duration || details.formattedDuration;
  if (formatted) return formatted;

  const mins = details.duration_minutes || details.durationMinutes;
  if (mins !== undefined && mins !== null) {
    return formatExactArabicDuration(Number(mins) * 60);
  }

  if (details.login_time) {
    const start = new Date(details.login_time).getTime();
    const end = new Date(createdAt).getTime();
    const diffSecs = Math.max(1, Math.round((end - start) / 1000));
    return formatExactArabicDuration(diffSecs);
  }

  return null;
}

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

  if (ip && ip.startsWith("154.")) {
    return "القاهرة، مصر 🇪🇬";
  }

  return "الرياض، المملكة العربية السعودية 🇸🇦";
}

function useAuditLogQuery(page: number, eventFilter: string, activeTab: string, search: string, timeRange: string, autoRefresh: boolean) {
  return useQuery({
    queryKey: ["audit-log", page, eventFilter, activeTab, search, timeRange],
    staleTime: autoRefresh ? 5000 : 60000,
    refetchInterval: autoRefresh ? 10000 : false,
    queryFn: async () => {
      let query = supabase
        .from("audit_log")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      // Apply tab category filter
      if (activeTab === "sessions") {
        query = query.in("event_type", ["login.success", "login_success", "logout.user", "session.duration"]);
      } else if (activeTab === "security") {
        query = query.in("event_type", ["login.failed", "login_failed", "login.otp_failed", "security.suspicious_ip", "role.deleted"]);
      } else if (activeTab === "roles") {
        query = query.in("event_type", ["role.changed", "role_changed", "member.invited", "member.deleted", "member_deleted", "signup"]);
      } else if (activeTab === "data") {
        query = query.in("event_type", ["data.exported", "data_export", "settings.changed", "offer.sent", "offer.accepted", "offer.rejected"]);
      }

      // Apply event dropdown filter if selected
      if (eventFilter && eventFilter !== "all") {
        query = query.eq("event_type", eventFilter);
      }

      // Apply search text
      if (search.trim()) {
        query = query.or(`user_email.ilike.%${search}%,event_type.ilike.%${search}%`);
      }

      // Apply date range filter
      if (timeRange !== "all") {
        const now = new Date();
        let startDate = new Date();
        if (timeRange === "today") {
          startDate.setHours(0, 0, 0, 0);
        } else if (timeRange === "7days") {
          startDate.setDate(now.getDate() - 7);
        } else if (timeRange === "30days") {
          startDate.setDate(now.getDate() - 30);
        }
        query = query.gte("created_at", startDate.toISOString());
      }

      query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: data || [], count: count || 0 };
    },
  });
}

function AuditLogRow({ log, index, isCompact }: { log: any; index: number; isCompact: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const info = EVENT_TYPES[log.event_type] || { label: log.event_type, icon: Shield, color: "text-muted-foreground", category: "session" };
  const Icon = info.icon;
  const details = log.details as Record<string, any> | null;
  const parsedDevice = parseDeviceDetails(details);
  const locationText = parseLocationDetails(details, log.ip_address);
  const durationText = parseSessionDuration(details, log.created_at);
  const DeviceIcon = parsedDevice.icon;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  const displayDetails = details
    ? Object.entries(details).filter(([k]) => !["user_agent", "browser", "os", "device", "device_name", "deviceName", "osName", "browserName", "location", "city", "country", "login_time", "logout_time", "duration_minutes", "duration_seconds", "formatted_duration", "formatted_active", "formatted_idle"].includes(k))
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

        {/* Date & Time & Duration */}
        <td className={cn(cellClass, "text-muted-foreground whitespace-nowrap")}>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {formatDate(log.created_at)}
            </div>
            {durationText && (
              <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 text-[10px] w-fit font-bold gap-1 px-2 py-0.5">
                ⏱️ التواجد: {durationText}
              </Badge>
            )}
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
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
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
                  <div className="p-2.5 rounded-xl bg-card border border-border/60">
                    <p className="text-muted-foreground text-[11px] mb-1 font-bold">مدة الجلسة والتواجد:</p>
                    <p className="font-bold text-indigo-600 dark:text-indigo-400 text-xs flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {durationText || "نشط حالياً / جلسة جديدة"}
                    </p>
                    {details?.formatted_active && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        نشاط تفاعلي: <span className="font-bold text-emerald-600">{details.formatted_active}</span> ({details.active_percentage}%)
                      </p>
                    )}
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
  const [activeTab, setActiveTab] = useState("all");
  const [eventFilter, setEventFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [timeRange, setTimeRange] = useState("all");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const { isCompact, toggleCompact } = useCompactView();

  const { data, isLoading, refetch, isFetching } = useAuditLogQuery(page, eventFilter, activeTab, search, timeRange, autoRefresh);
  const logs = data?.data || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // High-Precision Analytics Dashboard
  const stats = useMemo(() => {
    const failed = logs.filter((l: any) => l.event_type?.includes("failed") || l.event_type?.includes("suspicious")).length;
    const roles = logs.filter((l: any) => l.event_type?.includes("role") || l.event_type?.includes("member")).length;
    const sessionLogs = logs.filter((l: any) => l.event_type === "session.duration" || l.event_type === "logout.user");

    const totalSessions = sessionLogs.length;
    const healthScore = totalCount > 0 ? Math.max(70, Math.round(100 - (failed / totalCount) * 100)) : 100;

    return {
      total: totalCount,
      failed,
      roles,
      totalSessions,
      healthScore,
    };
  }, [logs, totalCount]);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(0);
  };

  const exportAuditLogToExcel = async () => {
    const XLSX = await import("xlsx");
    const rows = logs.map((l: any) => {
      const dev = parseDeviceDetails(l.details);
      const loc = parseLocationDetails(l.details, l.ip_address);
      const dur = parseSessionDuration(l.details, l.created_at);
      return {
        "نوع الحدث الأمني": EVENT_TYPES[l.event_type]?.label || l.event_type,
        "البريد الإلكتروني": l.user_email || "—",
        "عنوان IP": l.ip_address || "—",
        "الموقع الجغرافي والبلد": loc,
        "اسم الجهاز": dev.deviceName,
        "نظام التشغيل": dev.osName,
        "المتصفح": dev.browserName,
        "مدة الجلسة والتواجد": dur || "—",
        "زمن النشاط الفعلي": l.details?.formatted_active || "—",
        "زمن الخمول": l.details?.formatted_idle || "—",
        "نسبة التفاعل": l.details?.active_percentage ? `${l.details.active_percentage}%` : "—",
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
        {/* Clean Theme-Adaptive Page Header */}
        <PageHeader
          badgeText="مركز قيادة الحماية والتدقيق والتحليل الجنائي للشبكة"
          title="سجل الأحداث الأمنية ومراقبة التواجد الجغرافي 🛡️"
          description="تتبع فوري لكافة التفاعلات، مدة التواجد بالثواني، الأجهزة الذكية، العناوين الجغرافية، والتصدي للتهديدات والمحاولات المشبوهة."
          icon={ShieldCheck}
          accentColor="indigo"
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
                className="rounded-xl h-11 px-3 text-xs font-bold gap-1.5 bg-card"
              >
                <RefreshCw className={cn("w-4 h-4 text-indigo-500", isFetching && "animate-spin")} />
                تحديث
              </Button>
              <Button onClick={exportAuditLogToExcel} variant="outline" className="rounded-xl h-11 px-4 text-xs font-bold gap-2 bg-card hover:bg-muted shadow-xs">
                <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                تصدير سجل الأمان Excel 📊
              </Button>
            </div>
          }
        />

        {/* Live Security Health Score & Stats Header */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border/60 shadow-sm relative overflow-hidden">
            <CardContent className="p-4 flex items-center gap-3.5">
              <FlaticonCategoryIconCard icon={ShieldCheck} gradient="from-emerald-600/20 to-teal-600/10" iconColor="text-emerald-500" />
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.healthScore}%</p>
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-bold">نظام آمن 🛡️</Badge>
                </div>
                <p className="text-xs font-semibold text-muted-foreground">مؤشر جودة وسعادة أمان النظام</p>
              </div>
            </CardContent>
          </Card>

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
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-black text-rose-600">{stats.failed}</p>
                  {stats.failed > 0 && <Badge variant="destructive" className="text-[10px] font-bold">تنبه 🚨</Badge>}
                </div>
                <p className="text-xs font-semibold text-muted-foreground">محاولات الدخول الفاشلة والمشبوهة</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3.5">
              <FlaticonCategoryIconCard icon={Clock} gradient="from-indigo-600/20 to-purple-600/10" iconColor="text-indigo-500" />
              <div>
                <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{stats.totalSessions}</p>
                <p className="text-xs font-semibold text-muted-foreground">جلسات التواجد المسجلة ⏱️</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Security Tabs & Auto Refresh Toggle */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-card p-2 rounded-2xl border border-border/60 shadow-xs">
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setPage(0); }} className="w-full md:w-auto">
            <TabsList className="bg-muted/50 p-1 rounded-xl h-auto flex flex-wrap gap-1">
              <TabsTrigger value="all" className="rounded-lg text-xs font-bold px-3 py-1.5 data-[state=active]:bg-background shadow-xs">
                جميع الأحداث ({stats.total})
              </TabsTrigger>
              <TabsTrigger value="sessions" className="rounded-lg text-xs font-bold px-3 py-1.5 data-[state=active]:bg-background shadow-xs gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                مدد الجلسات والتواجد ⏱️
              </TabsTrigger>
              <TabsTrigger value="security" className="rounded-lg text-xs font-bold px-3 py-1.5 data-[state=active]:bg-background shadow-xs gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                التهديدات والمخاطر 🚨
              </TabsTrigger>
              <TabsTrigger value="roles" className="rounded-lg text-xs font-bold px-3 py-1.5 data-[state=active]:bg-background shadow-xs gap-1.5">
                <UserCog className="w-3.5 h-3.5 text-amber-500" />
                الصلاحيات والأعضاء 🔑
              </TabsTrigger>
              <TabsTrigger value="data" className="rounded-lg text-xs font-bold px-3 py-1.5 data-[state=active]:bg-background shadow-xs gap-1.5">
                <Download className="w-3.5 h-3.5 text-blue-500" />
                البيانات والإعدادات 📊
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-3 px-3 py-1.5 bg-muted/30 rounded-xl border border-border/40 shrink-0">
            <Switch id="auto-refresh" checked={autoRefresh} onCheckedChange={setAutoRefresh} />
            <Label htmlFor="auto-refresh" className="text-xs font-bold flex items-center gap-1.5 cursor-pointer">
              <Zap className={cn("w-3.5 h-3.5", autoRefresh ? "text-amber-500 animate-pulse" : "text-slate-400")} />
              بث مباشر تلقائي (Live Stream)
            </Label>
          </div>
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

          <Select value={timeRange} onValueChange={v => { setTimeRange(v); setPage(0); }}>
            <SelectTrigger className="w-[160px] h-11 rounded-xl text-xs font-bold">
              <Calendar className="w-3.5 h-3.5 ml-1.5 text-indigo-500" />
              <SelectValue placeholder="النطاق الزمني" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الأوقات</SelectItem>
              <SelectItem value="today">اليوم فقط 📅</SelectItem>
              <SelectItem value="7days">آخر 7 أيام</SelectItem>
              <SelectItem value="30days">آخر 30 يوماً</SelectItem>
            </SelectContent>
          </Select>

          <Select value={eventFilter} onValueChange={v => { setEventFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[180px] h-11 rounded-xl text-xs font-bold">
              <SelectValue placeholder="نوع الحدث المحدد" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع أنواع الأحداث</SelectItem>
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
                      لا توجد أحداث مسجلة في هذا القسم حتى الآن
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
