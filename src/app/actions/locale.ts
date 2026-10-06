"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isLocale, LOCALE_COOKIE, LOCALE_COOKIE_OPTIONS, type Locale } from "@/i18n";
import { getSession } from "@/lib/session";
import { track } from "@/lib/analytics/track";

export async function setLocale(locale: Locale) {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, LOCALE_COOKIE_OPTIONS);
  // Also offered on the login page, before any session.
  const session = await getSession();
  if (session) track({ accountId: session.user.accountId as string, therapistId: session.user.id }, "locale.changed", { locale });
  revalidatePath("/", "layout");
}
