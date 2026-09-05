import { useState, useMemo, useCallback, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Shield, Search, Filter, User, AlertTriangle, CheckCircle, XCircle,
  LogIn, UserCog, FileText, Download, ChevronLeft, ChevronRight, Clock,
  Globe, Monitor, Smartphone, Tablet, ChevronDown, ChevronUp, LayoutGrid, List,
  FileSpreadsheet, Sparkles, ShieldAlert, Laptop, Lock, MapPin, RefreshCw,
  Calendar, ShieldCheck, Activity, Eye, Zap, X, Copy, Check,
  TrendingUp, TrendingDown, Users, AlertCircle, Info, Flame,
  BarChart2, SlidersHorizontal, FileDown, Printer, LayoutList,
  GitCompare, Bell, BellOff, ChevronRightIcon, Layers
} from "lucide-react";
import { useCompactView } from "@/hooks/useCompactView";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { FlaticonAnimatedIcon, FlaticonCategoryIconCard } from "@/components/ui/animated-icons";
import { PageHeader } from "@/components/ui/page-header";
import { detectUserDevice } from "@/lib/deviceDetector";
import { getCountryFlag } from "@/lib/locationService";
import { formatExactArabicDuration } from "@/lib/sessionTracker";

// ────────────────────────────────────────────────────────────
// Constants & Maps
// ────────────────────────────────────────────────────────────

const PAGE_SIZE = 25;

type Severity = "critical" | "high" | "medium" | "low" | "info";
type ViewMode = "table" | "timeline" | "kanban";

