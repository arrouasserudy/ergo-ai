/**
 * Month grids for the calendar (pure, tested). Days are ISO calendar dates (YYYY-MM-DD)
 * computed with UTC arithmetic only: a day is never derived from a local instant, so DST
 * changes in the practice's time zone cannot skip or repeat a cell. "Today" comes from
 * the caller (`localToday()`, in APP_TIME_ZONE).
 */
import type { Locale } from "@/i18n";

/** 0 = Sunday, 1 = Monday. */
export type WeekStart = 0 | 1;

/** Sunday in Israel (Hebrew), Monday in France; Monday for English too (en-GB). */
export function weekStartOf(locale: Locale): WeekStart {
  return locale === "he" ? 0 : 1;
}

/** "YYYY-MM" with a real month, else null. */
export function parseMonth(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}$/.test(value)) return null;
  const month = Number(value.slice(5));
  return month >= 1 && month <= 12 ? value : null;
}

export function monthOf(day: string): string {
  return day.slice(0, 7);
}

const toUtc = (day: string) => Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)));
const fromUtc = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** `day` shifted by `n` days. */
export function addDays(day: string, n: number): string {
  const date = new Date(toUtc(day));
  date.setUTCDate(date.getUTCDate() + n);
  return fromUtc(date.getTime());
}

/** `month` ("YYYY-MM") shifted by `n` months. */
export function addMonths(month: string, n: number): string {
  const index = Number(month.slice(0, 4)) * 12 + Number(month.slice(5)) - 1 + n;
  return `${String(Math.floor(index / 12)).padStart(4, "0")}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/** Day of the week, 0 = Sunday. */
export function weekdayOf(day: string): number {
  return new Date(toUtc(day)).getUTCDay();
}

export type GridDay = { day: string; inMonth: boolean };

/**
 * The weeks shown for a month: from the week (per `weekStart`) containing the 1st to the
 * week containing the last day, so leading and trailing days of the neighbouring months
 * fill the first and last rows. 4 to 6 rows of 7 days.
 */
export function monthGrid(month: string, weekStart: WeekStart): GridDay[][] {
  const first = `${month}-01`;
  const last = addDays(`${addMonths(month, 1)}-01`, -1);
  const lead = (weekdayOf(first) - weekStart + 7) % 7;
  const trail = (weekStart + 6 - weekdayOf(last) + 7) % 7;
  const start = addDays(first, -lead);
  const total = lead + Number(last.slice(8)) + trail;

  const weeks: GridDay[][] = [];
  for (let i = 0; i < total; i++) {
    const day = addDays(start, i);
    if (i % 7 === 0) weeks.push([]);
    weeks.at(-1)!.push({ day, inMonth: monthOf(day) === month });
  }
  return weeks;
}

/** First and last day shown by a month's grid (the range events are loaded for). */
export function gridRange(month: string, weekStart: WeekStart): { from: string; to: string } {
  const weeks = monthGrid(month, weekStart);
  return { from: weeks[0][0].day, to: weeks.at(-1)!.at(-1)!.day };
}

/** The seven weekdays (0 = Sunday) in display order. */
export function weekdayOrder(weekStart: WeekStart): number[] {
  return Array.from({ length: 7 }, (_, i) => (weekStart + i) % 7);
}
