/**
 * The "up to date" week of the home page (pure, tested). A week is up to date when, at the
 * end of its last day, no form is overdue and no draft report is older than
 * `STALE_DRAFT_DAYS`; the streak counts such weeks in a row, up to last week. Days are
 * ISO dates in the practice's time zone. Only paperwork counts: never crises, tests or
 * the number of reports written.
 */
import { addDays, weekdayOf, type WeekStart } from "@/lib/calendar/month";
import { daysBetween } from "@/lib/forms/deadlines";

/** A draft left untouched longer than this is late. */
export const STALE_DRAFT_DAYS = 14;
/** How far back the streak looks. */
export const MAX_STREAK_WEEKS = 52;

/** A child form with a due date; `submittedOn` is the day it was filled in. */
export type DueForm = { dueDate: string; submittedOn: string | null };
/** A report: the day it was written and the day it stopped being a draft (null while it is one). */
export type ReportSpan = { createdOn: string; closedOn: string | null };

export type WeekState = {
  /** First and last day of the current week. */
  start: string;
  end: string;
  /** Up-to-date weeks in a row, up to last week. */
  streak: number;
  /** Items late today: they break the streak if still late at the end of the week. */
  late: number;
  /** To-do items cleared this week, and what is left on the list. */
  cleared: number;
  remaining: number;
};

/** First day of the week containing `day`. */
export function weekStartDay(day: string, weekStart: WeekStart): string {
  return addDays(day, -((weekdayOf(day) - weekStart + 7) % 7));
}

const doneBy = (on: string | null, day: string) => on !== null && on <= day;

/** Overdue forms and stale drafts at the end of `day`. */
export function lateOn(day: string, forms: DueForm[], reports: ReportSpan[], staleDays = STALE_DRAFT_DAYS): number {
  const staleBefore = addDays(day, -staleDays);
  return (
    forms.filter((f) => f.dueDate < day && !doneBy(f.submittedOn, day)).length +
    reports.filter((r) => r.createdOn <= staleBefore && !doneBy(r.closedOn, day)).length
  );
}

/**
 * The current week: the streak before it, what is late today, and the progress of the
 * to-do list (forms filled in while on the list, i.e. within `warnDays` of their due
 * date, and reports finished this week). `since` is the day the cabinet was created: a
 * week that ended before it does not count. `remaining` is the current to-do list size.
 */
export function weekState(input: {
  forms: DueForm[];
  reports: ReportSpan[];
  today: string;
  since: string;
  weekStart: WeekStart;
  warnDays: number;
  remaining: number;
}): WeekState {
  const { forms, reports, today, since, weekStart, warnDays, remaining } = input;
  const start = weekStartDay(today, weekStart);

  let streak = 0;
  for (let i = 1; i <= MAX_STREAK_WEEKS; i++) {
    const end = addDays(start, 6 - 7 * i); // last day of the week i weeks ago
    if (end < since || lateOn(end, forms, reports) > 0) break;
    streak++;
  }

  const thisWeek = (on: string | null): on is string => on !== null && on >= start && on <= today;
  const cleared =
    forms.filter((f) => thisWeek(f.submittedOn) && daysBetween(f.submittedOn, f.dueDate) <= warnDays).length +
    reports.filter((r) => thisWeek(r.closedOn)).length;

  return { start, end: addDays(start, 6), streak, late: lateOn(today, forms, reports), cleared, remaining };
}
