import "server-only";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { assessments, childForms, children, episodes, reports } from "@/db/schema";
import { APP_TIME_ZONE } from "@/lib/time";
import { buildTimeline } from "@/lib/timeline/events";
import { sentAtOf } from "@/lib/timeline/queries";
import { childCalendarEvents, deadlineEvents, sortCalendar, type CalendarEvent, type DayRange } from "./events";

const DAY_MS = 86_400_000;

export type CalendarChild = { id: string; name: string; status: "active" | "archived" };

/**
 * Every event of the cabinet's children within `range` (inclusive local days), oldest first.
 * One query per source for the whole account (not per child), each scoped by `accountId`
 * and, where the date is a column, by the range. Forms are loaded whole: any of their
 * date answers may fall in the range. Archived children only with `includeArchived`.
 */
export function accountCalendar(
  accountId: string,
  { range, today, warnDays, includeArchived = false }: { range: DayRange; today: string; warnDays: number; includeArchived?: boolean },
): { children: CalendarChild[]; events: CalendarEvent[] } {
  const childRows = db
    .select({
      id: children.id,
      name: children.name,
      status: children.status,
      birthDate: children.birthDate,
      followUpStart: children.followUpStart,
      createdAt: children.createdAt,
    })
    .from(children)
    .where(includeArchived ? eq(children.accountId, accountId) : and(eq(children.accountId, accountId), eq(children.status, "active")))
    .orderBy(asc(children.name))
    .all();
  const known = new Set(childRows.map((c) => c.id));

  // Timestamps: a day of margin on each side, the exact local day is checked after grouping.
  const episodeRows = db
    .select({
      id: episodes.id,
      childId: episodes.childId,
      kind: episodes.kind,
      status: episodes.status,
      situation: episodes.situation,
      causes: episodes.causes,
      startedAt: episodes.startedAt,
      endedAt: episodes.endedAt,
    })
    .from(episodes)
    .where(
      and(
        eq(episodes.accountId, accountId),
        gte(episodes.startedAt, new Date(Date.parse(`${range.from}T00:00:00Z`) - DAY_MS)),
        lte(episodes.startedAt, new Date(Date.parse(`${range.to}T00:00:00Z`) + 2 * DAY_MS)),
      ),
    )
    .all();
  const reportRows = db
    .select({ id: reports.id, childId: reports.childId, docType: reports.docType, sessionDate: reports.sessionDate, status: reports.status })
    .from(reports)
    .where(and(eq(reports.accountId, accountId), gte(reports.sessionDate, range.from), lte(reports.sessionDate, range.to)))
    .all();
  const formRows = db
    .select({
      id: childForms.id,
      childId: childForms.childId,
      status: childForms.status,
      schema: childForms.schema,
      answers: childForms.answers,
      submittedAt: childForms.submittedAt,
      submittedBy: childForms.submittedBy,
      shareExpiresAt: childForms.shareExpiresAt,
      dueDate: childForms.dueDate,
    })
    .from(childForms)
    .where(eq(childForms.accountId, accountId))
    .all();
  const assessmentRows = db
    .select({
      id: assessments.id,
      childId: assessments.childId,
      definitionId: assessments.definitionId,
      testDate: assessments.testDate,
      status: assessments.status,
      scores: assessments.scores,
    })
    .from(assessments)
    .where(and(eq(assessments.accountId, accountId), gte(assessments.testDate, range.from), lte(assessments.testDate, range.to)))
    .all();

  const byChild = <T extends { childId: string }>(rows: T[]) => {
    const map = new Map<string, T[]>();
    for (const row of rows) {
      if (!known.has(row.childId)) continue;
      const list = map.get(row.childId);
      if (list) list.push(row);
      else map.set(row.childId, [row]);
    }
    return map;
  };
  const episodesOf = byChild(episodeRows);
  const reportsOf = byChild(reportRows);
  const formsOf = byChild(formRows);
  const assessmentsOf = byChild(assessmentRows);

  const events: CalendarEvent[] = [];
  for (const child of childRows) {
    const timeline = buildTimeline({
      child,
      episodes: episodesOf.get(child.id) ?? [],
      reports: reportsOf.get(child.id) ?? [],
      forms: (formsOf.get(child.id) ?? []).map((f) => ({ ...f, sentAt: sentAtOf(f.shareExpiresAt) })),
      assessments: assessmentsOf.get(child.id) ?? [],
      timeZone: APP_TIME_ZONE,
    });
    events.push(...childCalendarEvents(child, timeline, range));
  }
  events.push(
    ...deadlineEvents(
      formRows
        .filter((f) => known.has(f.childId))
        .map((f) => ({ id: f.id, childId: f.childId, title: f.schema.title, dueDate: f.dueDate, submitted: f.status === "submitted" })),
      range,
      today,
      warnDays,
    ),
  );

  return { children: childRows.map(({ id, name, status }) => ({ id, name, status })), events: sortCalendar(events) };
}
