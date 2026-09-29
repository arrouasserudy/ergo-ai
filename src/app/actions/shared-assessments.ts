"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { assessments, children } from "@/db/schema";
import { sanitizeAnswers, unanswered } from "@/lib/assessments/answers";
import { findSharedAssessment } from "@/lib/assessments/queries";
import { ageAtTest, getDefinition } from "@/lib/assessments/registry";
import type { AssessmentResult } from "./assessments";

// Public actions for parents: no session, the link's token is the only credential.
// Answers are sanitized against the test's definition; scores are never returned.

const MAX_ANSWERS_BYTES = 200_000;

function openAssessment(token: string, answers: unknown) {
  const found = findSharedAssessment(token);
  if (!found || found.assessment.status === "completed" || JSON.stringify(answers ?? null).length > MAX_ANSWERS_BYTES) return null;
  const definition = getDefinition(found.assessment.definitionId);
  return definition?.respondents.includes("parent") ? { assessment: found.assessment, definition } : null;
}

export async function saveSharedAssessment(token: string, answers: unknown): Promise<AssessmentResult> {
  const found = openAssessment(token, answers);
  if (!found) return { ok: false, error: "expired" };
  db.update(assessments).set({ answers: sanitizeAnswers(found.definition, answers) }).where(eq(assessments.id, found.assessment.id)).run();
  revalidatePath(`/children/${found.assessment.childId}/assessments/${found.assessment.id}`);
  return { ok: true, savedAt: Date.now() };
}

/** Sends the answers once every item has one: the test is completed and scored for the cabinet. */
export async function submitSharedAssessment(token: string, answers: unknown): Promise<AssessmentResult> {
  const found = openAssessment(token, answers);
  if (!found) return { ok: false, error: "expired" };
  const { assessment, definition } = found;
  const clean = sanitizeAnswers(definition, answers);
  // Parents answer every statement ("Does Not Apply" when unsure).
  const missing = unanswered(definition, clean);
  if (missing.length) {
    db.update(assessments).set({ answers: clean }).where(eq(assessments.id, assessment.id)).run();
    return { ok: false, error: "missing", missing };
  }
  const child = db.select({ birthDate: children.birthDate }).from(children).where(eq(children.id, assessment.childId)).get();
  const scores = definition.score(clean, { ageMonths: ageAtTest(child?.birthDate ?? null, assessment.testDate) });
  db.update(assessments)
    .set({ answers: clean, scores, status: "completed", completedAt: new Date(), completedBy: "parent", definitionVersion: definition.version })
    .where(eq(assessments.id, assessment.id))
    .run();
  revalidatePath("/assessments");
  revalidatePath(`/children/${assessment.childId}`);
  revalidatePath(`/children/${assessment.childId}/assessments/${assessment.id}`);
  return { ok: true, savedAt: Date.now() };
}
