/**
 * Locale-aware helpers shared by server and client code.
 * Server components get an instance from `getI18n()` (i18n/server.ts),
 * client components from `useI18n()` (i18n/client.tsx).
 */
import { maskedName } from "@/lib/child-name";
import { fr, type Dictionary } from "./fr";
import { en } from "./en";
import { he } from "./he";

export const LOCALES = ["fr", "he", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "fr";
export const LOCALE_COOKIE = "locale";
/** The locale cookie is kept per device for a year. */
export const LOCALE_COOKIE_OPTIONS = { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" } as const;
/** Set when hidden mode is on (settings): child names are replaced by initials + id. */
export const HIDE_NAMES_COOKIE = "hide_names";

/** Name of each language in its own language, for the switcher. */
export const LOCALE_NAMES: Record<Locale, string> = { fr: "Français", he: "עברית", en: "English" };

const dictionaries: Record<Locale, Dictionary> = { fr, he, en };
const intlLocales: Record<Locale, string> = { fr: "fr-FR", he: "he-IL", en: "en-GB" };

/**
 * Wraps text in Unicode direction isolates so Latin initials keep their order inside
 * Hebrew text ("L. M." instead of ".L. M"). Safe in plain strings, e.g. page titles.
 */
export function isolate(text: string): string {
  return `\u2068${text}\u2069`;
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Age in whole months between an ISO birth date and `now`. */
export function ageInMonths(birthDate: string, now = new Date()): number {
  const birth = new Date(`${birthDate}T00:00:00`);
  let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) months -= 1;
  return Math.max(0, months);
}

/**
 * Translates a validation/error code produced on the server
 * ("required", "tooLong:200", "emailTaken"…). Unknown codes fall back to a generic message.
 */
function translateError(t: Dictionary, code: string): string {
  const [key, arg] = code.split(":");
  if (key === "tooLong") return t.errors.tooLong(Number(arg));
  const message = (t.errors as Record<string, unknown>)[key];
  return typeof message === "string" ? message : t.errors.generic;
}

export function createI18n(locale: Locale, timeZone: string, hideNames = false) {
  const t = dictionaries[locale];
  const intl = intlLocales[locale];

  return {
    locale,
    dir: (locale === "he" ? "rtl" : "ltr") as "rtl" | "ltr",
    t,
    /** Profile tag / calming strategy label, or the raw value for custom entries. */
    tag: (value: string) => t.tags[value] ?? value,
    cause: (value: string) => t.causes[value]?.label ?? value,
    situation: (value: string) => t.situations[value] ?? value,
    error: (code: string | undefined) => (code ? translateError(t, code) : undefined),

    hideNames,
    /** The child's name for display: initials + id in hidden mode. */
    childName: (child: { id: string; name: string }) => (hideNames ? maskedName(child) : child.name),

    /** Date-only ISO string (YYYY-MM-DD), e.g. "15 janv. 2026". */
    date: (iso: string | null | undefined) => {
      if (!iso) return "";
      const date = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
      if (Number.isNaN(date.getTime())) return iso;
      return date.toLocaleDateString(intl, { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
    },
    /** Timestamps are shown in the practice's time zone, not the server's. */
    dateTime: (date: Date) =>
      date.toLocaleString(intl, { timeZone, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
    /** Today's heading, e.g. "jeudi 1 octobre 2026". */
    longDate: (date: Date) => date.toLocaleDateString(intl, { timeZone, weekday: "long", day: "numeric", month: "long", year: "numeric" }),
    shortDate: (date: Date) => date.toLocaleDateString(intl, { timeZone, day: "numeric", month: "short" }),
    time: (date: Date) => date.toLocaleTimeString(intl, { timeZone, hour: "2-digit", minute: "2-digit" }),
    /** A yearly date "MM-DD", e.g. "1 oct." (a leap year, so 29 February works). */
    dayMonth: (value: string) =>
      new Date(`2000-${value}T00:00:00Z`).toLocaleDateString(intl, { timeZone: "UTC", day: "numeric", month: "short" }),
    /** A month "YYYY-MM" as a title, e.g. "octobre 2026". */
    monthTitle: (month: string) =>
      new Date(`${month}-01T00:00:00Z`).toLocaleDateString(intl, { timeZone: "UTC", month: "long", year: "numeric" }),
    /** A weekday name, 0 = Sunday (1 January 2023 was a Sunday), e.g. "lun." or "L". */
    weekday: (index: number, width: "short" | "narrow" | "long" = "short") =>
      new Date(Date.UTC(2023, 0, 1 + index)).toLocaleDateString(intl, { timeZone: "UTC", weekday: width }),
    /** A day "YYYY-MM-DD" with its weekday, e.g. "jeudi 1 octobre". */
    dayLong: (iso: string) =>
      new Date(`${iso}T00:00:00Z`).toLocaleDateString(intl, { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }),
    /** Month names, January first, for day/month pickers. */
    monthNames: () => Array.from({ length: 12 }, (_, i) => new Date(Date.UTC(2000, i, 1)).toLocaleDateString(intl, { timeZone: "UTC", month: "long" })),

    /** Months under 2 years, half-years under 4, whole years after; null when unknown. */
    age: (birthDate: string | null, now = new Date()) => {
      if (!birthDate) return null;
      const months = ageInMonths(birthDate, now);
      if (months < 24) return t.age.months(months);
      const years = Math.floor(months / 12);
      if (years < 4 && months % 12 >= 6) return t.age.yearsAndHalf(years);
      return t.age.years(years);
    },
  };
}

export type I18n = ReturnType<typeof createI18n>;
