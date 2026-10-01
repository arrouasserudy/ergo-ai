import { describe, expect, it } from "vitest";
import { addDays, addMonths, gridRange, monthGrid, parseMonth, weekdayOf, weekdayOrder, weekStartOf } from "./month";

describe("weekStartOf", () => {
  it("starts weeks on Sunday in Hebrew, Monday otherwise", () => {
    expect(weekStartOf("he")).toBe(0);
    expect(weekStartOf("fr")).toBe(1);
    expect(weekStartOf("en")).toBe(1);
    expect(weekdayOrder(0)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(weekdayOrder(1)).toEqual([1, 2, 3, 4, 5, 6, 0]);
  });
});

describe("parseMonth / addMonths / addDays", () => {
  it("accepts YYYY-MM with a real month only", () => {
    expect(parseMonth("2026-10")).toBe("2026-10");
    expect(parseMonth("2026-13")).toBeNull();
    expect(parseMonth("2026-1")).toBeNull();
    expect(parseMonth(undefined)).toBeNull();
  });
  it("shifts across years", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-10", -22)).toBe("2024-12");
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("monthGrid", () => {
  it("fills October 2026 from Monday (fr): leading September days, trailing November days", () => {
    // 1 October 2026 is a Thursday, the 31st a Saturday.
    expect(weekdayOf("2026-10-01")).toBe(4);
    const weeks = monthGrid("2026-10", 1);
    expect(weeks).toHaveLength(5);
    expect(weeks[0].map((d) => d.day)).toEqual(["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]);
    expect(weeks[0].map((d) => d.inMonth)).toEqual([false, false, false, true, true, true, true]);
    expect(weeks[4].map((d) => d.day)).toEqual(["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01"]);
    expect(weeks.flat().filter((d) => d.inMonth)).toHaveLength(31);
  });

  it("starts on Sunday for Hebrew", () => {
    const weeks = monthGrid("2026-10", 0);
    expect(weeks[0][0].day).toBe("2026-09-27");
    expect(weekdayOf(weeks[0][0].day)).toBe(0);
    expect(weeks.at(-1)!.at(-1)!.day).toBe("2026-10-31");
    expect(gridRange("2026-10", 0)).toEqual({ from: "2026-09-27", to: "2026-10-31" });
  });

  it("needs no leading day when the month starts on the week's first day", () => {
    // February 2026 starts on a Sunday and has exactly 4 weeks.
    expect(monthGrid("2026-02", 0)).toHaveLength(4);
    expect(monthGrid("2026-02", 0)[0][0].day).toBe("2026-02-01");
    expect(monthGrid("2026-02", 1)).toHaveLength(5);
    // August 2026 spans 6 rows from Monday (starts on Saturday, 31 days).
    expect(monthGrid("2026-08", 1)).toHaveLength(6);
  });

  it("has every day exactly once across DST changes (Jerusalem: 27 March and 25 October 2026)", () => {
    for (const month of ["2026-03", "2026-10", "2024-02"]) {
      for (const start of [0, 1] as const) {
        const days = monthGrid(month, start).flat().map((d) => d.day);
        expect(new Set(days).size).toBe(days.length);
        expect(days.length % 7).toBe(0);
        for (let i = 1; i < days.length; i++) expect(addDays(days[i - 1], 1)).toBe(days[i]);
      }
    }
    expect(monthGrid("2024-02", 1).flat().filter((d) => d.inMonth)).toHaveLength(29);
  });
});
