import { useState } from "react";
import { Globe, Palette, Settings2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/contexts/I18nContext";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "@/hooks/use-toast";
import { getAnimationsEnabled, setAnimationsEnabled as saveAnimationsEnabled } from "@/lib/motionPreferences";
import { cn } from "@/lib/utils";

type ThemeMode = "light" | "dark" | "system";

export function PreferencesSettingsSection() {
  const { locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const [animationsEnabled, setAnimationsEnabled] = useState(getAnimationsEnabled);
  const [shortcutsEnabled, setShortcutsEnabled] = useState(() => {
    return localStorage.getItem("workspace-shortcuts") !== "false";
  });

  const handleAnimationsChange = (checked: boolean) => {
    setAnimationsEnabled(checked);
    saveAnimationsEnabled(checked);
    toast({
      title: locale === "en" ? "Animations Updated" : "تم تحديث المؤثرات الحركية",
      description:
        locale === "en"
          ? "Page transitions have been updated."
          : "تم حفظ تفضيلات حركة الصفحات بنجاح.",
    });
  };

  const handleShortcutsChange = (checked: boolean) => {
    setShortcutsEnabled(checked);
    localStorage.setItem("workspace-shortcuts", String(checked));
    toast({
      title: locale === "en" ? "Shortcuts Updated" : "تم تحديث الاختصارات",
      description:
        locale === "en"
          ? "Keyboard shortcuts preference saved."
          : "تم حفظ تفضيلات اختصارات لوحة المفاتيح.",
    });
  };

  const themeModes: ReadonlyArray<{ id: ThemeMode; label: string; icon: string }> = [
    { id: "light", label: locale === "en" ? "Light Mode" : "مظهر فاتح", icon: "☀️" },
    { id: "dark", label: locale === "en" ? "Dark Mode" : "مظهر مظلم", icon: "🌙" },
    { id: "system", label: locale === "en" ? "System" : "تلقائي", icon: "💻" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Palette className="w-5 h-5 text-primary" />
          {locale === "en" ? "Platform Preferences" : "تفضيلات ومظهر المنصة"}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {locale === "en"
            ? "Customize your personal interface theme, language, and accessibility preferences"
            : "تخصيص المظهر الشخصي، لغة واجهة المستخدم، وخيارات سهولة الاستخدام للمنصة"}
        </p>
      </div>

      <div className="rounded-xl border border-border/50 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Globe className="w-5 h-5 text-muted-foreground" />
          <div>
            <h3 className="font-bold text-sm text-foreground">
              {locale === "en" ? "Interface Language" : "لغة واجهة المستخدم"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {locale === "en"
                ? "Select the primary display language of the system"
                : "اختر لغة العرض الرئيسية للنظام والواجهات"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 max-w-md">
          <button
            type="button"
            onClick={() => setLocale("ar")}
            className={cn(
              "p-3 rounded-xl border-2 text-center transition-all",
              locale === "ar"
                ? "border-primary bg-primary/5 font-bold text-primary"
                : "border-border/50 hover:bg-muted/30 text-muted-foreground",
            )}
          >
            العربية (AR)
          </button>
          <button
            type="button"
            onClick={() => setLocale("en")}
            className={cn(
              "p-3 rounded-xl border-2 text-center transition-all",
              locale === "en"
                ? "border-primary bg-primary/5 font-bold text-primary"
                : "border-border/50 hover:bg-muted/30 text-muted-foreground",
            )}
          >
            English (EN)
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border/50 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Palette className="w-5 h-5 text-muted-foreground" />
          <div>
            <h3 className="font-bold text-sm text-foreground">
              {locale === "en" ? "Display Mode" : "مظهر شاشة المنصة"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {locale === "en"
                ? "Toggle between Light and Dark color schemes"
                : "التبديل بين المظهر الفاتح والمظلم للمنصة"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 max-w-lg">
          {themeModes.map((mode) => {
            const isSelected = theme === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setTheme(mode.id)}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-3.5 rounded-xl border-2 transition-all",
                  isSelected
                    ? "border-primary bg-primary/5 font-bold text-primary"
                    : "border-border/50 hover:bg-muted/30 text-muted-foreground",
                )}
              >
                <span className="text-lg">{mode.icon}</span>
                <span className="text-xs">{mode.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-border/50 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Settings2 className="w-5 h-5 text-muted-foreground" />
          <div>
            <h3 className="font-bold text-sm text-foreground">
              {locale === "en" ? "Accessibility & System Settings" : "خيارات واجهة الاستخدام والنظام"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {locale === "en"
                ? "Optimize screen experience and efficiency options"
                : "خيارات مخصصة لتحسين كفاءة وتجربة شاشات العمل"}
            </p>
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-foreground">
                {locale === "en"
                  ? "Enable Page Transitions & Animations"
                  : "تفعيل الحركات والمؤثرات الانتقالية"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {locale === "en"
                  ? "Render fluid animations when navigating between pages"
                  : "عرض مؤثرات بصرية مريحة عند الانتقال بين صفحات النظام"}
              </p>
            </div>
            <Switch checked={animationsEnabled} onCheckedChange={handleAnimationsChange} />
          </div>

          <Separator className="opacity-45" />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-foreground">
                {locale === "en"
                  ? "Enable Keyboard Shortcuts HUD"
                  : "تفعيل اختصارات لوحة المفاتيح الذكية"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {locale === "en"
                  ? "Access navigation actions using hotkeys (e.g. Cmd+K)"
                  : "استخدام لوحة المفاتيح للانتقال السريع والبحث الذكي (Cmd+K)"}
              </p>
            </div>
            <Switch checked={shortcutsEnabled} onCheckedChange={handleShortcutsChange} />
          </div>
        </div>
      </div>
    </div>
  );
}
