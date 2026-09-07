import { useI18n } from "@/contexts/I18nContext";
import { Switch } from "@/components/ui/switch";

export default function NotificationsSection() {
  const { t } = useI18n();
  const prefs = [
    { label: t("settings.notifNewApplications"), desc: t("settings.notifNewApplicationsDesc"), icon: "📩" },
    { label: t("settings.notifInterviewReminders"), desc: t("settings.notifInterviewRemindersDesc"), icon: "⏰" },
    { label: t("settings.notifCandidateUpdates"), desc: t("settings.notifCandidateUpdatesDesc"), icon: "👤" },
    { label: t("settings.notifBrowserPush"), desc: t("settings.notifBrowserPushDesc"), icon: "🔔" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">{t("settings.notificationsTitle")}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t("settings.notificationsDesc")}</p>
      </div>
      <div className="space-y-2">
        {prefs.map((pref, i) => (
          <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/30 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-lg">{pref.icon}</span>
              <div>
                <p className="text-sm font-medium text-foreground">{pref.label}</p>
                <p className="text-[11px] text-muted-foreground">{pref.desc}</p>
              </div>
            </div>
            <Switch defaultChecked onClick={() => {
              if (i === 3 && "Notification" in window && Notification.permission !== "granted") {
                Notification.requestPermission();
              }
            }} />
          </div>
        ))}
      </div>
    </div>
  );
}
