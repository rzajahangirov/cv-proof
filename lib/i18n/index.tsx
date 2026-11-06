"use client";

import { createContext, useContext, useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { intlLocales, translate } from "@/lib/i18n/core";
import type { Translate } from "@/lib/i18n/core";
import { useStore } from "@/lib/store";
import type { Lang } from "@/lib/types";

type I18nValue = {
  locale: Lang;
  t: Translate;
  formatDate: (value: string, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useStore((state) => state.locale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18nValue>(() => {
    const tag = intlLocales[locale];
    return {
      locale,
      t: (key, vars) => translate(locale, key, vars),
      formatDate: (date, options) => new Intl.DateTimeFormat(tag, options).format(new Date(date)),
      formatNumber: (number) => new Intl.NumberFormat(tag).format(number),
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside I18nProvider");
  return value;
}

export function useT(): Translate {
  return useI18n().t;
}
