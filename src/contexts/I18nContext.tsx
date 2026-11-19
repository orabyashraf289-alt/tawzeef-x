import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import ar from "@/i18n/ar";
import en from "@/i18n/en";
import fr from "@/i18n/fr";
import ur from "@/i18n/ur";

export type Locale = "ar" | "en" | "fr" | "ur";

export interface LocaleOption {
  code: Locale;
  nativeLabel: string;
  subLabel: string;
  dir: "rtl" | "ltr";
}

export const SUPPORTED_LOCALES: ReadonlyArray<LocaleOption> = [
  { code: "ar", nativeLabel: "العربية", subLabel: "RTL — Arabic (AR)", dir: "rtl" },
  { code: "en", nativeLabel: "English", subLabel: "LTR — English (EN)", dir: "ltr" },
  { code: "fr", nativeLabel: "Français", subLabel: "LTR — French (FR)", dir: "ltr" },
  { code: "ur", nativeLabel: "اردو", subLabel: "RTL — Urdu (UR)", dir: "rtl" },
];

type Translations = Record<string, string>;

const translations: Record<Locale, Translations> = { ar, en, fr, ur };

export function isSupportedLocale(value: unknown): value is Locale {
  return value === "ar" || value === "en" || value === "fr" || value === "ur";
}

export function getLocaleDirection(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" || locale === "ur" ? "rtl" : "ltr";
}

interface I18nContextType {
  locale: Locale;
  dir: "rtl" | "ltr";
  setLocale: (locale: Locale) => void;
  t: (key: string, fallback?: string) => string;
}

const I18nContext = createContext<I18nContextType>({
  locale: "ar",
  dir: "rtl",
  setLocale: () => {},
  t: (key) => key,
});

export const useI18n = () => useContext(I18nContext);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    try {
      const stored = localStorage.getItem("app-locale");
      return isSupportedLocale(stored) ? stored : "ar";
    } catch {
      return "ar";
    }
  });

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem("app-locale", l);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const dir = getLocaleDirection(locale);

  useEffect(() => {
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", locale);
  }, [locale, dir]);

  const t = useCallback(
    (key: string, fallback?: string): string => {
      return translations[locale]?.[key] ?? translations.en[key] ?? fallback ?? key;
    },
    [locale],
  );

  return (
    <I18nContext.Provider value={{ locale, dir, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}
