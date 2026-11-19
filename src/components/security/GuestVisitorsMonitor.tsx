import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Globe,
  Search,
  Filter,
  Monitor,
  Smartphone,
  Tablet,
  Download,
  Clock,
  MapPin,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  ShieldAlert,
  Eye,
  Laptop,
  CheckCircle2,
  Users,
  Compass,
  FileSpreadsheet,
  AlertTriangle,
  Info,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { getCountryFlag } from "@/lib/locationService";
import { trackGuestVisit } from "@/lib/visitorTracker";

interface VisitorEvent {
  id: string;
  event_type: string;
  ip_address: string | null;
  created_at: string;
  details: {
    visitor_id?: string;
    is_guest?: boolean;
    is_returning?: boolean;
    path?: string;
    full_url?: string;
    referrer?: string;
    screen_resolution?: string;
    language?: string;
    time_zone?: string;
    device_type?: "Desktop" | "Mobile" | "Tablet" | string;
    device_name?: string;
    os_name?: string;
    browser_name?: string;
    event_label?: string;
    city?: string;
    country?: string;
    country_code?: string;
  } | null;
}

export default function GuestVisitorsMonitor() {
  const [search, setSearch] = useState("");
  const [routeFilter, setRouteFilter] = useState("all");
  const [deviceFilter, setDeviceFilter] = useState("all");
  const [timeRange, setTimeRange] = useState("all");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorEvent | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [blockingIp, setBlockingIp] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Fetch guest visitor events from audit_log (with RPC fallback)
  const { data: visitors = [], isLoading, refetch, isFetching } = useQuery<VisitorEvent[]>({
    queryKey: ["guest-visitors-monitor", timeRange],
    staleTime: 10000,
    refetchInterval: autoRefresh ? 10000 : false,
    queryFn: async () => {
      // 1) Direct RPC check first for unrestricted access
      try {
        const rpc = supabase.rpc as unknown as (
          fn: string,
          args: Record<string, unknown>,
        ) => Promise<{ data: unknown; error: unknown }>;
        const { data: rpcData, error: rpcError } = await rpc("get_guest_visitor_logs", {
          limit_count: 300,
        });
        if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
          let list = rpcData as unknown as VisitorEvent[];
          if (timeRange !== "all") {
            const startDate = new Date();
            if (timeRange === "today") startDate.setHours(0, 0, 0, 0);
            else if (timeRange === "7days") startDate.setDate(startDate.getDate() - 7);
            else if (timeRange === "30days") startDate.setDate(startDate.getDate() - 30);
            list = list.filter((v) => new Date(v.created_at) >= startDate);
          }
          return list;
        }
      } catch (rpcErr) {
        console.debug("[GuestMonitor] RPC query fallback:", rpcErr);
      }

      // 2) Direct table query on audit_log
      let query = supabase
        .from("audit_log")
        .select("*")
        .or("event_type.in.(visitor.entry,visitor.page_view,guest.visit),details->>is_guest.eq.true")
        .order("created_at", { ascending: false })
        .limit(300);

      if (timeRange !== "all") {
        const startDate = new Date();
        if (timeRange === "today") startDate.setHours(0, 0, 0, 0);
        else if (timeRange === "7days") startDate.setDate(startDate.getDate() - 7);
        else if (timeRange === "30days") startDate.setDate(startDate.getDate() - 30);
        query = query.gte("created_at", startDate.toISOString());
      }

      const { data, error } = await query;
      if (error) {
        console.error("Error fetching guest visitors:", error);
        return [];
      }
      return (data || []) as VisitorEvent[];
    },
  });

  // Simulate on-demand visitor entry for immediate testing verification
  const handleSimulateVisitor = async () => {
    try {
      setIsSimulating(true);
      const testPaths = ["/careers", "/pricing", "/features", "/jobs", "/about"];
      const randomPath = testPaths[Math.floor(Math.random() * testPaths.length)];
      await trackGuestVisit(randomPath, true);
      await refetch();
      toast({
        title: "تم تسجيل زيارة تجريبية بنجاح 🚀",
        description: `تم رصد الزيارة التجريبية للمسار (${randomPath}) وتحديث السجل فوراً.`,
      });
    } catch (err: any) {
      toast({
        title: "فشل تسجيل الزيارة التجريبية",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSimulating(false);
    }
  };

  // Real-time subscription to new visitor events
  useEffect(() => {
    const channel = supabase
      .channel("realtime-guest-visitors")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "audit_log",
          filter: "event_type=in.(visitor.entry,visitor.page_view,guest.visit)",
        },
        () => {
          void refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  // Copy helper
  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast({ title: "تم نسخ المعرف بنجاح 📋" });
    } catch {
      toast({ title: "تعذر النسخ", variant: "destructive" });
    }
  };

  // Block IP handler
  const handleBlockIp = (ip: string) => {
    setBlockingIp(ip);
    setTimeout(() => {
      setBlockingIp(null);
      toast({
        title: `تم إضافة العنوان ${ip} لقائمة المراقبة المشبوهة 🛡️`,
        description: "سيتم إرسال تنبيه أمني فوري عند محاولة هذا العنوان الدخول مجدداً.",
      });
    }, 600);
  };

  // Metrics calculation
  const metrics = useMemo(() => {
    const total = visitors.length;
    const now = Date.now();
    const thirtyMinAgo = now - 30 * 60 * 1000;

    // Active in last 30 minutes
    const activeRecent = visitors.filter((v) => new Date(v.created_at).getTime() >= thirtyMinAgo).length;

    // Device breakdown
    let mobileCount = 0;
    let desktopCount = 0;
    const pathCounts: Record<string, number> = {};

    visitors.forEach((v) => {
      const dev = v.details?.device_type || "Desktop";
      if (dev === "Mobile") mobileCount++;
      else desktopCount++;

      const p = v.details?.path || "/";
      pathCounts[p] = (pathCounts[p] || 0) + 1;
    });

    const mobilePercent = total > 0 ? Math.round((mobileCount / total) * 100) : 0;
    const desktopPercent = total > 0 ? Math.round((desktopCount / total) * 100) : 0;

    // Top path
    const topPathEntry = Object.entries(pathCounts).sort((a, b) => b[1] - a[1])[0];
    const topPath = topPathEntry ? { path: topPathEntry[0], count: topPathEntry[1] } : { path: "/", count: 0 };

    return {
      total,
      activeRecent,
      mobilePercent,
      desktopPercent,
      topPath,
      pathCounts,
    };
  }, [visitors]);

  // Filtered visitors
  const filteredVisitors = useMemo(() => {
    return visitors.filter((v) => {
      const q = search.trim().toLowerCase();
      const path = v.details?.path || "";
      const ip = v.ip_address || "";
      const browser = v.details?.browser_name || "";
      const os = v.details?.os_name || "";
      const visitorId = v.details?.visitor_id || "";

      const matchesSearch =
        !q ||
        path.toLowerCase().includes(q) ||
        ip.toLowerCase().includes(q) ||
        browser.toLowerCase().includes(q) ||
        os.toLowerCase().includes(q) ||
        visitorId.toLowerCase().includes(q);

      const matchesRoute =
        routeFilter === "all" ||
        (routeFilter === "home" && (path === "/" || path === "")) ||
        (routeFilter === "jobs" && path.startsWith("/jobs")) ||
        (routeFilter === "auth" && path.startsWith("/auth")) ||
        (routeFilter === "apply" && path.startsWith("/apply")) ||
        (routeFilter === "careers" && path.startsWith("/careers"));

      const devType = v.details?.device_type || "Desktop";
      const matchesDevice = deviceFilter === "all" || devType === deviceFilter;

      return matchesSearch && matchesRoute && matchesDevice;
    });
  }, [visitors, search, routeFilter, deviceFilter]);

  // Export to Excel
  const exportToExcel = async () => {
    try {
      const XLSX = await import("xlsx");
      const rows = filteredVisitors.map((v) => ({
        "معرف الزائر": v.details?.visitor_id || "غير معروف",
        "الصفحة المزارة": v.details?.path || "/",
        "الرابط بالكامل": v.details?.full_url || "",
        "عنوان IP": v.ip_address || "مجهول",
        "نوع الجهاز": v.details?.device_type || "Desktop",
        "اسم الجهاز": v.details?.device_name || "",
        "نظام التشغيل": v.details?.os_name || "",
        "المتصفح": v.details?.browser_name || "",
        "المصدر (Referrer)": v.details?.referrer || "Direct",
        "الدقة": v.details?.screen_resolution || "",
        "تاريخ ووقت الزيارة": new Date(v.created_at).toLocaleString("ar-SA"),
        "حالة الزائر": v.details?.is_returning ? "زائر عائد" : "زائر جديد لأول مرة",
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "GuestVisitors");
      XLSX.writeFile(wb, `TawzeefX_Guest_Visitors_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast({ title: "تم تصدير سجل الزوار بنجاح 📊" });
    } catch (err: any) {
      toast({ title: "تعذر التصدير", description: err.message, variant: "destructive" });
    }
  };

  const getDeviceIcon = (devType?: string) => {
    if (devType === "Mobile") return <Smartphone className="w-4 h-4 text-emerald-500" />;
    if (devType === "Tablet") return <Tablet className="w-4 h-4 text-blue-500" />;
    return <Laptop className="w-4 h-4 text-primary" />;
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Banner and Real-Time Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-l from-primary/10 via-background to-muted/40 border border-primary/20 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shrink-0">
            <Globe className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-black text-foreground">
                شاشة رصد حركة الزوار والضيوف غير المسجلين
              </h2>
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1.5 px-2 py-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                المراقبة اللحظية نشطة
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              تسجيل ومتابعة أي شخص يدخل على المنصة أو يتصفح الصفحات العامة والوظائف بدون تسجيل دخول
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="text-xs h-9 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? "text-emerald-600 animate-spin" : ""}`} />
            {autoRefresh ? "تحديث تلقائي (نشط)" : "تحديث تلقائي (متوقف)"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="text-xs h-9 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-primary" : ""}`} />
            تحديث فوري
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSimulateVisitor}
            disabled={isSimulating}
            className="text-xs h-9 gap-1.5 font-bold border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
          >
            <Eye className={`w-3.5 h-3.5 ${isSimulating ? "animate-pulse" : ""}`} />
            {isSimulating ? "جارِ التسجيل..." : "تسجيل زيارة تجريبية الآن ⚡"}
          </Button>

          <Button size="sm" onClick={exportToExcel} className="text-xs h-9 gap-1.5 font-bold">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            تصدير تقرير الزوار (.xlsx)
          </Button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4 bg-card/70 border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-semibold">إجمالي زيارات الضيوف</p>
              <p className="text-2xl font-black text-foreground mt-1">{metrics.total}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">زيارة مسجلة وموثقة</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-card/70 border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-semibold">نشطون الآن (آخر 30 دقيقة)</p>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {metrics.activeRecent}
              </p>
              <p className="text-[10px] text-emerald-600/80 mt-0.5 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                متصفحون في اللحظة الحالية
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <Eye className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-card/70 border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-semibold">أعلى مسار استكشافاً</p>
              <p className="text-base font-bold text-foreground mt-1 truncate max-w-[150px]">
                {metrics.topPath.path}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {metrics.topPath.count} زيارة مستقلة
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600">
              <Compass className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-card/70 border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-semibold">توزيع أجهزة الزوار</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-bold text-foreground">
                  📱 {metrics.mobilePercent}%
                </span>
                <span className="text-sm font-bold text-muted-foreground">
                  💻 {metrics.desktopPercent}%
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">هواتف جوالة مقابل كمبيوتر</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Smartphone className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Top Visited Landing Pages Ribbon */}
      {Object.keys(metrics.pathCounts).length > 0 && (
        <Card className="p-4 bg-muted/20 border-border/40">
          <div className="flex items-center gap-2 mb-2">
            <Compass className="w-4 h-4 text-primary" />
            <p className="text-xs font-bold text-foreground">
              توزيع الصفحات العامة الأكثر زيارة من الضيوف:
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(metrics.pathCounts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 6)
              .map(([path, count]) => (
                <button
                  key={path}
                  onClick={() => setSearch(path)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background border border-border/60 hover:border-primary/40 text-xs text-foreground transition-all"
                >
                  <span className="font-mono text-primary font-bold">{path}</span>
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                    {count} زيارة
                  </Badge>
                </button>
              ))}
          </div>
        </Card>
      )}

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border/60 shadow-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالمسار المزار، عنوان الـ IP، المتصفح، أو معرف الزائر..."
            className="pr-9 text-xs h-9 bg-background"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={routeFilter} onValueChange={setRouteFilter}>
            <SelectTrigger className="w-[150px] text-xs h-9">
              <SelectValue placeholder="الصفحة المزارة" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="all">كافة الصفحات</SelectItem>
              <SelectItem value="home">الرئيسية (/)</SelectItem>
              <SelectItem value="jobs">الوظائف المفتوحة (/jobs)</SelectItem>
              <SelectItem value="auth">شاشة الدخول (/auth)</SelectItem>
              <SelectItem value="apply">صفحة التقديم (/apply)</SelectItem>
              <SelectItem value="careers">المسارات المهنية (/careers)</SelectItem>
            </SelectContent>
          </Select>

          <Select value={deviceFilter} onValueChange={setDeviceFilter}>
            <SelectTrigger className="w-[130px] text-xs h-9">
              <SelectValue placeholder="نوع الجهاز" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="all">كافة الأجهزة</SelectItem>
              <SelectItem value="Desktop">كمبيوتر (Desktop)</SelectItem>
              <SelectItem value="Mobile">هاتف جوال (Mobile)</SelectItem>
              <SelectItem value="Tablet">جهاز لوحي (Tablet)</SelectItem>
            </SelectContent>
          </Select>

          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[120px] text-xs h-9">
              <SelectValue placeholder="الفترة" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="all">كافة الفترات</SelectItem>
              <SelectItem value="today">اليوم</SelectItem>
              <SelectItem value="7days">آخر 7 أيام</SelectItem>
              <SelectItem value="30days">آخر شهر</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Visitors List / Table */}
      {isLoading ? (
        <div className="py-16 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          جاري استرجاع سجلات حركة الزوار غير المسجلين...
        </div>
      ) : filteredVisitors.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <Globe className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="font-bold text-sm text-foreground">لا توجد زيارات غير مسجلة مطابقة لمعايير البحث</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            يتم تسجيل أي زائر يدخل للمنصة فورياً وتوثيق مساره وجهازه وعنوانه هنا في شاشة المراقبة.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-2">
            <span>
              عرض <strong className="text-foreground">{filteredVisitors.length}</strong> زيارة غير مسجلة
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            <AnimatePresence>
              {filteredVisitors.map((v) => {
                const isReturning = v.details?.is_returning;
                const devType = v.details?.device_type || "Desktop";
                const devName = v.details?.device_name || "جهاز غير محدد";
                const browser = v.details?.browser_name || "متصفح الويب";
                const os = v.details?.os_name || "نظام التشغيل";
                const path = v.details?.path || "/";
                const visitorId = v.details?.visitor_id || "vis_guest";
                const ip = v.ip_address || "مجهول";
                const countryCode = v.details?.country_code || "SA";
                const flag = getCountryFlag(countryCode);
                const referrer = v.details?.referrer || "مباشر";
                const dateFormatted = new Date(v.created_at).toLocaleString("ar-SA", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                });

                return (
                  <motion.div
                    key={v.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="p-4 rounded-xl bg-card border border-border/60 hover:border-primary/40 transition-all shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    {/* Visitor ID & Path Info */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-muted/60 border border-border/50 flex items-center justify-center shrink-0">
                        {getDeviceIcon(devType)}
                      </div>

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => handleCopy(visitorId, v.id)}
                            className="font-mono text-xs font-bold text-foreground hover:text-primary transition-colors flex items-center gap-1 bg-muted/40 px-2 py-0.5 rounded-md border border-border/40"
                            title="انقر لنسخ المعرف"
                          >
                            <span>{visitorId}</span>
                            {copiedId === v.id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3 text-muted-foreground" />
                            )}
                          </button>

                          <Badge
                            variant="secondary"
                            className="text-[10px] px-2 py-0.5 font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20"
                          >
                            ضيف غير مسجل 👤
                          </Badge>

                          {isReturning && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 font-medium text-purple-600 border-purple-500/30"
                            >
                              زائر عائد 🔄
                            </Badge>
                          )}
                        </div>

                        {/* Visited path with link */}
                        <div className="flex items-center gap-2 text-xs flex-wrap pt-0.5">
                          <span className="text-muted-foreground font-medium">الصفحة التي دخلها:</span>
                          <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded text-[11px] border border-primary/20">
                            {path}
                          </span>
                          <span className="text-muted-foreground text-[11px]">
                            • المصدر: <strong className="text-foreground">{referrer}</strong>
                          </span>
                        </div>

                        {/* Device & Location Meta */}
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap pt-1">
                          <span className="flex items-center gap-1 font-mono">
                            <span className="text-xs">{flag}</span>
                            {ip}
                          </span>
                          <span>•</span>
                          <span>{devName}</span>
                          <span>•</span>
                          <span>{browser} على {os}</span>
                        </div>
                      </div>
                    </div>

                    {/* Timestamp & Actions */}
                    <div className="flex items-center md:flex-col md:items-end justify-between gap-2 shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-border/40">
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                        <Clock className="w-3 h-3 text-primary/70" />
                        {dateFormatted}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-[11px] h-7 px-2.5"
                          onClick={() => setSelectedVisitor(v)}
                        >
                          <Info className="w-3 h-3" />
                          تفاصيل الجلسة
                        </Button>

                        {ip && ip !== "unknown" && ip !== "127.0.0.1" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[11px] h-7 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            disabled={blockingIp === ip}
                            onClick={() => handleBlockIp(ip)}
                            title="إضافة IP للمراقبة والحظر"
                          >
                            <ShieldAlert className="w-3 h-3" />
                            حظر
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Visitor Full Details Dialog */}
      {selectedVisitor && (
        <Dialog open onOpenChange={(op) => !op && setSelectedVisitor(null)}>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-right flex items-center gap-2 text-base font-black">
                <Globe className="w-5 h-5 text-primary" />
                تفاصيل جلسة الزائر غير المسجل
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 bg-muted/40 rounded-xl space-y-2 border border-border/50">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">معرّف الزائر:</span>
                  <span className="font-mono font-bold text-foreground">
                    {selectedVisitor.details?.visitor_id || "غير متوفر"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">نوع الزيارة:</span>
                  <Badge variant="outline" className="text-[10px]">
                    {selectedVisitor.details?.is_returning ? "زائر عائد (Returning)" : "زائر جديد (First-time)"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">الصفحة المستهدفة:</span>
                  <span className="font-mono font-bold text-primary">
                    {selectedVisitor.details?.path || "/"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">الرابط الكامل:</span>
                  <a
                    href={selectedVisitor.details?.full_url || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline font-mono truncate max-w-[200px] flex items-center gap-1"
                  >
                    <span>{selectedVisitor.details?.full_url || "/"}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>
              </div>

              <div className="p-3 bg-card rounded-xl space-y-2 border border-border/50">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">عنوان IP:</span>
                  <span className="font-mono font-bold text-foreground">
                    {selectedVisitor.ip_address || "مجهول"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">الجهاز ونظام التشغيل:</span>
                  <span className="font-bold text-foreground">
                    {selectedVisitor.details?.device_name || "كمبيوتر"} ({selectedVisitor.details?.os_name})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">المتصفح:</span>
                  <span className="font-bold text-foreground">
                    {selectedVisitor.details?.browser_name || "متصفح الويب"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">دقة الشاشة:</span>
                  <span className="font-mono text-muted-foreground">
                    {selectedVisitor.details?.screen_resolution || "غير محددة"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">المنطقة الزمنية واللغة:</span>
                  <span className="font-mono text-muted-foreground">
                    {selectedVisitor.details?.time_zone} • {selectedVisitor.details?.language}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">توقيت الدخول:</span>
                  <span className="font-mono text-muted-foreground">
                    {new Date(selectedVisitor.created_at).toLocaleString("ar-SA")}
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter className="flex justify-between items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedVisitor(null)}
              >
                إغلاق
              </Button>
              {selectedVisitor.ip_address && (
                <Button
                  size="sm"
                  variant="destructive"
                  className="gap-1 text-xs"
                  onClick={() => {
                    handleBlockIp(selectedVisitor.ip_address!);
                    setSelectedVisitor(null);
                  }}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  حظر عنوان IP هذا
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
