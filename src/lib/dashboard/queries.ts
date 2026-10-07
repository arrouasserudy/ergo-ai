import "server-only";
import { and, count, desc, eq, gte, inArray, isNotNull, ne, or, sql, type SQL } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import { db } from "@/db";
import { type Account, assessments, childForms, children, conversations, episodes, formTemplates, reports, reportVariants, therapists } from "@/db/schema";
import { getDefinition } from "@/lib/assessments/registry";
import type { PendingForm } from "@/lib/forms/queries";
import { closedAt } from "@/lib/reports/status";
import { localToday } from "@/lib/time";
import { sortActivity, sortTodo, type ActivityItem, type TodoItem } from "./feed";
import type { SetupStep } from "./setup";
import type { DueForm, ReportSpan } from "./streak";

// Every query here is scoped by `accountId`.

const RECENT = 6;
const WEEK_MS = 7 * 86_400_000;

export function countActiveChildren(accountId: string): number {
  return db.select({ n: count() }).from(children).where(and(eq(children.accountId, accountId), eq(children.status, "active"))).get()?.n ?? 0;
}

/** Crises (not everyday difficulties) started in the last 7 days. */
export function countRecentCrises(accountId: string, now = new Date()): number {
  return (
    db
      .select({ n: count() })
      .from(episodes)
      .where(and(eq(episodes.accountId, accountId), eq(episodes.kind, "crisis"), gte(episodes.startedAt, new Date(now.getTime() - WEEK_MS))))
      .get()?.n ?? 0
  );
}

function draftReports(accountId: string) {
  return db
    .select({ report: reports, child: { id: children.id, name: children.name } })
    .from(reports)
    .innerJoin(children, eq(children.id, reports.childId))
    .where(and(eq(reports.accountId, accountId), eq(reports.status, "draft")))
    .orderBy(desc(reports.updatedAt))
    .limit(50)
    .all();
}

/** Forms due soon or overdue and draft reports, most urgent first; plus the number of drafts. */
export function todoList(accountId: string, pending: PendingForm[]): { items: TodoItem[]; drafts: number } {
  const drafts = draftReports(accountId);
  const items: TodoItem[] = [
    ...pending.map((form): TodoItem => ({ kind: "form", ...form })),
    ...drafts.map(({ report, child }): TodoItem => ({
      kind: "report",
      id: report.id,
      child,
      docType: report.docType,
      sessionDate: report.sessionDate,
      updatedAt: report.updatedAt,
    })),
  ];
  return { items: sortTodo(items), drafts: drafts.length };
}

/** Latest crises and difficulties (unless `episodes: false`, crises module off), forms filled in and tests completed, newest first. */
export function recentActivity(accountId: string, { episodes: withEpisodes = true }: { episodes?: boolean } = {}): ActivityItem[] {
  const recentEpisodes = !withEpisodes
    ? []
    : db
        .select({ episode: episodes, child: { id: children.id, name: children.name } })
        .from(episodes)
        .innerJoin(children, eq(children.id, episodes.childId))
        .where(and(eq(episodes.accountId, accountId), eq(episodes.status, "closed")))
        .orderBy(desc(episodes.startedAt))
        .limit(RECENT)
        .all();
  const submittedForms = db
    .select({ form: childForms, child: { id: children.id, name: children.name } })
    .from(childForms)
    .innerJoin(children, eq(children.id, childForms.childId))
    .where(and(eq(childForms.accountId, accountId), eq(childForms.status, "submitted"), isNotNull(childForms.submittedAt)))
    .orderBy(desc(childForms.submittedAt))
    .limit(RECENT)
    .all();
  const completedTests = db
    .select({ assessment: assessments, child: { id: children.id, name: children.name } })
    .from(assessments)
    .innerJoin(children, eq(children.id, assessments.childId))
    .where(and(eq(assessments.accountId, accountId), eq(assessments.status, "completed"), isNotNull(assessments.completedAt)))
    .orderBy(desc(assessments.completedAt))
    .limit(RECENT)
    .all();

  return sortActivity([
    ...recentEpisodes.map(({ episode, child }): ActivityItem => ({
      kind: "episode",
      id: episode.id,
      child,
      at: episode.startedAt,
      episodeKind: episode.kind,
    })),
    ...submittedForms.map(({ form, child }): ActivityItem => ({
      kind: "form",
      id: form.id,
      child,
      at: form.submittedAt!,
      title: form.schema.title,
      byParent: form.submittedBy === "parent",
    })),
    ...completedTests.map(({ assessment, child }): ActivityItem => ({
      kind: "assessment",
      id: assessment.id,
      child,
      at: assessment.completedAt!,
      testName: getDefinition(assessment.definitionId)?.shortName ?? assessment.definitionId,
    })),
  ]);
}

