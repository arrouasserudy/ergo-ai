import { knoxPreschoolPlayScale } from "./definitions/knox-preschool-play-scale";
import { sensoryProfile2Child } from "./definitions/sensory-profile-2-child";
import { ageInMonths } from "@/i18n";
import type { AssessmentAnswers, AssessmentDefinition, ScoreGroup } from "./types";

/** The tests available in the app, in catalog order. Adding a test = one definition file + its tests. */
export const ASSESSMENTS: AssessmentDefinition[] = [sensoryProfile2Child, knoxPreschoolPlayScale];

export function getDefinition(id: string): AssessmentDefinition | null {
  return ASSESSMENTS.find((d) => d.id === id) ?? null;
}

/** Whether the child's age at the test date is within the test's norms (unknown age: not flagged). */
export function inAgeRange(definition: AssessmentDefinition, ageMonths: number | null): boolean {
  if (!definition.ageRange || ageMonths === null) return true;
  return ageMonths >= definition.ageRange.minMonths && ageMonths <= definition.ageRange.maxMonths;
}

/** The child's age in whole months on the test date, null without a birth date. */
export function ageAtTest(birthDate: string | null, testDate: string): number | null {
  return birthDate ? ageInMonths(birthDate, new Date(`${testDate}T12:00:00`)) : null;
}

/** Scores as shown: the snapshot of a completed test, else computed from the current answers. */
export function scoresOf(
  definition: AssessmentDefinition,
  assessment: { answers: AssessmentAnswers; scores: ScoreGroup[] | null; testDate: string },
  birthDate: string | null,
): ScoreGroup[] {
  return assessment.scores ?? definition.score(assessment.answers, { ageMonths: ageAtTest(birthDate, assessment.testDate) });
}
