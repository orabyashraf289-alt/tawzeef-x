import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/contexts/I18nContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function NotificationsSettingsSection() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [hasWebPushEndpoint, setHasWebPushEndpoint] = useState(false);
  const [browserPermission, setBrowserPermission] = useState<string>(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported",
  );

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await (supabase.from as any)("user_push_subscriptions")
        .select("id, endpoint, is_active, p256dh")
        .eq("user_id", user.id)
        .eq("is_active", true);
      if (cancelled || error || !Array.isArray(data)) return;
      setPushEnabled(data.length > 0);
      setHasWebPushEndpoint(data.some((row: any) => typeof row.p256dh === "string" && row.p256dh.length > 0));
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const handleToggleBrowserPush = async (nextChecked: boolean) => {
    if (pushBusy) return;
    setPushBusy(true);
    try {
      if (!nextChecked) {
        if (user?.id) {
          await (supabase.from as any)("user_push_subscriptions")
            .update({ is_active: false })
            .eq("user_id", user.id);
        }
        setPushEnabled(false);
        setHasWebPushEndpoint(false);
        toast({ title: "تم إيقاف إشعارات المتصفح على هذا الحساب" });
        return;
      }

      let perm: NotificationPermission | "unsupported" =
        typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported";
      if (perm !== "granted" && typeof window !== "undefined" && "Notification" in window) {
        perm = await Notification.requestPermission();
      }
      setBrowserPermission(perm);
      if (perm === "denied") {
        toast({
          title: "إذن الإشعارات مرفوض في المتصفح",
          description: "اسمح بالإشعارات من إعدادات الموقع في المتصفح ثم أعد المحاولة.",
          variant: "destructive",
        });
        return;
      }

      let endpoint = `web-notification:${user?.id || "anon"}`;
      let p256dh: string | null = null;
      let authSecret: string | null = null;
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

      if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
        try {
          const registration = await Promise.race([
            navigator.serviceWorker.ready,
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
          ]);
          if (registration && "pushManager" in registration) {
            let sub = await registration.pushManager.getSubscription();
            if (!sub && vapidKey?.trim()) {
              sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidKey.trim()),
              });
            }
            if (sub) {
              const jsonSub = sub.toJSON();
              endpoint = sub.endpoint;
              p256dh = jsonSub.keys?.p256dh || null;
              authSecret = jsonSub.keys?.auth || null;
            }
          }
        } catch {
          // Graceful fallback to browser-level Notification opt-in record
        }
      }

      if (user?.id) {
        const { error } = await (supabase.from as any)("user_push_subscriptions").upsert(
          {
            company_id: activeCompanyId || null,
            user_id: user.id,
            endpoint,
            p256dh,
            auth_secret: authSecret,
            user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 240) : null,
            is_active: true,
          },
          { onConflict: "user_id,endpoint" },
        );
        if (error) throw error;
      }

      setPushEnabled(true);
      setHasWebPushEndpoint(Boolean(p256dh));
      toast({
        title: p256dh ? "تم تفعيل إشعارات Web Push الخلفية" : "تم تفعيل إشعارات المتصفح الفورية",
      });
    } catch {
      toast({ title: "تعذّر حفظ اشتراك الإشعارات", variant: "destructive" });
    } finally {
      setPushBusy(false);
    }
  };

  const prefs = [
    {
      label: t("settings.notifNewApplications"),
      desc: t("settings.notifNewApplicationsDesc"),
      icon: "📩",
    },
    {
      label: t("settings.notifInterviewReminders"),
      desc: t("settings.notifInterviewRemindersDesc"),
      icon: "⏰",
    },
    {
      label: t("settings.notifCandidateUpdates"),
      desc: t("settings.notifCandidateUpdatesDesc"),
      icon: "👤",
    },
    {
      label: t("settings.notifBrowserPush"),
      desc: t("settings.notifBrowserPushDesc"),
      icon: "🔔",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">{t("settings.notificationsTitle")}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t("settings.notificationsDesc")}</p>
      </div>
      <div className="space-y-2">
        {prefs.map((pref, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-3 p-4 rounded-xl bg-muted/30 border border-border/30 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-lg">{pref.icon}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-foreground">{pref.label}</p>
                  {i === 3 && pushEnabled && (
                    <Badge variant="secondary" className="text-[10px]">
                      {hasWebPushEndpoint ? "PWA Web Push مفعّل" : "إذن المتصفح محفوظ"}
                    </Badge>
                  )}
                  {i === 3 && browserPermission === "denied" && (
                    <Badge variant="destructive" className="text-[10px]">
                      محظور في المتصفح
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">{pref.desc}</p>
              </div>
            </div>
            {i === 3 ? (
              <Switch
                checked={pushEnabled}
                disabled={pushBusy}
                onCheckedChange={(checked) => void handleToggleBrowserPush(checked)}
              />
            ) : (
              <Switch defaultChecked />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
