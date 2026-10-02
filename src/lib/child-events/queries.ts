import "server-only";
import { and, asc, desc, eq, gte, lte, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { childEvents, reports, type ChildEventKind } from "@/db/schema";
import { compareEvents, eventState } from "./events";
import type { Urgency } from "@/lib/forms/deadlines";

export type ChildEventRow = {
  id: string;
  childId: string;
  kind: ChildEventKind;
  date: string;
  time: string | null;
  details: string | null;
  report: { id: string; docType: string; sessionDate: string; status: string } | null;
  done: boolean;
  urgency: Urgency;
};

/** Events of the account (optionally one child, a range of days), with their report and state. Scoped by `accountId`. */
export function listEvents(
  accountId: string,
  { childId, from, to, today, warnDays }: { childId?: string; from?: string; to?: string; today: string; warnDays: number },
): ChildEventRow[] {
  const conditions: SQL[] = [eq(childEvents.accountId, accountId)];
  if (childId) conditions.push(eq(childEvents.childId, childId));
  if (from) conditions.push(gte(childEvents.date, from));
  if (to) conditions.push(lte(childEvents.date, to));
  const rows = db
    .select({
      event: childEvents,
      report: { id: reports.id, docType: reports.docType, sessionDate: reports.sessionDate, status: reports.status },
    })
    .from(childEvents)
    .leftJoin(reports, and(eq(reports.id, childEvents.reportId), eq(reports.accountId, accountId)))
    .where(and(...conditions))
    .orderBy(asc(childEvents.date))
    .all();
  return rows
    .map(({ event, report }) => ({
      id: event.id,
      childId: event.childId,
      kind: event.kind,
      date: event.date,
      time: event.time,
      details: event.details,
      report: report?.id ? report : null,
      ...eventState(event, report?.status ?? null, today, warnDays),
    }))
    .sort(compareEvents);
}

/** The child's reports, newest session first: the choices of a report due date. */
export function reportOptions(accountId: string, childId: string) {
  return db
    .select({ id: reports.id, docType: reports.docType, sessionDate: reports.sessionDate, status: reports.status })
    .from(reports)
    .where(and(eq(reports.accountId, accountId), eq(reports.childId, childId)))
    .orderBy(desc(reports.sessionDate))
    .all();
}
