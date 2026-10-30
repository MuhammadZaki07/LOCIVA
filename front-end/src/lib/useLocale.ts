import { useState, useCallback } from "react";
import { en, id } from "./locales";
import type { Locale, Translations } from "./locales";

const STORAGE_KEY = "lociva_locale";

const DICTIONARIES: Record<Locale, Translations> = { en, id };

export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "id") {
      return stored;
    }
    return "en";
  });

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const t = useCallback(
    (key: keyof Translations): string => {
      return DICTIONARIES[locale][key];
    },
    [locale],
  );

  return { locale, setLocale, t };
}
