import "server-only";
import { and, count, desc, eq, gte, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { assessments, childForms, children, episodes, reports } from "@/db/schema";
import { getDefinition } from "@/lib/assessments/registry";
import type { PendingForm } from "@/lib/forms/queries";
import { sortActivity, sortTodo, type ActivityItem, type TodoItem } from "./feed";

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

/** Entries still in progress, with their child (the banner at the top of the page). */
export function openEpisodes(accountId: string) {
  return db
    .select({ episode: episodes, child: { id: children.id, name: children.name } })
    .from(episodes)
    .innerJoin(children, eq(children.id, episodes.childId))
    .where(and(eq(episodes.accountId, accountId), eq(episodes.status, "open")))
    .orderBy(desc(episodes.startedAt))
    .all();
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

/** Latest crises and difficulties, forms filled in and tests completed, newest first. */
export function recentActivity(accountId: string): ActivityItem[] {
  const recentEpisodes = db
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
