import "server-only";
import { and, eq, isNull, ne, notExists, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { accounts, childForms, children, formTemplates, type FormTemplate } from "@/db/schema";
import { localToday } from "@/lib/time";
import { dueDateFor, schoolYearStartDate } from "./deadlines";

/** Cabinets already synced today in this process (the layout calls sync on every page). */
const syncedToday = new Set<string>();

const sqlite = () => (db as unknown as { $client: import("better-sqlite3").Database }).$client;

/** Active children of the cabinet without a copy matching `has`. */
function childrenWithout(accountId: string, has: SQL) {
  return db
    .select({ id: children.id })
    .from(children)
    .where(
      and(
        eq(children.accountId, accountId),
        eq(children.status, "active"),
        notExists(db.select({ id: childForms.id }).from(childForms).where(and(eq(childForms.childId, children.id), has))),
      ),
    )
    .all();
}

function insertCopies(accountId: string, template: FormTemplate, childIds: string[], dueDate: string | null, cycle: string): number {
  if (childIds.length === 0) return 0;
  return db
    .insert(childForms)
    .values(childIds.map((childId) => ({ accountId, childId, templateId: template.id, schema: template.schema, dueDate, cycle })))
    .onConflictDoNothing()
    .run().changes;
}

/**
 * Adds every published auto form to each active child of the cabinet that lacks it:
 * - without a deadline, once (any copy of the form counts, even one added by hand);
 * - with a yearly deadline, one copy per school year (cycle = its start year, "2026").
 * Copies still to fill follow a changed deadline. Idempotent: the (child, template,
 * cycle) unique index guards against races.
 */
export function syncAutoForms(accountId: string, today = localToday()): number {
  const account = db.select({ schoolYearStart: accounts.schoolYearStart }).from(accounts).where(eq(accounts.id, accountId)).get();
  if (!account) return 0;
  const templates = db
    .select()
    .from(formTemplates)
    .where(and(eq(formTemplates.accountId, accountId), eq(formTemplates.status, "published"), eq(formTemplates.autoAssign, true)))
    .all();

  let added = 0;
  for (const template of templates) {
    const ofTemplate = eq(childForms.templateId, template.id);

    if (!template.deadline) {
      const missing = childrenWithout(accountId, ofTemplate);
      added += insertCopies(accountId, template, missing.map((c) => c.id), null, "once");
      continue;
    }

    const dueDate = dueDateFor(template.deadline, account.schoolYearStart, today);
    const cycle = schoolYearStartDate(account.schoolYearStart, today).slice(0, 4);
    // A copy added before the form had a deadline, still to fill, becomes this year's copy
    // (OR IGNORE: skipped when the child already has one for this year).
    sqlite()
      .prepare("UPDATE OR IGNORE child_forms SET cycle = ?, due_date = ? WHERE template_id = ? AND cycle = 'once' AND status != 'submitted'")
      .run(cycle, dueDate, template.id);
    const missing = childrenWithout(accountId, and(ofTemplate, eq(childForms.cycle, cycle))!);
    added += insertCopies(accountId, template, missing.map((c) => c.id), dueDate, cycle);
    db.update(childForms)
      .set({ dueDate })
      .where(and(ofTemplate, eq(childForms.cycle, cycle), ne(childForms.status, "submitted"), or(isNull(childForms.dueDate), ne(childForms.dueDate, dueDate))))
      .run();
  }
  syncedToday.add(`${accountId}:${today}`);
  return added;
}

/** Once a day per cabinet: creates the new yearly copies when a school year starts. */
export function syncAutoFormsDaily(accountId: string) {
  const today = localToday();
  if (!syncedToday.has(`${accountId}:${today}`)) syncAutoForms(accountId, today);
}
