"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { requireOwner } from "@/lib/session";
import { createTherapist, EmailTakenError } from "@/lib/therapists";
import { MILESTONES } from "@/db/schema";
import { accountNameSchema, deadlinesSchema, formDataToStrings, letterheadSchema, newTherapistSchema, toFieldErrors } from "@/lib/validation";
import type { FormState } from "./children";

export async function renameAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  const { accountId } = await requireOwner();
  const input = formDataToStrings(formData, ["name"]);
  const parsed = accountNameSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: toFieldErrors(parsed.error), values: input };

  db.update(accounts).set({ name: parsed.data.name }).where(eq(accounts.id, accountId)).run();
  revalidatePath("/", "layout");
  return { ok: true, savedAt: Date.now() };
}

/** Letterhead printed on exported reports. */
export async function saveLetterhead(_prev: FormState, formData: FormData): Promise<FormState> {
  const { accountId } = await requireOwner();
  const input = formDataToStrings(formData, ["letterhead"]);
  const parsed = letterheadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: toFieldErrors(parsed.error), values: input };

  db.update(accounts).set({ letterhead: parsed.data.letterhead }).where(eq(accounts.id, accountId)).run();
  revalidatePath("/account");
  return { ok: true, savedAt: Date.now() };
}

/** The cabinet's school-year deadlines (initial assessment, parent guidance, year-end report). */
export async function saveDeadlines(_prev: FormState, formData: FormData): Promise<FormState> {
  const { accountId } = await requireOwner();
  const input = formDataToStrings(formData, [...MILESTONES]);
  const parsed = deadlinesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: toFieldErrors(parsed.error), values: input };

  db.update(accounts).set({ deadlines: parsed.data }).where(eq(accounts.id, accountId)).run();
  revalidatePath("/", "layout");
  return { ok: true, savedAt: Date.now() };
}

export async function addTherapist(_prev: FormState, formData: FormData): Promise<FormState> {
  const { accountId } = await requireOwner();
  const input = formDataToStrings(formData, ["name", "email", "password"]);
  const values = { name: input.name, email: input.email }; // never echo the password back
  const parsed = newTherapistSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: toFieldErrors(parsed.error), values };

  try {
    await createTherapist({ ...parsed.data, accountId, role: "member" });
  } catch (error) {
    if (error instanceof EmailTakenError) return { ok: false, errors: { email: "emailTaken" }, values };
    throw error;
  }
  revalidatePath("/account");
  return { ok: true, savedAt: Date.now(), addedName: parsed.data.name };
}
