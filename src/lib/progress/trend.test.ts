import { describe, expect, it } from "vitest";
import { addMonths, averages, monthlyCounts, monthsRange } from "./trend";

describe("months", () => {
  it("shifts across years", () => {
    expect(addMonths("2025-11", 2)).toBe("2026-01");
    expect(addMonths("2026-01", -2)).toBe("2025-11");
  });

  it("lists a range, ends included", () => {
    expect(monthsRange("2025-11", "2026-02")).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
    expect(monthsRange("2026-02", "2026-01")).toEqual([]);
  });
});

describe("monthlyCounts", () => {
  it("buckets episodes by local month and keeps empty months", () => {
    const counts = monthlyCounts(
      [
        { kind: "crisis", startedAt: new Date("2026-01-10T10:00:00Z") },
        { kind: "difficulty", startedAt: new Date("2026-01-20T10:00:00Z") },
        // 31 January 23:30 UTC is already 1 February in Jerusalem.
        { kind: "crisis", startedAt: new Date("2026-01-31T23:30:00Z") },
        { kind: "crisis", startedAt: new Date("2025-06-01T10:00:00Z") },
      ],
      { from: "2025-12", to: "2026-03", timeZone: "Asia/Jerusalem" },
    );
    expect(counts).toEqual([
      { month: "2025-12", crisis: 0, difficulty: 0 },
      { month: "2026-01", crisis: 1, difficulty: 1 },
      { month: "2026-02", crisis: 1, difficulty: 0 },
      { month: "2026-03", crisis: 0, difficulty: 0 },
    ]);
  });
});

describe("averages", () => {
  const series = (totals: number[]) => totals.map((n, i) => ({ month: addMonths("2025-07", i), crisis: n, difficulty: 0 }));

  it("compares the 3 months up to the first test with the last 3 months", () => {
    expect(averages(series([6, 3, 6, 4, 2, 1, 1, 1]), "2025-09")).toEqual({ around: 5, recent: 1 });
  });

  it("uses the months available before the first test", () => {
    expect(averages(series([4, 2, 2, 0, 1, 2]), "2025-07")).toEqual({ around: 4, recent: 1 });
  });

  it("is null when the two windows would overlap", () => {
    expect(averages(series([4, 2, 2, 0]), "2025-08")).toBeNull();
  });
});
