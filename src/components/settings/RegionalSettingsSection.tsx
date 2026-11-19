import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  Calendar,
  Check,
  Clock,
  Coins,
  Database,
  Globe2,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { useI18n } from "@/contexts/I18nContext";
import { toast } from "@/hooks/use-toast";
import {
  convertCurrency,
  formatRegionalCurrency,
  formatRegionalDate,
  loadRegionalSettings,
  SUPPORTED_CURRENCIES,
  SUPPORTED_TIMEZONES,
  type CalendarMode,
  type CurrencyCode,
  type RegionalSettings,
  type WorkweekPreset,
} from "@/lib/regionalSettings";
import {
  hydrateCompanyEnterpriseSettings,
  saveAndSyncRegionalSettings,
  type SyncSource,
} from "@/lib/enterpriseConfigSync";
import { cn } from "@/lib/utils";

const CURRENCY_LIST = Object.values(SUPPORTED_CURRENCIES);
const PREVIEW_TARGET_CURRENCIES: CurrencyCode[] = ["SAR", "AED", "USD", "EGP", "KWD"];

export function RegionalSettingsSection() {
  const { locale } = useI18n();
  const isAr = locale === "ar";
  const { user } = useAuth();
  const { activeCompanyId } = useCompany();

  const [settings, setSettings] = useState<RegionalSettings>(() =>
    loadRegionalSettings(activeCompanyId),
  );
  const [syncSource, setSyncSource] = useState<SyncSource>("local");
  const [sampleAmount, setSampleAmount] = useState<number>(15000);
  const [sampleFrom, setSampleFrom] = useState<CurrencyCode>("SAR");

  useEffect(() => {
    let active = true;
    setSettings(loadRegionalSettings(activeCompanyId));
    void hydrateCompanyEnterpriseSettings(activeCompanyId).then(({ regional, source }) => {
      if (!active) return;
      setSettings(regional);
      setSyncSource(source);
    });
    return () => {
      active = false;
    };
  }, [activeCompanyId]);

  const today = useMemo(() => new Date(), []);
  const nextWeek = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d;
  }, []);

  const updateAndSave = (patch: Partial<RegionalSettings>, notify = true) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    void saveAndSyncRegionalSettings(activeCompanyId, next, user?.id).then(({ settings: saved, source }) => {
      setSettings(saved);
      setSyncSource(source);
      if (notify) {
        toast({
          title: isAr ? "تم حفظ التخصيص الإقليمي بنجاح" : "Regional preferences saved",
          description: isAr
            ? source === "supabase"
              ? "تمت مزامنة إعدادات التقويم والعملة مع قاعدة بيانات الشركة لجميع الفريق."
              : "سيتم تطبيق إعدادات التقويم والعملة على التواريخ والعروض والرواتب."
            : source === "supabase"
            ? "Synced company-wide to Supabase for your entire team."
            : "Calendar and currency formatting updated across dates, offers, and salaries.",
        });
      }
    });
  };

  const calendarOptions: Array<{
    id: CalendarMode;
    title: string;
    desc: string;
    badge?: string;
  }> = [
    {
      id: "both",
      title: isAr ? "مزدوج (ميلادي + هجري أم القرى)" : "Dual (Gregorian + Hijri)",
      desc: isAr
        ? "يعرض التاريخ الميلادي والهجري معاً في المقابلات والعروض والتقارير"
        : "Shows both Gregorian and Umm al-Qura Hijri dates side by side",
      badge: isAr ? "موصى به للسعودية" : "Recommended KSA",
    },
    {
      id: "hijri",
      title: isAr ? "التقويم الهجري فقط (أم القرى)" : "Hijri Only (Umm al-Qura)",
      desc: isAr
        ? "اعتماد تقويم أم القرى الرسمي في كافة الجداول والخطابات"
        : "Use official Umm al-Qura Hijri calendar across schedules and letters",
    },
    {
      id: "gregorian",
      title: isAr ? "التقويم الميلادي فقط" : "Gregorian Only",
      desc: isAr
        ? "العرض القياسي الدولي للتواريخ والمواعيد"
        : "Standard international Gregorian date presentation",
    },
  ];

  const workweekOptions: Array<{ id: WorkweekPreset; label: string; hint: string }> = [
    {
      id: "sun-thu",
      label: isAr ? "الأحد — الخميس" : "Sunday — Thursday",
      hint: isAr ? "أيام العمل الرسمية في السعودية والخليج ومصر" : "Official GCC & MENA workweek",
    },
    {
      id: "mon-fri",
      label: isAr ? "الاثنين — الجمعة" : "Monday — Friday",
      hint: isAr ? "أيام العمل العالمية والإمارات" : "International & UAE workweek",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground flex flex-wrap items-center gap-2">
            <Globe2 className="w-5 h-5 text-primary" />
            {isAr
              ? "التخصيص الإقليمي (التقويم الهجري وتعدد العملات)"
              : "Regional Customization (Hijri Calendar & Multi-Currency)"}
            <Badge
              variant="outline"
              className={
                syncSource === "supabase"
                  ? "text-[10px] gap-1 bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
                  : "text-[10px] gap-1 text-muted-foreground"
              }
            >
              <Database className="w-3 h-3" />
              {syncSource === "supabase"
                ? isAr
                  ? "مزامنة الشركة مفعّلة"
                  : "Company Sync Active"
                : isAr
                ? "حفظ محلي"
                : "Local Cache"}
            </Badge>
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isAr
              ? "ضبط تقويم أم القرى الهجري، العملة الافتراضية مع التحويل الآلي للرواتب، والمنطقة الزمنية وأيام العمل."
              : "Configure Umm al-Qura Hijri dates, company currency with auto-conversion, timezone, and workweek."}
          </p>
        </div>
        <Badge variant="secondary" className="gap-1 text-xs">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          {isAr ? "تحديث فوري" : "Live Sync"}
        </Badge>
      </div>

      {/* 1. Hijri & Gregorian Calendar Card */}
      <div className="rounded-xl border border-border/60 p-5 space-y-4 bg-card/50">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-primary shrink-0" />
          <div>
            <h3 className="font-bold text-sm text-foreground">
              {isAr ? "نظام التقويم والتواريخ (أم القرى / ميلادي)" : "Calendar System (Umm al-Qura / Gregorian)"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isAr
                ? "اختر صيغة التاريخ المعتمدة للمقابلات، عروض العمل، وتقارير الموارد البشرية."
                : "Choose how dates appear in interviews, offers, and HR reports."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {calendarOptions.map((option) => {
            const selected = settings.calendarMode === option.id;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={selected}
                onClick={() => updateAndSave({ calendarMode: option.id })}
                className={cn(
                  "text-start p-4 rounded-xl border-2 transition-all space-y-1.5 relative",
                  selected
                    ? "border-primary bg-primary/5 shadow-xs"
                    : "border-border/50 hover:bg-muted/30",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={cn("text-xs font-bold", selected ? "text-primary" : "text-foreground")}>
                    {option.title}
                  </span>
                  {selected && <Check className="w-4 h-4 text-primary shrink-0" />}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{option.desc}</p>
                {option.badge && (
                  <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
                    {option.badge}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>

        {/* Live Date Preview */}
        <div className="rounded-lg bg-muted/40 border border-border/50 p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-muted-foreground block text-[11px]">
              {isAr ? "معاينة تاريخ اليوم:" : "Today's date preview:"}
            </span>
            <span className="font-bold text-foreground mt-0.5 block" data-testid="regional-date-preview">
              {formatRegionalDate(today, settings.calendarMode, locale, settings.timezone)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">
              {isAr ? "معاينة موعد مقابلة (بعد 7 أيام):" : "Sample interview (+7 days):"}
            </span>
            <span className="font-bold text-foreground mt-0.5 block">
              {formatRegionalDate(nextWeek, settings.calendarMode, locale, settings.timezone)}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Multi-Currency & Auto-Conversion Card */}
      <div className="rounded-xl border border-border/60 p-5 space-y-4 bg-card/50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Coins className="w-5 h-5 text-primary shrink-0" />
            <div>
              <h3 className="font-bold text-sm text-foreground">
                {isAr ? "العملة الافتراضية والتحويل الآلي" : "Default Currency & Auto-Conversion"}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isAr
                  ? "اعرض رواتب الوظائف والعروض بالعملة الأساسية مع تحويل فوري للعملات الخليجية والعالمية."
                  : "Display job salaries and offers in your primary currency with instant conversion."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="auto-convert-salaries" className="text-xs font-semibold cursor-pointer">
              {isAr ? "تحويل تلقائي للرواتب" : "Auto-convert salaries"}
            </Label>
            <Switch
              id="auto-convert-salaries"
              checked={settings.autoConvertSalaries}
              onCheckedChange={(checked) => updateAndSave({ autoConvertSalaries: checked })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {CURRENCY_LIST.map((curr) => {
            const active = settings.currency === curr.code;
            return (
              <button
                key={curr.code}
                type="button"
                aria-pressed={active}
                onClick={() => updateAndSave({ currency: curr.code })}
                className={cn(
                  "p-3 rounded-xl border-2 text-start transition-all",
                  active
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border/50 hover:bg-muted/30 text-foreground",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs">{curr.code}</span>
                  <span className="text-xs font-bold opacity-80">
                    {isAr ? curr.symbolAr : curr.symbolEn}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground truncate mt-1">
                  {isAr ? curr.nameAr : curr.nameEn}
                </div>
              </button>
            );
          })}
        </div>

        {/* Interactive Auto-Conversion Calculator */}
        <div className="rounded-xl bg-muted/35 border border-border/50 p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-foreground">
            <ArrowLeftRight className="w-4 h-4 text-primary" />
            <span>{isAr ? "محوّل الرواتب الفوري (معاينة حية)" : "Instant Salary Converter (Live Preview)"}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="w-40">
              <Label htmlFor="sample-salary-amount" className="sr-only">
                {isAr ? "مبلغ الراتب" : "Salary amount"}
              </Label>
              <Input
                id="sample-salary-amount"
                type="number"
                min={0}
                value={sampleAmount}
                onChange={(e) => setSampleAmount(Math.max(0, Number(e.target.value) || 0))}
                className="h-9 text-xs font-mono"
              />
            </div>

            <select
              aria-label={isAr ? "العملة المصدر" : "Source currency"}
              value={sampleFrom}
              onChange={(e) => setSampleFrom(e.target.value as CurrencyCode)}
              className="h-9 rounded-md border border-input bg-background px-3 text-xs font-semibold"
            >
              {CURRENCY_LIST.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {isAr ? c.nameAr : c.nameEn}
                </option>
              ))}
            </select>

            <span className="text-xs text-muted-foreground">→</span>

            <div className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-bold text-xs" data-testid="converted-primary-salary">
              {formatRegionalCurrency(
                convertCurrency(sampleAmount, sampleFrom, settings.currency),
                settings.currency,
                locale,
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {PREVIEW_TARGET_CURRENCIES.filter((c) => c !== sampleFrom).map((target) => (
              <Badge key={target} variant="outline" className="font-mono text-[11px] py-1 px-2.5 bg-background">
                {target}: {formatRegionalCurrency(convertCurrency(sampleAmount, sampleFrom, target), target, locale)}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Timezone & Workweek Card */}
      <div className="rounded-xl border border-border/60 p-5 space-y-4 bg-card/50">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-primary shrink-0" />
          <div>
            <h3 className="font-bold text-sm text-foreground">
              {isAr ? "المنطقة الزمنية وأيام العمل الأسبوعية" : "Timezone & Official Workweek"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isAr
                ? "تُستخدم تلقائياً في جدولة المقابلات وحساب أوقات الاستجابة (SLA)."
                : "Used automatically for interview scheduling and SLA calculations."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="regional-timezone" className="text-xs font-bold">
              {isAr ? "المنطقة الزمنية" : "Timezone"}
            </Label>
            <select
              id="regional-timezone"
              value={settings.timezone}
              onChange={(e) => updateAndSave({ timezone: e.target.value })}
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-xs font-medium"
            >
              {SUPPORTED_TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {isAr ? tz.labelAr : tz.labelEn}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold block">{isAr ? "أيام العمل الرسمية" : "Official Workweek"}</span>
            <div className="grid grid-cols-2 gap-2">
              {workweekOptions.map((wk) => {
                const selected = settings.workweek === wk.id;
                return (
                  <button
                    key={wk.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => updateAndSave({ workweek: wk.id })}
                    className={cn(
                      "p-2.5 rounded-lg border-2 text-start transition-all",
                      selected
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border/50 hover:bg-muted/30",
                    )}
                  >
                    <div className="text-xs font-bold">{wk.label}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{wk.hint}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => updateAndSave({})}
            className="text-xs font-bold"
          >
            <Check className="w-3.5 h-3.5 me-1.5" />
            {isAr ? "تأكيد وحفظ الإعدادات الإقليمية" : "Save Regional Preferences"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default RegionalSettingsSection;
