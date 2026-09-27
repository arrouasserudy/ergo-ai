import "server-only";
import { and, desc, eq, type SQL } from "drizzle-orm";
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

/** Recent episodes across the account, with the child's name, open ones first. */
export function listAccountEpisodes(accountId: string, limit = 50) {
  return db
    .select({ episode: episodes, child: { id: children.id, name: children.name, birthDate: children.birthDate } })
    .from(episodes)
    .innerJoin(children, eq(children.id, episodes.childId))
    .where(eq(episodes.accountId, accountId))
    .orderBy(desc(episodes.status), desc(episodes.startedAt)) // descending puts "open" before "closed"
    .limit(limit)
    .all();
}
