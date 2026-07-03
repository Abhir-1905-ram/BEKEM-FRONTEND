import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { APP_LOCALE_CODES, type AppLocale } from '@afios/shared';
import { en, type TranslationTree } from './locales/en';
import { localeOverrides } from './locale-overrides';
import { deepMerge } from './deepMerge';
import { useAuthStore } from '@/stores/authStore';

type NestedKeyOf<T, Prefix extends string = ''> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? NestedKeyOf<T[K], `${Prefix}${K}.`>
        : `${Prefix}${K}`;
    }[keyof T & string]
  : never;

export type TranslationKey = NestedKeyOf<typeof en>;

interface I18nContextValue {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);
const STORAGE_KEY = 'bekem-locale';

function resolve(obj: Record<string, unknown>, path: string): string {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return path;
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === 'string' ? cur : path;
}

function normalizeLocale(raw: string | null | undefined): AppLocale {
  if (raw && APP_LOCALE_CODES.includes(raw as AppLocale)) return raw as AppLocale;
  return 'en';
}

function messagesFor(locale: AppLocale): TranslationTree {
  if (locale === 'en') return en;
  const patch = localeOverrides[locale];
  return patch ? deepMerge(en, patch) : en;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const userLocale = useAuthStore((s) => s.user?.locale);
  const [locale, setLocaleState] = useState<AppLocale>(() =>
    normalizeLocale(localStorage.getItem(STORAGE_KEY))
  );

  useEffect(() => {
    if (userLocale) setLocaleState(normalizeLocale(userLocale));
  }, [userLocale]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = ['ur', 'ks', 'sd'].includes(locale) ? 'rtl' : 'ltr';
  }, [locale]);

  const setLocale = (next: AppLocale) => {
    setLocaleState(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  const messages = useMemo(() => messagesFor(locale), [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key) => resolve(messages as unknown as Record<string, unknown>, key),
    }),
    [locale, messages]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
