/**
 * Regional Customization Engine (p5-hijri & p5-currency)
 *
 * Provides:
 * 1. Calendar formatting: Gregorian, Hijri (Umm al-Qura), or Dual display.
 * 2. Multi-currency definitions & automated conversion anchored to SAR.
 * 3. Timezone & GCC/International workweek presets.
 * 4. Per-company persistent storage with live cross-component sync events.
 */

export type CalendarMode = "gregorian" | "hijri" | "both";

export type CurrencyCode =
  | "SAR"
  | "AED"
  | "KWD"
  | "QAR"
  | "BHD"
  | "OMR"
  | "EGP"
  | "JOD"
  | "USD"
  | "EUR";

export type WorkweekPreset = "sun-thu" | "mon-fri";

export interface CurrencyDefinition {
  code: CurrencyCode;
  symbolAr: string;
  symbolEn: string;
  nameAr: string;
  nameEn: string;
  /** Exchange rate relative to 1 SAR (e.g. 1 SAR = 0.2667 USD) */
  rateFromSar: number;
  decimals: number;
}

export const SUPPORTED_CURRENCIES: Record<CurrencyCode, CurrencyDefinition> = {
  SAR: { code: "SAR", symbolAr: "ر.س", symbolEn: "SAR", nameAr: "ريال سعودي", nameEn: "Saudi Riyal", rateFromSar: 1, decimals: 0 },
  AED: { code: "AED", symbolAr: "د.إ", symbolEn: "AED", nameAr: "درهم إماراتي", nameEn: "UAE Dirham", rateFromSar: 0.979, decimals: 0 },
  KWD: { code: "KWD", symbolAr: "د.ك", symbolEn: "KWD", nameAr: "دينار كويتي", nameEn: "Kuwaiti Dinar", rateFromSar: 0.0818, decimals: 2 },
  QAR: { code: "QAR", symbolAr: "ر.ق", symbolEn: "QAR", nameAr: "ريال قطري", nameEn: "Qatari Riyal", rateFromSar: 0.971, decimals: 0 },
  BHD: { code: "BHD", symbolAr: "د.ب", symbolEn: "BHD", nameAr: "دينار بحريني", nameEn: "Bahraini Dinar", rateFromSar: 0.1005, decimals: 2 },
  OMR: { code: "OMR", symbolAr: "ر.ع", symbolEn: "OMR", nameAr: "ريال عماني", nameEn: "Omani Rial", rateFromSar: 0.1027, decimals: 2 },
  EGP: { code: "EGP", symbolAr: "ج.م", symbolEn: "EGP", nameAr: "جنيه مصري", nameEn: "Egyptian Pound", rateFromSar: 13.15, decimals: 0 },
  JOD: { code: "JOD", symbolAr: "د.أ", symbolEn: "JOD", nameAr: "دينار أردني", nameEn: "Jordanian Dinar", rateFromSar: 0.189, decimals: 2 },
  USD: { code: "USD", symbolAr: "$", symbolEn: "$", nameAr: "دولار أمريكي", nameEn: "US Dollar", rateFromSar: 0.2667, decimals: 0 },
  EUR: { code: "EUR", symbolAr: "€", symbolEn: "€", nameAr: "يورو أوروبي", nameEn: "Euro", rateFromSar: 0.246, decimals: 0 },
};

export interface TimezoneOption {
  value: string;
  labelAr: string;
  labelEn: string;
}

export const SUPPORTED_TIMEZONES: TimezoneOption[] = [
  { value: "Asia/Riyadh", labelAr: "الرياض / السعودية (UTC+3)", labelEn: "Riyadh / KSA (UTC+3)" },
  { value: "Asia/Dubai", labelAr: "دبي / الإمارات (UTC+4)", labelEn: "Dubai / UAE (UTC+4)" },
  { value: "Asia/Kuwait", labelAr: "الكويت (UTC+3)", labelEn: "Kuwait (UTC+3)" },
  { value: "Asia/Qatar", labelAr: "الدوحة / قطر (UTC+3)", labelEn: "Doha / Qatar (UTC+3)" },
  { value: "Asia/Bahrain", labelAr: "المنامة / البحرين (UTC+3)", labelEn: "Manama / Bahrain (UTC+3)" },
  { value: "Asia/Muscat", labelAr: "مسقط / عُمان (UTC+4)", labelEn: "Muscat / Oman (UTC+4)" },
  { value: "Africa/Cairo", labelAr: "القاهرة / مصر (UTC+2)", labelEn: "Cairo / Egypt (UTC+2)" },
  { value: "Asia/Amman", labelAr: "عمّان / الأردن (UTC+3)", labelEn: "Amman / Jordan (UTC+3)" },
  { value: "UTC", labelAr: "التوقيت العالمي (UTC)", labelEn: "UTC" },
];

export interface RegionalSettings {
  calendarMode: CalendarMode;
  currency: CurrencyCode;
  autoConvertSalaries: boolean;
  timezone: string;
  workweek: WorkweekPreset;
  updatedAt?: string;
}

export const DEFAULT_REGIONAL_SETTINGS: RegionalSettings = {
  calendarMode: "both",
  currency: "SAR",
  autoConvertSalaries: true,
  timezone: "Asia/Riyadh",
  workweek: "sun-thu",
};

