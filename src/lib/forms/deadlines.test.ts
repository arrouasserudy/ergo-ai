import { describe, expect, it } from "vitest";
import { daysBetween, dueDateFor, isDayMonth, schoolYearStartDate, urgency, worse } from "./deadlines";

describe("isDayMonth", () => {
  it("accepts real days only", () => {
    expect(isDayMonth("10-01")).toBe(true);
    expect(isDayMonth("02-29")).toBe(true);
    expect(isDayMonth("02-30")).toBe(false);
    expect(isDayMonth("13-01")).toBe(false);
    expect(isDayMonth("1-10")).toBe(false);
    expect(isDayMonth(null)).toBe(false);
  });
});

describe("schoolYearStartDate", () => {
  it("is this year's start once reached, else last year's", () => {
    expect(schoolYearStartDate("09-01", "2026-09-28")).toBe("2026-09-01");
    expect(schoolYearStartDate("09-01", "2026-09-01")).toBe("2026-09-01");
    expect(schoolYearStartDate("09-01", "2026-08-31")).toBe("2025-09-01");
  });
});

describe("dueDateFor", () => {
  it("falls in the current school year", () => {
    expect(dueDateFor("10-01", "09-01", "2026-09-28")).toBe("2026-10-01");
    expect(dueDateFor("06-15", "09-01", "2026-09-28")).toBe("2027-06-15");
  });

  it("keeps the current year's date after it has passed (overdue, not next year)", () => {
    expect(dueDateFor("10-01", "09-01", "2026-11-15")).toBe("2026-10-01");
    expect(dueDateFor("10-01", "09-01", "2027-08-31")).toBe("2026-10-01");
  });

  it("moves to the next cycle when the school year starts", () => {
    expect(dueDateFor("10-01", "09-01", "2027-09-01")).toBe("2027-10-01");
  });

  it("handles a deadline on the start day and 29 February", () => {
    expect(dueDateFor("09-01", "09-01", "2026-09-01")).toBe("2026-09-01");
    expect(dueDateFor("02-29", "09-01", "2026-09-28")).toBe("2027-02-28");
    expect(dueDateFor("02-29", "09-01", "2027-09-28")).toBe("2028-02-29");
  });
});

describe("urgency", () => {
  it("is soon within the warning period, overdue after the due date", () => {
    expect(urgency("2026-10-01", "2026-09-10", 14)).toBe("none");
    expect(urgency("2026-10-01", "2026-09-17", 14)).toBe("soon");
    expect(urgency("2026-10-01", "2026-10-01", 14)).toBe("soon");
    expect(urgency("2026-10-01", "2026-10-02", 14)).toBe("overdue");
  });

  it("is none without a due date or once submitted", () => {
    expect(urgency(null, "2026-10-02", 14)).toBe("none");
    expect(urgency("2026-10-01", "2026-10-02", 14, true)).toBe("none");
  });
});

describe("helpers", () => {
  it("counts days and ranks levels", () => {
    expect(daysBetween("2026-09-28", "2026-10-01")).toBe(3);
    expect(daysBetween("2026-10-02", "2026-10-01")).toBe(-1);
    expect(worse("soon", "overdue")).toBe("overdue");
    expect(worse("none", "soon")).toBe("soon");
  });
});
