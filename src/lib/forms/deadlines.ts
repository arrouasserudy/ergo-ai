/**
 * Yearly deadlines of auto-assigned forms. A deadline is a day of the year ("10-01");
 * each school year (from the cabinet's `schoolYearStart`) it falls due once. Dates are
 * ISO strings (YYYY-MM-DD) in the practice's time zone. Pure: no clock, no database.
 */

export type Urgency = "none" | "soon" | "overdue";

export const DEFAULT_WARN_DAYS = 14;
export const DEFAULT_SCHOOL_YEAR_START = "09-01";

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** A valid "MM-DD" (29 February allowed). */
export function isDayMonth(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{2}-\d{2}$/.test(value)) return false;
  const [month, day] = value.split("-").map(Number);
  return month >= 1 && month <= 12 && day >= 1 && day <= DAYS_IN_MONTH[month - 1];
}

const isLeap = (year: number) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

/** "MM-DD" in a given year; 29 February becomes the 28th in other years. */
export function inYear(dayMonth: string, year: number): string {
  const md = dayMonth === "02-29" && !isLeap(year) ? "02-28" : dayMonth;
  return `${year}-${md}`;
}

/** First day of the school year that contains `today`. */
export function schoolYearStartDate(schoolYearStart: string, today: string): string {
  const year = Number(today.slice(0, 4));
  const thisYear = inYear(schoolYearStart, year);
  return today >= thisYear ? thisYear : inYear(schoolYearStart, year - 1);
}

/**
 * The due date of a yearly deadline for the current school year: its first occurrence
 * on or after the start of the school year (a June deadline falls in the next calendar year).
 */
export function dueDateFor(deadline: string, schoolYearStart: string, today: string): string {
  const start = schoolYearStartDate(schoolYearStart, today);
  const year = Number(start.slice(0, 4));
  const sameYear = inYear(deadline, year);
  return sameYear >= start ? sameYear : inYear(deadline, year + 1);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** Overdue once the due date has passed; "soon" within `warnDays` days of it (inclusive). */
export function urgency(dueDate: string | null, today: string, warnDays: number, submitted = false): Urgency {
  if (!dueDate || submitted) return "none";
  const left = daysBetween(today, dueDate);
  if (left < 0) return "overdue";
  return left <= warnDays ? "soon" : "none";
}

/** The worse of two levels (a child's badge shows its most urgent form). */
export function worse(a: Urgency, b: Urgency): Urgency {
  const rank = { none: 0, soon: 1, overdue: 2 };
  return rank[a] >= rank[b] ? a : b;
}