/**
 * The paperwork history behind the "up to date" week (see streak.ts): forms with a due date
 * and reports, of active children only, like the to-do list.
 */
export function weekHistory(accountId: string): { forms: DueForm[]; reports: ReportSpan[] } {
  const active = and(eq(children.id, childForms.childId), eq(children.status, "active"));
  const forms = db
    .select({ dueDate: childForms.dueDate, submittedAt: childForms.submittedAt })
    .from(childForms)
    .innerJoin(children, active)
    .where(and(eq(childForms.accountId, accountId), isNotNull(childForms.dueDate)))
    .all()
    .map((f): DueForm => ({ dueDate: f.dueDate!, submittedOn: f.submittedAt ? localToday(f.submittedAt) : null }));

  const rows = db
    .select({ id: reports.id, createdAt: reports.createdAt, recipients: reports.recipients, status: reports.status })
    .from(reports)
    .innerJoin(children, and(eq(children.id, reports.childId), eq(children.status, "active")))
    .where(eq(reports.accountId, accountId))
    .all();
  const closed = rows.filter((r) => r.status !== "draft").map((r) => r.id);
  const variants = closed.length
    ? db
        .select({ reportId: reportVariants.reportId, recipient: reportVariants.recipient, validatedAt: reportVariants.validatedAt, exportedAt: reportVariants.exportedAt })
        .from(reportVariants)
        .where(and(eq(reportVariants.accountId, accountId), inArray(reportVariants.reportId, closed)))
        .all()
    : [];
  const spans = rows.map((r): ReportSpan => {
    const createdOn = localToday(r.createdAt);
    if (r.status === "draft") return { createdOn, closedOn: null };
    // A report closed without a known date (should not happen) counts as closed when written.
    const end = closedAt(r.recipients, variants.filter((v) => v.reportId === r.id));
    return { createdOn, closedOn: end ? localToday(end) : createdOn };
  });
  return { forms, reports: spans };
}

const exists = (table: SQLiteTable, where: SQL | undefined) => !!db.select({ one: sql`1` }).from(table).where(where).limit(1).get();

/** The getting-started steps already done: by anyone in the cabinet, except asking Amit (personal). */
export function setupDone(account: Account, therapistId: string): Set<SetupStep> {
  const accountId = account.id;
  const checks: Record<SetupStep, () => boolean> = {
    child: () => exists(children, eq(children.accountId, accountId)),
    letterhead: () => !!account.letterhead?.trim(),
    autoForm: () =>
      exists(formTemplates, and(eq(formTemplates.accountId, accountId), eq(formTemplates.autoAssign, true), eq(formTemplates.status, "published"))),
    parentLink: () =>
      exists(childForms, and(eq(childForms.accountId, accountId), or(isNotNull(childForms.shareTokenHash), eq(childForms.submittedBy, "parent")))) ||
      exists(assessments, and(eq(assessments.accountId, accountId), or(isNotNull(assessments.shareTokenHash), eq(assessments.completedBy, "parent")))),
    assessment: () => exists(assessments, and(eq(assessments.accountId, accountId), eq(assessments.status, "completed"))),
    report: () => exists(reports, and(eq(reports.accountId, accountId), ne(reports.status, "draft"))),
    export: () => exists(reports, and(eq(reports.accountId, accountId), eq(reports.status, "exported"))),
    amit: () => exists(conversations, and(eq(conversations.accountId, accountId), eq(conversations.therapistId, therapistId))),
  };
  return new Set((Object.keys(checks) as SetupStep[]).filter((step) => checks[step]()));
}

/** Which optional home page cards the therapist hid (Settings → My account). */
export function homePreferences(therapistId: string): { hideWeekStreak: boolean; hideSetupGuide: boolean } {
  return (
    db.select({ hideWeekStreak: therapists.hideWeekStreak, hideSetupGuide: therapists.hideSetupGuide }).from(therapists).where(eq(therapists.id, therapistId)).get() ?? {
      hideWeekStreak: false,
      hideSetupGuide: false,
    }
  );
}
