import { useState } from "react";
import { ArrowUpLeft, ArrowUpRight, Check, Globe, Globe2, LayoutGrid, Palette, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/contexts/I18nContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useCompactView } from "@/hooks/useCompactView";
import { toast } from "@/hooks/use-toast";
import { getAnimationsEnabled, setAnimationsEnabled as saveAnimationsEnabled } from "@/lib/motionPreferences";
import { cn } from "@/lib/utils";

type ThemeMode = "light" | "dark" | "system";

const ACCENT_PRESETS: ReadonlyArray<{
  hsl: string;
  hex: string;
  labelAr: string;
  labelEn: string;
}> = [
  { hsl: "160 84% 25%", hex: "#0a7554", labelAr: "زمردي توظيف إكس", labelEn: "Tawzeef Emerald" },
  { hsl: "217 91% 45%", hex: "#0c5cd6", labelAr: "أزرق تنفيذي", labelEn: "Executive Blue" },
  { hsl: "252 72% 48%", hex: "#5422d1", labelAr: "نيلي عصري", labelEn: "Modern Indigo" },
  { hsl: "184 82% 28%", hex: "#0d7c82", labelAr: "تركواز سحابي", labelEn: "Cloud Teal" },
  { hsl: "32 90% 42%", hex: "#cc6c0a", labelAr: "كهرماني دافئ", labelEn: "Warm Amber" },
  { hsl: "345 75% 44%", hex: "#c41c46", labelAr: "ياقوتي مؤسسي", labelEn: "Enterprise Rose" },
];

interface PreferencesSettingsSectionProps {
  onOpenRegional?: () => void;
}

