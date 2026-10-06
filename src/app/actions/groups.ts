"use server";

import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { childGroups, children } from "@/db/schema";
import { requireTherapist } from "@/lib/session";
import { groupSchema, toFieldErrors } from "@/lib/validation";
import type { FormState } from "./children";
import { track } from "@/lib/analytics/track";

// Groups are cabinet data, like children: any therapist of the account manages them.
// Each action re-checks the session and scopes its queries to the account.

const groupInput = (formData: FormData) => ({
  name: String(formData.get("name") ?? ""),
  place: String(formData.get("place") ?? ""),
  color: String(formData.get("color") ?? ""),
});

function revalidateGroups() {
  revalidatePath("/groups", "layout");
  revalidatePath("/children", "layout");
}

export async function createGroup(_prev: FormState, formData: FormData): Promise<FormState> {
  const { accountId, therapist } = await requireTherapist();
  const input = groupInput(formData);
  const parsed = groupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: toFieldErrors(parsed.error), values: input };
  const created = db
    .insert(childGroups)
    .values({ ...parsed.data, accountId })
    .returning({ id: childGroups.id })
    .get();
  track({ accountId, therapist }, "group.created");
  revalidateGroups();
  redirect(`/groups/${created.id}?members=1`);
}

export async function updateGroup(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { accountId } = await requireTherapist();
  const input = groupInput(formData);
  const parsed = groupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: toFieldErrors(parsed.error), values: input };
  const result = db
    .update(childGroups)
    .set(parsed.data)
    .where(and(eq(childGroups.id, id), eq(childGroups.accountId, accountId)))
    .run();
  if (result.changes === 0) return { ok: false, errors: { form: "generic" } };
  revalidateGroups();
  return { ok: true, savedAt: Date.now() };
}

/** Deletes the group; its children stay, without a group. */
export async function deleteGroup(id: string) {
  const { accountId } = await requireTherapist();
  db.transaction((tx) => {
    tx.update(children)
      .set({ groupId: null, updatedAt: sql`(CURRENT_TIMESTAMP)` })
      .where(and(eq(children.accountId, accountId), eq(children.groupId, id)))
      .run();
    tx.delete(childGroups)
      .where(and(eq(childGroups.id, id), eq(childGroups.accountId, accountId)))
      .run();
  });
  revalidateGroups();
  redirect("/groups");
}

/** Sets the children of a group: the ticked ones join it (leaving their previous group), the others leave it. */
export async function setGroupMembers(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const { accountId, therapist } = await requireTherapist();
  const group = db.select({ id: childGroups.id }).from(childGroups).where(and(eq(childGroups.id, id), eq(childGroups.accountId, accountId))).get();
  if (!group) return { ok: false, errors: { form: "generic" } };
  const ids = [...new Set(formData.getAll("childId").map(String))].slice(0, 500);

  db.transaction((tx) => {
    tx.update(children)
      .set({ groupId: null, updatedAt: sql`(CURRENT_TIMESTAMP)` })
      .where(and(eq(children.accountId, accountId), eq(children.groupId, id), ...(ids.length ? [notInArray(children.id, ids)] : [])))
      .run();
    if (ids.length) {
      tx.update(children)
        .set({ groupId: id, updatedAt: sql`(CURRENT_TIMESTAMP)` })
        .where(and(eq(children.accountId, accountId), inArray(children.id, ids)))
        .run();
    }
  });
  track({ accountId, therapist }, "group.members_set", { count: ids.length });
  revalidateGroups();
  return { ok: true, savedAt: Date.now() };
}
