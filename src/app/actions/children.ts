"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { children, type ChildStatus } from "@/db/schema";
import { requireTherapist } from "@/lib/session";
import { formDataToInput, identitySchema, sectionSchemas, SECTIONS, toFieldErrors, type FieldErrors, type Section } from "@/lib/validation";

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

export async function createChild(_prev: FormState, formData: FormData): Promise<FormState> {
  const { accountId, therapist } = await requireTherapist();
  const input = formDataToInput("identity", formData);
  const parsed = identitySchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: toFieldErrors(parsed.error), values: input };

  const created = db
    .insert(children)
    .values({ ...parsed.data, accountId, createdBy: therapist.id })
    .returning({ id: children.id })
    .get();
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

  const result = db
    .update(children)
    .set({ ...parsed.data, updatedAt: sql`(CURRENT_TIMESTAMP)` })
    .where(and(eq(children.id, id), eq(children.accountId, accountId)))
    .run();
  if (result.changes === 0) return { ok: false, errors: { form: "generic" } };

  revalidatePath("/children");
  revalidatePath(`/children/${id}`);
  return { ok: true, savedAt: Date.now() };
}

export async function setChildStatus(id: string, status: ChildStatus) {
  const { accountId } = await requireTherapist();
  if (status !== "active" && status !== "archived") return;
  db.update(children)
    .set({ status, updatedAt: sql`(CURRENT_TIMESTAMP)` })
    .where(and(eq(children.id, id), eq(children.accountId, accountId)))
    .run();
  revalidatePath("/children");
  revalidatePath(`/children/${id}`);
}
