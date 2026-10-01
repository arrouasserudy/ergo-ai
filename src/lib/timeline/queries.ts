import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { assessments, childForms, episodes, reports, type Child } from "@/db/schema";
import { SHARE_LINK_DAYS } from "@/lib/forms/queries";
import { APP_TIME_ZONE } from "@/lib/time";
import { buildTimeline, type TimelineEvent } from "./events";

const DAY_MS = 86_400_000;

/** When the parents' link was created: not stored, it is the link's expiry minus its validity. */
export function sentAtOf(shareExpiresAt: Date | null): Date | null {
  return shareExpiresAt ? new Date(shareExpiresAt.getTime() - SHARE_LINK_DAYS * DAY_MS) : null;
}

/** Everything dated about one child, as timeline events (oldest first). Every query is scoped by `accountId`. */
export function childTimeline(accountId: string, child: Child): TimelineEvent[] {
  const episodeRows = db
    .select({
      id: episodes.id,
      kind: episodes.kind,
      status: episodes.status,
      situation: episodes.situation,
      causes: episodes.causes,
      startedAt: episodes.startedAt,
      endedAt: episodes.endedAt,
    })
    .from(episodes)
    .where(and(eq(episodes.accountId, accountId), eq(episodes.childId, child.id)))
    .all();
  const reportRows = db
    .select({ id: reports.id, docType: reports.docType, sessionDate: reports.sessionDate, status: reports.status })
    .from(reports)
    .where(and(eq(reports.accountId, accountId), eq(reports.childId, child.id)))
    .all();
  const formRows = db
    .select({
      id: childForms.id,
      schema: childForms.schema,
      answers: childForms.answers,
      submittedAt: childForms.submittedAt,
      submittedBy: childForms.submittedBy,
      shareExpiresAt: childForms.shareExpiresAt,
    })
    .from(childForms)
    .where(and(eq(childForms.accountId, accountId), eq(childForms.childId, child.id)))
    .all();
  const assessmentRows = db
    .select({ id: assessments.id, definitionId: assessments.definitionId, testDate: assessments.testDate, status: assessments.status, scores: assessments.scores })
    .from(assessments)
    .where(and(eq(assessments.accountId, accountId), eq(assessments.childId, child.id)))
    .all();

  return buildTimeline({
    child,
    episodes: episodeRows,
    reports: reportRows,
    forms: formRows.map(({ shareExpiresAt, ...form }) => ({ ...form, sentAt: sentAtOf(shareExpiresAt) })),
    assessments: assessmentRows,
    timeZone: APP_TIME_ZONE,
  });
}
