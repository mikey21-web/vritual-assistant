import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import en from '../locales/en.json';

type Locale = 'en';
type Translations = typeof en;

const SUPPORTED_LOCALES: Record<Locale, Translations> = { en };

interface I18nContext {
  locale: Locale;
  t: (key: string) => string;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContext | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof localStorage === 'undefined') return 'en';
    return (localStorage.getItem('locale') as Locale) || 'en';
  });

  const t = (key: string): string => {
    const translations = SUPPORTED_LOCALES[locale] || en;
    const parts = key.split('.');
    let value: any = translations;
    for (const part of parts) {
      value = value?.[part];
    }
    return value || key;
  };

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    if (typeof localStorage !== 'undefined') localStorage.setItem('locale', newLocale);
  };

  return <I18nContext.Provider value={{ locale, t, setLocale }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
