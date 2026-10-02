import "server-only";
import { and, desc, eq, inArray, lt, ne } from "drizzle-orm";
import { db } from "@/db";
import { accounts, assessments } from "@/db/schema";
import { hashToken } from "@/lib/forms/queries";

// Every query here is scoped by `accountId`, except the lookup by share token (the token is the credential).

export function listChildAssessments(accountId: string, childId: string) {
  return db
    .select()
    .from(assessments)
    .where(and(eq(assessments.accountId, accountId), eq(assessments.childId, childId)))
    .orderBy(desc(assessments.testDate), desc(assessments.createdAt))
    .all();
}

export function getAssessment(accountId: string, id: string) {
  return db.select().from(assessments).where(and(eq(assessments.id, id), eq(assessments.accountId, accountId))).get() ?? null;
}

/** The completed administration of the same test just before this one (before / after treatment). */
export function previousAssessment(accountId: string, current: { id: string; childId: string; definitionId: string; testDate: string }) {
  return (
    db
      .select()
      .from(assessments)
      .where(
        and(
          eq(assessments.accountId, accountId),
          eq(assessments.childId, current.childId),
          eq(assessments.definitionId, current.definitionId),
          eq(assessments.status, "completed"),
          lt(assessments.testDate, current.testDate),
          ne(assessments.id, current.id),
        ),
      )
      .orderBy(desc(assessments.testDate))
      .get() ?? null
  );
}

/** Completed tests of a child among `ids` (tests attached to a report). */
export function completedAssessments(accountId: string, childId: string, ids: string[]) {
  if (ids.length === 0) return [];
  return db
    .select()
    .from(assessments)
    .where(and(eq(assessments.accountId, accountId), eq(assessments.childId, childId), eq(assessments.status, "completed"), inArray(assessments.id, ids)))
    .orderBy(desc(assessments.testDate))
    .all();
}

/** The test behind a parent link, with the cabinet's name, or null when unknown or expired. */
export function findSharedAssessment(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const row = db
    .select({ assessment: assessments, cabinet: accounts.name })
    .from(assessments)
    .innerJoin(accounts, eq(accounts.id, assessments.accountId))
    .where(eq(assessments.shareTokenHash, hashToken(token)))
    .get();
  if (!row || !row.assessment.shareExpiresAt || row.assessment.shareExpiresAt.getTime() < Date.now()) return null;
  return row;
}
