import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Bell,
  UserPlus,
  Briefcase,
  Calendar,
  Trash2,
  BellOff,
  FileText,
  Send,
  ArrowLeftRight,
  XCircle,
  Eye,
  EyeOff,
  MailOpen,
  Search,
  SlidersHorizontal,
  RefreshCw,
  ClipboardList,
  Clock,
  Volume2,
  VolumeX,
  Download,
  Settings2,
  Sparkles,
  ShieldAlert,
  Flame,
  Star,
  ExternalLink,
} from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/useJobs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { AnimatedDashboardBackground } from "@/components/AnimatedBackground";
import {
  isSoundNotificationEnabled,
  setSoundNotificationEnabled,
  playNotificationTone,
  getNotificationPriority,
  getNotificationDestination,
} from "@/lib/notificationDispatcher";
import NotificationPreferencesDialog from "@/components/notifications/NotificationPreferencesDialog";

const typeIcons: Record<string, typeof Bell> = {
  candidate: UserPlus,
  job: Briefcase,
  interview: Calendar,
  interview_reminder: Clock,
  task: ClipboardList,
  application: FileText,
  offer: Send,
  stage_change: ArrowLeftRight,
  rejection: XCircle,
  ai_eval: Sparkles,
  security: ShieldAlert,
  system: Bell,
};

const typeStyles: Record<string, string> = {
  candidate: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  job: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  interview: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  interview_reminder: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  task: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  application: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  offer: "bg-emerald-600/10 text-emerald-700 border-emerald-600/20",
  stage_change: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  rejection: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  ai_eval: "bg-purple-600/10 text-purple-600 border-purple-600/20",
  security: "bg-rose-600/10 text-rose-600 border-rose-600/20",
  system: "bg-muted text-muted-foreground border-border/40",
};

