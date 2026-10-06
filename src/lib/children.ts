import "server-only";
import { and, desc, eq, isNull, like, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { children, type ChildStatus } from "@/db/schema";

export type StatusFilter = ChildStatus | "all";

/** Children of one account. Every query here is scoped by `accountId`. */
/** `group`: a group id, or "none" for the children without a group. */
export function listChildren(
  accountId: string,
  { search = "", status = "active", group }: { search?: string; status?: StatusFilter; group?: string } = {},
) {
  const conditions: SQL[] = [eq(children.accountId, accountId)];
  if (status !== "all") conditions.push(eq(children.status, status));
  if (group === "none") conditions.push(isNull(children.groupId));
  else if (group) conditions.push(eq(children.groupId, group));

  const term = search.trim();
  if (term) {
    const pattern = `%${term}%`;
    // Also match initials typed without dots/spaces ("LM" → "L. M.").
    const compact = `%${term.replace(/[\s.]/g, "").split("").join("%")}%`;
    conditions.push(
      or(
        like(children.name, pattern),
        like(children.name, compact),
        like(children.referralReason, pattern),
        like(children.schoolLevel, pattern),
      )!,
    );
  }

  return db
    .select()
    .from(children)
    .where(and(...conditions))
    .orderBy(desc(children.updatedAt))
    .all();
}

export function getChild(accountId: string, id: string) {
  return db
    .select()
    .from(children)
    .where(and(eq(children.id, id), eq(children.accountId, accountId)))
    .get() ?? null;
}
