/**
 * Events planned for a child by hand (pure, tested): validation of the add/edit form,
 * the state of a report due date, and what the child's overview lists as upcoming.
 * Error codes only ("required", "tooLong:500"…), translated at display.
 */
import { CHILD_EVENT_KINDS, type ChildEventKind } from "@/db/schema";
import { urgency, type Urgency } from "@/lib/forms/deadlines";
import { isIsoDate } from "@/lib/timeline/events";

export const DETAILS_MAX = 500;

export type EventInput = { kind: ChildEventKind; date: string; time: string | null; reportId: string | null; details: string | null };
export type EventErrors = Partial<Record<"kind" | "date" | "time" | "reportId" | "details", string>>;

const isTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/**
 * Checks a submitted event. `reportIds`: the child's reports (a report due date must name
 * one of them). A report due date has no time; the details are required for "other".
 */
export function parseEventInput(raw: Record<string, unknown>, reportIds: string[]): { ok: true; data: EventInput } | { ok: false; errors: EventErrors } {
  const errors: EventErrors = {};
  const kind = text(raw.kind) as ChildEventKind;
  if (!CHILD_EVENT_KINDS.includes(kind)) errors.kind = "required";

  const date = text(raw.date);
  if (!date) errors.date = "required";
  else if (!isIsoDate(date)) errors.date = "invalidDate";

  let time: string | null = text(raw.time) || null;
  if (kind === "report_due") time = null;
  else if (time && !isTime(time)) errors.time = "invalidTime";

  let reportId: string | null = null;
  if (kind === "report_due") {
    reportId = text(raw.reportId) || null;
    if (!reportId || !reportIds.includes(reportId)) errors.reportId = "required";
  }

  const details = text(raw.details).replace(/\r\n/g, "\n") || null;
  if (kind === "other" && !details) errors.details = "required";
  else if (details && details.length > DETAILS_MAX) errors.details = `tooLong:${DETAILS_MAX}`;

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: { kind, date, time, reportId, details } };
}

/**
 * Where an event stands: a report due date is `done` once the report is no longer a draft,
 * otherwise orange/red as form deadlines; meetings carry no urgency.
 */
export function eventState(event: { kind: ChildEventKind; date: string }, reportStatus: string | null, today: string, warnDays: number): { done: boolean; urgency: Urgency } {
  if (event.kind !== "report_due") return { done: false, urgency: "none" };
  const done = reportStatus !== null && reportStatus !== "draft";
  return { done, urgency: urgency(event.date, today, warnDays, done) };
}

/** Day, then events without a time, then by time. */
export function compareEvents(a: { date: string; time: string | null; id: string }, b: { date: string; time: string | null; id: string }): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  if ((a.time ?? "") !== (b.time ?? "")) return (a.time ?? "") < (b.time ?? "") ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** The overview's list: from today on, plus report due dates already past but not handed in; soonest first. */
export function upcomingEvents<T extends { id: string; kind: ChildEventKind; date: string; time: string | null; done: boolean }>(events: T[], today: string): T[] {
  return events.filter((e) => e.date >= today || (e.kind === "report_due" && !e.done)).sort(compareEvents);
}
