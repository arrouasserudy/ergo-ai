"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { childGroups, children, type ChildStatus } from "@/db/schema";
import { syncAutoForms } from "@/lib/forms/auto-assign";
import { requireTherapist } from "@/lib/session";
import { formDataToInput, identitySchema, sectionSchemas, SECTIONS, toFieldErrors, type FieldErrors, type Section } from "@/lib/validation";
import { track } from "@/lib/analytics/track";

// Server actions are reachable by direct POST: each one re-checks the session
// and scopes its query to the therapist's account.

export type FormState = {
  ok: boolean;
  errors?: FieldErrors;
  /** Submitted values, echoed back on error so the form keeps what was typed. */
  values?: Record<string, unknown>;
  /** Timestamp of the last successful save, so client forms can react. */
  savedAt?: number;
  /** Name of the therapist just added (account page confirmation). */
  addedName?: string;
};

/** A group id typed into a form must be one of the account's groups. */
function groupBelongs(accountId: string, groupId: string | null | undefined): boolean {
  if (!groupId) return true;
  return Boolean(db.select({ id: childGroups.id }).from(childGroups).where(and(eq(childGroups.id, groupId), eq(childGroups.accountId, accountId))).get());
}

export async function createChild(_prev: FormState, formData: FormData): Promise<FormState> {
  const { accountId, therapist } = await requireTherapist();
  const input = formDataToInput("identity", formData);
  const parsed = identitySchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: toFieldErrors(parsed.error), values: input };
  if (!groupBelongs(accountId, parsed.data.groupId)) return { ok: false, errors: { groupId: "generic" }, values: input };

  const created = db
    .insert(children)
    .values({ ...parsed.data, accountId, createdBy: therapist.id })
    .returning({ id: children.id })
    .get();
  syncAutoForms(accountId);
  track({ accountId, therapist }, "child.created");
  revalidatePath("/children");
  redirect(`/children/${created.id}`);
}

export async function updateChildSection(
  id: string,
  section: Section,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { accountId } = await requireTherapist();
  if (!SECTIONS.includes(section)) return { ok: false, errors: { form: "generic" } };

  const input = formDataToInput(section, formData);
  const parsed = sectionSchemas[section].safeParse(input);
  if (!parsed.success) return { ok: false, errors: toFieldErrors(parsed.error), values: input };
  if ("groupId" in parsed.data && !groupBelongs(accountId, parsed.data.groupId)) return { ok: false, errors: { groupId: "generic" }, values: input };

  const result = db
    .update(children)
    .set({ ...parsed.data, updatedAt: sql`(CURRENT_TIMESTAMP)` })
    .where(and(eq(children.id, id), eq(children.accountId, accountId)))
    .run();
  if (result.changes === 0) return { ok: false, errors: { form: "generic" } };

  revalidatePath("/children");
  revalidatePath("/groups", "layout");
  revalidatePath(`/children/${id}`, "layout");
  return { ok: true, savedAt: Date.now() };
}

export async function setChildStatus(id: string, status: ChildStatus) {
  const { accountId, therapist } = await requireTherapist();
  if (status !== "active" && status !== "archived") return;
  const result = db
    .update(children)
    .set({ status, updatedAt: sql`(CURRENT_TIMESTAMP)` })
    .where(and(eq(children.id, id), eq(children.accountId, accountId)))
    .run();
  if (result.changes && status === "archived") track({ accountId, therapist }, "child.archived");
  if (status === "active") syncAutoForms(accountId);
  // The bell (in the layout) lists active children's forms only.
  revalidatePath("/", "layout");
}
