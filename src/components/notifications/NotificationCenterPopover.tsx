import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  Check,
  CheckCheck,
  ExternalLink,
  Settings2,
  Trash2,
  Volume2,
  VolumeX,
  UserPlus,
  Briefcase,
  Calendar,
  Clock,
  ClipboardList,
  FileText,
  Send,
  ArrowLeftRight,
  XCircle,
  Sparkles,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/useJobs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import {
  isSoundNotificationEnabled,
  setSoundNotificationEnabled,
  getNotificationPriority,
  getNotificationDestination,
  playNotificationTone,
} from "@/lib/notificationDispatcher";
import NotificationPreferencesDialog from "./NotificationPreferencesDialog";

const typeIcons: Record<string, any> = {
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

const typeColors: Record<string, string> = {
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

interface NotificationCenterPopoverProps {
  className?: string;
}

export default function NotificationCenterPopover({ className }: NotificationCenterPopoverProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: notifications = [], isLoading } = useNotifications();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [soundActive, setSoundActive] = useState(() => isSoundNotificationEnabled());

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const displayedNotifications = useMemo(() => {
    let list = [...notifications];
    if (filter === "unread") {
      list = list.filter((n) => !n.read);
    }
    return list.slice(0, 7); // Show latest 7 in quick popover
  }, [notifications, filter]);

  const toggleSound = () => {
    const next = !soundActive;
    setSoundActive(next);
    setSoundNotificationEnabled(next);
    if (next) playNotificationTone("normal");
    toast({
      title: next ? "تم تفعيل التنبيه الصوتي 🔊" : "تم كتم التنبيه الصوتي 🔇",
      duration: 2500,
    });
  };

  const markAllRead = async () => {
    if (!user?.id) return;
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);

    if (error) {
      toast({ title: "تعذر تحديث الإشعارات", variant: "destructive" });
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    queryClient.invalidateQueries({ queryKey: ["unread-notif-count"] });
    toast({ title: "تم تحديد جميع الإشعارات كمقروءة ✅" });
  };

  const markSingleRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user?.id) return;

    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id)
      .eq("user_id", user.id);

    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    queryClient.invalidateQueries({ queryKey: ["unread-notif-count"] });
  };

  const handleNotificationClick = async (notif: (typeof notifications)[0]) => {
    if (!notif.read) {
      await markSingleRead(notif.id);
    }
    setPopoverOpen(false);
    const dest = getNotificationDestination(notif.type);
    navigate(dest.path);
  };

  const formatRelativeTime = (dateStr: string) => {
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

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "relative p-2 rounded-md3-full bg-md-surface-container hover:bg-md-surface-variant text-md-on-surface transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary",
              className
            )}
            title="الإشعارات والتنبيهات المباشرة"
            aria-label="مركز الإشعارات"
          >
            <Bell className="w-4 h-4 text-foreground/80 hover:text-foreground transition-colors" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-destructive text-[9px] font-black text-destructive-foreground shadow-sm animate-in zoom-in-50">
                {unreadCount > 99 ? "99+" : unreadCount}
                <span className="absolute inset-0 rounded-full bg-destructive animate-ping opacity-40 pointer-events-none" />
              </span>
            )}
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          sideOffset={8}
          className="w-[340px] sm:w-[380px] p-0 rounded-3xl border-border/80 shadow-2xl bg-card/95 backdrop-blur-xl z-50 overflow-hidden"
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3.5 border-b border-border/50 bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Bell className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  مركز الإشعارات
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="h-4 px-1.5 text-[9px] font-bold">
                      {unreadCount} جديد
                    </Badge>
                  )}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSound}
                className="w-7 h-7 rounded-lg text-muted-foreground hover:text-foreground"
                title={soundActive ? "كتم الصوت" : "تفعيل التنبيه الصوتي"}
              >
                {soundActive ? <Volume2 className="w-3.5 h-3.5 text-emerald-600" /> : <VolumeX className="w-3.5 h-3.5" />}
              </Button>

              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={markAllRead}
                  className="w-7 h-7 rounded-lg text-muted-foreground hover:text-primary"
                  title="تحديد الكل كمقروء"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setPopoverOpen(false);
                  setPrefsOpen(true);
                }}
                className="w-7 h-7 rounded-lg text-muted-foreground hover:text-foreground"
                title="إعدادات الإشعارات"
              >
                <Settings2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Subheader Filters */}
          <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border/40 bg-muted/15 text-xs">
            <button
              onClick={() => setFilter("all")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all",
                filter === "all"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              الكل ({notifications.length})
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1",
                filter === "unread"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              غير مقروء ({unreadCount})
            </button>
          </div>

          {/* Notification Items List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-border/30">
            {isLoading ? (
              <div className="p-8 flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span>جاري تحميل الإشعارات...</span>
              </div>
            ) : displayedNotifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-muted/50 mx-auto flex items-center justify-center text-muted-foreground">
                  <Bell className="w-5 h-5 opacity-40" />
                </div>
                <p className="text-xs font-semibold text-muted-foreground">
                  {filter === "unread" ? "لا توجد إشعارات غير مقروءة ✨" : "لا توجد إشعارات حالياً"}
                </p>
              </div>
            ) : (
              displayedNotifications.map((notif) => {
                const Icon = typeIcons[notif.type] || Bell;
                const colorClass = typeColors[notif.type] || "bg-muted text-muted-foreground";
                const priority = getNotificationPriority(notif.type, notif.title);

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={cn(
                      "group relative p-3 flex items-start gap-3 cursor-pointer transition-colors hover:bg-muted/40",
                      !notif.read && "bg-primary/[0.03]"
                    )}
                  >
                    <div
                      className={cn(
                        "w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 mt-0.5",
                        colorClass
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <h4
                          className={cn(
                            "text-xs truncate",
                            !notif.read ? "font-bold text-foreground" : "font-medium text-foreground/85"
                          )}
                        >
                          {notif.title}
                        </h4>
                        <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                          {formatRelativeTime(notif.created_at)}
                        </span>
                      </div>

                      {notif.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                          {notif.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-0.5">
                        <div className="flex items-center gap-1.5">
                          {priority === "urgent" && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/20">
                              عاجل 🔥
                            </span>
                          )}
                          {priority === "high" && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                              هام ⭐
                            </span>
                          )}
                        </div>

                        {!notif.read && (
                          <button
                            type="button"
                            onClick={(e) => markSingleRead(notif.id, e)}
                            className="text-[10px] text-primary hover:underline font-semibold flex items-center gap-0.5"
                          >
                            <Check className="w-3 h-3" />
                            تحديد كمقروء
                          </button>
                        )}
                      </div>
                    </div>

                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-primary shrink-0 self-center" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 border-t border-border/50 bg-muted/20 flex items-center justify-between text-xs">
            <Link
              to="/notifications"
              onClick={() => setPopoverOpen(false)}
              className="text-xs font-bold text-primary hover:text-primary/80 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-primary/5 transition-colors"
            >
              <span>عرض كافة الإشعارات ({notifications.length})</span>
              <ExternalLink className="w-3 h-3" />
            </Link>

            <button
              onClick={() => {
                setPopoverOpen(false);
                setPrefsOpen(true);
              }}
              className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-1"
            >
              التفضيلات
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <NotificationPreferencesDialog open={prefsOpen} onOpenChange={setPrefsOpen} />
    </>
  );
}
