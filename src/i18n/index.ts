/**
 * Locale-aware helpers shared by server and client code.
 * Server components get an instance from `getI18n()` (i18n/server.ts),
 * client components from `useI18n()` (i18n/client.tsx).
 */
import { fr, type Dictionary } from "./fr";
import { he } from "./he";

export const LOCALES = ["fr", "he"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "fr";
export const LOCALE_COOKIE = "locale";

/** Name of each language in its own language, for the switcher. */
export const LOCALE_NAMES: Record<Locale, string> = { fr: "Français", he: "עברית" };

const dictionaries: Record<Locale, Dictionary> = { fr, he };
const intlLocales: Record<Locale, string> = { fr: "fr-FR", he: "he-IL" };

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

export function createI18n(locale: Locale, timeZone: string) {
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
    shortDate: (date: Date) => date.toLocaleDateString(intl, { timeZone, day: "numeric", month: "short" }),
    time: (date: Date) => date.toLocaleTimeString(intl, { timeZone, hour: "2-digit", minute: "2-digit" }),

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
