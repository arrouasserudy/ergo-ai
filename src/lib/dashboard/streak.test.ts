import { describe, expect, it } from "vitest";
import { lateOn, weekStartDay, weekState, type DueForm, type ReportSpan } from "./streak";

// 2026-10-07 is a Wednesday.
const TODAY = "2026-10-07";
const base = { today: TODAY, since: "2026-01-01", weekStart: 1 as const, warnDays: 14, remaining: 0 };

describe("weekStartDay", () => {
  it("goes back to Monday or Sunday", () => {
    expect(weekStartDay(TODAY, 1)).toBe("2026-10-05");
    expect(weekStartDay(TODAY, 0)).toBe("2026-10-04");
    expect(weekStartDay("2026-10-04", 1)).toBe("2026-09-28");
    expect(weekStartDay("2026-10-04", 0)).toBe("2026-10-04");
  });
});

describe("lateOn", () => {
  it("counts forms past their due date that were not filled in by that day", () => {
    const forms: DueForm[] = [
      { dueDate: "2026-10-01", submittedOn: null },
      { dueDate: "2026-10-01", submittedOn: "2026-10-03" },
      { dueDate: "2026-10-01", submittedOn: "2026-10-09" },
      { dueDate: "2026-10-04", submittedOn: null }, // due that very day: not late yet
    ];
    expect(lateOn("2026-10-04", forms, [])).toBe(2);
  });
  it("counts drafts older than the stale limit", () => {
    const reports: ReportSpan[] = [
      { createdOn: "2026-09-20", closedOn: null },
      { createdOn: "2026-09-20", closedOn: "2026-10-02" },
      { createdOn: "2026-09-21", closedOn: null }, // exactly 13 days old
    ];
    expect(lateOn("2026-10-04", [], reports)).toBe(1);
    expect(lateOn("2026-10-04", [], reports, 13)).toBe(2);
  });
});

describe("weekState", () => {
  it("counts up-to-date weeks back to the first late one", () => {
    // Overdue from 2026-09-11 until filled in on 2026-09-22: weeks ending 09-13 and 09-20 were late.
    const forms: DueForm[] = [{ dueDate: "2026-09-10", submittedOn: "2026-09-22" }];
    const state = weekState({ ...base, forms, reports: [] });
    expect(state.start).toBe("2026-10-05");
    expect(state.end).toBe("2026-10-11");
    expect(state.streak).toBe(2); // weeks ending 10-04 and 09-27
    expect(state.late).toBe(0);
  });

  it("does not count the current week, and reports what is late today", () => {
    const forms: DueForm[] = [{ dueDate: "2026-10-05", submittedOn: null }];
    const state = weekState({ ...base, since: "2026-09-01", forms, reports: [] });
    expect(state.late).toBe(1);
    expect(state.streak).toBe(5); // 09-06 … 10-04
  });

  it("stops at the cabinet's creation", () => {
    expect(weekState({ ...base, since: "2026-09-25", forms: [], reports: [] }).streak).toBe(2);
    expect(weekState({ ...base, since: TODAY, forms: [], reports: [] }).streak).toBe(0);
  });

  it("caps the streak", () => {
    expect(weekState({ ...base, since: "2020-01-01", forms: [], reports: [] }).streak).toBe(52);
  });

  it("counts what was cleared this week", () => {
    const forms: DueForm[] = [
      { dueDate: "2026-10-15", submittedOn: "2026-10-06" }, // on the list (due within 14 days)
      { dueDate: "2026-10-01", submittedOn: "2026-10-05" }, // overdue, filled in this week
      { dueDate: "2026-12-01", submittedOn: "2026-10-06" }, // not on the list yet
      { dueDate: "2026-10-15", submittedOn: "2026-10-02" }, // last week
    ];
    const reports: ReportSpan[] = [
      { createdOn: "2026-10-01", closedOn: "2026-10-07" },
      { createdOn: "2026-10-01", closedOn: "2026-10-04" },
      { createdOn: "2026-10-06", closedOn: null },
    ];
    const state = weekState({ ...base, forms, reports, remaining: 3 });
    expect(state.cleared).toBe(3);
    expect(state.remaining).toBe(3);
  });

  it("follows a Sunday week", () => {
    // Late at the end of Saturday 10-03 (last day of a Sunday week), fixed on Sunday 10-04.
    const forms: DueForm[] = [{ dueDate: "2026-10-01", submittedOn: "2026-10-04" }];
    expect(weekState({ ...base, since: "2026-09-28", weekStart: 0, forms, reports: [] }).streak).toBe(0);
    expect(weekState({ ...base, since: "2026-09-28", weekStart: 1, forms, reports: [] }).streak).toBe(1);
  });
});
