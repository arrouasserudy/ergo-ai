"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { createI18n, type I18n, type Locale } from ".";

const I18nContext = createContext<I18n | null>(null);

/**
 * Only the locale, time zone and hidden mode cross the server/client boundary (the dictionaries
 * contain functions); the client rebuilds the same helpers from them.
 */
export function I18nProvider({ locale, timeZone, hideNames, children }: { locale: Locale; timeZone: string; hideNames: boolean; children: ReactNode }) {
  const value = useMemo(() => createI18n(locale, timeZone, hideNames), [locale, timeZone, hideNames]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside <I18nProvider>");
  return value;
}
