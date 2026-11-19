import { useState } from "react";
import { ArrowUpLeft, ArrowUpRight, Check, Globe, Globe2, LayoutGrid, Palette, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { SUPPORTED_LOCALES, useI18n } from "@/contexts/I18nContext";
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
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Palette className="w-5 h-5 text-primary" />
          {isAr ? "تفضيلات ومظهر المنصة" : "Platform Preferences & Appearance"}
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isAr
            ? "تخصيص المظهر الشخصي، لغة واجهة المستخدم، لون الهوية، وكثافة عرض الجداول."
            : "Customize your personal interface theme, accent color, language, and display density."}
        </p>
      </div>

      {/* Top 2-Column Bento Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Display Mode + Brand Accent Color */}
        <div className="rounded-xl border border-border/60 bg-muted/15 p-5 space-y-5">
          <div className="flex items-center gap-3">
            <Palette className="w-5 h-5 text-primary shrink-0" />
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

          <div className="grid grid-cols-3 gap-3">
            {themeModes.map((mode) => {
              const isSelected = theme === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setTheme(mode.id)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3.5 rounded-xl border-2 transition-all bg-background",
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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                      "inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all bg-background",
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
                    <span className="truncate">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Language + Regional Shortcut */}
        <div className="rounded-xl border border-border/60 bg-muted/15 p-5 flex flex-col justify-between gap-5">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-primary shrink-0" />
              <div>
                <h3 className="font-bold text-sm text-foreground">
                  {isAr ? "لغة واجهة المستخدم" : "Interface Language"}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isAr
                    ? "اختر لغة العرض الرئيسية للنظام والواجهات والتقارير"
                    : "Select the primary display language of the system"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {SUPPORTED_LOCALES.map((lang) => {
                const active = locale === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setLocale(lang.code)}
                    className={cn(
                      "p-3.5 rounded-xl border-2 text-center transition-all bg-background",
                      active
                        ? "border-primary bg-primary/5 font-bold text-primary shadow-xs"
                        : "border-border/50 hover:bg-muted/30 text-muted-foreground",
                    )}
                  >
                    <div className="text-sm font-black">{lang.nativeLabel}</div>
                    <div className="text-[10px] opacity-75 mt-0.5">{lang.subLabel}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {onOpenRegional && (
            <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Globe2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-foreground">
                    {isAr ? "إعدادات التقويم الهجري والعملات المتعددة" : "Hijri Calendar & Multi-Currency"}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    {isAr
                      ? "ضبط تقويم أم القرى الهجري، العملة الافتراضية والتحويل الآلي، والمنطقة الزمنية وأيام العمل."
                      : "Configure Umm al-Qura Hijri dates, salary currency conversion, and workweek."}
                  </p>
                </div>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={onOpenRegional} className="w-full text-xs font-bold gap-1 bg-background">
                <span>{isAr ? "فتح التخصيص الإقليمي" : "Open Regional Settings"}</span>
                {isAr ? <ArrowUpLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom 3-Column Feature Toggles Bento Row */}
      <div className="rounded-xl border border-border/60 bg-muted/15 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Settings2 className="w-5 h-5 text-primary shrink-0" />
          <div>
            <h3 className="font-bold text-sm text-foreground">
              {isAr ? "خيارات واجهة الاستخدام والكثافة" : "Accessibility, Density & Shortcuts"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isAr
                ? "تحكم فوري في كثافة الجداول والمؤثرات الانتقالية واختصارات لوحة المفاتيح"
                : "Fine-tune screen density, animations, and keyboard navigation"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div className="rounded-xl border border-border/60 bg-background p-4 flex flex-col justify-between gap-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <LayoutGrid className="w-4 h-4 text-primary shrink-0" />
                {isAr ? "العرض المدمج (Compact)" : "Compact Density"}
              </p>
              <Switch checked={isCompact} onCheckedChange={handleDensityToggle} />
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {isAr
                ? "عرض عدد أكبر من المرشحين وسجلات الأمان في الشاشة الواحدة"
                : "Fit more candidates and audit records into each screen view"}
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-background p-4 flex flex-col justify-between gap-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-bold text-foreground">
                {isAr ? "المؤثرات الانتقالية" : "Page Animations"}
              </p>
              <Switch checked={animationsEnabled} onCheckedChange={handleAnimationsChange} />
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {isAr
                ? "عرض حركات بصرية مريحة عند الانتقال بين صفحات النظام"
                : "Render fluid transitions when navigating between views"}
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-background p-4 flex flex-col justify-between gap-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-bold text-foreground">
                {isAr ? "اختصارات المفاتيح" : "Keyboard Shortcuts"}
              </p>
              <Switch checked={shortcutsEnabled} onCheckedChange={handleShortcutsChange} />
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {isAr
                ? "استخدام لوحة المفاتيح للانتقال السريع والبحث الذكي (Cmd+K)"
                : "Access navigation actions using hotkeys (e.g. Cmd+K)"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
