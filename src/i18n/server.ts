import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { APP_TIME_ZONE } from "@/lib/time";
import { createI18n, DEFAULT_LOCALE, HIDE_NAMES_COOKIE, isLocale, LOCALE_COOKIE } from ".";

export const getLocale = cache(async () => {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
});

/** Hidden mode, kept per device like the locale (settings page). */
export const getHideNames = cache(async () => (await cookies()).get(HIDE_NAMES_COOKIE)?.value === "1");

/** The request's i18n helpers (locale and hidden mode from cookies). */
export const getI18n = cache(async () => createI18n(await getLocale(), APP_TIME_ZONE, await getHideNames()));
