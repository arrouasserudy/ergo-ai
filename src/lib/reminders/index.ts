import "server-only";
import { and, asc, eq, gte, lt } from "drizzle-orm";
import { db } from "@/db";
import { childFiles, children, meetings, reports, type Account, type Child } from "@/db/schema";
import { localDate } from "@/lib/time";
import { childMilestones, needsAction, resolveDeadlines, schoolYearOf, schoolYearRange, type ChildYearFacts, type MilestoneStatus } from "./milestones";

export type ChildReminders = { child: Pick<Child, "id" | "name" | "birthDate">; milestones: MilestoneStatus[] };

/** Every active child's milestones for the current school year. Scoped by account. */
export function accountMilestones(account: Pick<Account, "id" | "deadlines">, now = new Date()): ChildReminders[] {
  const today = localDate(now);
  const { start } = schoolYearRange(schoolYearOf(today));
  const deadlines = resolveDeadlines(account.deadlines);

  const kids = db
    .select({ id: children.id, name: children.name, birthDate: children.birthDate, followUpStart: children.followUpStart, createdAt: children.createdAt })
    .from(children)
    .where(and(eq(children.accountId, account.id), eq(children.status, "active")))
    .all();
  if (kids.length === 0) return [];

  const facts = new Map<string, ChildYearFacts>(
    kids.map((c) => [c.id, { startedOn: c.followUpStart ?? c.createdAt.slice(0, 10), reports: [], meetings: [], files: [] }]),
  );

  const yearReports = db
    .select({ childId: reports.childId, docType: reports.docType, sessionDate: reports.sessionDate, status: reports.status })
    .from(reports)
    .where(and(eq(reports.accountId, account.id), gte(reports.sessionDate, start)))
    .all();
  for (const { childId, ...r } of yearReports) facts.get(childId)?.reports.push(r);

  const yearMeetings = db
    .select({ childId: meetings.childId, kind: meetings.kind, status: meetings.status, scheduledAt: meetings.scheduledAt })
    .from(meetings)
    .where(and(eq(meetings.accountId, account.id), gte(meetings.scheduledAt, new Date(`${start}T00:00:00Z`))))
    .all();
  for (const m of yearMeetings) facts.get(m.childId)?.meetings.push({ kind: m.kind, status: m.status, date: localDate(m.scheduledAt) });

  const files = db
    .select({ childId: childFiles.childId, kind: childFiles.kind, formDate: childFiles.formDate, createdAt: childFiles.createdAt })
    .from(childFiles)
    .where(eq(childFiles.accountId, account.id))
    .all();
  for (const f of files) facts.get(f.childId)?.files.push({ kind: f.kind, date: f.formDate ?? localDate(f.createdAt) });

  return kids.map(({ id, name, birthDate }) => ({ child: { id, name, birthDate }, milestones: childMilestones(facts.get(id)!, deadlines, today) }));
}

export function childReminders(account: Pick<Account, "id" | "deadlines">, childId: string, now = new Date()) {
  return accountMilestones(account, now).find((r) => r.child.id === childId)?.milestones ?? [];
}

/** Number shown on the sidebar: milestones due soon or overdue, plus past meetings still to close. */
export function actionCount(account: Pick<Account, "id" | "deadlines">, now = new Date()): number {
  const milestones = accountMilestones(account, now).reduce((n, r) => n + r.milestones.filter(needsAction).length, 0);
  return milestones + pastMeetingsToClose(account.id, now).length;
}

/** Meetings whose time has passed but that were never marked done or cancelled. */
export function pastMeetingsToClose(accountId: string, now = new Date()) {
  return db
    .select({ meeting: meetings, child: { id: children.id, name: children.name } })
    .from(meetings)
    .innerJoin(children, eq(children.id, meetings.childId))
    .where(
      and(
        eq(meetings.accountId, accountId),
        eq(meetings.status, "scheduled"),
        // An hour after the start: the meeting is most likely over.
        lt(meetings.scheduledAt, new Date(now.getTime() - 60 * 60 * 1000)),
      ),
    )
    .orderBy(asc(meetings.scheduledAt))
    .all();
}
