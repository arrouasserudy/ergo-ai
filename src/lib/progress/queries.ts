import "server-only";
import { and, asc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { assessments, episodes } from "@/db/schema";

// Every query here is scoped by `accountId`.

/** A child's completed test administrations, oldest first. */
export function completedAdministrations(accountId: string, childId: string) {
  return db
    .select({
      id: assessments.id,
      definitionId: assessments.definitionId,
      definitionVersion: assessments.definitionVersion,
      testDate: assessments.testDate,
      answers: assessments.answers,
      scores: assessments.scores,
    })
    .from(assessments)
    .where(and(eq(assessments.accountId, accountId), eq(assessments.childId, childId), eq(assessments.status, "completed")))
    .orderBy(asc(assessments.testDate), asc(assessments.createdAt))
    .all();
}

/** The child's crises and difficulties started since `since`. */
export function episodesSince(accountId: string, childId: string, since: Date) {
  return db
    .select({ kind: episodes.kind, startedAt: episodes.startedAt })
    .from(episodes)
    .where(and(eq(episodes.accountId, accountId), eq(episodes.childId, childId), gte(episodes.startedAt, since)))
    .all();
}
