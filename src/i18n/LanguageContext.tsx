import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { Language, TranslationDictionary } from './types';
export type { Language, TranslationDictionary } from './types';
import { translations } from './translations';
import { parseISO, isToday, isYesterday, isTomorrow, format } from 'date-fns';

const LANGUAGE_STORAGE_KEY = 'kairo_app_language';

// Global helper to get currently stored language (defaults to 'uz')
export function getStoredLanguage(): Language {
  if (typeof window === 'undefined') return 'uz';
  const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language | null;
  if (saved && (saved === 'uz' || saved === 'en' || saved === 'ru')) {
    return saved;
  }
  // Default to Uzbek as requested
  return 'uz';
}

// Global helper to set stored language
export function setStoredLanguage(lang: Language): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  window.dispatchEvent(new CustomEvent('kairo:language-changed', { detail: lang }));
}

// Dotted path resolver for translations: tDirect('priorities.slotTitle', { number: 1 })
export function tDirect(
  keyPath: string,
  params?: Record<string, string | number>,
  langOverride?: Language
): string {
  const lang = langOverride || getStoredLanguage();
  const dict = translations[lang] || translations.uz;

  const parts = keyPath.split('.');
  let current: any = dict;

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      // Fallback to English or key itself if missing
      const enDict = translations.en as any;
      let enFallback: any = enDict;
      for (const p of parts) {
        if (enFallback && typeof enFallback === 'object' && p in enFallback) {
          enFallback = enFallback[p];
        } else {
          enFallback = null;
          break;
        }
      }
      current = typeof enFallback === 'string' ? enFallback : keyPath;
      break;
    }
  }

  if (typeof current !== 'string') {
    return keyPath;
  }

  if (!params) {
    return current;
  }

  let result = current;
  for (const [k, v] of Object.entries(params)) {
    result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  }
  return result;
}

// Localized Date Formatter Helpers
export function formatDateDirect(dateStr: string, langOverride?: Language): string {
  try {
    const lang = langOverride || getStoredLanguage();
    const dict = translations[lang] || translations.uz;
    const date = parseISO(dateStr);
    const day = date.getDate();
    const monthIndex = date.getMonth();
    const weekdayIndex = (date.getDay() + 6) % 7; // 0 = Mon, 6 = Sun

    const monthName = (lang === 'ru' && dict.date.monthsGenitive?.[monthIndex])
      ? dict.date.monthsGenitive[monthIndex]
      : (dict.date.months[monthIndex] || format(date, 'MMM'));
    const weekdayName = dict.date.weekdaysShort[weekdayIndex] || format(date, 'EEE');

    if (lang === 'uz') {
      return `${day}-${monthName}, ${weekdayName}`;
    } else if (lang === 'ru') {
      return `${day} ${monthName}, ${weekdayName}`;
    } else {
      return `${weekdayName}, ${monthName} ${day}`;
    }
  } catch {
    return dateStr;
  }
}

export function formatMonthYearDirect(date: Date, langOverride?: Language): string {
  try {
    const lang = langOverride || getStoredLanguage();
    const dict = translations[lang] || translations.uz;
    const monthName = dict.date.months[date.getMonth()] || format(date, 'MMMM');
    const year = date.getFullYear();

    if (lang === 'uz') {
      return `${monthName} ${year}`;
    } else if (lang === 'ru') {
      return `${monthName} ${year}`;
    } else {
      return `${monthName} ${year}`;
    }
  } catch {
    return format(date, 'MMMM yyyy');
  }
}

export function getRelativeDayDirect(dateStr: string, langOverride?: Language): string {
  try {
    const lang = langOverride || getStoredLanguage();
    const dict = translations[lang] || translations.uz;
    const date = parseISO(dateStr);

    if (isToday(date)) return dict.common.today;
    if (isYesterday(date)) return dict.common.yesterday;
    if (isTomorrow(date)) return dict.common.tomorrow;

    const day = date.getDate();
    const monthIndex = date.getMonth();
    const monthName = (lang === 'ru' && dict.date.monthsGenitive?.[monthIndex])
      ? dict.date.monthsGenitive[monthIndex]
      : dict.date.months[monthIndex];
    return `${day} ${monthName}`;
  } catch {
    return dateStr;
  }
}

export type TranslationFunction = ((keyPath: string, params?: Record<string, string | number>) => string) &
  TranslationDictionary;

export interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationFunction;
  dictionary: TranslationDictionary;
  isUz: boolean;
  isEn: boolean;
  isRu: boolean;
  formatDisplayDate: (dateStr: string) => string;
  formatMonthYear: (date: Date) => string;
  getRelativeDayLabel: (dateStr: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => getStoredLanguage());

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    setStoredLanguage(lang);
  }, []);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === LANGUAGE_STORAGE_KEY && e.newValue) {
        const nextLang = e.newValue as Language;
        if (nextLang === 'uz' || nextLang === 'en' || nextLang === 'ru') {
          setLanguageState(nextLang);
        }
      }
    };

    const handleCustomChange = (e: any) => {
      if (e.detail && (e.detail === 'uz' || e.detail === 'en' || e.detail === 'ru')) {
        setLanguageState(e.detail);
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('kairo:language-changed', handleCustomChange);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('kairo:language-changed', handleCustomChange);
    };
  }, []);

  const dictionary = useMemo(() => {
    return translations[language] || translations.uz;
  }, [language]);

  const t: TranslationFunction = useMemo(() => {
    const fn = (keyPath: string, params?: Record<string, string | number>): string => {
      return tDirect(keyPath, params, language);
    };
    return Object.assign(fn, dictionary) as TranslationFunction;
  }, [language, dictionary]);

  const formatDisplayDate = useCallback(
    (dateStr: string): string => {
      return formatDateDirect(dateStr, language);
    },
    [language]
  );

  const formatMonthYear = useCallback(
    (date: Date): string => {
      return formatMonthYearDirect(date, language);
    },
    [language]
  );

  const getRelativeDayLabel = useCallback(
    (dateStr: string): string => {
      return getRelativeDayDirect(dateStr, language);
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      dictionary,
      isUz: language === 'uz',
      isEn: language === 'en',
      isRu: language === 'ru',
      formatDisplayDate,
      formatMonthYear,
      getRelativeDayLabel,
    }),
    [language, setLanguage, t, dictionary, formatDisplayDate, formatMonthYear, getRelativeDayLabel]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export function useTranslation(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    // Fallback for components used outside Provider
    const fallbackLang = getStoredLanguage();
    const fallbackDict = translations[fallbackLang] || translations.uz;
    const fallbackFn = (k: string, p?: Record<string, string | number>) => tDirect(k, p, fallbackLang);
    const fallbackT = Object.assign(fallbackFn, fallbackDict) as TranslationFunction;
    return {
      language: fallbackLang,
      setLanguage: setStoredLanguage,
      t: fallbackT,
      dictionary: fallbackDict,
      isUz: fallbackLang === 'uz',
      isEn: fallbackLang === 'en',
      isRu: fallbackLang === 'ru',
      formatDisplayDate: (d) => formatDateDirect(d, fallbackLang),
      formatMonthYear: (d) => formatMonthYearDirect(d, fallbackLang),
      getRelativeDayLabel: (d) => getRelativeDayDirect(d, fallbackLang),
    };
  }
  return context;
}

export const useLanguage = useTranslation;
