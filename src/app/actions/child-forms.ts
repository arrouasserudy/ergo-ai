"use server";

import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { childForms, type ChildForm } from "@/db/schema";
import { getChild } from "@/lib/children";
import { missingRequired, sanitizeAnswers } from "@/lib/forms/answers";
import { dueDateFor, schoolYearStartDate } from "@/lib/forms/deadlines";
import { getChildForm, getTemplate, hashToken, SHARE_LINK_DAYS } from "@/lib/forms/queries";
import { requireTherapist } from "@/lib/session";
import { localToday } from "@/lib/time";
import { track } from "@/lib/analytics/track";

// Each action re-checks the session and scopes by account (actions are reachable by direct POST).

/** The whole app: status changes also move the form in or out of the bell (layout). */
function revalidateChildForm() {
  revalidatePath("/", "layout");
}

/** Status once a completed form is reopened, or a link revoked. */
const openStatus = (form: Pick<ChildForm, "shareExpiresAt">) => (form.shareExpiresAt && form.shareExpiresAt.getTime() > Date.now() ? "sent" : "draft");

/**
 * Adds a published library form to a child's file (a copy of its schema), then opens it.
 * A form with a yearly deadline is this school year's copy: if the child already has it,
 * that one is opened instead.
 */
export async function attachForm(childId: string, formData: FormData) {
  const { accountId, account, therapist } = await requireTherapist();
  const child = getChild(accountId, childId);
  const template = getTemplate(accountId, String(formData.get("templateId") ?? ""));
  if (!child || !template || template.status !== "published") redirect(`/children/${childId}/forms`);

  const today = localToday();
  const yearly = template.deadline
    ? { dueDate: dueDateFor(template.deadline, account.schoolYearStart, today), cycle: schoolYearStartDate(account.schoolYearStart, today).slice(0, 4) }
    : { dueDate: null, cycle: null };
  const inserted = db
    .insert(childForms)
    .values({ accountId, childId, templateId: template.id, schema: template.schema, ...yearly })
    .onConflictDoNothing()
    .returning({ id: childForms.id })
    .get();
  const id =
    inserted?.id ??
    db
      .select({ id: childForms.id })
      .from(childForms)
      .where(and(eq(childForms.childId, childId), eq(childForms.templateId, template.id), eq(childForms.cycle, yearly.cycle!)))
      .get()!.id;
  if (inserted) track({ accountId, therapist }, "child_form.attached", { form: template.builtinKey ?? "custom" });
  revalidateChildForm();
  redirect(`/children/${childId}/forms/${id}`);
}

export type ChildFormResult = { ok: true; savedAt: number } | { ok: false; error: string; missing?: string[] };

/** Saves answers typed in the app. A completed form must be reopened first. */
export async function saveChildFormAnswers(id: string, answers: unknown): Promise<ChildFormResult> {
  const { accountId } = await requireTherapist();
  const form = getChildForm(accountId, id);
  if (!form || form.status === "submitted") return { ok: false, error: "generic" };
  db.update(childForms).set({ answers: sanitizeAnswers(form.schema, answers) }).where(eq(childForms.id, id)).run();
  // Not the form page itself: the answers being typed are the client's state.
  revalidatePath(`/children/${form.childId}`);
  revalidatePath(`/children/${form.childId}/forms`);
  return { ok: true, savedAt: Date.now() };
}

/** Saves and marks as completed by the practice; refused while required questions are empty. */
export async function submitChildForm(id: string, answers: unknown): Promise<ChildFormResult> {
  const { accountId, therapist } = await requireTherapist();
  const form = getChildForm(accountId, id);
  if (!form || form.status === "submitted") return { ok: false, error: "generic" };
  const clean = sanitizeAnswers(form.schema, answers);
  const missing = missingRequired(form.schema, clean);
  if (missing.length) {
    db.update(childForms).set({ answers: clean }).where(eq(childForms.id, id)).run();
    return { ok: false, error: "missing", missing };
  }
  db.update(childForms)
    .set({ answers: clean, status: "submitted", submittedAt: new Date(), submittedBy: "therapist" })
    .where(eq(childForms.id, id))
    .run();
  track({ accountId, therapist }, "child_form.submitted");
  revalidateChildForm();
  return { ok: true, savedAt: Date.now() };
}

/** Makes a completed form editable again (by the practice, and by the parents while their link is valid). */
export async function reopenChildForm(id: string) {
  const { accountId } = await requireTherapist();
  const form = getChildForm(accountId, id);
  if (!form) return;
  db.update(childForms).set({ status: openStatus(form), submittedAt: null, submittedBy: null }).where(eq(childForms.id, id)).run();
  revalidateChildForm();
}

export type ShareLinkResult = { ok: true; token: string; expiresAt: number } | { ok: false; error: string };

/**
 * A new parent link (replaces any previous one). Only its hash is stored: the token
 * is returned once, for the therapist to copy.
 */
export async function createShareLink(id: string): Promise<ShareLinkResult> {
  const { accountId, therapist } = await requireTherapist();
  const form = getChildForm(accountId, id);
  if (!form) return { ok: false, error: "generic" };
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SHARE_LINK_DAYS * 24 * 60 * 60 * 1000);
  db.update(childForms)
    .set({ shareTokenHash: hashToken(token), shareExpiresAt: expiresAt, status: form.status === "submitted" ? "submitted" : "sent" })
    .where(eq(childForms.id, id))
    .run();
  track({ accountId, therapist }, "child_form.link_created");
  revalidateChildForm();
  return { ok: true, token, expiresAt: expiresAt.getTime() };
}

export async function revokeShareLink(id: string) {
  const { accountId } = await requireTherapist();
  const form = getChildForm(accountId, id);
  if (!form) return;
  db.update(childForms)
    .set({ shareTokenHash: null, shareExpiresAt: null, status: form.status === "submitted" ? "submitted" : "draft" })
    .where(eq(childForms.id, id))
    .run();
  revalidateChildForm();
}

export async function deleteChildForm(id: string) {
  const { accountId } = await requireTherapist();
  const deleted = db
    .delete(childForms)
    .where(and(eq(childForms.id, id), eq(childForms.accountId, accountId)))
    .returning({ childId: childForms.childId })
    .get();
  if (!deleted) redirect("/children");
  revalidateChildForm();
  redirect(`/children/${deleted.childId}/forms`);
}
