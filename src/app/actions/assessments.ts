"use server";

import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { assessments, type Assessment } from "@/db/schema";
import { sanitizeAnswers } from "@/lib/assessments/answers";
import { getAssessment } from "@/lib/assessments/queries";
import { ageAtTest, getDefinition } from "@/lib/assessments/registry";
import { getChild } from "@/lib/children";
import { hashToken, SHARE_LINK_DAYS } from "@/lib/forms/queries";
import { requireTherapist } from "@/lib/session";
import { localToday } from "@/lib/time";
import type { ShareLinkResult } from "./child-forms";
import { track } from "@/lib/analytics/track";

// Each action re-checks the session and scopes by account (actions are reachable by direct POST).

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function revalidateAssessment(a: Pick<Assessment, "id" | "childId">) {
  revalidatePath("/assessments");
  revalidatePath(`/children/${a.childId}`, "layout");
}

/** Status once a completed test is reopened, or a link revoked. */
const openStatus = (a: Pick<Assessment, "shareExpiresAt">) => (a.shareExpiresAt && a.shareExpiresAt.getTime() > Date.now() ? "sent" : "draft");

/** Form action of the child page: starts a test (picked in the catalog) on a date, then opens it. */
export async function startAssessment(childId: string, formData: FormData) {
  const { accountId, therapist } = await requireTherapist();
  const child = getChild(accountId, childId);
  const definition = getDefinition(String(formData.get("definitionId") ?? ""));
  const date = String(formData.get("testDate") ?? "");
  if (!child || !definition) redirect(`/children/${childId}/forms`);

  const { id } = db
    .insert(assessments)
    .values({
      accountId,
      childId,
      createdBy: therapist.id,
      definitionId: definition.id,
      definitionVersion: definition.version,
      testDate: ISO_DATE.test(date) ? date : localToday(),
    })
    .returning({ id: assessments.id })
    .get();
  track({ accountId, therapist }, "assessment.started", { test: definition.id });
  revalidateAssessment({ id, childId });
  redirect(`/children/${childId}/assessments/${id}`);
}

export type AssessmentResult = { ok: true; savedAt: number } | { ok: false; error: string; missing?: string[] };

function editable(accountId: string, id: string) {
  const assessment = getAssessment(accountId, id);
  const definition = assessment && getDefinition(assessment.definitionId);
  return assessment && definition && assessment.status !== "completed" ? { assessment, definition } : null;
}

/** Autosave of the answers typed in the app. */
export async function saveAssessmentAnswers(id: string, answers: unknown): Promise<AssessmentResult> {
  const { accountId } = await requireTherapist();
  const found = editable(accountId, id);
  if (!found) return { ok: false, error: "generic" };
  db.update(assessments).set({ answers: sanitizeAnswers(found.definition, answers) }).where(eq(assessments.id, id)).run();
  revalidatePath(`/children/${found.assessment.childId}`);
  revalidatePath(`/children/${found.assessment.childId}/forms`);
  return { ok: true, savedAt: Date.now() };
}

/** Saves, computes and stores the scores. Unanswered items are allowed: their totals stay unclassified. */
export async function completeAssessment(id: string, answers: unknown): Promise<AssessmentResult> {
  const { accountId, therapist } = await requireTherapist();
  const found = editable(accountId, id);
  const child = found && getChild(accountId, found.assessment.childId);
  if (!found || !child) return { ok: false, error: "generic" };
  const clean = sanitizeAnswers(found.definition, answers);
  const scores = found.definition.score(clean, { ageMonths: ageAtTest(child.birthDate, found.assessment.testDate) });
  db.update(assessments)
    .set({ answers: clean, scores, status: "completed", completedAt: new Date(), completedBy: "therapist", definitionVersion: found.definition.version })
    .where(eq(assessments.id, id))
    .run();
  track({ accountId, therapist }, "assessment.completed", { test: found.definition.id });
  revalidateAssessment(found.assessment);
  return { ok: true, savedAt: Date.now() };
}

/** Makes a completed test editable again; its scores are computed live until completed again. */
export async function reopenAssessment(id: string) {
  const { accountId } = await requireTherapist();
  const assessment = getAssessment(accountId, id);
  if (!assessment) return;
  db.update(assessments)
    .set({ status: openStatus(assessment), scores: null, completedAt: null, completedBy: null })
    .where(eq(assessments.id, id))
    .run();
  revalidateAssessment(assessment);
}

export async function deleteAssessment(id: string) {
  const { accountId } = await requireTherapist();
  const deleted = db
    .delete(assessments)
    .where(and(eq(assessments.id, id), eq(assessments.accountId, accountId)))
    .returning({ id: assessments.id, childId: assessments.childId })
    .get();
  if (!deleted) redirect("/assessments");
  revalidateAssessment(deleted);
  redirect(`/children/${deleted.childId}/forms`);
}

/** A new parent link (replaces any previous one), for tests parents can fill in. Only its hash is stored. */
export async function createAssessmentLink(id: string): Promise<ShareLinkResult> {
  const { accountId, therapist } = await requireTherapist();
  const assessment = getAssessment(accountId, id);
  const definition = assessment && getDefinition(assessment.definitionId);
  if (!assessment || !definition?.respondents.includes("parent")) return { ok: false, error: "generic" };
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SHARE_LINK_DAYS * 24 * 60 * 60 * 1000);
  db.update(assessments)
    .set({ shareTokenHash: hashToken(token), shareExpiresAt: expiresAt, status: assessment.status === "completed" ? "completed" : "sent" })
    .where(eq(assessments.id, id))
    .run();
  track({ accountId, therapist }, "assessment.link_created", { test: definition.id });
  revalidateAssessment(assessment);
  return { ok: true, token, expiresAt: expiresAt.getTime() };
}

export async function revokeAssessmentLink(id: string) {
  const { accountId } = await requireTherapist();
  const assessment = getAssessment(accountId, id);
  if (!assessment) return;
  db.update(assessments)
    .set({ shareTokenHash: null, shareExpiresAt: null, status: assessment.status === "completed" ? "completed" : "draft" })
    .where(eq(assessments.id, id))
    .run();
  revalidateAssessment(assessment);
}
