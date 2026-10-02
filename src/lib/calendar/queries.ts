import "server-only";
import { and, asc, eq, isNotNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { childForms, children } from "@/db/schema";
import { listEvents } from "@/lib/child-events/queries";
import { birthdayEvents, childEventEntries, deadlineEvents, sortCalendar, type CalendarEvent, type DayRange } from "./events";

export type CalendarChild = { id: string; name: string; status: "active" | "archived" };

/**
 * What is planned for the cabinet's children within `range` (inclusive local days), oldest
 * first: events added on their files, form due dates and birthdays. One query per source for
 * the whole account, each scoped by `accountId`. Archived children only with `includeArchived`.
 */
export function accountCalendar(
  accountId: string,
  { range, today, warnDays, includeArchived = false }: { range: DayRange; today: string; warnDays: number; includeArchived?: boolean },
): { children: CalendarChild[]; events: CalendarEvent[] } {
  const childRows = db
    .select({ id: children.id, name: children.name, status: children.status, birthDate: children.birthDate })
    .from(children)
    .where(includeArchived ? eq(children.accountId, accountId) : and(eq(children.accountId, accountId), eq(children.status, "active")))
    .orderBy(asc(children.name))
    .all();
  const known = new Set(childRows.map((c) => c.id));

  const formRows = db
    .select({ id: childForms.id, childId: childForms.childId, status: childForms.status, schema: childForms.schema, dueDate: childForms.dueDate })
    .from(childForms)
    .where(and(eq(childForms.accountId, accountId), isNotNull(childForms.dueDate), ne(childForms.status, "submitted")))
    .all()
    .filter((f) => known.has(f.childId));
  const eventRows = listEvents(accountId, { from: range.from, to: range.to, today, warnDays }).filter((e) => known.has(e.childId));

  const events: CalendarEvent[] = [
    ...childRows.flatMap((child) => birthdayEvents(child, range)),
    ...childEventEntries(eventRows, range),
    ...deadlineEvents(
      formRows.map((f) => ({ id: f.id, childId: f.childId, title: f.schema.title, dueDate: f.dueDate, submitted: f.status === "submitted" })),
      range,
      today,
      warnDays,
    ),
  ];

  return { children: childRows.map(({ id, name, status }) => ({ id, name, status })), events: sortCalendar(events) };
}
