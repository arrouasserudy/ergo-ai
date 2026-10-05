import { describe, expect, it } from "vitest";
import type { ScoreGroup, ScoreRow } from "@/lib/assessments/types";
import { bandPosition, compareScores, countAllChanges, countChanges, linearMax, monthsBetween } from "./compare";

const BANDS = ["Much less", "Less", "Just like", "More", "Much more"];
const RANGES = ["0–6", "7–19", "20–47", "48–60", "61–95"];
const row = (id: string, value: number | null, band: number | null, missing = 0): ScoreRow => ({
  id,
  label: id.toUpperCase(),
  value,
  max: 95,
  unit: "points",
  missing,
  band,
  ranges: RANGES,
});
const quadrants = (rows: ScoreRow[]): ScoreGroup => ({ id: "quadrants", title: "Quadrants", bands: BANDS, rows });

describe("compareScores", () => {
  it("matches rows by id and computes differences and band changes", () => {
    const [group] = compareScores([quadrants([row("sk", 31, 2), row("av", 72, 4)])], [quadrants([row("sk", 32, 2), row("av", 53, 3)])]);
    expect(group.rows.map((r) => [r.id, r.difference, r.bandChanged])).toEqual([
      ["sk", 1, false],
      ["av", -19, true],
    ]);
  });

  it("keeps a row or a group found on one side only, with a null on the other", () => {
    const before: ScoreGroup[] = [quadrants([row("sk", 31, 2)]), { id: "old", title: "Old", rows: [row("x", 4, null)] }];
    const after: ScoreGroup[] = [quadrants([row("sk", 32, 2), row("rg", 33, 2)])];
    const groups = compareScores(before, after);
    expect(groups.map((g) => g.id)).toEqual(["quadrants", "old"]);
    expect(groups[0].rows[1]).toMatchObject({ id: "rg", before: null, difference: null, bandChanged: false });
    expect(groups[1].rows[0]).toMatchObject({ id: "x", after: null });
  });

  it("does not count a band change when a side has unanswered items", () => {
    const [group] = compareScores([quadrants([row("av", 72, 4)])], [quadrants([row("av", 40, null, 3)])]);
    expect(group.rows[0]).toMatchObject({ difference: -32, bandChanged: false });
    expect(countChanges(group)).toEqual({ kind: "bands", changed: 0, total: 0 });
  });
});

describe("countChanges", () => {
  it("counts band changes for a banded test", () => {
    const [group] = compareScores(
      [quadrants([row("sk", 31, 2), row("av", 72, 4), row("sn", 68, 4)])],
      [quadrants([row("sk", 32, 2), row("av", 53, 3), row("sn", 53, 3)])],
    );
    expect(countChanges(group)).toEqual({ kind: "bands", changed: 2, total: 3 });
  });

  it("counts value changes for a test without bands", () => {
    const months = (id: string, value: number): ScoreRow => ({ id, label: id, value, unit: "months", missing: 0 });
    const groups = compareScores(
      [{ id: "factors", title: "Factors", rows: [months("a", 18), months("b", 24)] }],
      [{ id: "factors", title: "Factors", rows: [months("a", 24), months("b", 24)] }],
    );
    expect(countChanges(groups[0])).toEqual({ kind: "values", changed: 1, total: 2 });
    expect(linearMax(groups, 12)).toBe(24);
  });

  it("adds up the groups", () => {
    const groups = compareScores(
      [quadrants([row("sk", 31, 2)]), { id: "sensory", title: "Sensory", bands: BANDS, rows: [row("au", 28, 3), row("vi", 14, 2)] }],
      [quadrants([row("sk", 50, 3)]), { id: "sensory", title: "Sensory", bands: BANDS, rows: [row("au", 23, 2), row("vi", 15, 2)] }],
    );
    expect(countAllChanges(groups)).toEqual({ kind: "bands", changed: 2, total: 3 });
  });
});

describe("bandPosition", () => {
  it("places a score inside its band, on equal band columns", () => {
    expect(bandPosition(row("a", 0, 0), 5)).toBeCloseTo((0 + 0.5 / 7) / 5);
    expect(bandPosition(row("a", 33, 2), 5)).toBeCloseTo((2 + 13.5 / 28) / 5);
    expect(bandPosition(row("a", 95, 4), 5)).toBeCloseTo((4 + 34.5 / 35) / 5);
  });

  it("is null for an unclassified score", () => {
    expect(bandPosition(row("a", 40, null, 2), 5)).toBeNull();
    expect(bandPosition(null, 5)).toBeNull();
  });
});

describe("monthsBetween", () => {
  it("counts whole months", () => {
    expect(monthsBetween("2025-09-11", "2026-08-20")).toBe(11);
    expect(monthsBetween("2025-09-11", "2026-09-10")).toBe(11);
    expect(monthsBetween("2025-09-11", "2025-09-30")).toBe(0);
  });
});
