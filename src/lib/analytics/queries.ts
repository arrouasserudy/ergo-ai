import "server-only";
import { and, count, countDistinct, desc, eq, gte, inArray, isNull, max, notInArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { DEMO_CABINET_IDS } from "@/db/demo-ids";
import { accounts, therapists, usageEvents } from "@/db/schema";
import type { UsageCount } from "./summary";
import type { TimelineEvent } from "./timeline";

export type UsageFilters = { days: number; includeDemo: boolean; includeAdmins: boolean };

const DEMO_ACCOUNT_IDS = Object.values(DEMO_CABINET_IDS).map((c) => c.accountId);

function adminTherapistIds(): string[] {
  const emails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!emails.length) return [];
  return db
    .select({ id: therapists.id })
    .from(therapists)
    .where(inArray(sql`lower(${therapists.email})`, emails))
    .all()
    .map((t) => t.id);
}

function scope({ days, includeDemo, includeAdmins }: UsageFilters) {
  const admins = includeAdmins ? [] : adminTherapistIds();
  return and(
    gte(usageEvents.createdAt, new Date(Date.now() - days * 86_400_000)),
    includeDemo ? undefined : notInArray(usageEvents.accountId, DEMO_ACCOUNT_IDS),
    admins.length ? or(isNull(usageEvents.therapistId), notInArray(usageEvents.therapistId, admins)) : undefined,
  );
}

/** Uses per page and per event over the period, with how many therapists and cabinets. */
export function usageCounts(filters: UsageFilters): UsageCount[] {
  return db
    .select({
      kind: usageEvents.kind,
      name: usageEvents.name,
      uses: count(),
      therapists: countDistinct(usageEvents.therapistId),
      cabinets: countDistinct(usageEvents.accountId),
      lastAt: max(usageEvents.createdAt),
    })
    .from(usageEvents)
    .where(scope(filters))
    .groupBy(usageEvents.kind, usageEvents.name)
    .all();
}

/** Therapists and cabinets with at least one recorded use over the period. */
export function activeTotals(filters: UsageFilters) {
  return db
    .select({ therapists: countDistinct(usageEvents.therapistId), cabinets: countDistinct(usageEvents.accountId), uses: count() })
    .from(usageEvents)
    .where(scope(filters))
    .get() ?? { therapists: 0, cabinets: 0, uses: 0 };
}

/** Therapists with recorded uses over the period, most recently active first. */
export function therapistActivity(filters: UsageFilters) {
  return db
    .select({
      id: therapists.id,
      name: therapists.name,
      email: therapists.email,
      cabinet: accounts.name,
      uses: count(),
      lastAt: max(usageEvents.createdAt),
    })
    .from(usageEvents)
    .innerJoin(therapists, eq(therapists.id, usageEvents.therapistId))
    .innerJoin(accounts, eq(accounts.id, usageEvents.accountId))
    .where(scope(filters))
    .groupBy(therapists.id)
    .orderBy(desc(max(usageEvents.createdAt)))
    .all();
}

export function getTherapistWithCabinet(therapistId: string) {
  return db
    .select({ id: therapists.id, name: therapists.name, email: therapists.email, cabinet: accounts.name })
    .from(therapists)
    .innerJoin(accounts, eq(accounts.id, therapists.accountId))
    .where(eq(therapists.id, therapistId))
    .get();
}

/** Most events one timeline loads (the newest ones). */
export const TIMELINE_LIMIT = 3000;

/** One therapist's events over the last `days`, newest first. */
export function therapistEvents(therapistId: string, days: number): TimelineEvent[] {
  return db
    .select({ kind: usageEvents.kind, name: usageEvents.name, props: usageEvents.props, createdAt: usageEvents.createdAt })
    .from(usageEvents)
    .where(and(eq(usageEvents.therapistId, therapistId), gte(usageEvents.createdAt, new Date(Date.now() - days * 86_400_000))))
    .orderBy(desc(usageEvents.createdAt))
    .limit(TIMELINE_LIMIT)
    .all();
}
