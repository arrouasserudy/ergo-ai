"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { childEvents, children, reports } from "@/db/schema";
import { parseEventInput, type EventErrors } from "@/lib/child-events/events";
import { requireTherapist } from "@/lib/session";
import { track } from "@/lib/analytics/track";

// Reachable by direct POST: each action re-checks the session and scopes by account.

export type EventFormState = { ok: boolean; errors?: EventErrors & { form?: string }; values?: Record<string, string>; savedAt?: number };

const FIELDS = ["kind", "date", "time", "reportId", "details"] as const;

/** Creates (no `eventId`) or updates an event of one of the account's children. */
export async function saveChildEvent(childId: string, eventId: string | null, _prev: EventFormState, formData: FormData): Promise<EventFormState> {
  const { accountId, therapist } = await requireTherapist();
  const values = Object.fromEntries(FIELDS.map((f) => [f, String(formData.get(f) ?? "")]));
  const child = db
    .select({ id: children.id })
    .from(children)
    .where(and(eq(children.id, childId), eq(children.accountId, accountId)))
    .get();
  if (!child) return { ok: false, errors: { form: "generic" }, values };

  const reportIds = db
    .select({ id: reports.id })
    .from(reports)
    .where(and(eq(reports.accountId, accountId), eq(reports.childId, childId)))
    .all()
    .map((r) => r.id);
  const parsed = parseEventInput(values, reportIds);
  if (!parsed.ok) return { ok: false, errors: parsed.errors, values };

  if (eventId) {
    const result = db
      .update(childEvents)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(childEvents.id, eventId), eq(childEvents.childId, childId), eq(childEvents.accountId, accountId)))
      .run();
    if (result.changes === 0) return { ok: false, errors: { form: "generic" }, values };
  } else {
    db.insert(childEvents)
      .values({ ...parsed.data, accountId, childId, createdBy: therapist.id })
      .run();
  }
  track({ accountId, therapist }, "child_event.saved", { kind: parsed.data.kind, edit: Boolean(eventId) });
  revalidatePath(`/children/${childId}`, "layout");
  revalidatePath("/calendar");
  return { ok: true, savedAt: Date.now() };
}

export async function deleteChildEvent(eventId: string) {
  const { accountId } = await requireTherapist();
  const row = db
    .delete(childEvents)
    .where(and(eq(childEvents.id, eventId), eq(childEvents.accountId, accountId)))
    .returning({ childId: childEvents.childId })
    .get();
  if (!row) return;
  revalidatePath(`/children/${row.childId}`, "layout");
  revalidatePath("/calendar");
}