const STORAGE_PREFIX = "tx_regional_settings_v1";
export const REGIONAL_SETTINGS_EVENT = "tx-regional-settings-changed";

function getStorageKey(companyId?: string | null): string {
  return companyId ? `${STORAGE_PREFIX}:${companyId}` : STORAGE_PREFIX;
}

export function loadRegionalSettings(companyId?: string | null): RegionalSettings {
  if (typeof window === "undefined") return { ...DEFAULT_REGIONAL_SETTINGS };
  try {
    const raw =
      localStorage.getItem(getStorageKey(companyId)) ??
      localStorage.getItem(STORAGE_PREFIX);
    if (!raw) return { ...DEFAULT_REGIONAL_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<RegionalSettings>;
    const calendarMode: CalendarMode =
      parsed.calendarMode === "gregorian" || parsed.calendarMode === "hijri" || parsed.calendarMode === "both"
        ? parsed.calendarMode
        : DEFAULT_REGIONAL_SETTINGS.calendarMode;
    const currency: CurrencyCode =
      parsed.currency && parsed.currency in SUPPORTED_CURRENCIES
        ? (parsed.currency as CurrencyCode)
        : DEFAULT_REGIONAL_SETTINGS.currency;
    const workweek: WorkweekPreset =
      parsed.workweek === "mon-fri" || parsed.workweek === "sun-thu"
        ? parsed.workweek
        : DEFAULT_REGIONAL_SETTINGS.workweek;

    return {
      calendarMode,
      currency,
      autoConvertSalaries:
        typeof parsed.autoConvertSalaries === "boolean"
          ? parsed.autoConvertSalaries
          : DEFAULT_REGIONAL_SETTINGS.autoConvertSalaries,
      timezone:
        typeof parsed.timezone === "string" && parsed.timezone.trim().length > 0
          ? parsed.timezone
          : DEFAULT_REGIONAL_SETTINGS.timezone,
      workweek,
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return { ...DEFAULT_REGIONAL_SETTINGS };
  }
}

export function saveRegionalSettings(
  settings: RegionalSettings,
  companyId?: string | null,
): RegionalSettings {
  const next: RegionalSettings = {
    ...settings,
    updatedAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    try {
      const serialized = JSON.stringify(next);
      localStorage.setItem(getStorageKey(companyId), serialized);
      localStorage.setItem(STORAGE_PREFIX, serialized);
      window.dispatchEvent(new CustomEvent(REGIONAL_SETTINGS_EVENT, { detail: next }));
    } catch {
      // Ignore storage quota errors
    }
  }
  return next;
}

/**
 * Convert an amount between any two supported currencies via SAR base rate.
 */
export function convertCurrency(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
): number {
  if (!Number.isFinite(amount)) return 0;
  if (from === to) return amount;
  const sourceDef = SUPPORTED_CURRENCIES[from] ?? SUPPORTED_CURRENCIES.SAR;
  const targetDef = SUPPORTED_CURRENCIES[to] ?? SUPPORTED_CURRENCIES.SAR;
  const inSar = amount / sourceDef.rateFromSar;
  const converted = inSar * targetDef.rateFromSar;
  const factor = Math.pow(10, targetDef.decimals);
  return Math.round(converted * factor) / factor;
}

/**
 * Format an amount using the selected currency and interface locale.
 */
export function formatRegionalCurrency(
  amount: number,
  currency: CurrencyCode,
  locale: string = "ar",
): string {
  const def = SUPPORTED_CURRENCIES[currency] ?? SUPPORTED_CURRENCIES.SAR;
  const formattedNumber = new Intl.NumberFormat(locale === "en" ? "en-US" : "ar-SA", {
    minimumFractionDigits: def.decimals,
    maximumFractionDigits: def.decimals,
  }).format(amount);
  return locale === "en"
    ? `${def.symbolEn} ${formattedNumber}`
    : `${formattedNumber} ${def.symbolAr}`;
}

/**
 * Format a date in Gregorian, Hijri (Umm al-Qura), or Dual mode.
 */
export function formatRegionalDate(
  input: Date | string | number,
  mode: CalendarMode = "gregorian",
  locale: string = "ar",
  timezone?: string,
): string {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "";

  const isEn = locale === "en";
  const tzOption = timezone ? { timeZone: timezone } : {};

  const gregorian = new Intl.DateTimeFormat(isEn ? "en-US" : "ar-SA-u-ca-gregory", {
    year: "numeric",
    month: "long",
    day: "numeric",
    ...tzOption,
  }).format(date);

  if (mode === "gregorian") return gregorian;

  let hijri = "";
  try {
    hijri = new Intl.DateTimeFormat(
      isEn ? "en-US-u-ca-islamic-umalqura" : "ar-SA-u-ca-islamic-umalqura",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
        ...tzOption,
      },
    ).format(date);
  } catch {
    hijri = new Intl.DateTimeFormat(
      isEn ? "en-US-u-ca-islamic" : "ar-SA-u-ca-islamic",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
        ...tzOption,
      },
    ).format(date);
  }

  if (mode === "hijri") return hijri;
  return `${gregorian} (${hijri})`;
}
