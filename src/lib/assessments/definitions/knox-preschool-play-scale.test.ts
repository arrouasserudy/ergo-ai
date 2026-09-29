import { describe, expect, it } from "vitest";
import { mostTickedLevel } from "../scoring";
import type { LevelItem, ScoreGroup } from "../types";
import { knoxPreschoolPlayScale as knox } from "./knox-preschool-play-scale";

const rowsOf = (groups: ScoreGroup[]) => Object.fromEntries(groups.flatMap((g) => g.rows.map((r) => [r.id, r])));
const factors = knox.sections.flatMap((s) => s.items) as LevelItem[];

describe("Revised Knox Preschool Play Scale", () => {
  it("has 12 factors in 4 dimensions (2, 4, 2, 4), each with levels 6 to 36 months", () => {
    expect(knox.sections.map((s) => s.items.length)).toEqual([2, 4, 2, 4]);
    for (const f of factors) expect(f.levels.map((l) => l.value)).toEqual([6, 12, 18, 24, 30, 36]);
  });

  it("gives every behavior a unique id; dramatization is not seen before 12 months", () => {
    const ids = factors.flatMap((f) => f.levels.flatMap((l) => l.descriptors.map((d) => d.id)));
    expect(new Set(ids).size).toBe(ids.length);
    const drama = factors.find((f) => f.id === "dramatization")!;
    expect(drama.levels.slice(0, 2).every((l) => l.descriptors.length === 0)).toBe(true);
  });

  it("suggests the level with most behaviors ticked", () => {
    const gross = factors.find((f) => f.id === "grossMotor")!;
    expect(mostTickedLevel(gross.levels, ["grossMotor-18-1", "grossMotor-18-2", "grossMotor-24-1"])).toBe(18);
  });

  it("averages dimensions and gives both overall play ages", () => {
    // space 12, 18 → 15; materials 18, 18, 24, 12 → 18; pretense 24, 18 → 21; participation 24, 24, 30, 18 → 24.
    const values = { grossMotor: 12, interests: 18, manipulation: 18, construction: 18, purpose: 24, attention: 12, imitation: 24, dramatization: 18, type: 24, cooperation: 24, humor: 30, language: 18 };
    const rows = rowsOf(knox.score({ values, ticks: {}, comments: {} }, { ageMonths: 30 }));
    expect([rows.space.value, rows.materials.value, rows.pretense.value, rows.participation.value]).toEqual([15, 18, 21, 24]);
    // Mean of the dimensions: 78 / 4 = 19.5. Mean of the 12 factors (the spreadsheet): 240 / 12 = 20.
    expect(rows.playAgeDimensions).toMatchObject({ value: 19.5, missing: 0, unit: "months" });
    expect(rows.playAgeFactors).toMatchObject({ value: 20, missing: 0 });
    expect(rows.chronologicalAge.value).toBe(30);
  });

  it("averages what is scored and counts what is not", () => {
    const rows = rowsOf(knox.score({ values: { grossMotor: 12 }, ticks: {}, comments: {} }, { ageMonths: null }));
    expect(rows.space).toMatchObject({ value: 12, missing: 1 });
    expect(rows.materials.value).toBeNull();
    expect(rows.playAgeFactors).toMatchObject({ value: 12, missing: 11 });
    expect(rows.chronologicalAge).toBeUndefined();
  });
});
