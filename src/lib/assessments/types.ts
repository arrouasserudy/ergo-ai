/**
 * Standardized OT tests ("assessments"). Each test is written by hand in
 * `definitions/`: its content (in the test's own language) and a pure `score()`
 * function. The app never lets a model compute a score.
 */

export type AssessmentLanguage = "fr" | "he" | "en";
export type Respondent = "therapist" | "parent";

/** One answer choice of a rating item, e.g. "Almost Always" = 5. */
export type RatingChoice = { value: number; label: string; short?: string };

/** An item answered by picking one value of the section's scale (Sensory Profile 2). */
export type RatingItem = { kind: "rating"; id: string; number: number; text: string };

/** One age level of a level item, with the behaviors that can be ticked when observed. */
export type Level = { value: number; label: string; descriptors: { id: string; text: string }[] };

/**
 * An item scored by choosing a level (Knox factor): the therapist ticks the behaviors
 * observed at each level, then picks the level; the most ticked one is suggested.
 */
export type LevelItem = { kind: "level"; id: string; text: string; levels: Level[] };

export type AssessmentItem = RatingItem | LevelItem;

export type AssessmentSection = {
  id: string;
  title: string;
  /** Shown above the items ("My child…"). */
  lead?: string;
  /** The scale of the rating items of this section. */
  scale?: RatingChoice[];
  items: AssessmentItem[];
  /** A free comments box under the section. */
  comments?: boolean;
  /** Footnote under the items ("* This item is not part of the raw score."). */
  note?: string;
};

/**
 * Answers keyed by item id: the chosen value (rating value or level), the ticked
 * behaviors of level items, and the comments of each section.
 */
export type AssessmentAnswers = {
  values: Record<string, number>;
  ticks: Record<string, string[]>;
  comments: Record<string, string>;
};

export const EMPTY_ANSWERS: AssessmentAnswers = { values: {}, ticks: {}, comments: {} };

/** A computed score. `band` is the index of the matching column of the group's `bands`. */
export type ScoreRow = {
  id: string;
  label: string;
  value: number | null;
  max?: number;
  unit: "points" | "months";
  /** Items without an answer that count in this score. */
  missing: number;
  band?: number | null;
  /** Range of each band column ("0–6"), null when the test gives none. */
  ranges?: (string | null)[];
};

export type ScoreGroup = { id: string; title: string; bands?: string[]; rows: ScoreRow[] };

export type ScoreContext = { ageMonths: number | null };

export type AssessmentDefinition = {
  id: string;
  /** Bumped when content or scoring changes; stored with each administration. */
  version: number;
  name: string;
  shortName: string;
  language: AssessmentLanguage;
  respondents: Respondent[];
  /** Ages the norms apply to, in months (inclusive). */
  ageRange?: { minMonths: number; maxMonths: number };
  instructions?: string;
  sections: AssessmentSection[];
  /** Id of the score group summarized on the child's timeline (default: the first group). */
  summaryGroup?: string;
  score: (answers: AssessmentAnswers, context: ScoreContext) => ScoreGroup[];
};
