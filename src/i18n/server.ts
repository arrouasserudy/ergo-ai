import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { APP_TIME_ZONE } from "@/lib/time";
import { createI18n, DEFAULT_LOCALE, isLocale, LOCALE_COOKIE } from ".";

export const getLocale = cache(async () => {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
});

/** The request's i18n helpers (locale from the cookie). */
export const getI18n = cache(async () => createI18n(await getLocale(), APP_TIME_ZONE));
