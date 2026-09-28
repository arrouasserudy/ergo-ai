import "server-only";
import { createHash } from "node:crypto";
import { and, asc, count, desc, eq, gte, inArray, isNotNull, lte, ne } from "drizzle-orm";
import { db } from "@/db";
import { accounts, childForms, children, formTemplates } from "@/db/schema";
import { urgency, worse, type Urgency } from "./deadlines";

// Every query here is scoped by `accountId`, except the lookup by share token (the token is the credential).

export function listTemplates(accountId: string, { publishedOnly = false } = {}) {
  const conditions = [eq(formTemplates.accountId, accountId)];
  if (publishedOnly) conditions.push(eq(formTemplates.status, "published"));
  return db.select().from(formTemplates).where(and(...conditions)).orderBy(desc(formTemplates.updatedAt)).all();
}

export function getTemplate(accountId: string, id: string) {
  return db.select().from(formTemplates).where(and(eq(formTemplates.id, id), eq(formTemplates.accountId, accountId))).get() ?? null;
}

/** Conversions in the last 24 hours (daily limit). */
export function conversionsToday(accountId: string): number {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return (
    db
      .select({ n: count() })
      .from(formTemplates)
      .where(and(eq(formTemplates.accountId, accountId), gte(formTemplates.generatedAt, since)))
      .get()?.n ?? 0
  );
}

export function listChildForms(accountId: string, childId: string) {
  return db
    .select()
    .from(childForms)
    .where(and(eq(childForms.accountId, accountId), eq(childForms.childId, childId)))
    .orderBy(desc(childForms.updatedAt))
    .all();
}

export function getChildForm(accountId: string, id: string) {
  return db.select().from(childForms).where(and(eq(childForms.id, id), eq(childForms.accountId, accountId))).get() ?? null;
}

/** Completed forms of a child among `ids` (forms attached to a report). */
export function submittedChildForms(accountId: string, childId: string, ids: string[]) {
  if (ids.length === 0) return [];
  return db
    .select()
    .from(childForms)
    .where(and(eq(childForms.accountId, accountId), eq(childForms.childId, childId), eq(childForms.status, "submitted"), inArray(childForms.id, ids)))
    .orderBy(desc(childForms.submittedAt))
    .all();
}

export const SHARE_LINK_DAYS = 30;

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * The form behind a parent link, with the cabinet's name, or null when the token is
 * unknown or expired. A submitted form is still returned (the page shows a thank-you).
 */
export function findSharedForm(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const row = db
    .select({ form: childForms, cabinet: accounts.name })
    .from(childForms)
    .innerJoin(accounts, eq(accounts.id, childForms.accountId))
    .where(eq(childForms.shareTokenHash, hashToken(token)))
    .get();
  if (!row || !row.form.shareExpiresAt || row.form.shareExpiresAt.getTime() < Date.now()) return null;
  return row;
}

/** Expiry of the form's parent link (ISO), or null when there is none or it expired. */
export function activeLinkUntil(form: { shareExpiresAt: Date | null }): string | null {
  return form.shareExpiresAt && form.shareExpiresAt.getTime() > Date.now() ? form.shareExpiresAt.toISOString() : null;
}

export type PendingForm = {
  id: string;
  title: string;
  dueDate: string;
  level: Exclude<Urgency, "none">;
  child: { id: string; name: string };
};

/**
 * Forms still to fill in for active children, due within `warnDays` days or overdue:
 * overdue first, then by due date. Feeds the bell and the children's badges.
 */
export function pendingForms(accountId: string, today: string, warnDays: number): PendingForm[] {
  const horizon = new Date(Date.parse(`${today}T00:00:00Z`) + warnDays * 86_400_000).toISOString().slice(0, 10);
  const rows = db
    .select({ id: childForms.id, schema: childForms.schema, dueDate: childForms.dueDate, childId: children.id, childName: children.name })
    .from(childForms)
    .innerJoin(children, eq(children.id, childForms.childId))
    .where(
      and(
        eq(childForms.accountId, accountId),
        ne(childForms.status, "submitted"),
        isNotNull(childForms.dueDate),
        lte(childForms.dueDate, horizon),
        eq(children.status, "active"),
      ),
    )
    .orderBy(asc(childForms.dueDate))
    .all();
  return rows
    .map((row) => ({
      id: row.id,
      title: row.schema.title,
      dueDate: row.dueDate!,
      level: urgency(row.dueDate, today, warnDays) as PendingForm["level"],
      child: { id: row.childId, name: row.childName },
    }))
    .filter((row) => (row.level as Urgency) !== "none");
}

export type ChildUrgency = { level: Exclude<Urgency, "none">; count: number };

/** The most urgent level per child, with the number of forms due soon or overdue. */
export function urgencyByChild(pending: PendingForm[]): Map<string, ChildUrgency> {
  const result = new Map<string, ChildUrgency>();
  for (const form of pending) {
    const current = result.get(form.child.id);
    result.set(form.child.id, {
      level: current ? (worse(current.level, form.level) as ChildUrgency["level"]) : form.level,
      count: (current?.count ?? 0) + 1,
    });
  }
  return result;
}
