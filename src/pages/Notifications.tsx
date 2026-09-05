import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Bell, UserPlus, Briefcase, Calendar, CheckCircle, Trash2, BellOff, FileText, Send, ArrowLeftRight, XCircle, Eye, EyeOff, MailOpen, Search, SlidersHorizontal, RefreshCw } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { AnimatedDashboardBackground } from "@/components/AnimatedBackground";

const typeIcons: Record<string, typeof Bell> = {
  candidate: UserPlus,
  job: Briefcase,
  interview: Calendar,
  application: FileText,
  offer: Send,
  stage_change: ArrowLeftRight,
  rejection: XCircle,
  system: Bell,
};

const typeStyles: Record<string, string> = {
  candidate: "bg-primary/10 text-primary",
  job: "bg-success/10 text-success",
  interview: "bg-warning/10 text-warning",
  application: "bg-info/10 text-info",
  offer: "bg-accent text-accent-foreground",
  stage_change: "bg-primary/10 text-primary",
  rejection: "bg-destructive/10 text-destructive",
  system: "bg-muted text-muted-foreground",
};

const typeLabels: Record<string, string> = {
  all: "الكل",
  candidate: "المرشحين",
  job: "الوظائف",
  interview: "المقابلات",
  application: "الطلبات",
  offer: "العروض",
  stage_change: "تغيير المراحل",
  rejection: "الرفض",
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
  const { data: notifications, isLoading } = useNotifications();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [openClearAllDialog, setOpenClearAllDialog] = useState(false);

  const allNotifications = notifications || [];
  const unreadCount = allNotifications.filter(n => !n.read).length;
  const totalCount = allNotifications.length;

  // Stats
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = allNotifications.filter(n => new Date(n.created_at) >= today).length;
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const weekCount = allNotifications.filter(n => new Date(n.created_at) >= weekAgo).length;
    return { today: todayCount, week: weekCount, unread: unreadCount, total: totalCount };
  }, [allNotifications, unreadCount, totalCount]);

  const filtered = useMemo(() => {
    let result = allNotifications;
    if (filter !== "all") result = result.filter(n => n.type === filter);
    if (showUnreadOnly) result = result.filter(n => !n.read);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(n => n.title.toLowerCase().includes(q) || (n.description || "").toLowerCase().includes(q));
    }
    return result;
  }, [allNotifications, filter, showUnreadOnly, search]);

  // Group by date
  const grouped = useMemo(() => {
    const groups: Record<string, typeof filtered> = {};
    filtered.forEach(n => {
      const d = new Date(n.created_at);
      const today = new Date();
      const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
      let label: string;
      if (d.toDateString() === today.toDateString()) label = "اليوم";
      else if (d.toDateString() === yesterday.toDateString()) label = "أمس";
      else label = d.toLocaleDateString("ar-SA", { day: "numeric", month: "long" });
      if (!groups[label]) groups[label] = [];
      groups[label].push(n);
    });
    return Object.entries(groups);
  }, [filtered]);

  const markAllRead = async () => {
    await supabase.from("notifications").update({ read: true }).eq("read", false);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    toast({ title: "تم تحديد جميع الإشعارات كمقروءة ✅" });
  };

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const deleteNotification = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    toast({ title: "تم حذف الإشعار 🗑️" });
  };

  const handleClearAllConfirm = async () => {
    await supabase.from("notifications").delete().neq("id", "");
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    toast({ title: "تم مسح جميع الإشعارات 🗑️" });
    setOpenClearAllDialog(false);
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

  // Get navigation link for notification
  const getNotificationLink = (notif: typeof allNotifications[0]): string | null => {
    if (notif.type === "application" || notif.type === "candidate" || notif.type === "stage_change" || notif.type === "rejection") {
      return "/candidates";
    }
    if (notif.type === "interview") return "/interviews";
    if (notif.type === "offer") return "/offers";
    if (notif.type === "job") return "/jobs";
    return null;
  };

  const availableTypes = useMemo(() => {
    const types = new Set(allNotifications.map(n => n.type));
    return ["all", ...Array.from(types)];
  }, [allNotifications]);

  return (
    <DashboardLayout>
      <AnimatedDashboardBackground />
      <div className="p-4 lg:p-8 space-y-6 relative z-10" dir="rtl">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
              <Bell className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
                الإشعارات
                {unreadCount > 0 && (
                  <motion.span 
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="bg-destructive text-destructive-foreground text-xs rounded-full px-2.5 py-0.5 font-bold"
                  >
                    {unreadCount} جديد
                  </motion.span>
                )}
              </h1>
              <p className="text-muted-foreground text-sm mt-0.5">تتبع جميع التحديثات والأحداث</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["notifications"] })} className="gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />تحديث
            </Button>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllRead} className="gap-1.5">
                <MailOpen className="w-3.5 h-3.5" />تحديد الكل كمقروء
              </Button>
            )}
            {totalCount > 0 && (
              <Button variant="outline" size="sm" onClick={() => setOpenClearAllDialog(true)} className="text-destructive hover:text-destructive gap-1.5">
                <Trash2 className="w-3.5 h-3.5" />مسح الكل
              </Button>
            )}
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "اليوم", value: stats.today, icon: Bell, color: "text-primary", bg: "bg-primary/10", border: "border-primary/20", glow: "shadow-[0_0_12px_rgba(var(--primary),0.1)]" },
            { label: "هذا الأسبوع", value: stats.week, icon: Calendar, color: "text-warning", bg: "bg-warning/10", border: "border-warning/20", glow: "shadow-[0_0_12px_rgba(245,158,11,0.1)]" },
            { label: "غير مقروء", value: stats.unread, icon: EyeOff, color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/20", glow: "shadow-[0_0_12px_rgba(239,68,68,0.1)]" },
            { label: "الإجمالي", value: stats.total, icon: FileText, color: "text-foreground", bg: "bg-muted/30", border: "border-border/30", glow: "" },
          ].map((s, i) => (
            <motion.div key={i} variants={item}>
              <Card className="glass-card-premium relative overflow-hidden border border-border/30 bg-card/45 backdrop-blur-md rounded-2xl shadow-sm transition-all duration-300 group hover:scale-[1.02]">
                <div className={cn("absolute top-0 right-0 w-16 h-16 rounded-full blur-2xl opacity-10 transition-transform duration-300 group-hover:scale-110", s.color.replace("text-", "bg-"))} />
                <CardContent className="p-4 relative z-10">
                  <div className="flex items-center justify-between">
                    <s.icon className={cn("w-5 h-5 mb-2 transition-transform duration-300 group-hover:scale-110", s.color)} />
                    {s.label === "غير مقروء" && s.value > 0 && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
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
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="ابحث في الإشعارات..." 
                className="pr-10 bg-card/40 border border-border/30 backdrop-blur-md focus-visible:ring-primary/50 focus-visible:border-primary transition-all duration-300 rounded-xl" 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
              />
            </div>
            <Button 
              variant={showUnreadOnly ? "default" : "outline"} 
              size="sm" 
              onClick={() => setShowUnreadOnly(!showUnreadOnly)}
              className="gap-1.5 shrink-0 rounded-xl transition-all duration-300 shadow-sm border-border/40 hover:bg-primary/5 hover:text-primary"
            >
              {showUnreadOnly ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              {showUnreadOnly ? "عرض الكل" : "غير المقروء فقط"}
            </Button>
          </div>

          {availableTypes.length > 1 && (
            <div className="flex flex-wrap gap-2 items-center">
              <SlidersHorizontal className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex flex-wrap gap-1.5">
                {availableTypes.map(type => {
                  const count = type === "all" ? totalCount : allNotifications.filter(n => n.type === type).length;
                  return (
                    <button key={type} onClick={() => setFilter(type)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 shadow-sm",
                        filter === type
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card/45 border-border/30 text-muted-foreground hover:border-primary/30 hover:text-foreground hover:bg-primary/5"
                      )}>
                      {typeLabels[type] || type}
                      <span className={cn("text-[10px] font-bold rounded-full px-1.5 py-0.5", filter === type ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground")}>
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
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-card rounded-xl p-4 border border-border/50 animate-pulse flex items-start gap-3">
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
            title="لا توجد إشعارات"
            description={showUnreadOnly ? "جميع الإشعارات مقروءة! يمكنك التبديل لعرض الكل." : "ستظهر التنبيهات والتحديثات الجديدة هنا تلقائياً عند قيام فريق العمل أو المرشحين بأي إجراء."}
            actionLabel={showUnreadOnly ? "عرض جميع الإشعارات" : undefined}
            onAction={showUnreadOnly ? () => setShowUnreadOnly(false) : undefined}
          />

        ) : (
          <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
            {grouped.map(([dateLabel, items]) => (
              <div key={dateLabel}>
                <div className="flex items-center gap-3 mb-3">
                  <p className="text-xs font-bold text-muted-foreground">{dateLabel}</p>
                  <div className="flex-1 h-px bg-border/50" />
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">{items.length}</Badge>
                </div>
                <div className="space-y-2">
                  <AnimatePresence>
                    {items.map((notif, i) => {
                      const Icon = typeIcons[notif.type] || Bell;
                      const link = getNotificationLink(notif);
                      
                      const content = (
                        <motion.div key={notif.id}
                          variants={item}
                          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                          className={cn(
                            "glass-card-premium rounded-xl border p-4 flex items-start gap-3 transition-all cursor-pointer group relative overflow-hidden list-hover-highlight",
                            !notif.read 
                              ? "border-primary/30 bg-primary/[0.03] shadow-sm" 
                              : "border-border/30 bg-card/45 hover:border-border/50"
                          )}
                          onClick={() => markRead(notif.id)}>
                          {/* Unread indicator */}
                          {!notif.read && (
                            <motion.div 
                              initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
                              className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-primary/60 rounded-l-full" 
                            />
                          )}
                          
                          {/* Icon */}
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 shadow-sm", typeStyles[notif.type] || "bg-muted")}>
                            <Icon className="w-4.5 h-4.5" />
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className={cn("text-sm leading-relaxed", !notif.read ? "font-bold text-foreground" : "font-medium text-foreground/90")}>
                                {notif.title}
                              </h3>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[11px] text-muted-foreground font-semibold">{formatTime(notif.created_at)}</span>
                              </div>
                            </div>
                            {notif.description && (
                              <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2 font-medium">{notif.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className={cn("text-[10px] border-0 font-bold", typeStyles[notif.type] || "bg-muted text-muted-foreground")}>
                                {typeLabels[notif.type] || notif.type}
                              </Badge>
                              {!notif.read && (
                                <span className="flex items-center gap-1 text-[10px] text-primary font-bold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                  جديد
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Delete button */}
                          <button onClick={e => { e.stopPropagation(); e.preventDefault(); deleteNotification(notif.id); }}
                            className="text-muted-foreground/30 hover:text-destructive transition-all shrink-0 mt-1 opacity-0 group-hover:opacity-100 hover:scale-110">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </motion.div>
                      );

                      // Wrap with Link if navigable
                      if (link) {
                        return (
                          <Link key={notif.id} to={link} onClick={() => markRead(notif.id)} className="block">
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

        {/* ─── Clear All Notifications Confirmation Modal (Centered & Modern) ─── */}
        <AlertDialog open={openClearAllDialog} onOpenChange={setOpenClearAllDialog}>
          <AlertDialogContent className="sm:max-w-[460px] p-6 text-right rounded-2xl border border-border/80 shadow-2xl bg-card" dir="rtl">
            <AlertDialogHeader className="space-y-3 text-right">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-600 flex items-center justify-center border border-red-500/20 shadow-sm">
                <Trash2 className="w-6 h-6 animate-pulse" />
              </div>
              <AlertDialogTitle className="text-lg font-bold text-foreground" style={{ fontFamily: "'Cairo', sans-serif" }}>
                مسح جميع الإشعارات
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed" style={{ fontFamily: "'Cairo', sans-serif" }}>
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
      </div>
    </DashboardLayout>
  );
}
