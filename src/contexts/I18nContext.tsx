import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import ar from "@/i18n/ar";
import en from "@/i18n/en";

export type Locale = "ar" | "en";

type Translations = Record<string, string>;

const translations: Record<Locale, Translations> = { ar, en };

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
    const stored = localStorage.getItem("app-locale");
    return (stored === "en" || stored === "ar") ? stored : "ar";
  });

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("app-locale", l);
  }, []);

  const dir = locale === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", locale);
  }, [locale, dir]);

  const t = useCallback((key: string, fallback?: string): string => {
    return translations[locale]?.[key] ?? fallback ?? key;
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, dir, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}
