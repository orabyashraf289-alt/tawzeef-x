import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  Volume2,
  VolumeX,
  Mail,
  MessageSquare,
  Globe,
  Calendar,
  UserPlus,
  ArrowLeftRight,
  BrainCircuit,
  FileCheck2,
  Save,
  CheckCircle2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { isSoundNotificationEnabled, setSoundNotificationEnabled, playNotificationTone } from "@/lib/notificationDispatcher";

interface NotificationPreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PreferencesState {
  soundEnabled: boolean;
  browserPush: boolean;
  emailAlerts: boolean;
  whatsappAlerts: boolean;
  categories: {
    interviews: boolean;
    applications: boolean;
    stageChanges: boolean;
    aiEvaluations: boolean;
    jobOffers: boolean;
  };
}

const PREF_STORAGE_KEY = "tx_notification_preferences_v2";

export default function NotificationPreferencesDialog({
  open,
  onOpenChange,
}: NotificationPreferencesDialogProps) {
  const [prefs, setPrefs] = useState<PreferencesState>({
    soundEnabled: true,
    browserPush: false,
    emailAlerts: true,
    whatsappAlerts: true,
    categories: {
      interviews: true,
      applications: true,
      stageChanges: true,
      aiEvaluations: true,
      jobOffers: true,
    },
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sound = isSoundNotificationEnabled();
    const saved = localStorage.getItem(PREF_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPrefs({ ...parsed, soundEnabled: sound });
      } catch {
        setPrefs((prev) => ({ ...prev, soundEnabled: sound }));
      }
    } else {
      setPrefs((prev) => ({ ...prev, soundEnabled: sound }));
    }
  }, [open]);

  const handleSoundToggle = (enabled: boolean) => {
    setSoundNotificationEnabled(enabled);
    setPrefs((prev) => ({ ...prev, soundEnabled: enabled }));
    if (enabled) {
      playNotificationTone("normal");
    }
  };

  const handleSave = () => {
    setSoundNotificationEnabled(prefs.soundEnabled);
    localStorage.setItem(PREF_STORAGE_KEY, JSON.stringify(prefs));
    toast({
      title: "تم حفظ تفضيلات الإشعارات بنجاح ✅",
      description: "سيتم تطبيق التفضيلات على كافة التنبيهات الفورية والتلقائية.",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg rounded-3xl p-6" dir="rtl">
        <DialogHeader className="text-right space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                تفضيلات وإعدادات الإشعارات 🔔
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                تخصيص قنوات الاستلام، التنبيهات الصوتية، والفئات التي تهمك
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Channel Settings */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-muted-foreground tracking-wide flex items-center gap-1.5">
              <span>قنوات الاستلام والتنبيه</span>
            </h4>

            <div className="space-y-2 rounded-2xl border border-border/60 bg-muted/20 p-3.5">
              {/* Sound Notifications */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    {prefs.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-foreground block">
                      التنبيه الصوتي المباشر (Audio Chime)
                    </Label>
                    <span className="text-[11px] text-muted-foreground">
                      تشغيل نغمة لطيفة عند وصول إشعار جديد في النظام
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {prefs.soundEnabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => playNotificationTone("urgent")}
                      className="h-7 text-[10px] px-2 text-primary"
                    >
                      تجربة 🔊
                    </Button>
                  )}
                  <Switch
                    checked={prefs.soundEnabled}
                    onCheckedChange={handleSoundToggle}
                  />
                </div>
              </div>

              {/* Browser Push */}
              <div className="flex items-center justify-between border-t border-border/40 pt-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-foreground block">
                      إشعارات المتصفح (Web Push)
                    </Label>
                    <span className="text-[11px] text-muted-foreground">
                      تنبيهات فورية حتى عند تصغير النافذة
                    </span>
                  </div>
                </div>
                <Switch
                  checked={prefs.browserPush}
                  onCheckedChange={(val) => {
                    setPrefs((prev) => ({ ...prev, browserPush: val }));
                    if (val && typeof window !== "undefined" && "Notification" in window) {
                      Notification.requestPermission();
                    }
                  }}
                />
              </div>

              {/* WhatsApp Alerts */}
              <div className="flex items-center justify-between border-t border-border/40 pt-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-foreground block">
                      تنبيهات واتساب الذكية
                    </Label>
                    <span className="text-[11px] text-muted-foreground">
                      استلام تحديثات المقابلات والملاحظات الحرجة عبر واتساب
                    </span>
                  </div>
                </div>
                <Switch
                  checked={prefs.whatsappAlerts}
                  onCheckedChange={(val) => setPrefs((prev) => ({ ...prev, whatsappAlerts: val }))}
                />
              </div>

              {/* Email Alerts */}
              <div className="flex items-center justify-between border-t border-border/40 pt-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <Label className="text-xs font-bold text-foreground block">
                      ملخص البريد الإلكتروني
                    </Label>
                    <span className="text-[11px] text-muted-foreground">
                      استلام الملخص اليومي لأهم التحديثات على البريد
                    </span>
                  </div>
                </div>
                <Switch
                  checked={prefs.emailAlerts}
                  onCheckedChange={(val) => setPrefs((prev) => ({ ...prev, emailAlerts: val }))}
                />
              </div>
            </div>
          </div>

          {/* Categories Granular Toggles */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-muted-foreground tracking-wide">
              تخصيص أنواع الأحداث
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/50 bg-card">
                <div className="flex items-center gap-2 text-xs">
                  <Calendar className="w-4 h-4 text-warning" />
                  <span>تذكيرات المقابلات</span>
                </div>
                <Switch
                  checked={prefs.categories.interviews}
                  onCheckedChange={(val) =>
                    setPrefs((prev) => ({
                      ...prev,
                      categories: { ...prev.categories, interviews: val },
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/50 bg-card">
                <div className="flex items-center gap-2 text-xs">
                  <UserPlus className="w-4 h-4 text-primary" />
                  <span>المتقدمين الجدد</span>
                </div>
                <Switch
                  checked={prefs.categories.applications}
                  onCheckedChange={(val) =>
                    setPrefs((prev) => ({
                      ...prev,
                      categories: { ...prev.categories, applications: val },
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/50 bg-card">
                <div className="flex items-center gap-2 text-xs">
                  <ArrowLeftRight className="w-4 h-4 text-blue-500" />
                  <span>نقل المراحل والفرز</span>
                </div>
                <Switch
                  checked={prefs.categories.stageChanges}
                  onCheckedChange={(val) =>
                    setPrefs((prev) => ({
                      ...prev,
                      categories: { ...prev.categories, stageChanges: val },
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/50 bg-card">
                <div className="flex items-center gap-2 text-xs">
                  <BrainCircuit className="w-4 h-4 text-purple-500" />
                  <span>تقارير الذكاء الاصطناعي</span>
                </div>
                <Switch
                  checked={prefs.categories.aiEvaluations}
                  onCheckedChange={(val) =>
                    setPrefs((prev) => ({
                      ...prev,
                      categories: { ...prev.categories, aiEvaluations: val },
                    }))
                  }
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:justify-start pt-3 border-t">
          <Button onClick={handleSave} className="gap-2 rounded-xl text-xs font-bold px-5">
            <Save className="w-4 h-4" />
            حفظ التفضيلات
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl text-xs"
          >
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
