import "server-only";
import { lt } from "drizzle-orm";
import { db } from "@/db";
import { usageEvents, type UsageKind } from "@/db/schema";
import { localToday } from "@/lib/time";
import { sanitizeProps, type EventName } from "./events";
import type { AppRoute } from "./routes";

/** Usage events are kept for a year, then deleted. */
export const USAGE_RETENTION_DAYS = 365;

type Scope = { accountId: string; therapistId: string | null };
export type UsageRow = { kind: "page"; name: AppRoute } | { kind: "event"; name: EventName; props?: Record<string, unknown> };

let prunedOn: string | null = null;

function pruneDaily() {
  const today = localToday();
  if (prunedOn === today) return;
  prunedOn = today;
  db.delete(usageEvents)
    .where(lt(usageEvents.createdAt, new Date(Date.now() - USAGE_RETENTION_DAYS * 86_400_000)))
    .run();
}

/** Stores usage rows; analytics never break the feature, so errors are only logged. */
export function recordUsage(scope: Scope, rows: UsageRow[]) {
  if (!rows.length) return;
  try {
    const now = new Date();
    db.insert(usageEvents)
      .values(
        rows.map((row) => ({
          accountId: scope.accountId,
          therapistId: scope.therapistId,
          kind: row.kind satisfies UsageKind,
          name: row.name,
          props: row.kind === "event" ? sanitizeProps(row.props) : null,
          createdAt: now,
        })),
      )
      .run();
    pruneDaily();
  } catch (error) {
    console.error("[usage] could not record", error);
  }
}

/** Records that a feature was used, from a server action or route (see EVENTS). */
export function track(scope: Scope | { accountId: string; therapist: { id: string } }, name: EventName, props?: Record<string, unknown>) {
  const resolved = "therapist" in scope ? { accountId: scope.accountId, therapistId: scope.therapist.id } : scope;
  recordUsage(resolved, [{ kind: "event", name, props }]);
}
