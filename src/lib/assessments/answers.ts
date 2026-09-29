import type { AssessmentAnswers, AssessmentDefinition, AssessmentItem, AssessmentSection } from "./types";

const COMMENT_MAX = 2000;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** The values an item accepts: its section's scale, or its levels. */
function allowedValues(section: AssessmentSection, item: AssessmentItem): Set<number> {
  return new Set(item.kind === "rating" ? (section.scale ?? []).map((c) => c.value) : item.levels.map((l) => l.value));
}

/** Keeps only known items, allowed values and behaviors, and capped comments (untrusted input). */
export function sanitizeAnswers(definition: AssessmentDefinition, raw: unknown): AssessmentAnswers {
  const input = isRecord(raw) ? raw : {};
  const values = isRecord(input.values) ? input.values : {};
  const ticks = isRecord(input.ticks) ? input.ticks : {};
  const comments = isRecord(input.comments) ? input.comments : {};
  const result: AssessmentAnswers = { values: {}, ticks: {}, comments: {} };

  for (const section of definition.sections) {
    for (const item of section.items) {
      const value = values[item.id];
      if (typeof value === "number" && allowedValues(section, item).has(value)) result.values[item.id] = value;
      if (item.kind === "level" && Array.isArray(ticks[item.id])) {
        const known = new Set(item.levels.flatMap((l) => l.descriptors.map((d) => d.id)));
        const ticked = [...new Set((ticks[item.id] as unknown[]).filter((id): id is string => typeof id === "string" && known.has(id)))];
        if (ticked.length) result.ticks[item.id] = ticked;
      }
    }
    const comment = comments[section.id];
    if (section.comments && typeof comment === "string" && comment.trim()) result.comments[section.id] = comment.slice(0, COMMENT_MAX);
  }
  return result;
}

/** Items that take a value, and how many have one. */
export function progress(definition: AssessmentDefinition, answers: AssessmentAnswers): { answered: number; total: number } {
  const items = definition.sections.flatMap((s) => s.items);
  return { answered: items.filter((i) => answers.values[i.id] !== undefined).length, total: items.length };
}

/** Ids of the items still without a value, in order. */
export function unanswered(definition: AssessmentDefinition, answers: AssessmentAnswers): string[] {
  return definition.sections.flatMap((s) => s.items).filter((i) => answers.values[i.id] === undefined).map((i) => i.id);
}