const typeLabels: Record<string, string> = {
  all: "الكل",
  candidate: "المرشحين",
  job: "الوظائف",
  interview: "المقابلات",
  interview_reminder: "تذكير مقابلة",
  task: "المهام",
  application: "الطلبات",
  offer: "العروض",
  stage_change: "تغيير المراحل",
  rejection: "الرفض",
  ai_eval: "الذكاء الاصطناعي",
  security: "الأمان",
  system: "النظام",
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.03 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function Notifications() {
  const { user } = useAuth();
  const { data: notifications, isLoading } = useNotifications();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [openClearAllDialog, setOpenClearAllDialog] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => isSoundNotificationEnabled());

  useEffect(() => {
    if (!user?.id || typeof supabase.channel !== "function") return;

    const channel = supabase
      .channel(`notifications-live:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
          queryClient.invalidateQueries({ queryKey: ["unread-notif-count"] });
        },
      )
      .subscribe();

    return () => {
      if (typeof supabase.removeChannel === "function") {
        supabase.removeChannel(channel);
      }
    };
  }, [user?.id, queryClient]);

  const allNotifications = notifications || [];
  const unreadCount = allNotifications.filter((n) => !n.read).length;
  const totalCount = allNotifications.length;

  // Stats
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = allNotifications.filter((n) => new Date(n.created_at) >= today).length;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekCount = allNotifications.filter((n) => new Date(n.created_at) >= weekAgo).length;
    const urgentCount = allNotifications.filter(
      (n) => getNotificationPriority(n.type, n.title) === "urgent"
    ).length;
    return { today: todayCount, week: weekCount, unread: unreadCount, total: totalCount, urgent: urgentCount };
  }, [allNotifications, unreadCount, totalCount]);

  const filtered = useMemo(() => {
    let result = allNotifications;
    if (filter !== "all") result = result.filter((n) => n.type === filter);
    if (priorityFilter !== "all") {
      result = result.filter((n) => getNotificationPriority(n.type, n.title) === priorityFilter);
    }
    if (showUnreadOnly) result = result.filter((n) => !n.read);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (n) => n.title.toLowerCase().includes(q) || (n.description || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [allNotifications, filter, priorityFilter, showUnreadOnly, search]);

  // Group by date
  const grouped = useMemo(() => {
    const groups: Record<string, typeof filtered> = {};
    filtered.forEach((n) => {
      const d = new Date(n.created_at);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      let label: string;
      if (d.toDateString() === today.toDateString()) label = "اليوم";
      else if (d.toDateString() === yesterday.toDateString()) label = "أمس";
      else label = d.toLocaleDateString("ar-SA", { day: "numeric", month: "long" });
      if (!groups[label]) groups[label] = [];
      groups[label].push(n);
    });
    return Object.entries(groups);
  }, [filtered]);

  const invalidateNotificationQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    queryClient.invalidateQueries({ queryKey: ["unread-notif-count"] });
  };

  const markAllRead = async () => {
    let query = supabase.from("notifications").update({ read: true }).eq("read", false);
    if (user?.id) {
      query = query.eq("user_id", user.id);
    }
    const { error } = await query;
    if (error) {
      toast({ title: "تعذر تحديث الإشعارات", description: error.message, variant: "destructive" });
      return;
    }
    invalidateNotificationQueries();
    toast({ title: "تم تحديد جميع الإشعارات كمقروءة ✅" });
  };

  const markRead = async (id: string) => {
    let query = supabase.from("notifications").update({ read: true }).eq("id", id);
    if (user?.id) {
      query = query.eq("user_id", user.id);
    }
    const { error } = await query;
    if (error) {
      toast({ title: "تعذر تحديث الإشعار", description: error.message, variant: "destructive" });
      return;
    }
    invalidateNotificationQueries();
  };

  const deleteNotification = async (id: string) => {
    let query = supabase.from("notifications").delete().eq("id", id);
    if (user?.id) {
      query = query.eq("user_id", user.id);
    }
    const { error } = await query;
    if (error) {
      toast({ title: "تعذر حذف الإشعار", description: error.message, variant: "destructive" });
      return;
    }
    invalidateNotificationQueries();
    toast({ title: "تم حذف الإشعار 🗑️" });
  };

  const handleClearAllConfirm = async () => {
    let query = supabase.from("notifications").delete().neq("id", "");
    if (user?.id) {
      query = query.eq("user_id", user.id);
    }
    const { error } = await query;
    if (error) {
      toast({ title: "تعذر مسح الإشعارات", description: error.message, variant: "destructive" });
      return;
    }
    invalidateNotificationQueries();
    toast({ title: "تم مسح جميع الإشعارات 🗑️" });
    setOpenClearAllDialog(false);
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setSoundNotificationEnabled(next);
    if (next) playNotificationTone("normal");
    toast({
      title: next ? "تم تفعيل التنبيه الصوتي 🔊" : "تم كتم التنبيه الصوتي 🔇",
    });
  };

  const exportNotificationsCsv = () => {
    if (!filtered.length) {
      toast({ title: "لا توجد إشعارات للتصدير", variant: "destructive" });
      return;
    }
    const headers = ["المعرف", "النوع", "الأولوية", "العنوان", "الوصف", "الحالة", "التاريخ"];
    const rows = filtered.map((n) => [
      n.id,
      typeLabels[n.type] || n.type,
      getNotificationPriority(n.type, n.title),
      `"${(n.title || "").replace(/"/g, '""')}"`,
      `"${(n.description || "").replace(/"/g, '""')}"`,
      n.read ? "مقروء" : "غير مقروء",
      new Date(n.created_at).toLocaleString("ar-SA"),
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tawzeef-x-notifications-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "تم تصدير سجل الإشعارات بنجاح (CSV) 📥" });
  };

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "الآن";
    if (mins < 60) return `منذ ${mins} د`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `منذ ${hours} س`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `منذ ${days} يوم`;
    return new Date(dateStr).toLocaleDateString("ar-SA", { day: "numeric", month: "short" });
  };

  const availableTypes = useMemo(() => {
    const types = new Set(allNotifications.map((n) => n.type));
    return ["all", ...Array.from(types)];
  }, [allNotifications]);

  return (
    <DashboardLayout>
      <AnimatedDashboardBackground />
      <div className="p-4 lg:p-8 space-y-6 relative z-10" dir="rtl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
              <Bell className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
                مركز الإشعارات والتنبيهات المباشرة 🔔
                {unreadCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="bg-destructive text-destructive-foreground text-xs rounded-full px-2.5 py-0.5 font-bold shadow-sm"
                  >
                    {unreadCount} جديد
                  </motion.span>
                )}
              </h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                تتبع التحديثات، تذكيرات المقابلات، وحركات التوظيف لحظياً
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSound}
              className="gap-1.5 rounded-xl h-9 text-xs"
              title={soundEnabled ? "كتم الصوت" : "تشغيل الصوت"}
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-4 h-4 text-emerald-600" />
                  <span>الصوت: مفعّل</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-muted-foreground" />
                  <span>الصوت: مكتوم</span>
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPrefsOpen(true)}
              className="gap-1.5 rounded-xl h-9 text-xs"
            >
              <Settings2 className="w-3.5 h-3.5 text-primary" />
              <span>التفضيلات ⚙️</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={exportNotificationsCsv}
              className="gap-1.5 rounded-xl h-9 text-xs"
              title="تصدير السجل إلى ملف CSV"
            >
              <Download className="w-3.5 h-3.5 text-primary" />
              <span>تصدير CSV 📥</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={invalidateNotificationQueries}
              className="gap-1.5 rounded-xl h-9 text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>تحديث</span>
            </Button>

            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllRead}
                className="gap-1.5 rounded-xl h-9 text-xs bg-primary/5 hover:bg-primary/10 text-primary border-primary/20"
              >
                <MailOpen className="w-3.5 h-3.5" />
                <span>تحديد الكل كمقروء</span>
              </Button>
            )}

            {totalCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpenClearAllDialog(true)}
                className="text-destructive hover:text-destructive gap-1.5 rounded-xl h-9 text-xs border-destructive/20"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>مسح الكل</span>
              </Button>
            )}
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          {[
            {
              label: "اليوم",
              value: stats.today,
              icon: Bell,
              color: "text-primary",
              bg: "bg-primary/10",
              border: "border-primary/20",
              glow: "shadow-[0_0_12px_rgba(var(--primary),0.1)]",
            },
            {
              label: "هذا الأسبوع",
              value: stats.week,
              icon: Calendar,
              color: "text-warning",
              bg: "bg-warning/10",
              border: "border-warning/20",
              glow: "shadow-[0_0_12px_rgba(245,158,11,0.1)]",
            },
            {
              label: "غير مقروء",
              value: stats.unread,
              icon: EyeOff,
              color: "text-destructive",
              bg: "bg-destructive/10",
              border: "border-destructive/20",
              glow: "shadow-[0_0_12px_rgba(239,68,68,0.1)]",
            },
            {
              label: "الإجمالي",
              value: stats.total,
              icon: FileText,
              color: "text-foreground",
              bg: "bg-muted/30",
              border: "border-border/30",
              glow: "",
            },
          ].map((s, i) => (
            <motion.div key={i} variants={item}>
              <Card className="glass-card-premium relative overflow-hidden border border-border/30 bg-card/45 backdrop-blur-md rounded-2xl shadow-sm transition-all duration-300 group hover:scale-[1.02]">
                <div
                  className={cn(
                    "absolute top-0 right-0 w-16 h-16 rounded-full blur-2xl opacity-10 transition-transform duration-300 group-hover:scale-110",
                    s.color.replace("text-", "bg-")
                  )}
                />
                <CardContent className="p-4 relative z-10">
                  <div className="flex items-center justify-between">
                    <s.icon
                      className={cn(
                        "w-5 h-5 mb-2 transition-transform duration-300 group-hover:scale-110",
                        s.color
                      )}
                    />
                    {s.label === "غير مقروء" && s.value > 0 && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
                      </span>
                    )}
                  </div>
                  <p className={cn("text-2xl font-extrabold", s.color)}>{s.value}</p>
                  <p className="text-xs font-semibold text-muted-foreground mt-0.5">{s.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Search & Filters */}
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3.5 bg-card/40 p-4 rounded-2xl border border-border/40 backdrop-blur-md"
        >
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="ابحث في عنوان الإشعار أو الوصف أو اسم المرشح..."
                className="pr-10 bg-card/60 border border-border/40 backdrop-blur-md focus-visible:ring-primary/50 focus-visible:border-primary transition-all duration-300 rounded-xl"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button
              variant={showUnreadOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setShowUnreadOnly(!showUnreadOnly)}
              className="gap-1.5 shrink-0 rounded-xl transition-all duration-300 shadow-sm border-border/40 hover:bg-primary/5 hover:text-primary h-10 px-4"
            >
              {showUnreadOnly ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              {showUnreadOnly ? "عرض الكل" : "غير المقروء فقط"}
            </Button>
          </div>

          {/* Priority Quick Filter */}
          <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-border/30">
            <span className="text-xs font-bold text-muted-foreground flex items-center gap-1 shrink-0">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              الأولوية:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: "all", label: "كافة الأولويات" },
                { id: "urgent", label: "عاجل 🔥", style: "border-rose-500/30 text-rose-600" },
                { id: "high", label: "هام ⭐", style: "border-amber-500/30 text-amber-600" },
                { id: "normal", label: "عادي 💬", style: "border-blue-500/30 text-blue-600" },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPriorityFilter(p.id)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-bold border transition-all shadow-2xs",
                    priorityFilter === p.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card/60 border-border/40 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category Filter */}
          {availableTypes.length > 1 && (
            <div className="flex flex-wrap gap-2 items-center pt-1 border-t border-border/30">
              <span className="text-xs font-bold text-muted-foreground flex items-center gap-1 shrink-0">
                <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                الفئة:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {availableTypes.map((type) => {
                  const count =
                    type === "all"
                      ? totalCount
                      : allNotifications.filter((n) => n.type === type).length;
                  return (
                    <button
                      key={type}
                      onClick={() => setFilter(type)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 shadow-sm",
                        filter === type
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card/45 border-border/30 text-muted-foreground hover:border-primary/30 hover:text-foreground hover:bg-primary/5"
                      )}
                    >
                      {typeLabels[type] || type}
                      <span
                        className={cn(
                          "text-[10px] font-bold rounded-full px-1.5 py-0.5",
                          filter === type
                            ? "bg-primary-foreground/20 text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>

        {/* Notification List */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-card rounded-xl p-4 border border-border/50 animate-pulse flex items-start gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={BellOff}
            title="لا توجد إشعارات مطابقة"
            description={
              showUnreadOnly || filter !== "all" || priorityFilter !== "all" || search
                ? "لا توجد نتائج مطابقة لخيارات الفرز الحالية. جرب إعادة تعيين الفلاتر أو البحث."
                : "ستظهر التنبيهات والتحديثات الجديدة هنا تلقائياً عند قيام فريق العمل أو المرشحين بأي إجراء."
            }
            actionLabel={
              showUnreadOnly || filter !== "all" || priorityFilter !== "all" || search
                ? "عرض كافة الإشعارات"
                : undefined
            }
            onAction={
              showUnreadOnly || filter !== "all" || priorityFilter !== "all" || search
                ? () => {
                    setShowUnreadOnly(false);
                    setFilter("all");
                    setPriorityFilter("all");
                    setSearch("");
                  }
                : undefined
            }
          />
        ) : (
          <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
            {grouped.map(([dateLabel, items]) => (
              <div key={dateLabel}>
                <div className="flex items-center gap-3 mb-3">
                  <p className="text-xs font-bold text-muted-foreground">{dateLabel}</p>
                  <div className="flex-1 h-px bg-border/50" />
                  <Badge variant="outline" className="text-[10px] text-muted-foreground font-mono">
                    {items.length}
                  </Badge>
                </div>
                <div className="space-y-2.5">
                  <AnimatePresence>
                    {items.map((notif) => {
                      const Icon = typeIcons[notif.type] || Bell;
                      const priority = getNotificationPriority(notif.type, notif.title);
                      const destination = getNotificationDestination(notif.type);

                      const content = (
                        <motion.div
                          key={notif.id}
                          variants={item}
                          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                          className={cn(
                            "glass-card-premium rounded-2xl border p-4 flex items-start gap-3.5 transition-all cursor-pointer group relative overflow-hidden list-hover-highlight",
                            !notif.read
                              ? "border-primary/40 bg-primary/[0.03] shadow-xs"
                              : "border-border/40 bg-card/50 hover:border-border/70"
                          )}
                          onClick={() => markRead(notif.id)}
                        >
                          {/* Unread indicator */}
                          {!notif.read && (
                            <motion.div
                              initial={{ scaleY: 0 }}
                              animate={{ scaleY: 1 }}
                              className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-primary/60 rounded-l-full"
                            />
                          )}

                          {/* Icon */}
                          <div
                            className={cn(
                              "w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 shadow-xs",
                              typeStyles[notif.type] || "bg-muted"
                            )}
                          >
                            <Icon className="w-5 h-5" />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <h3
                                className={cn(
                                  "text-sm leading-relaxed",
                                  !notif.read
                                    ? "font-bold text-foreground"
                                    : "font-medium text-foreground/90"
                                )}
                              >
                                {notif.title}
                              </h3>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[11px] text-muted-foreground font-mono">
                                  {formatTime(notif.created_at)}
                                </span>
                              </div>
                            </div>

                            {notif.description && (
                              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                                {notif.description}
                              </p>
                            )}

                            <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[10px] font-bold border",
                                    typeStyles[notif.type] || "bg-muted text-muted-foreground"
                                  )}
                                >
                                  {typeLabels[notif.type] || notif.type}
                                </Badge>

                                {priority === "urgent" && (
                                  <Badge className="text-[10px] bg-rose-500/10 text-rose-600 border border-rose-500/20 font-bold hover:bg-rose-500/15">
                                    عاجل 🔥
                                  </Badge>
                                )}
                                {priority === "high" && (
                                  <Badge className="text-[10px] bg-amber-500/10 text-amber-600 border border-amber-500/20 font-bold hover:bg-amber-500/15">
                                    هام ⭐
                                  </Badge>
                                )}

                                {!notif.read && (
                                  <span className="flex items-center gap-1 text-[10px] text-primary font-bold">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                    جديد
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold text-primary group-hover:underline flex items-center gap-1 opacity-90 group-hover:opacity-100">
                                  <span>{destination.label}</span>
                                  <ExternalLink className="w-3 h-3" />
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Delete button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              deleteNotification(notif.id);
                            }}
                            className="text-muted-foreground/30 hover:text-destructive transition-all shrink-0 mt-1 opacity-0 group-hover:opacity-100 hover:scale-110 p-1"
                            title="حذف الإشعار"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </motion.div>
                      );

                      // Wrap with Link if navigable
                      if (destination.path) {
                        return (
                          <Link
                            key={notif.id}
                            to={destination.path}
                            onClick={() => markRead(notif.id)}
                            className="block"
                          >
                            {content}
                          </Link>
                        );
                      }
                      return content;
                    })}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* ─── Clear All Notifications Confirmation Modal ─── */}
        <AlertDialog open={openClearAllDialog} onOpenChange={setOpenClearAllDialog}>
          <AlertDialogContent
            className="sm:max-w-[460px] p-6 text-right rounded-2xl border border-border/80 shadow-2xl bg-card"
            dir="rtl"
          >
            <AlertDialogHeader className="space-y-3 text-right">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-600 flex items-center justify-center border border-red-500/20 shadow-sm">
                <Trash2 className="w-6 h-6 animate-pulse" />
              </div>
              <AlertDialogTitle className="text-lg font-bold text-foreground">
                مسح جميع الإشعارات
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
                هل أنت متأكد من رغبتك في مسح كافة الإشعارات في النظام نهائياً؟
                <span className="text-xs text-red-600 dark:text-red-400 font-medium block mt-3 bg-red-50 dark:bg-red-950/40 p-2.5 rounded-xl border border-red-200 dark:border-red-900/40">
                  ⚠️ لن تتمكن من استرجاع أي إشعار تم حذفه بعد تأكيد هذا الإجراء.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-6 flex flex-row gap-2 justify-end sm:space-x-0" dir="rtl">
              <AlertDialogCancel className="font-bold text-xs rounded-xl px-5 h-10 border-border hover:bg-muted">
                إلغاء
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleClearAllConfirm}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl px-5 h-10 gap-1.5 shadow-md shadow-red-600/20"
              >
                <Trash2 className="w-3.5 h-3.5" />
                تأكيد مسح الكل
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Notification Preferences Modal */}
        <NotificationPreferencesDialog open={prefsOpen} onOpenChange={setPrefsOpen} />
      </div>
    </DashboardLayout>
  );
}
