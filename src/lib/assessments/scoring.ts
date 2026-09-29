import type { AssessmentAnswers, Level } from "./types";

// Building blocks of the definitions' `score()` functions. Pure and tested.

/** Sum of the answered items and the number left unanswered. */
export function sumOf(answers: AssessmentAnswers, ids: readonly string[]): { value: number; missing: number } {
  let value = 0;
  let missing = 0;
  for (const id of ids) {
    const v = answers.values[id];
    if (v === undefined) missing++;
    else value += v;
  }
  return { value, missing };
}

/** Mean of the known values (like a spreadsheet's AVERAGE, blanks ignored); null when none. */
export function meanOf(values: readonly (number | null | undefined)[]): number | null {
  const known = values.filter((v): v is number => typeof v === "number");
  return known.length ? known.reduce((a, b) => a + b, 0) / known.length : null;
}

/** A band's inclusive bounds; null for a band the test leaves empty. */
export type Range = readonly [number, number] | null;

/** Index of the band holding `value`, or null. */
export function bandOf(value: number, ranges: readonly Range[]): number | null {
  const index = ranges.findIndex((r) => r !== null && value >= r[0] && value <= r[1]);
  return index === -1 ? null : index;
}

/** "0–6", "0" when both bounds are equal, null for an empty band. */
export function rangeLabel(range: Range): string | null {
  if (!range) return null;
  return range[0] === range[1] ? String(range[0]) : `${range[0]}–${range[1]}`;
}

/**
 * The level with the most ticked behaviors (ties go to the higher level), or null
 * when nothing is ticked.
 */
export function mostTickedLevel(levels: readonly Level[], ticked: readonly string[] = []): number | null {
  const set = new Set(ticked);
  let best: { value: number; count: number } | null = null;
  for (const level of levels) {
    const count = level.descriptors.filter((d) => set.has(d.id)).length;
    if (count > 0 && (!best || count >= best.count)) best = { value: level.value, count };
  }
  return best?.value ?? null;
}

/** One decimal, as the Knox scoring sheet shows averages. */
export const round1 = (value: number | null): number | null => (value === null ? null : Math.round(value * 10) / 10);
