import "server-only";
import { and, asc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { type Account, childGroups, children, episodes, reports } from "@/db/schema";
import { listEvents } from "@/lib/child-events/queries";
import { upcomingEvents } from "@/lib/child-events/events";
import { pendingForms } from "@/lib/forms/queries";
import { localToday } from "@/lib/time";
import { summarizeChildren, WINDOW_DAYS } from "./overview";

// Every query here is scoped by `accountId`.

export function listGroups(accountId: string) {
  return db.select().from(childGroups).where(eq(childGroups.accountId, accountId)).orderBy(asc(childGroups.name)).all();
}

export function getGroup(accountId: string, id: string) {
  return db
    .select()
    .from(childGroups)
    .where(and(eq(childGroups.id, id), eq(childGroups.accountId, accountId)))
    .get() ?? null;
}

/** Active children of the account (optionally of one group) with their overview figures (no crises when the module is off). */
export function childSummaries(account: Account, { groupId }: { groupId?: string } = {}, now = new Date()) {
  const accountId = account.id;
  const conditions = [eq(children.accountId, accountId), eq(children.status, "active")];
  if (groupId) conditions.push(eq(children.groupId, groupId));
  const kids = db
    .select({ id: children.id, name: children.name, birthDate: children.birthDate, schoolLevel: children.schoolLevel, groupId: children.groupId })
    .from(children)
    .where(and(...conditions))
    .orderBy(asc(children.name))
    .all();

  const today = localToday(now);
  const since = new Date(now.getTime() - 2 * WINDOW_DAYS * 86_400_000);
  const summaries = summarizeChildren(kids, {
    now,
    episodes: !account.crisesEnabled
      ? []
      : db
          .select({ childId: episodes.childId, kind: episodes.kind, startedAt: episodes.startedAt })
          .from(episodes)
          .where(and(eq(episodes.accountId, accountId), gte(episodes.startedAt, since)))
          .all(),
    forms: pendingForms(accountId, today, account.deadlineWarnDays),
    drafts: db
      .select({ childId: reports.childId })
      .from(reports)
      .where(and(eq(reports.accountId, accountId), eq(reports.status, "draft")))
      .all(),
    events: upcomingEvents(listEvents(accountId, { today, warnDays: account.deadlineWarnDays }), today),
  });
  return kids.map((child) => ({ child, summary: summaries.get(child.id)! }));
}
