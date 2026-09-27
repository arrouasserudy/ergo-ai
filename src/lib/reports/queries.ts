import "server-only";
import { and, asc, count, desc, eq, gte, inArray, like, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { children, reports, reportVariants, styleExamples, type ReportRecipient, type ReportStatus } from "@/db/schema";
import { MAX_STYLE_EXAMPLES, type StylePair } from "./prompt";

export type ReportStatusFilter = ReportStatus | "all";

/** Reports of one account with their child, newest first. Every query here is scoped by `accountId`. */
export function listReports(
  accountId: string,
  { search = "", status = "all", fromDate, childId }: { search?: string; status?: ReportStatusFilter; fromDate?: string; childId?: string } = {},
) {
  const conditions: SQL[] = [eq(reports.accountId, accountId)];
  if (status !== "all") conditions.push(eq(reports.status, status));
  if (fromDate) conditions.push(gte(reports.sessionDate, fromDate));
  if (childId) conditions.push(eq(reports.childId, childId));
  const term = search.trim();
  if (term) {
    // Also match initials typed without dots/spaces ("LM" → "L. M."), as in the children list.
    const compact = `%${term.replace(/[\s.]/g, "").split("").join("%")}%`;
    conditions.push(or(like(children.name, `%${term}%`), like(children.name, compact))!);
  }

  return db
    .select({ report: reports, child: { id: children.id, name: children.name, birthDate: children.birthDate } })
    .from(reports)
    .innerJoin(children, eq(children.id, reports.childId))
    .where(and(...conditions))
    .orderBy(desc(reports.updatedAt))
    .limit(200)
    .all();
}

export function getReport(accountId: string, id: string) {
  return db.select().from(reports).where(and(eq(reports.id, id), eq(reports.accountId, accountId))).get() ?? null;
}

export function listVariants(reportId: string) {
  return db.select().from(reportVariants).where(eq(reportVariants.reportId, reportId)).orderBy(asc(reportVariants.generatedAt)).all();
}

export function generationsToday(accountId: string): number {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return (
    db
      .select({ n: count() })
      .from(reportVariants)
      .where(and(eq(reportVariants.accountId, accountId), gte(reportVariants.generatedAt, since)))
      .get()?.n ?? 0
  );
}

/** The therapist's most recent corrections for these recipients, newest first. */
export function recentStyleExamples(therapistId: string, recipients: ReportRecipient[]): Record<ReportRecipient, StylePair[]> {
  const rows = db
    .select({ recipient: styleExamples.recipient, before: styleExamples.before, after: styleExamples.after })
    .from(styleExamples)
    .where(and(eq(styleExamples.therapistId, therapistId), inArray(styleExamples.recipient, recipients)))
    .orderBy(desc(styleExamples.createdAt))
    .limit(MAX_STYLE_EXAMPLES * recipients.length * 4)
    .all();
  const byRecipient = { parents: [], doctor: [], school: [] } as Record<ReportRecipient, StylePair[]>;
  for (const row of rows) {
    if (byRecipient[row.recipient].length < MAX_STYLE_EXAMPLES) byRecipient[row.recipient].push({ before: row.before, after: row.after });
  }
  return byRecipient;
}
