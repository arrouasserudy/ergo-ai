"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { syncAutoForms } from "@/lib/forms/auto-assign";
import { isDayMonth } from "@/lib/forms/deadlines";
import { requireOwner, requireTherapist } from "@/lib/session";
import { createTherapist, EmailTakenError } from "@/lib/therapists";
import { accountNameSchema, formDataToStrings, letterheadSchema, newTherapistSchema, toFieldErrors } from "@/lib/validation";
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
  revalidatePath("/settings");
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
  revalidatePath("/settings");
  return { ok: true, savedAt: Date.now(), addedName: parsed.data.name };
}

export type DeadlineSettings = { warnDays: number; schoolYearStart: string };

/** Cabinet-wide: how early forms are flagged, and when yearly deadlines restart. Any therapist of the cabinet. */
export async function updateDeadlineSettings(input: DeadlineSettings): Promise<{ ok: boolean }> {
  const { accountId } = await requireTherapist();
  const warnDays = Number(input?.warnDays);
  if (!Number.isInteger(warnDays) || warnDays < 0 || warnDays > 90 || !isDayMonth(input?.schoolYearStart)) return { ok: false };
  db.update(accounts).set({ deadlineWarnDays: warnDays, schoolYearStart: input.schoolYearStart }).where(eq(accounts.id, accountId)).run();
  syncAutoForms(accountId);
  revalidatePath("/", "layout");
  return { ok: true };
}