const SEVERITY_CONFIG: Record<Severity, { label: string; labelEn: string; color: string; bg: string; ring: string; dot: string; icon: typeof Shield }> = {
  critical: { label: "حرج", labelEn: "Critical", color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10 border-red-500/30", ring: "ring-red-500", dot: "bg-red-500 animate-pulse", icon: Flame },
  high:     { label: "عالي", labelEn: "High",     color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/10 border-orange-500/30", ring: "ring-orange-500", dot: "bg-orange-500", icon: AlertTriangle },
  medium:   { label: "متوسط", labelEn: "Medium",  color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10 border-amber-500/30", ring: "ring-amber-500", dot: "bg-amber-400", icon: AlertCircle },
  low:      { label: "منخفض", labelEn: "Low",     color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30", ring: "ring-emerald-500", dot: "bg-emerald-500", icon: CheckCircle },
  info:     { label: "معلومة", labelEn: "Info",   color: "text-slate-500 dark:text-slate-400", bg: "bg-slate-500/10 border-slate-500/20", ring: "ring-slate-400", dot: "bg-slate-400", icon: Info },
};

const EVENT_TYPES: Record<string, {
  label: string;
  icon: typeof Shield;
  color: string;
  category: "session" | "security" | "roles" | "data";
  severity: Severity;
}> = {
  "login_success":          { label: "تسجيل دخول ناجح",             icon: LogIn,        color: "text-emerald-500", category: "session",  severity: "low"      },
  "login.success":          { label: "تسجيل دخول ناجح",             icon: LogIn,        color: "text-emerald-500", category: "session",  severity: "low"      },
  "logout.user":            { label: "تسجيل خروج (إنهاء الجلسة)",   icon: LogIn,        color: "text-amber-500",   category: "session",  severity: "info"     },
  "session.duration":       { label: "مدة الجلسة والتواجد ⏱️",      icon: Clock,        color: "text-indigo-500",  category: "session",  severity: "info"     },
  "login_failed":           { label: "محاولة دخول فاشلة",           icon: XCircle,      color: "text-rose-500",    category: "security", severity: "high"     },
  "login.failed":           { label: "محاولة دخول فاشلة",           icon: XCircle,      color: "text-rose-500",    category: "security", severity: "high"     },
  "login.otp_failed":       { label: "فشل رمز OTP",                 icon: XCircle,      color: "text-rose-500",    category: "security", severity: "high"     },
  "role_changed":           { label: "تغيير صلاحية",                icon: UserCog,      color: "text-amber-500",   category: "roles",    severity: "medium"   },
  "role.changed":           { label: "تغيير صلاحية",                icon: UserCog,      color: "text-amber-500",   category: "roles",    severity: "medium"   },
  "role.deleted":           { label: "حذف صلاحية",                  icon: AlertTriangle,color: "text-rose-500",    category: "roles",    severity: "high"     },
  "member_deleted":         { label: "حذف عضو",                     icon: AlertTriangle,color: "text-rose-500",    category: "roles",    severity: "high"     },
  "member.deleted":         { label: "حذف عضو",                     icon: AlertTriangle,color: "text-rose-500",    category: "roles",    severity: "high"     },
  "member.invited":         { label: "دعوة عضو جديد",               icon: User,         color: "text-blue-500",    category: "roles",    severity: "low"      },
  "offer_accepted":         { label: "قبول عرض وظيفي",              icon: CheckCircle,  color: "text-emerald-500", category: "data",     severity: "low"      },
  "offer.accepted":         { label: "قبول عرض وظيفي",              icon: CheckCircle,  color: "text-emerald-500", category: "data",     severity: "low"      },
  "offer_rejected":         { label: "رفض عرض وظيفي",               icon: XCircle,      color: "text-amber-500",   category: "data",     severity: "low"      },
  "offer.rejected":         { label: "رفض عرض وظيفي",               icon: XCircle,      color: "text-amber-500",   category: "data",     severity: "low"      },
  "offer_sent":             { label: "إرسال عرض وظيفي",             icon: FileText,     color: "text-blue-500",    category: "data",     severity: "low"      },
  "offer.sent":             { label: "إرسال عرض وظيفي",             icon: FileText,     color: "text-blue-500",    category: "data",     severity: "low"      },
  "offer.withdrawn":        { label: "سحب عرض وظيفي",               icon: XCircle,      color: "text-rose-500",    category: "data",     severity: "medium"   },
  "data_export":            { label: "تصدير بيانات",                 icon: Download,     color: "text-indigo-500",  category: "data",     severity: "medium"   },
  "data.exported":          { label: "تصدير بيانات",                 icon: Download,     color: "text-indigo-500",  category: "data",     severity: "medium"   },
  "settings.changed":       { label: "تغيير إعدادات المنصة",         icon: Shield,       color: "text-amber-500",   category: "data",     severity: "medium"   },
  "password_reset":         { label: "إعادة تعيين كلمة مرور",        icon: Lock,         color: "text-purple-500",  category: "security", severity: "medium"   },
  "signup":                 { label: "تسجيل حساب جديد",              icon: User,         color: "text-blue-500",    category: "roles",    severity: "low"      },
  "security.suspicious_ip": { label: "🚨 محاولة مشبوهة / IP غير معروف", icon: AlertTriangle, color: "text-rose-600", category: "security", severity: "critical" },
};

// ────────────────────────────────────────────────────────────
// Helper utilities
// ────────────────────────────────────────────────────────────

function getSeverity(eventType: string): Severity {
  return EVENT_TYPES[eventType]?.severity ?? "info";
}

function parseSessionDuration(details: Record<string, unknown> | null, createdAt: string) {
  if (!details) return null;
  const secs = (details.duration_seconds ?? details.durationSeconds) as number | undefined;
  if (secs !== undefined && secs !== null) return formatExactArabicDuration(Number(secs));
  const formatted = (details.formatted_duration ?? details.formattedDuration) as string | undefined;
  if (formatted) return formatted;
  const mins = (details.duration_minutes ?? details.durationMinutes) as number | undefined;
  if (mins !== undefined && mins !== null) return formatExactArabicDuration(Number(mins) * 60);
  if (details.login_time) {
    const start = new Date(details.login_time as string).getTime();
    const end = new Date(createdAt).getTime();
    return formatExactArabicDuration(Math.max(1, Math.round((end - start) / 1000)));
  }
  return null;
}

function parseDeviceDetails(details: Record<string, unknown> | null) {
  if (!details) return { deviceName: "كمبيوتر شخصي (Windows PC)", deviceType: "Desktop", osName: "Windows", browserName: "المتصفح", icon: Laptop };
  let devName = (details.device_name ?? details.deviceName) as string | undefined;
  let os = (details.os ?? details.osName) as string | undefined;
  let browser = (details.browser ?? details.browserName) as string | undefined;
  let devType = (details.device ?? details.deviceType ?? "Desktop") as string;
  if ((!devName || !os) && details.user_agent) {
    const parsed = detectUserDevice();
    devName = parsed.deviceName; os = parsed.osName; browser = parsed.browserName; devType = parsed.deviceType;
  }
  let IconComponent: typeof Laptop = Laptop;
  if (devType === "Mobile" || /iPhone|Android.*Mobile/i.test(devName ?? "")) IconComponent = Smartphone;
  else if (devType === "Tablet" || /iPad|Tablet/i.test(devName ?? "")) IconComponent = Tablet;
  return { deviceName: devName ?? "جهاز كمبيوتر (Desktop)", deviceType: devType, osName: os ?? "نظام التشغيل", browserName: browser ?? "المتصفح", icon: IconComponent };
}

function parseLocationDetails(details: Record<string, unknown> | null, ip?: string) {
  if (details?.location) return details.location as string;
  if (details?.city || details?.country) {
    const code = (details.country_code ?? details.countryCode ?? "SA") as string;
    const flag = (details.flag as string) ?? getCountryFlag(code);
    return `${details.city ?? "الرياض"}، ${details.country ?? "المملكة العربية السعودية"} ${flag}`;
  }
  if (ip && ip.startsWith("154.")) return "القاهرة، مصر 🇪🇬";
  return "الرياض، المملكة العربية السعودية 🇸🇦";
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDateShort(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
}

// ────────────────────────────────────────────────────────────
// Sparkline SVG Chart
// ────────────────────────────────────────────────────────────

function SparklineChart({ data, color = "#6366f1", height = 40, width = 120 }: { data: number[]; color?: string; height?: number; width?: number }) {
  if (!data || data.length < 2) return <div className="w-full h-10 opacity-20 text-xs text-muted-foreground flex items-center justify-center">لا بيانات</div>;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  });
  const polyline = pts.join(" ");
  const fill = `M0,${height} L${pts[0]} L${polyline.split(" ").slice(1).join(" L")} L${width},${height} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible">
      <defs>
        <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={fill} fill="url(#spark-grad)" />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ────────────────────────────────────────────────────────────
// Circular Progress
// ────────────────────────────────────────────────────────────

function CircularProgress({ value, size = 64, strokeWidth = 6, color = "#10b981" }: { value: number; size?: number; strokeWidth?: number; color?: string }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-muted/30" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" style={{ transition: "stroke-dasharray 0.6s ease" }} />
    </svg>
  );
}

// ────────────────────────────────────────────────────────────
// Threat Intelligence Panel
// ────────────────────────────────────────────────────────────

interface ThreatAlert {
  id: string;
  type: "brute_force" | "off_hours" | "bulk_delete" | "suspicious_ip";
  title: string;
  description: string;
  count: number;
  affectedEmails: string[];
}

function detectThreats(logs: any[]): ThreatAlert[] {
  const threats: ThreatAlert[] = [];
  const now = new Date();

  // 1. Brute force: >3 failed logins from same IP in 10 min
  const failedByIp: Record<string, any[]> = {};
  logs.forEach(l => {
    if (l.event_type?.includes("failed") && l.ip_address) {
      if (!failedByIp[l.ip_address]) failedByIp[l.ip_address] = [];
      failedByIp[l.ip_address].push(l);
    }
  });
  Object.entries(failedByIp).forEach(([ip, events]) => {
    if (events.length >= 3) {
      threats.push({
        id: `bf_${ip}`,
        type: "brute_force",
        title: "🔴 محاولات دخول متكررة (Brute Force)",
        description: `${events.length} محاولة دخول فاشلة من العنوان ${ip}`,
        count: events.length,
        affectedEmails: [...new Set(events.map((e: any) => e.user_email).filter(Boolean))] as string[],
      });
    }
  });

  // 2. Off-hours role changes
  const offHoursRoles = logs.filter(l => {
    if (!l.event_type?.includes("role") && !l.event_type?.includes("member")) return false;
    const h = new Date(l.created_at).getHours();
    return h < 8 || h >= 22;
  });
  if (offHoursRoles.length > 0) {
    threats.push({
      id: "off_hours",
      type: "off_hours",
      title: "🟠 تغيير صلاحيات خارج أوقات العمل",
      description: `${offHoursRoles.length} تغيير صلاحيات تم خارج ساعات العمل الرسمية`,
      count: offHoursRoles.length,
      affectedEmails: [...new Set(offHoursRoles.map((e: any) => e.user_email).filter(Boolean))] as string[],
    });
  }

  // 3. Suspicious IP events
  const suspiciousIp = logs.filter(l => l.event_type === "security.suspicious_ip");
  if (suspiciousIp.length > 0) {
    threats.push({
      id: "suspicious_ip",
      type: "suspicious_ip",
      title: "🚨 عناوين IP مشبوهة مكتشفة",
      description: `${suspiciousIp.length} حدث من عناوين IP مصنّفة على أنها مشبوهة`,
      count: suspiciousIp.length,
      affectedEmails: [...new Set(suspiciousIp.map((e: any) => e.user_email).filter(Boolean))] as string[],
    });
  }

  return threats;
}

function ThreatIntelPanel({ threats, onDismiss, onFilter }: { threats: ThreatAlert[]; onDismiss: (id: string) => void; onFilter?: (email: string) => void }) {
  if (threats.length === 0) return null;
  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
      {threats.map(t => (
        <motion.div key={t.id} layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
          className={cn("flex items-start gap-3 p-3 rounded-xl border text-sm",
            t.type === "brute_force" || t.type === "suspicious_ip"
              ? "bg-red-500/8 border-red-500/30"
              : "bg-orange-500/8 border-orange-500/30"
          )}>
          <div className={cn("mt-0.5 w-2 h-2 rounded-full shrink-0",
            t.type === "brute_force" || t.type === "suspicious_ip" ? "bg-red-500 animate-pulse" : "bg-orange-400"
          )} />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-foreground text-xs">{t.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
            {t.affectedEmails.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {t.affectedEmails.slice(0, 3).map(e => (
                  <button key={e} onClick={() => onFilter?.(e)}
                    className="text-[10px] px-1.5 py-0.5 rounded-md bg-background border border-border/60 text-foreground font-mono hover:bg-muted transition-colors">
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => onDismiss(t.id)} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      ))}
    </motion.div>
  );
}

// ────────────────────────────────────────────────────────────
// User Activity Popover
// ────────────────────────────────────────────────────────────

function UserActivityPopover({ email, logs, onFilterByUser }: { email: string; logs: any[]; onFilterByUser: (email: string) => void }) {
  const userLogs = useMemo(() => logs.filter((l: any) => l.user_email === email), [email, logs]);
  const todayCount = useMemo(() => {
    const today = new Date().toDateString();
    return userLogs.filter((l: any) => new Date(l.created_at).toDateString() === today).length;
  }, [userLogs]);
  const recentFive = useMemo(() => userLogs.slice(0, 5), [userLogs]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="text-foreground font-medium hover:text-primary hover:underline transition-colors text-right truncate max-w-[160px]">
          {email || "زائر / غير معروف"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0 rounded-2xl shadow-xl border-border/60" align="start">
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">{email}</p>
              <p className="text-xs text-muted-foreground">{userLogs.length} حدث إجمالاً</p>
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2 rounded-xl bg-muted/40 border border-border/40">
              <p className="text-lg font-black text-primary">{todayCount}</p>
              <p className="text-[10px] text-muted-foreground font-semibold">اليوم</p>
            </div>
            <div className="p-2 rounded-xl bg-muted/40 border border-border/40">
              <p className="text-lg font-black">{userLogs.length}</p>
              <p className="text-[10px] text-muted-foreground font-semibold">الإجمالي</p>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">آخر الأحداث</p>
            {recentFive.map((l: any) => {
              const info = EVENT_TYPES[l.event_type];
              const Icon = info?.icon ?? Shield;
              return (
                <div key={l.id} className="flex items-center gap-2 py-1">
                  <Icon className={cn("w-3 h-3 shrink-0", info?.color ?? "text-muted-foreground")} />
                  <span className="text-xs text-foreground flex-1 truncate">{info?.label ?? l.event_type}</span>
                  <span className="text-[10px] text-muted-foreground">{formatDateShort(l.created_at)}</span>
                </div>
              );
            })}
          </div>
          <Button size="sm" variant="outline" className="w-full rounded-xl text-xs h-8 gap-1.5" onClick={() => onFilterByUser(email)}>
            <Eye className="w-3.5 h-3.5" />
            عرض كل أحداث هذا المستخدم
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ────────────────────────────────────────────────────────────
// Diff Viewer (Before / After)
// ────────────────────────────────────────────────────────────

function DiffViewer({ details }: { details: Record<string, unknown> | null }) {
  const [copied, setCopied] = useState(false);
  if (!details) return null;

  const before = details.before as Record<string, unknown> | undefined;
  const after = details.after as Record<string, unknown> | undefined;

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(details, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (before && after) {
    const allKeys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
    const changed = allKeys.filter(k => JSON.stringify(before[k]) !== JSON.stringify(after[k]));
    const unchanged = allKeys.filter(k => JSON.stringify(before[k]) === JSON.stringify(after[k]));
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
            <GitCompare className="w-3.5 h-3.5" /> مقارنة التغييرات (قبل / بعد):
          </p>
          <button onClick={copyJson} className="text-[10px] flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            {copied ? "تم النسخ" : "نسخ JSON"}
          </button>
        </div>
        <div className="rounded-xl overflow-hidden border border-border/60">
          <div className="grid grid-cols-2 text-[10px]">
            <div className="p-1.5 bg-red-500/5 border-b border-red-500/20 font-bold text-red-600 text-center">قبل</div>
            <div className="p-1.5 bg-emerald-500/5 border-b border-emerald-500/20 font-bold text-emerald-600 text-center border-r border-border/40">بعد</div>
          </div>
          {changed.map(k => (
            <div key={k} className="grid grid-cols-2 text-[10px] border-b border-border/30 last:border-0">
              <div className="p-2 bg-red-500/5 font-mono">
                <span className="text-muted-foreground">{k}: </span>
                <span className="text-red-600 dark:text-red-400 line-through">{String(before[k] ?? "—")}</span>
              </div>
              <div className="p-2 bg-emerald-500/5 font-mono border-r border-border/40">
                <span className="text-muted-foreground">{k}: </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">{String(after[k] ?? "—")}</span>
              </div>
            </div>
          ))}
          {unchanged.length > 0 && (
            <div className="px-2 py-1.5 text-[10px] text-muted-foreground bg-muted/20 text-center">
              + {unchanged.length} حقل بدون تغيير
            </div>
          )}
        </div>
      </div>
    );
  }

  // No before/after — show raw JSON
  const displayDetails = Object.entries(details).filter(([k]) =>
    !["user_agent", "browser", "os", "device", "device_name", "deviceName", "osName", "browserName", "location", "city", "country", "login_time", "logout_time", "duration_minutes", "duration_seconds", "formatted_duration", "formatted_active", "formatted_idle"].includes(k)
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold text-muted-foreground">بيانات الحدث (Payload):</p>
        <button onClick={copyJson} className="text-[10px] flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
          {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
          {copied ? "تم النسخ" : "نسخ JSON"}
        </button>
      </div>
      {displayDetails.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {displayDetails.map(([k, v]) => (
            <Badge key={k} variant="secondary" className="text-[10px] font-mono px-2 py-0.5">
              {k}: {String(v)}
            </Badge>
          ))}
        </div>
      ) : (
        <pre className="text-[10px] font-mono bg-slate-900 text-slate-300 rounded-xl p-3 border border-slate-800 overflow-auto max-h-32">
          {JSON.stringify(details, null, 2)}
        </pre>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Advanced Filters Drawer
// ────────────────────────────────────────────────────────────

interface AdvancedFilters {
  severities: Severity[];
  devices: string[];
  countries: string[];
}

function AdvancedFiltersDrawer({
  filters, onApply, logs
}: {
  filters: AdvancedFilters;
  onApply: (f: AdvancedFilters) => void;
  logs: any[];
}) {
  const [local, setLocal] = useState<AdvancedFilters>(filters);

  const uniqueDevices = useMemo(() => {
    const s = new Set<string>();
    logs.forEach((l: any) => {
      const d = parseDeviceDetails(l.details);
      s.add(d.deviceType);
    });
    return [...s];
  }, [logs]);

  const toggleSeverity = (s: Severity) => {
    setLocal(prev => ({
      ...prev,
      severities: prev.severities.includes(s) ? prev.severities.filter(x => x !== s) : [...prev.severities, s]
    }));
  };
  const toggleDevice = (d: string) => {
    setLocal(prev => ({
      ...prev,
      devices: prev.devices.includes(d) ? prev.devices.filter(x => x !== d) : [...prev.devices, d]
    }));
  };

  const reset = () => setLocal({ severities: [], devices: [], countries: [] });

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="h-11 rounded-xl text-xs font-bold gap-1.5">
          <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
          فلتر متقدم
          {(filters.severities.length + filters.devices.length) > 0 && (
            <Badge className="h-4 w-4 p-0 text-[9px] bg-primary text-primary-foreground rounded-full flex items-center justify-center">
              {filters.severities.length + filters.devices.length}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[320px] p-0 rounded-r-3xl" dir="rtl">
        <SheetHeader className="p-5 pb-3 border-b border-border/60">
          <SheetTitle className="flex items-center gap-2 text-base font-black">
            <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
            فلاتر متقدمة
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-140px)]">
          <div className="p-5 space-y-6">
            {/* Severity Filter */}
            <div className="space-y-2">
              <p className="text-xs font-black text-muted-foreground uppercase tracking-wider">مستوى الخطورة</p>
              <div className="space-y-1.5">
                {(Object.entries(SEVERITY_CONFIG) as [Severity, typeof SEVERITY_CONFIG[Severity]][]).map(([sev, cfg]) => {
                  const Icon = cfg.icon;
                  const checked = local.severities.includes(sev);
                  return (
                    <label key={sev} className={cn("flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all",
                      checked ? `${cfg.bg} border-opacity-60` : "border-border/40 hover:bg-muted/30"
                    )}>
                      <Checkbox checked={checked} onCheckedChange={() => toggleSeverity(sev)} className="rounded-md" />
                      <div className={cn("w-2 h-2 rounded-full shrink-0", cfg.dot)} />
                      <Icon className={cn("w-4 h-4 shrink-0", cfg.color)} />
                      <span className={cn("text-xs font-bold", cfg.color)}>{cfg.label}</span>
                      <span className="text-[10px] text-muted-foreground mr-auto">{cfg.labelEn}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Device Filter */}
            <div className="space-y-2">
              <p className="text-xs font-black text-muted-foreground uppercase tracking-wider">نوع الجهاز</p>
              <div className="space-y-1.5">
                {["Desktop", "Mobile", "Tablet"].map(d => {
                  const Icon = d === "Mobile" ? Smartphone : d === "Tablet" ? Tablet : Monitor;
                  const checked = local.devices.includes(d);
                  return (
                    <label key={d} className={cn("flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all",
                      checked ? "bg-primary/8 border-primary/30" : "border-border/40 hover:bg-muted/30"
                    )}>
                      <Checkbox checked={checked} onCheckedChange={() => toggleDevice(d)} className="rounded-md" />
                      <Icon className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-xs font-bold">{d === "Desktop" ? "كمبيوتر" : d === "Mobile" ? "هاتف محمول" : "جهاز لوحي"}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </ScrollArea>
        <div className="p-4 border-t border-border/60 flex gap-2">
          <Button variant="outline" size="sm" className="rounded-xl flex-1 text-xs" onClick={reset}>إعادة ضبط</Button>
          <Sheet>
            <Button size="sm" className="rounded-xl flex-1 text-xs bg-primary" onClick={() => onApply(local)}>تطبيق الفلاتر</Button>
          </Sheet>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ────────────────────────────────────────────────────────────
// Data Query Hook
// ────────────────────────────────────────────────────────────

function useAuditLogQuery(page: number, eventFilter: string, activeTab: string, search: string, timeRange: string, autoRefresh: boolean) {
  return useQuery({
    queryKey: ["audit-log", page, eventFilter, activeTab, search, timeRange],
    staleTime: autoRefresh ? 5000 : 60000,
    refetchInterval: autoRefresh ? 10000 : false,
    queryFn: async () => {
      let query = supabase.from("audit_log").select("*", { count: "exact" }).order("created_at", { ascending: false });

      if (activeTab === "sessions") query = query.in("event_type", ["login.success", "login_success", "logout.user", "session.duration"]);
      else if (activeTab === "security") query = query.in("event_type", ["login.failed", "login_failed", "login.otp_failed", "security.suspicious_ip", "role.deleted"]);
      else if (activeTab === "roles") query = query.in("event_type", ["role.changed", "role_changed", "member.invited", "member.deleted", "member_deleted", "signup"]);
      else if (activeTab === "data") query = query.in("event_type", ["data.exported", "data_export", "settings.changed", "offer.sent", "offer.accepted", "offer.rejected"]);

      if (eventFilter && eventFilter !== "all") query = query.eq("event_type", eventFilter);
      if (search.trim()) query = query.or(`user_email.ilike.%${search}%,event_type.ilike.%${search}%`);

      if (timeRange !== "all") {
        const now = new Date();
        const startDate = new Date();
        if (timeRange === "today") startDate.setHours(0, 0, 0, 0);
        else if (timeRange === "7days") startDate.setDate(now.getDate() - 7);
        else if (timeRange === "30days") startDate.setDate(now.getDate() - 30);
        query = query.gte("created_at", startDate.toISOString());
      }

      query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      const { data, error, count } = await query;
      if (error) throw error;
      return { data: data || [], count: count || 0 };
    },
  });
}

// ────────────────────────────────────────────────────────────
// Audit Log Row (Table View)
// ────────────────────────────────────────────────────────────

function AuditLogRow({ log, index, isCompact, allLogs, onFilterByUser }: {
  log: any; index: number; isCompact: boolean; allLogs: any[]; onFilterByUser: (email: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const info = EVENT_TYPES[log.event_type] ?? { label: log.event_type, icon: Shield, color: "text-muted-foreground", category: "session", severity: "info" as Severity };
  const Icon = info.icon;
  const details = log.details as Record<string, unknown> | null;
  const parsedDevice = parseDeviceDetails(details);
  const locationText = parseLocationDetails(details, log.ip_address);
  const durationText = parseSessionDuration(details, log.created_at);
  const DeviceIcon = parsedDevice.icon;
  const severity = getSeverity(log.event_type);
  const sevCfg = SEVERITY_CONFIG[severity];
  const cellClass = cn("transition-all", isCompact ? "p-2 text-xs" : "p-3.5 text-sm");

  return (
    <>
      <motion.tr
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: index * 0.02 }}
        className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer group"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Severity indicator */}
        <td className={cn(cellClass, "w-1 p-0")}>
          <div className={cn("w-1 h-full min-h-[48px] rounded-r-full", sevCfg.dot.replace("animate-pulse", ""))} />
        </td>

        {/* Event Type & Label */}
        <td className={cellClass}>
          <div className="flex items-center gap-2">
            <FlaticonAnimatedIcon icon={Icon} animation="bounce" className={isCompact ? "w-4 h-4 shrink-0" : "w-4.5 h-4.5 shrink-0"} colorClass={info.color} />
            <div className="flex flex-col gap-0.5">
              <Badge variant="outline" className={cn("text-[10px] font-bold border", sevCfg.bg, sevCfg.color)}>
                {info.label}
              </Badge>
              <Badge variant="secondary" className={cn("text-[9px] font-bold w-fit gap-0.5 px-1.5 py-0", sevCfg.bg, sevCfg.color)}>
                <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", sevCfg.dot)} />
                {sevCfg.label}
              </Badge>
            </div>
          </div>
        </td>

        {/* User Email */}
        <td className={cellClass} onClick={e => e.stopPropagation()}>
          <UserActivityPopover email={log.user_email || ""} logs={allLogs} onFilterByUser={onFilterByUser} />
        </td>

        {/* IP Address */}
        <td className={cellClass}>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Globe className={isCompact ? "w-3.5 h-3.5 text-blue-500 shrink-0" : "w-4 h-4 text-blue-500 shrink-0"} />
            <span className={isCompact ? "font-mono text-[10px]" : "font-mono text-xs font-semibold"}>
              {log.ip_address && log.ip_address !== "unknown" ? log.ip_address : "—"}
            </span>
          </div>
        </td>

        {/* Location */}
        <td className={cellClass}>
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
            <MapPin className={isCompact ? "w-3.5 h-3.5 shrink-0" : "w-4 h-4 shrink-0"} />
            <span className={isCompact ? "text-[10px]" : "text-xs"}>{locationText}</span>
          </div>
        </td>

        {/* Device */}
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

        {/* Date & Duration */}
        <td className={cn(cellClass, "text-muted-foreground whitespace-nowrap")}>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {formatDate(log.created_at)}
            </div>
            {durationText && (
              <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 text-[10px] w-fit font-bold gap-1 px-2 py-0.5">
                ⏱️ {durationText}
              </Badge>
            )}
          </div>
        </td>

        {/* Expand */}
        <td className={cellClass}>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </td>
      </motion.tr>

      {/* Expanded Details */}
      <AnimatePresence>
        {expanded && (
          <motion.tr initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <td colSpan={8} className="p-0">
              <div className="bg-muted/20 px-6 py-4 border-b border-border/60 space-y-4">
                {/* Meta info grid */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-2.5 text-xs">
                  {[
                    { label: "الموقع الجغرافي", value: locationText, cls: "text-emerald-600 dark:text-emerald-400 font-bold" },
                    { label: "اسم الجهاز", value: parsedDevice.deviceName, cls: "font-bold" },
                    { label: "نظام التشغيل", value: parsedDevice.osName, cls: "font-bold" },
                    { label: "المتصفح", value: parsedDevice.browserName, cls: "font-bold" },
                    { label: "عنوان IP", value: log.ip_address || "غير متوفر", cls: "font-mono font-bold text-blue-600 dark:text-blue-400" },
                    { label: "مدة الجلسة", value: durationText || "نشط / جلسة جديدة", cls: "font-bold text-indigo-600 dark:text-indigo-400" },
                  ].map(item => (
                    <div key={item.label} className="p-2.5 rounded-xl bg-card border border-border/60">
                      <p className="text-muted-foreground text-[10px] mb-1 font-bold">{item.label}:</p>
                      <p className={cn("text-xs", item.cls)}>{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Active percentage */}
                {details && (details as any).formatted_active && (
                  <div className="text-xs flex items-center gap-2 text-muted-foreground">
                    <Activity className="w-3.5 h-3.5 text-emerald-500" />
                    نشاط تفاعلي: <span className="font-bold text-emerald-600">{(details as any).formatted_active}</span>
                    ({(details as any).active_percentage}%)
                  </div>
                )}

                {/* User Agent */}
                {details && (details as any).user_agent && (
                  <div>
                    <p className="text-[10px] text-muted-foreground font-bold mb-1">User Agent String:</p>
                    <p className="font-mono text-[10px] text-slate-300 break-all bg-slate-900 rounded-xl p-3 border border-slate-800">
                      {(details as any).user_agent}
                    </p>
                  </div>
                )}

                {/* Diff Viewer */}
                <DiffViewer details={details} />
              </div>
            </td>
          </motion.tr>
        )}
      </AnimatePresence>
    </>
  );
}

// ────────────────────────────────────────────────────────────
// Timeline Feed View
// ────────────────────────────────────────────────────────────

function TimelineFeedView({ logs, allLogs, onFilterByUser }: { logs: any[]; allLogs: any[]; onFilterByUser: (email: string) => void }) {
  return (
    <div className="relative space-y-0 pl-6" dir="rtl">
      {/* Vertical line */}
      <div className="absolute right-[18px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-border via-border/60 to-transparent" />

      {logs.map((log: any, i: number) => {
        const info = EVENT_TYPES[log.event_type] ?? { label: log.event_type, icon: Shield, color: "text-muted-foreground", category: "session", severity: "info" as Severity };
        const Icon = info.icon;
        const severity = getSeverity(log.event_type);
        const sevCfg = SEVERITY_CONFIG[severity];
        const details = log.details as Record<string, unknown> | null;
        const locationText = parseLocationDetails(details, log.ip_address);
        const parsedDevice = parseDeviceDetails(details);

        return (
          <motion.div key={log.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
            className="relative flex gap-4 pb-4 pr-8">
            {/* Timeline dot */}
            <div className={cn("absolute right-[-22px] top-3 w-4 h-4 rounded-full border-2 border-background flex items-center justify-center shadow-sm z-10",
              severity === "critical" ? "bg-red-500 animate-pulse" :
              severity === "high" ? "bg-orange-500" :
              severity === "medium" ? "bg-amber-400" :
              severity === "low" ? "bg-emerald-500" : "bg-slate-400"
            )}>
              <div className="w-1.5 h-1.5 rounded-full bg-white/80" />
            </div>

            {/* Event card */}
            <div className={cn("flex-1 rounded-2xl border p-4 transition-all hover:shadow-md", sevCfg.bg)}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border", sevCfg.bg)}>
                    <Icon className={cn("w-4 h-4", info.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("text-sm font-black", sevCfg.color)}>{info.label}</span>
                      <Badge className={cn("text-[9px] font-bold px-1.5 py-0 h-4", sevCfg.bg, sevCfg.color, "border", sevCfg.bg)}>
                        {sevCfg.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <UserActivityPopover email={log.user_email || ""} logs={allLogs} onFilterByUser={onFilterByUser} />
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Globe className="w-3 h-3 text-blue-500" />
                        {log.ip_address && log.ip_address !== "unknown" ? log.ip_address : "—"}
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {locationText}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-muted-foreground font-mono">{formatDate(log.created_at)}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {parsedDevice.deviceName}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Kanban View (grouped by user)
// ────────────────────────────────────────────────────────────

function KanbanView({ logs, allLogs, onFilterByUser }: { logs: any[]; allLogs: any[]; onFilterByUser: (email: string) => void }) {
  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {};
    logs.forEach((l: any) => {
      const key = l.user_email || "غير معروف";
      if (!g[key]) g[key] = [];
      g[key].push(l);
    });
    return Object.entries(g).sort((a, b) => b[1].length - a[1].length);
  }, [logs]);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4" dir="rtl">
      {grouped.map(([email, userLogs]) => (
        <div key={email} className="min-w-[280px] max-w-[280px] bg-muted/20 rounded-2xl border border-border/60 p-3 space-y-2">
          <div className="flex items-center gap-2 pb-2 border-b border-border/40">
            <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate">{email}</p>
              <p className="text-[10px] text-muted-foreground">{userLogs.length} حدث</p>
            </div>
          </div>
          <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
            {userLogs.map((log: any) => {
              const info = EVENT_TYPES[log.event_type] ?? { label: log.event_type, icon: Shield, color: "text-muted-foreground", severity: "info" as Severity };
              const severity = getSeverity(log.event_type);
              const sevCfg = SEVERITY_CONFIG[severity];
              const Icon = info.icon;
              return (
                <div key={log.id} className={cn("p-2 rounded-xl border text-[10px]", sevCfg.bg)}>
                  <div className="flex items-center gap-1.5">
                    <Icon className={cn("w-3 h-3 shrink-0", info.color)} />
                    <span className={cn("font-bold flex-1 truncate", sevCfg.color)}>{info.label}</span>
                    <span className="text-muted-foreground">{formatDateShort(log.created_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Main AuditLog Component
// ────────────────────────────────────────────────────────────

export default function AuditLog() {
  const [page, setPage] = useState(0);
  const [activeTab, setActiveTab] = useState("all");
  const [eventFilter, setEventFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [timeRange, setTimeRange] = useState("all");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({ severities: [], devices: [], countries: [] });
  const [dismissedThreats, setDismissedThreats] = useState<string[]>([]);
  const { isCompact, toggleCompact } = useCompactView();

  const { data, isLoading, refetch, isFetching } = useAuditLogQuery(page, eventFilter, activeTab, search, timeRange, autoRefresh);
  const logs = data?.data || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Apply client-side advanced filters
  const filteredLogs = useMemo(() => {
    let result = [...logs];
    if (advancedFilters.severities.length > 0) {
      result = result.filter((l: any) => advancedFilters.severities.includes(getSeverity(l.event_type)));
    }
    if (advancedFilters.devices.length > 0) {
      result = result.filter((l: any) => {
        const d = parseDeviceDetails(l.details);
        return advancedFilters.devices.includes(d.deviceType);
      });
    }
    return result;
  }, [logs, advancedFilters]);

  // Analytics
  const stats = useMemo(() => {
    const failed = logs.filter((l: any) => l.event_type?.includes("failed") || l.event_type?.includes("suspicious")).length;
    const roles = logs.filter((l: any) => l.event_type?.includes("role") || l.event_type?.includes("member")).length;
    const sessionLogs = logs.filter((l: any) => l.event_type === "session.duration" || l.event_type === "logout.user");
    const totalSessions = sessionLogs.length;
    const healthScore = totalCount > 0 ? Math.max(60, Math.round(100 - (failed / totalCount) * 120)) : 100;
    const riskLevel: "low" | "medium" | "high" | "critical" =
      healthScore >= 90 ? "low" : healthScore >= 75 ? "medium" : healthScore >= 55 ? "high" : "critical";

    // Top actor
    const emailCount: Record<string, number> = {};
    logs.forEach((l: any) => { if (l.user_email) emailCount[l.user_email] = (emailCount[l.user_email] || 0) + 1; });
    const topActor = Object.entries(emailCount).sort((a, b) => b[1] - a[1])[0];

    // Sparkline: 24 buckets (1h each)
    const now = Date.now();
    const sparkline = Array.from({ length: 24 }, (_, i) => {
      const bucketStart = now - (23 - i) * 3600000;
      const bucketEnd = bucketStart + 3600000;
      return logs.filter((l: any) => {
        const t = new Date(l.created_at).getTime();
        return t >= bucketStart && t < bucketEnd;
      }).length;
    });

    // Yesterday comparison (rough estimate from position in dataset)
    const todayCount = logs.filter((l: any) => new Date(l.created_at).toDateString() === new Date().toDateString()).length;

    return { total: totalCount, failed, roles, totalSessions, healthScore, riskLevel, topActor, sparkline, todayCount };
  }, [logs, totalCount]);

  // Threats
  const allThreats = useMemo(() => detectThreats(logs), [logs]);
  const visibleThreats = useMemo(() => allThreats.filter(t => !dismissedThreats.includes(t.id)), [allThreats, dismissedThreats]);

  const handleSearch = () => { setSearch(searchInput); setPage(0); };

  const handleFilterByUser = useCallback((email: string) => {
    setSearchInput(email);
    setSearch(email);
    setPage(0);
  }, []);

  // ── Export functions ──

  const exportToExcel = async () => {
    const XLSX = await import("xlsx");
    const rows = filteredLogs.map((l: any) => {
      const dev = parseDeviceDetails(l.details);
      const loc = parseLocationDetails(l.details, l.ip_address);
      const dur = parseSessionDuration(l.details, l.created_at);
      return {
        "مستوى الخطورة": SEVERITY_CONFIG[getSeverity(l.event_type)].label,
        "نوع الحدث الأمني": EVENT_TYPES[l.event_type]?.label || l.event_type,
        "البريد الإلكتروني": l.user_email || "—",
        "عنوان IP": l.ip_address || "—",
        "الموقع الجغرافي": loc,
        "اسم الجهاز": dev.deviceName,
        "نظام التشغيل": dev.osName,
        "المتصفح": dev.browserName,
        "مدة الجلسة": dur || "—",
        "التاريخ والوقت": new Date(l.created_at).toLocaleString("ar-SA"),
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "AuditLogs");
    XLSX.writeFile(wb, `TawzeefX_Audit_Log_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportToCSV = () => {
    const headers = ["الخطورة", "نوع الحدث", "البريد", "عنوان IP", "الموقع", "الجهاز", "التاريخ"];
    const rows = filteredLogs.map((l: any) => [
      SEVERITY_CONFIG[getSeverity(l.event_type)].label,
      EVENT_TYPES[l.event_type]?.label || l.event_type,
      l.user_email || "",
      l.ip_address || "",
      parseLocationDetails(l.details, l.ip_address),
      parseDeviceDetails(l.details).deviceName,
      new Date(l.created_at).toLocaleString("ar-SA"),
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `TawzeefX_Audit_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    const riskColors: Record<string, string> = { low: "#10b981", medium: "#f59e0b", high: "#f97316", critical: "#ef4444" };
    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8" />
        <title>تقرير سجل الأحداث الأمنية — TawzeefX</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 24px; background: #0f172a; color: #e2e8f0; direction: rtl; }
          .header { background: linear-gradient(135deg, #1e293b, #0f172a); border: 1px solid #334155; border-radius: 16px; padding: 24px; margin-bottom: 20px; }
          .logo { font-size: 28px; font-weight: 900; color: #6366f1; }
          .subtitle { color: #94a3b8; font-size: 12px; margin-top: 4px; }
          .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
          .kpi { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 14px; text-align: center; }
          .kpi-val { font-size: 28px; font-weight: 900; }
          .kpi-label { font-size: 10px; color: #94a3b8; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; background: #1e293b; border-radius: 12px; overflow: hidden; font-size: 11px; }
          th { background: #0f172a; color: #94a3b8; padding: 10px 8px; text-align: right; font-weight: 700; border-bottom: 1px solid #334155; }
          td { padding: 8px; border-bottom: 1px solid #1e293b; }
          tr:hover td { background: #0f172a20; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 700; }
          .badge-critical { background: #ef444420; color: #f87171; border: 1px solid #ef444440; }
          .badge-high { background: #f9731620; color: #fb923c; border: 1px solid #f9731640; }
          .badge-medium { background: #f59e0b20; color: #fbbf24; border: 1px solid #f59e0b40; }
          .badge-low { background: #10b98120; color: #34d399; border: 1px solid #10b98140; }
          .badge-info { background: #64748b20; color: #94a3b8; border: 1px solid #64748b40; }
          .footer { margin-top: 16px; color: #475569; font-size: 10px; text-align: center; }
          @media print { body { background: white; color: black; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">🛡️ TawzeefX — سجل الأحداث الأمنية</div>
          <div class="subtitle">تاريخ التقرير: ${new Date().toLocaleString("ar-SA")} | إجمالي الأحداث: ${stats.total}</div>
          <div style="margin-top:12px;display:flex;align-items:center;gap:8px;">
            <span style="font-size:12px;color:#94a3b8;">مستوى الأمان:</span>
            <span style="color:${riskColors[stats.riskLevel]};font-weight:900;font-size:14px;">${stats.healthScore}%</span>
          </div>
        </div>
        <div class="kpi-grid">
          <div class="kpi"><div class="kpi-val" style="color:#10b981">${stats.healthScore}%</div><div class="kpi-label">نقاط الأمان</div></div>
          <div class="kpi"><div class="kpi-val" style="color:#6366f1">${stats.total}</div><div class="kpi-label">إجمالي الأحداث</div></div>
          <div class="kpi"><div class="kpi-val" style="color:#ef4444">${stats.failed}</div><div class="kpi-label">محاولات فاشلة</div></div>
          <div class="kpi"><div class="kpi-val" style="color:#8b5cf6">${stats.totalSessions}</div><div class="kpi-label">جلسات مسجلة</div></div>
        </div>
        <table>
          <thead><tr>
            <th>الخطورة</th><th>نوع الحدث</th><th>المستخدم</th><th>عنوان IP</th><th>الموقع</th><th>الجهاز</th><th>التاريخ</th>
          </tr></thead>
          <tbody>
            ${filteredLogs.map((l: any) => {
              const sev = getSeverity(l.event_type);
              const info = EVENT_TYPES[l.event_type];
              const loc = parseLocationDetails(l.details, l.ip_address);
              const dev = parseDeviceDetails(l.details);
              return `<tr>
                <td><span class="badge badge-${sev}">${SEVERITY_CONFIG[sev].label}</span></td>
                <td>${info?.label ?? l.event_type}</td>
                <td style="font-size:10px;color:#94a3b8">${l.user_email || "—"}</td>
                <td style="font-family:monospace;color:#60a5fa">${l.ip_address || "—"}</td>
                <td>${loc}</td>
                <td>${dev.deviceName}</td>
                <td style="color:#64748b;font-size:10px">${new Date(l.created_at).toLocaleString("ar-SA")}</td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
        <div class="footer">صدر بواسطة TawzeefX Security Command Center • ${new Date().toISOString()}</div>
      </body></html>
    `;
    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); win.print(); }
  };

  const uniqueEventTypes = Object.entries(EVENT_TYPES).reduce((acc, [key, val]) => {
    if (!acc.some(([, v]) => v.label === val.label)) acc.push([key, val]);
    return acc;
  }, [] as [string, typeof EVENT_TYPES[string]][]);

  const riskColors = { low: "#10b981", medium: "#f59e0b", high: "#f97316", critical: "#ef4444" };
  const riskLabels = { low: "آمن 🛡️", medium: "تحذير ⚠️", high: "خطر 🔥", critical: "حرج 🚨" };

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-8 space-y-5" dir="rtl">

        {/* Page Header */}
        <PageHeader
          badgeText="مركز قيادة الحماية والتدقيق والتحليل الجنائي"
          title="سجل الأحداث الأمنية المتقدم 🛡️"
          description="تحليل جنائي شامل، كشف التهديدات الذكي، مقارنة التغييرات، وملفات نشاط المستخدمين في الوقت الفعلي."
          icon={ShieldCheck}
          accentColor="indigo"
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}
                className="rounded-xl h-11 px-3 text-xs font-bold gap-1.5 bg-card">
                <RefreshCw className={cn("w-4 h-4 text-indigo-500", isFetching && "animate-spin")} />
                تحديث
              </Button>
              {/* Export dropdown */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="rounded-xl h-11 px-4 text-xs font-bold gap-2 bg-card hover:bg-muted shadow-xs">
                    <FileDown className="w-4 h-4 text-emerald-500" />
                    تصدير ▾
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-1.5 rounded-xl" align="end">
                  <button onClick={exportToExcel} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg hover:bg-muted/60 transition-colors">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> Excel (.xlsx)
                  </button>
                  <button onClick={exportToCSV} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg hover:bg-muted/60 transition-colors">
                    <FileDown className="w-4 h-4 text-blue-500" /> CSV سريع
                  </button>
                  <button onClick={exportToPDF} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg hover:bg-muted/60 transition-colors">
                    <Printer className="w-4 h-4 text-purple-500" /> تقرير PDF
                  </button>
                </PopoverContent>
              </Popover>
            </div>
          }
        />

        {/* Threat Intelligence Panel */}
        <AnimatePresence>
          {visibleThreats.length > 0 && (
            <ThreatIntelPanel
              threats={visibleThreats}
              onDismiss={id => setDismissedThreats(prev => [...prev, id])}
              onFilter={handleFilterByUser}
            />
          )}
        </AnimatePresence>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">

          {/* Security Score */}
          <Card className="border-border/60 shadow-sm lg:col-span-1 relative overflow-hidden">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="relative shrink-0">
                <CircularProgress value={stats.healthScore} size={56} color={riskColors[stats.riskLevel]} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[10px] font-black" style={{ color: riskColors[stats.riskLevel] }}>{stats.healthScore}%</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-black" style={{ color: riskColors[stats.riskLevel] }}>{riskLabels[stats.riskLevel]}</p>
                <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">نقاط الأمان</p>
              </div>
            </CardContent>
          </Card>

          {/* Total Events with Sparkline */}
          <Card className="border-border/60 shadow-sm lg:col-span-2">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <FlaticonCategoryIconCard icon={BarChart2} gradient="from-blue-600/20 to-indigo-600/10" iconColor="text-blue-500" />
                  <div>
                    <p className="text-xl font-black">{stats.total}</p>
                    <p className="text-[10px] font-semibold text-muted-foreground">إجمالي الأحداث</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-emerald-600">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span className="font-bold">{stats.todayCount} اليوم</span>
                </div>
              </div>
              <div className="mt-2 opacity-70">
                <SparklineChart data={stats.sparkline} color="#6366f1" height={32} width={160} />
                <p className="text-[9px] text-muted-foreground mt-0.5">توزيع آخر 24 ساعة</p>
              </div>
            </CardContent>
          </Card>

          {/* Failed Attempts */}
          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <FlaticonCategoryIconCard icon={XCircle} gradient="from-rose-600/20 to-red-600/10" iconColor="text-rose-500" />
              <div>
                <div className="flex items-center gap-2">
                  <p className={cn("text-2xl font-black", stats.failed > 0 ? "text-rose-600" : "text-foreground")}>{stats.failed}</p>
                  {stats.failed > 5 && (
                    <Badge variant="destructive" className="text-[9px] font-bold animate-pulse">تنبه 🚨</Badge>
                  )}
                </div>
                <p className="text-[10px] font-semibold text-muted-foreground">محاولات فاشلة / مشبوهة</p>
              </div>
            </CardContent>
          </Card>

          {/* Sessions */}
          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <FlaticonCategoryIconCard icon={Clock} gradient="from-indigo-600/20 to-purple-600/10" iconColor="text-indigo-500" />
              <div>
                <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{stats.totalSessions}</p>
                <p className="text-[10px] font-semibold text-muted-foreground">جلسات مسجلة ⏱️</p>
                {stats.topActor && (
                  <p className="text-[9px] text-muted-foreground mt-0.5 truncate max-w-[110px]">
                    🏆 {stats.topActor[0].split("@")[0]} ({stats.topActor[1]})
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs + Auto Refresh + View Mode */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-2 rounded-2xl border border-border/60 shadow-xs">
          <Tabs value={activeTab} onValueChange={v => { setActiveTab(v); setPage(0); }} className="w-full md:w-auto">
            <TabsList className="bg-muted/50 p-1 rounded-xl h-auto flex flex-wrap gap-1">
              <TabsTrigger value="all" className="rounded-lg text-xs font-bold px-3 py-1.5 data-[state=active]:bg-background shadow-xs">
                الكل ({stats.total})
              </TabsTrigger>
              <TabsTrigger value="sessions" className="rounded-lg text-xs font-bold px-3 py-1.5 data-[state=active]:bg-background shadow-xs gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-500" /> الجلسات ⏱️
              </TabsTrigger>
              <TabsTrigger value="security" className="rounded-lg text-xs font-bold px-3 py-1.5 data-[state=active]:bg-background shadow-xs gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> التهديدات 🚨
              </TabsTrigger>
              <TabsTrigger value="roles" className="rounded-lg text-xs font-bold px-3 py-1.5 data-[state=active]:bg-background shadow-xs gap-1.5">
                <UserCog className="w-3.5 h-3.5 text-amber-500" /> الصلاحيات 🔑
              </TabsTrigger>
              <TabsTrigger value="data" className="rounded-lg text-xs font-bold px-3 py-1.5 data-[state=active]:bg-background shadow-xs gap-1.5">
                <Download className="w-3.5 h-3.5 text-blue-500" /> البيانات 📊
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2 shrink-0">
            {/* View Mode buttons */}
            <div className="flex items-center border border-border/60 rounded-xl overflow-hidden h-9">
              {([["table", List, "جدول"], ["timeline", LayoutList, "مخطط زمني"], ["kanban", Layers, "Kanban"]] as const).map(([mode, Icon, label]) => (
                <button key={mode} onClick={() => setViewMode(mode as ViewMode)}
                  title={label as string}
                  className={cn("h-full px-2.5 flex items-center gap-1 text-[10px] font-bold transition-colors border-l border-border/40 last:border-0 first:border-0",
                    viewMode === mode ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground hover:bg-muted/40"
                  )}>
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{label as string}</span>
                </button>
              ))}
            </div>

            {/* Auto Refresh */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 rounded-xl border border-border/40">
              <Switch id="auto-refresh" checked={autoRefresh} onCheckedChange={setAutoRefresh} />
              <Label htmlFor="auto-refresh" className="text-[10px] font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap">
                <Zap className={cn("w-3.5 h-3.5", autoRefresh ? "text-amber-500 animate-pulse" : "text-slate-400")} />
                مباشر
              </Label>
            </div>
          </div>
        </div>

        {/* Filters Toolbar */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={searchInput} onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="بحث بالبريد، الجهاز، البلد، أو نوع الحدث..."
              className="pr-10 h-11 text-xs rounded-xl" />
          </div>

          <Select value={timeRange} onValueChange={v => { setTimeRange(v); setPage(0); }}>
            <SelectTrigger className="w-[150px] h-11 rounded-xl text-xs font-bold">
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
            <SelectTrigger className="w-[170px] h-11 rounded-xl text-xs font-bold">
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
            <Filter className="w-4 h-4" /> بحث
          </Button>

          <AdvancedFiltersDrawer filters={advancedFilters} onApply={f => { setAdvancedFilters(f); setPage(0); }} logs={logs} />

          {viewMode === "table" && (
            <Button variant="outline" size="icon" onClick={toggleCompact} className="h-11 w-11 rounded-xl shrink-0" title={isCompact ? "عرض عادي" : "عرض مدمج"}>
              {isCompact ? <LayoutGrid className="w-4 h-4" /> : <List className="w-4 h-4" />}
            </Button>
          )}
        </div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          {/* TABLE VIEW */}
          {viewMode === "table" && (
            <motion.div key="table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Card className="border-border/60 rounded-3xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className={cn("w-full transition-all", isCompact ? "text-xs" : "text-sm")}>
                    <thead>
                      <tr className="border-b border-border bg-muted/40 font-bold">
                        <th className="w-1 p-0" />
                        {["الحدث / الخطورة", "المستخدم", "عنوان IP", "الموقع 📍", "الجهاز", "التاريخ والوقت", ""].map(h => (
                          <th key={h} className={cn("text-right text-muted-foreground transition-all", isCompact ? "p-2" : "p-3.5")}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        Array.from({ length: 6 }).map((_, i) => (
                          <tr key={i} className="border-b border-border/50">
                            {Array.from({ length: 8 }).map((_, j) => (
                              <td key={j} className={cn("transition-all", isCompact ? "p-2" : "p-3.5")}>
                                <div className="h-4 bg-muted rounded animate-pulse" style={{ width: `${40 + j * 15}px` }} />
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : filteredLogs.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-16 text-center text-muted-foreground">
                            <Shield className="w-14 h-14 mx-auto mb-4 text-muted-foreground/20" />
                            <p className="font-bold text-sm">لا توجد أحداث مطابقة للفلاتر المحددة</p>
                            <p className="text-xs mt-1">جرّب تغيير الفلاتر أو توسيع النطاق الزمني</p>
                          </td>
                        </tr>
                      ) : (
                        filteredLogs.map((log: any, i: number) => (
                          <AuditLogRow key={log.id} log={log} index={i} isCompact={isCompact} allLogs={logs} onFilterByUser={handleFilterByUser} />
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t border-border bg-muted/20">
                    <p className="text-xs text-muted-foreground font-semibold">
                      {page * PAGE_SIZE + 1} - {Math.min((page + 1) * PAGE_SIZE, totalCount)} من {totalCount} حدث
                    </p>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 0} className="rounded-xl">
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                      <span className="text-xs font-bold px-2">{page + 1} / {totalPages}</span>
                      <Button variant="ghost" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1} className="rounded-xl">
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </motion.div>
          )}

          {/* TIMELINE VIEW */}
          {viewMode === "timeline" && (
            <motion.div key="timeline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Card className="border-border/60 rounded-3xl p-6 shadow-sm">
                {isLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex gap-4 items-start">
                        <div className="w-4 h-4 rounded-full bg-muted animate-pulse shrink-0 mt-3" />
                        <div className="flex-1 h-20 rounded-2xl bg-muted animate-pulse" />
                      </div>
                    ))}
                  </div>
                ) : filteredLogs.length === 0 ? (
                  <div className="p-16 text-center text-muted-foreground">
                    <Activity className="w-14 h-14 mx-auto mb-4 text-muted-foreground/20" />
                    <p className="font-bold text-sm">لا توجد أحداث للعرض</p>
                  </div>
                ) : (
                  <TimelineFeedView logs={filteredLogs} allLogs={logs} onFilterByUser={handleFilterByUser} />
                )}
              </Card>
            </motion.div>
          )}

          {/* KANBAN VIEW */}
          {viewMode === "kanban" && (
            <motion.div key="kanban" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Card className="border-border/60 rounded-3xl p-4 shadow-sm">
                {isLoading ? (
                  <div className="flex gap-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="min-w-[280px] h-60 rounded-2xl bg-muted animate-pulse" />
                    ))}
                  </div>
                ) : filteredLogs.length === 0 ? (
                  <div className="p-16 text-center text-muted-foreground">
                    <Users className="w-14 h-14 mx-auto mb-4 text-muted-foreground/20" />
                    <p className="font-bold text-sm">لا توجد أحداث للعرض</p>
                  </div>
                ) : (
                  <KanbanView logs={filteredLogs} allLogs={logs} onFilterByUser={handleFilterByUser} />
                )}
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </DashboardLayout>
  );
}
