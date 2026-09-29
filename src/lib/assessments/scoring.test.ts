import { describe, expect, it } from "vitest";
import { bandOf, meanOf, mostTickedLevel, rangeLabel, round1, sumOf } from "./scoring";
import { EMPTY_ANSWERS } from "./types";

const answers = (values: Record<string, number>) => ({ ...EMPTY_ANSWERS, values });

describe("scoring helpers", () => {
  it("sums answered items and counts the missing ones (0 counts as an answer)", () => {
    expect(sumOf(answers({ a: 5, b: 0, c: 3 }), ["a", "b", "c", "d"])).toEqual({ value: 8, missing: 1 });
  });

  it("averages known values only, like a spreadsheet", () => {
    expect(meanOf([12, null, 18])).toBe(15);
    expect(meanOf([null, undefined])).toBeNull();
  });

  it("finds the band, skipping empty ones", () => {
    const ranges = [null, [0, 7], [8, 24], [25, 32], [33, 50]] as const;
    expect(bandOf(0, ranges)).toBe(1);
    expect(bandOf(24, ranges)).toBe(2);
    expect(bandOf(51, ranges)).toBeNull();
    expect(rangeLabel([0, 0])).toBe("0");
    expect(rangeLabel([3, 9])).toBe("3–9");
    expect(rangeLabel(null)).toBeNull();
  });

  it("suggests the most ticked level, the higher one on a tie", () => {
    const levels = [6, 12, 18].map((value) => ({ value, label: "", descriptors: [1, 2, 3].map((n) => ({ id: `${value}-${n}`, text: "" })) }));
    expect(mostTickedLevel(levels, [])).toBeNull();
    expect(mostTickedLevel(levels, ["6-1", "6-2", "12-1"])).toBe(6);
    expect(mostTickedLevel(levels, ["6-1", "12-1", "18-1", "18-2", "12-2"])).toBe(18);
  });

  it("rounds to one decimal", () => {
    expect(round1(20.25)).toBe(20.3);
    expect(round1(null)).toBeNull();
  });
});
