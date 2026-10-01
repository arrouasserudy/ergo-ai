/**
 * The cabinet's calendar (pure, tested): every child's timeline events within a range
 * (built by `buildTimeline`, never re-extracted here), plus what only a calendar needs:
 * a birthday every year instead of the single birth event, and the due dates of forms
 * still to fill in (the future, with their orange/red urgency). Keys and user content
 * only; labels are translated at display.
 */
import { inYear, urgency, type Urgency } from "@/lib/forms/deadlines";
import { isIsoDate, type TimelineEvent } from "@/lib/timeline/events";

/** Legend entries and type filters, in display order. The child's milestones share one. */
export const CALENDAR_TYPES = ["crisis", "difficulty", "report", "form", "formDate", "assessment", "deadline", "birthday", "milestone"] as const;
export type CalendarType = (typeof CALENDAR_TYPES)[number];

type DayBase = { id: string; childId: string; date: string; day: string; precision: "day"; href: string };

type Milestone = "birth" | "followUp" | "fileCreated";
/** Timeline events but the birth (a calendar shows birthdays instead). */
type TimelineButBirth =
  | Exclude<TimelineEvent, { kind: Milestone }>
  | (Omit<Extract<TimelineEvent, { kind: Milestone }>, "kind"> & { kind: Exclude<Milestone, "birth"> });

export type CalendarEvent =
  | (TimelineButBirth & { childId: string })
  | (DayBase & { kind: "birthday"; age: number })
  | (DayBase & { kind: "deadline"; title: string; urgency: Urgency });
export type CalendarKind = CalendarEvent["kind"];

export function typeOf(kind: CalendarKind): CalendarType {
  return kind === "followUp" || kind === "fileCreated" ? "milestone" : kind;
}

export type DayRange = { from: string; to: string };

const inRange = (day: string, { from, to }: DayRange) => day >= from && day <= to;

/** Where an event without a page of its own leads: the child's timeline. */
export const childTimelineHref = (childId: string) => `/children/${childId}/timeline`;

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

/** One child's events within the range: its timeline (birth replaced by birthdays), ids made unique across children. */
export function childCalendarEvents(child: { id: string; birthDate: string | null }, timeline: TimelineEvent[], range: DayRange): CalendarEvent[] {
  const fallback = childTimelineHref(child.id);
  const events: CalendarEvent[] = [];
  for (const event of timeline) {
    if (event.kind === "birth" || !inRange(event.day, range)) continue;
    events.push({ ...event, kind: event.kind, id: `${child.id}:${event.id}`, childId: child.id, href: event.href ?? fallback } as CalendarEvent); // TS cannot narrow the milestone member's kind through the spread.
  }
  for (const { day, age } of birthdaysInRange(child.birthDate, range)) {
    events.push({ id: `${child.id}:birthday:${day}`, kind: "birthday", childId: child.id, date: day, day, precision: "day", href: fallback, age });
  }
  return events;
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
      date: form.dueDate,
      day: form.dueDate,
      precision: "day" as const,
      href: `/children/${form.childId}/forms/${form.id}`,
      title: form.title,
      urgency: urgency(form.dueDate, today, warnDays),
    }));
}

/** Order within a day: birthdays and deadlines first, then dated-only events, then timed ones by time. */
const RANK: Record<CalendarKind, number> = {
  birthday: 0,
  deadline: 1,
  followUp: 2,
  fileCreated: 2,
  formDate: 3,
  assessment: 4,
  report: 5,
  form: 6,
  crisis: 7,
  difficulty: 7,
};

export function sortCalendar(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((x, y) => {
    if (x.day !== y.day) return x.day < y.day ? -1 : 1;
    if (x.precision !== y.precision) return x.precision === "day" ? -1 : 1;
    if (x.precision === "datetime" && x.date !== y.date) return x.date < y.date ? -1 : 1;
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
