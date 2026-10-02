/**
 * The cabinet's calendar (pure, tested): what is planned, not what was logged. Events added
 * on a child's file (intakes, parent guidance, report due dates, other), the due dates of
 * forms still to fill in (with their orange/red urgency), and each child's birthday every
 * year. Crises, reports written, forms filled in… stay in the child's timeline. Keys and
 * user content only; labels are translated at display.
 */
import { CHILD_EVENT_KINDS, type ChildEventKind } from "@/db/schema";
import { inYear, urgency, type Urgency } from "@/lib/forms/deadlines";
import { isIsoDate } from "@/lib/timeline/events";

/** Legend entries and type filters, in display order. */
export const CALENDAR_TYPES = [...CHILD_EVENT_KINDS, "deadline", "birthday"] as const;
export type CalendarType = (typeof CALENDAR_TYPES)[number];

type DayBase = {
  id: string;
  childId: string;
  /** The local day (YYYY-MM-DD). */
  day: string;
  /** Local time ("HH:MM") of a meeting, if set. */
  time: string | null;
  href: string;
};

export type CalendarEvent =
  | (DayBase & { kind: "birthday"; age: number })
  | (DayBase & { kind: "deadline"; title: string; urgency: Urgency })
  | (DayBase & {
      kind: ChildEventKind;
      eventId: string;
      details: string | null;
      report: { docType: string; sessionDate: string } | null;
      done: boolean;
      urgency: Urgency;
    });
export type CalendarKind = CalendarEvent["kind"];

export function typeOf(kind: CalendarKind): CalendarType {
  return kind;
}

export type DayRange = { from: string; to: string };

const inRange = (day: string, { from, to }: DayRange) => day >= from && day <= to;

/** Where an event without a page of its own leads: the child's overview, the event open for editing. */
export const childEventHref = (childId: string, eventId: string) => `/children/${childId}?event=${eventId}`;

/**
 * Every birthday of a child within the range, the birth itself included (age 0).
 * Born on 29 February: the 28th in other years (as yearly form deadlines).
 */
export function birthdaysInRange(birthDate: string | null, range: DayRange): { day: string; age: number }[] {
  if (!isIsoDate(birthDate)) return [];
  const birthYear = Number(birthDate.slice(0, 4));
  const result: { day: string; age: number }[] = [];
  for (let year = Math.max(birthYear, Number(range.from.slice(0, 4))); year <= Number(range.to.slice(0, 4)); year++) {
    const day = inYear(birthDate.slice(5), year);
    if (inRange(day, range) && day >= birthDate) result.push({ day, age: year - birthYear });
  }
  return result;
}

export function birthdayEvents(child: { id: string; birthDate: string | null }, range: DayRange): CalendarEvent[] {
  return birthdaysInRange(child.birthDate, range).map(({ day, age }) => ({
    id: `${child.id}:birthday:${day}`,
    kind: "birthday" as const,
    childId: child.id,
    day,
    time: null,
    href: `/children/${child.id}`,
    age,
  }));
}

export type EventInput = {
  id: string;
  childId: string;
  kind: ChildEventKind;
  date: string;
  time: string | null;
  details: string | null;
  report: { id: string; docType: string; sessionDate: string } | null;
  done: boolean;
  urgency: Urgency;
};

/** Events added on the children's files, within the range. A report due date leads to the report. */
export function childEventEntries(events: EventInput[], range: DayRange): CalendarEvent[] {
  return events
    .filter((e) => isIsoDate(e.date) && inRange(e.date, range))
    .map((e) => ({
      id: `${e.childId}:event:${e.id}`,
      kind: e.kind,
      eventId: e.id,
      childId: e.childId,
      day: e.date,
      time: e.time,
      href: e.kind === "report_due" && e.report ? `/reports/${e.report.id}` : childEventHref(e.childId, e.id),
      details: e.details,
      report: e.report && { docType: e.report.docType, sessionDate: e.report.sessionDate },
      done: e.done,
      urgency: e.urgency,
    }));
}

export type DeadlineInput = { id: string; childId: string; title: string; dueDate: string | null; submitted: boolean };

/** Due dates of forms not yet submitted, within the range, with their urgency as of `today`. */
export function deadlineEvents(forms: DeadlineInput[], range: DayRange, today: string, warnDays: number): CalendarEvent[] {
  return forms
    .filter((form): form is DeadlineInput & { dueDate: string } => !form.submitted && isIsoDate(form.dueDate) && inRange(form.dueDate, range))
    .map((form) => ({
      id: `${form.childId}:deadline:${form.id}`,
      kind: "deadline" as const,
      childId: form.childId,
      day: form.dueDate,
      time: null,
      href: `/children/${form.childId}/forms/${form.id}`,
      title: form.title,
      urgency: urgency(form.dueDate, today, warnDays),
    }));
}

/** Order within a day: birthdays, to-dos, then meetings without a time, then by time. */
const RANK: Record<CalendarKind, number> = {
  birthday: 0,
  deadline: 1,
  report_due: 2,
  intake: 3,
  parent_guidance: 3,
  other: 3,
};

export function sortCalendar(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((x, y) => {
    if (x.day !== y.day) return x.day < y.day ? -1 : 1;
    if ((x.time ?? "") !== (y.time ?? "")) return (x.time ?? "") < (y.time ?? "") ? -1 : 1;
    if (RANK[x.kind] !== RANK[y.kind]) return RANK[x.kind] - RANK[y.kind];
    return x.id < y.id ? -1 : x.id > y.id ? 1 : 0;
  });
}

export type CalendarFilter = { children: string[]; types: CalendarType[] };

/** An empty list means "all" (all children, all types). */
export function filterCalendar(events: CalendarEvent[], { children, types }: CalendarFilter): CalendarEvent[] {
  return events.filter((e) => (children.length === 0 || children.includes(e.childId)) && (types.length === 0 || types.includes(typeOf(e.kind))));
}

/** Events per local day, in the given order. */
export function groupByDay(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const days = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const list = days.get(event.day);
    if (list) list.push(event);
    else days.set(event.day, [event]);
  }
  return days;
}

/** A comma-separated URL parameter ("a,b") as a list of distinct non-empty values. */
export function parseList(value: unknown): string[] {
  const raw = Array.isArray(value) ? value.join(",") : typeof value === "string" ? value : "";
  return [...new Set(raw.split(",").map((v) => v.trim()).filter(Boolean))].slice(0, 200);
}

export function parseTypes(value: unknown): CalendarType[] {
  return parseList(value).filter((v): v is CalendarType => (CALENDAR_TYPES as readonly string[]).includes(v));
}
