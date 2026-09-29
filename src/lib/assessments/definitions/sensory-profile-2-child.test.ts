import { describe, expect, it } from "vitest";
import { sanitizeAnswers } from "../answers";
import type { ScoreGroup } from "../types";
import { QUADRANT_ITEMS, SECTION_ITEMS, sensoryProfile2Child as sp2 } from "./sensory-profile-2-child";

// Checked against the printed Caregiver Questionnaire: item lists of the Quadrant Grid
// (p. 7) and maxima and ranges of the Summary Scores (p. 8).

const ids = (numbers: number[]) => numbers.map((n) => `i${n}`);
const GRID = {
  SK: ids([14, 21, 22, 25, 27, 28, 30, 31, 32, 41, 48, 49, 50, 51, 55, 56, 60, 82, 83]),
  AV: ids([1, 2, 5, 15, 18, 58, 59, 61, 63, 64, 65, 66, 67, 68, 70, 71, 72, 74, 75, 81]),
  SN: ids([3, 4, 6, 7, 9, 13, 16, 19, 20, 44, 45, 46, 47, 52, 69, 73, 77, 78, 84]),
  RG: ids([8, 12, 23, 24, 26, 33, 34, 35, 36, 37, 38, 39, 40, 53, 54, 57, 62, 76, 79, 80, 85, 86]),
};

const all = (value: number) => ({ values: Object.fromEntries(sp2.sections.flatMap((s) => s.items).map((i) => [i.id, value])), ticks: {}, comments: {} });
const rowsOf = (groups: ScoreGroup[]) => Object.fromEntries(groups.flatMap((g) => g.rows.map((r) => [r.id, r])));

describe("Sensory Profile 2 — Child", () => {
  it("has items 1 to 86, each in one section", () => {
    const numbers = sp2.sections.flatMap((s) => s.items.map((i) => (i.kind === "rating" ? i.number : 0)));
    expect(numbers).toEqual(Array.from({ length: 86 }, (_, i) => i + 1));
  });

  it("builds the quadrants of the Quadrant Grid from the item tags", () => {
    expect(QUADRANT_ITEMS).toEqual(GRID);
  });

  it("leaves items 15 and 86 out of their section scores only", () => {
    expect(SECTION_ITEMS.visual).not.toContain("i15");
    expect(SECTION_ITEMS.attentional).not.toContain("i86");
    expect(Object.values(SECTION_ITEMS).flat()).toHaveLength(84);
  });

  it("reaches the printed maximum of every total", () => {
    const rows = rowsOf(sp2.score(all(5), { ageMonths: 60 }));
    const printed = { SK: 95, AV: 100, SN: 95, RG: 110, auditory: 40, visual: 30, touch: 55, movement: 40, bodyPosition: 40, oral: 50, conduct: 45, socialEmotional: 70, attentional: 50 };
    for (const [id, max] of Object.entries(printed)) {
      expect(rows[id].value, id).toBe(max);
      expect(rows[id].max, id).toBe(max);
      expect(rows[id].band, id).toBe(4);
    }
  });

  it("has contiguous ranges covering 0 to the maximum", () => {
    const rows = rowsOf(sp2.score(all(5), { ageMonths: 60 }));
    for (const row of Object.values(rows)) {
      const bounds = row.ranges!.filter((r): r is string => r !== null).map((r) => r.split("–").map(Number));
      expect(bounds[0][0], row.id).toBe(0);
      expect(bounds.at(-1)!.at(-1), row.id).toBe(row.max);
      for (let i = 1; i < bounds.length; i++) expect(bounds[i][0], row.id).toBe(bounds[i - 1].at(-1)! + 1);
    }
  });

  it("scores a hand-checked example", () => {
    // Auditory: 5+4+3+2+1+0+3+2 = 20 → Just Like the Majority (10–24).
    // Every other item "Occasionally" (2).
    const answers = all(2);
    Object.assign(answers.values, { i1: 5, i2: 4, i3: 3, i4: 2, i5: 1, i6: 0, i7: 3, i8: 2 });
    const rows = rowsOf(sp2.score(sanitizeAnswers(sp2, answers), { ageMonths: 60 }));
    expect(rows.auditory).toMatchObject({ value: 20, band: 2, missing: 0 });
    // Seeking: 19 items × 2 = 38 → Just Like (20–47).
    expect(rows.SK).toMatchObject({ value: 38, band: 2 });
    // Avoiding: 1, 2, 5 = 10, 17 others × 2 = 34 → 44, Just Like (21–46).
    expect(rows.AV).toMatchObject({ value: 44, band: 2 });
    // Sensitivity: 3, 4, 6, 7 = 8, 15 others × 2 = 30 → 38 (18–42).
    expect(rows.SN).toMatchObject({ value: 38, band: 2 });
    // Registration: item 8 = 2, 22 × 2 = 44 → More Than Others (44–55).
    expect(rows.RG).toMatchObject({ value: 44, band: 3 });
    // Touch: 11 × 2 = 22 → More Than Others (22–28).
    expect(rows.touch).toMatchObject({ value: 22, band: 3 });
  });

  it("does not classify a total with unanswered items", () => {
    const answers = all(1);
    delete answers.values.i1;
    const rows = rowsOf(sp2.score(answers, { ageMonths: 60 }));
    expect(rows.auditory).toMatchObject({ value: 7, missing: 1, band: null });
    expect(rows.visual.band).toBe(1);
  });
});