export function PreferencesSettingsSection({ onOpenRegional }: PreferencesSettingsSectionProps) {
  const { locale, setLocale } = useI18n();
  const isAr = locale !== "en";
  const { theme, setTheme, primaryColor, setPrimaryColor } = useTheme();
  const { isCompact, toggleCompact } = useCompactView();
  const [animationsEnabled, setAnimationsEnabled] = useState(getAnimationsEnabled);
  const [shortcutsEnabled, setShortcutsEnabled] = useState(() => {
    return localStorage.getItem("workspace-shortcuts") !== "false";
  });

  const handleAnimationsChange = (checked: boolean) => {
    setAnimationsEnabled(checked);
    saveAnimationsEnabled(checked);
    toast({
      title: isAr ? "تم تحديث المؤثرات الحركية" : "Animations Updated",
      description: isAr
        ? "تم حفظ تفضيلات حركة الصفحات بنجاح."
        : "Page transitions have been updated.",
    });
  };

  const handleShortcutsChange = (checked: boolean) => {
    setShortcutsEnabled(checked);
    localStorage.setItem("workspace-shortcuts", String(checked));
    toast({
      title: isAr ? "تم تحديث الاختصارات" : "Shortcuts Updated",
      description: isAr
        ? "تم حفظ تفضيلات اختصارات لوحة المفاتيح."
        : "Keyboard shortcuts preference saved.",
    });
  };

  const handleAccentSelect = (hsl: string, label: string) => {
    setPrimaryColor(hsl);
    toast({
      title: isAr ? `تم تطبيق لون الهوية: ${label}` : `Accent color applied: ${label}`,
    });
  };

  const handleDensityToggle = () => {
    toggleCompact();
    toast({
      title: isAr ? "تم تحديث كثافة العرض" : "Display Density Updated",
      description: isAr
        ? !isCompact
          ? "تم تفعيل العرض المدمج للجداول والمرشحين."
          : "تمت العودة للعرض المريح القياسي."
        : !isCompact
        ? "Compact table density enabled."
        : "Comfortable spacing restored.",
    });
  };

  const themeModes: ReadonlyArray<{ id: ThemeMode; label: string; icon: string }> = [
    { id: "light", label: isAr ? "مظهر فاتح" : "Light Mode", icon: "☀️" },
    { id: "dark", label: isAr ? "مظهر مظلم" : "Dark Mode", icon: "🌙" },
    { id: "system", label: isAr ? "تلقائي" : "System", icon: "💻" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Palette className="w-5 h-5 text-primary" />
          {isAr ? "تفضيلات ومظهر المنصة" : "Platform Preferences & Appearance"}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {isAr
            ? "تخصيص المظهر الشخصي، لغة واجهة المستخدم، لون الهوية، وكثافة عرض الجداول."
            : "Customize your personal interface theme, accent color, language, and display density."}
        </p>
      </div>

      {/* Interface Language */}
      <div className="rounded-xl border border-border/50 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Globe className="w-5 h-5 text-muted-foreground" />
          <div>
            <h3 className="font-bold text-sm text-foreground">
              {isAr ? "لغة واجهة المستخدم" : "Interface Language"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isAr
                ? "اختر لغة العرض الرئيسية للنظام والواجهات"
                : "Select the primary display language of the system"}
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

      {/* Display Mode + Brand Accent Color */}
      <div className="rounded-xl border border-border/50 p-5 space-y-5">
        <div className="flex items-center gap-3">
          <Palette className="w-5 h-5 text-muted-foreground" />
          <div>
            <h3 className="font-bold text-sm text-foreground">
              {isAr ? "مظهر الشاشة ولون الهوية" : "Display Mode & Accent Color"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isAr
                ? "التبديل بين المظهر الفاتح والمظلم واختيار اللون التفاعلي المفضل"
                : "Toggle between Light and Dark modes and choose your accent hue"}
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

        <Separator className="opacity-45" />

        <div className="space-y-2.5">
          <p className="text-xs font-semibold text-foreground">
            {isAr ? "اللون الأساسي للواجهة (Accent Color)" : "Primary Interface Accent"}
          </p>
          <div className="flex flex-wrap gap-2.5">
            {ACCENT_PRESETS.map((preset) => {
              const selected = primaryColor === preset.hsl;
              const label = isAr ? preset.labelAr : preset.labelEn;
              return (
                <button
                  key={preset.hsl}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => handleAccentSelect(preset.hsl, label)}
                  className={cn(
                    "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all",
                    selected
                      ? "border-primary bg-primary/10 text-foreground shadow-xs"
                      : "border-border/60 hover:bg-muted/40 text-muted-foreground",
                  )}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: preset.hex }}
                  >
                    {selected && <Check className="w-2.5 h-2.5 text-white" />}
                  </span>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Accessibility, Density & Shortcuts */}
      <div className="rounded-xl border border-border/50 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Settings2 className="w-5 h-5 text-muted-foreground" />
          <div>
            <h3 className="font-bold text-sm text-foreground">
              {isAr ? "خيارات واجهة الاستخدام والكثافة" : "Accessibility, Density & Shortcuts"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isAr
                ? "خيارات مخصصة لتحسين كفاءة وتجربة شاشات العمل اليومية"
                : "Optimize screen density, animations, and keyboard navigation"}
            </p>
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <LayoutGrid className="w-3.5 h-3.5 text-primary" />
                {isAr ? "العرض المدمج للجداول والقوائم (Compact View)" : "Compact Table & List Density"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {isAr
                  ? "عرض عدد أكبر من المرشحين وسجلات الأمان في الشاشة الواحدة"
                  : "Fit more candidates and audit records into each screen view"}
              </p>
            </div>
            <Switch checked={isCompact} onCheckedChange={handleDensityToggle} />
          </div>

          <Separator className="opacity-45" />

          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-foreground">
                {isAr ? "تفعيل الحركات والمؤثرات الانتقالية" : "Enable Page Transitions & Animations"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {isAr
                  ? "عرض مؤثرات بصرية مريحة عند الانتقال بين صفحات النظام"
                  : "Render fluid animations when navigating between pages"}
              </p>
            </div>
            <Switch checked={animationsEnabled} onCheckedChange={handleAnimationsChange} />
          </div>

          <Separator className="opacity-45" />

          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-foreground">
                {isAr ? "تفعيل اختصارات لوحة المفاتيح الذكية" : "Enable Keyboard Shortcuts HUD"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {isAr
                  ? "استخدام لوحة المفاتيح للانتقال السريع والبحث الذكي (Cmd+K)"
                  : "Access navigation actions using hotkeys (e.g. Cmd+K)"}
              </p>
            </div>
            <Switch checked={shortcutsEnabled} onCheckedChange={handleShortcutsChange} />
          </div>
        </div>
      </div>

      {/* Regional Shortcut Card */}
      {onOpenRegional && (
        <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Globe2 className="w-5 h-5 text-primary shrink-0" />
            <div>
              <p className="text-xs font-bold text-foreground">
                {isAr ? "إعدادات التقويم الهجري والعملات المتعددة" : "Hijri Calendar & Multi-Currency Settings"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {isAr
                  ? "انتقل لتبويب التخصيص الإقليمي لضبط تقويم أم القرى والعملة الافتراضية وأيام العمل."
                  : "Configure Umm al-Qura Hijri dates, salary currency conversion, and workweek."}
              </p>
            </div>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={onOpenRegional} className="text-xs font-bold gap-1">
            <span>{isAr ? "فتح التخصيص الإقليمي" : "Open Regional Settings"}</span>
            {isAr ? <ArrowUpLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
          </Button>
        </div>
      )}
    </div>
  );
}
