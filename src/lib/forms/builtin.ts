import { and, eq, inArray, isNotNull, lt } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type * as dbSchema from "../../db/schema";
import { accounts, formTemplates } from "../../db/schema";
import { BUILTIN_FORMS, type BuiltinForm } from "./defaults";

// Relative imports and an injected database: also run from `db/index.ts` (startup) and the seed script.

type Database = BetterSQLite3Database<typeof dbSchema>;
type Stored = { builtinKey: string | null; builtinVersion: number | null };

/** Built-in forms a cabinet lacks, and those stored in an older version (to replace). */
export function planBuiltinSync(stored: Stored[], forms: BuiltinForm[] = BUILTIN_FORMS) {
  const versions = new Map(stored.filter((s) => s.builtinKey).map((s) => [s.builtinKey!, s.builtinVersion ?? 0]));
  return {
    insert: forms.filter((f) => !versions.has(f.key)),
    update: forms.filter((f) => versions.has(f.key) && versions.get(f.key)! < f.version),
  };
}

/**
 * Makes sure every cabinet (or the given ones) has each built-in form, published, in its
 * current version. Idempotent: the (account, builtin_key) unique index guards against
 * races. A new version replaces the template's schema; copies already attached to
 * children keep theirs.
 */
export function ensureBuiltinForms(db: Database, accountIds?: string[]): void {
  const ids = accountIds ?? db.select({ id: accounts.id }).from(accounts).all().map((a) => a.id);
  if (ids.length === 0) return;
  const stored = db
    .select({ accountId: formTemplates.accountId, builtinKey: formTemplates.builtinKey, builtinVersion: formTemplates.builtinVersion })
    .from(formTemplates)
    .where(and(inArray(formTemplates.accountId, ids), isNotNull(formTemplates.builtinKey)))
    .all();

  for (const accountId of ids) {
    const plan = planBuiltinSync(stored.filter((s) => s.accountId === accountId));
    for (const form of plan.insert) {
      db.insert(formTemplates)
        .values({
          accountId,
          title: form.schema.title,
          sourceFilename: "",
          sourceKind: "builtin",
          schema: form.schema,
          status: "published",
          builtinKey: form.key,
          builtinVersion: form.version,
          model: "builtin",
          generatedAt: new Date(0), // not a conversion: stays out of the daily limit
        })
        .onConflictDoNothing()
        .run();
    }
    for (const form of plan.update) {
      db.update(formTemplates)
        .set({ schema: form.schema, title: form.schema.title, status: "published", builtinVersion: form.version })
        .where(and(eq(formTemplates.accountId, accountId), eq(formTemplates.builtinKey, form.key), lt(formTemplates.builtinVersion, form.version)))
        .run();
    }
  }
}
