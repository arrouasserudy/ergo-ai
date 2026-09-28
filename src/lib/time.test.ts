import { describe, expect, it } from "vitest";
import { addDays, fromLocalInput, localClock, toLocalInput } from "./time";

const TZ = "Asia/Jerusalem";

describe("local time", () => {
  it("round-trips a datetime-local value, across daylight saving time", () => {
    expect(fromLocalInput("2026-07-01T09:30", TZ)?.toISOString()).toBe("2026-07-01T06:30:00.000Z"); // UTC+3
    expect(fromLocalInput("2026-12-01T09:30", TZ)?.toISOString()).toBe("2026-12-01T07:30:00.000Z"); // UTC+2
    expect(toLocalInput(new Date("2026-12-01T07:30:00Z"), TZ)).toBe("2026-12-01T09:30");
  });

  it("rejects malformed values", () => {
    expect(fromLocalInput("2026-02-30T10:00", TZ)).toBeNull();
    expect(fromLocalInput("tomorrow", TZ)).toBeNull();
  });

  it("gives the local date and weekday", () => {
    expect(localClock(new Date("2026-10-09T22:30:00Z"), TZ)).toEqual({ date: "2026-10-10", hour: 1, weekday: 6 });
    expect(addDays("2027-02-28", 1)).toBe("2027-03-01");
  });
});
