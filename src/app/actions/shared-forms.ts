"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { childForms } from "@/db/schema";
import { missingRequired, sanitizeAnswers } from "@/lib/forms/answers";
import { findSharedForm } from "@/lib/forms/queries";
import { track } from "@/lib/analytics/track";

// Public actions for parents: no session, the link's token is the only credential.
// Answers are sanitized against the form's own schema; nothing else can be written.

export type SharedFormResult = { ok: true; savedAt: number } | { ok: false; error: string; missing?: string[] };

/** Size cap on what a parent can post (JSON of the answers). */
const MAX_ANSWERS_BYTES = 500_000;

function openForm(token: string) {
  const found = findSharedForm(token);
  return found && found.form.status !== "submitted" ? found.form : null;
}

const tooLarge = (answers: unknown) => JSON.stringify(answers ?? null).length > MAX_ANSWERS_BYTES;

export async function saveSharedAnswers(token: string, answers: unknown): Promise<SharedFormResult> {
  const form = openForm(token);
  if (!form) return { ok: false, error: "expired" };
  if (tooLarge(answers)) return { ok: false, error: "generic" };
  db.update(childForms).set({ answers: sanitizeAnswers(form.schema, answers) }).where(eq(childForms.id, form.id)).run();
  revalidatePath(`/children/${form.childId}/forms/${form.id}`);
  return { ok: true, savedAt: Date.now() };
}

export async function submitSharedForm(token: string, answers: unknown): Promise<SharedFormResult> {
  const form = openForm(token);
  if (!form) return { ok: false, error: "expired" };
  if (tooLarge(answers)) return { ok: false, error: "generic" };
  const clean = sanitizeAnswers(form.schema, answers);
  const missing = missingRequired(form.schema, clean);
  if (missing.length) {
    db.update(childForms).set({ answers: clean }).where(eq(childForms.id, form.id)).run();
    return { ok: false, error: "missing", missing };
  }
  db.update(childForms)
    .set({ answers: clean, status: "submitted", submittedAt: new Date(), submittedBy: "parent" })
    .where(eq(childForms.id, form.id))
    .run();
  track({ accountId: form.accountId, therapistId: null }, "child_form.parent_submitted");
  // The whole app: the form leaves the bell (layout).
  revalidatePath("/", "layout");
  return { ok: true, savedAt: Date.now() };
}
