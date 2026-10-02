import "server-only";
import { and, desc, eq, gte, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { children, episodes, type EpisodeStatus } from "@/db/schema";

/** Every query here is scoped by `accountId`. */

export function getEpisode(accountId: string, id: string) {
  return db
    .select()
    .from(episodes)
    .where(and(eq(episodes.id, id), eq(episodes.accountId, accountId)))
    .get() ?? null;
}

export function listChildEpisodes(accountId: string, childId: string, { status, limit = 200 }: { status?: EpisodeStatus; limit?: number } = {}) {
  const conditions: SQL[] = [eq(episodes.accountId, accountId), eq(episodes.childId, childId)];
  if (status) conditions.push(eq(episodes.status, status));
  return db
    .select()
    .from(episodes)
    .where(and(...conditions))
    .orderBy(desc(episodes.startedAt))
    .limit(limit)
    .all();
}

/** Finished episodes across the account started since `since`, with the child's name (crises page). */
export function listClosedEpisodesSince(accountId: string, since: Date) {
  return db
    .select({ episode: episodes, child: { id: children.id, name: children.name } })
    .from(episodes)
    .innerJoin(children, eq(children.id, episodes.childId))
    .where(and(eq(episodes.accountId, accountId), eq(episodes.status, "closed"), gte(episodes.startedAt, since)))
    .orderBy(desc(episodes.startedAt))
    .all();
}

/** Entries still in progress across the account, with their child, most recent first. */
export function listOpenEpisodes(accountId: string) {
  return db
    .select({ episode: episodes, child: { id: children.id, name: children.name } })
    .from(episodes)
    .innerJoin(children, eq(children.id, episodes.childId))
    .where(and(eq(episodes.accountId, accountId), eq(episodes.status, "open")))
    .orderBy(desc(episodes.startedAt))
    .all();
}
