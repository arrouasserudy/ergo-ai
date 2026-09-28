import { describe, expect, it } from "vitest";
import { fromLocalInput } from "@/lib/time";
import { isReminderDue, isSendingHour } from "./reminder-timing";

const TZ = "Asia/Jerusalem";
const at = (local: string) => fromLocalInput(local, TZ)!;

describe("isSendingHour", () => {
  it("never on Shabbat, only in the morning on Friday", () => {
    expect(isSendingHour(6, 11)).toBe(false);
    expect(isSendingHour(5, 11)).toBe(true);
    expect(isSendingHour(5, 14)).toBe(false);
    expect(isSendingHour(2, 8)).toBe(false);
    expect(isSendingHour(2, 19)).toBe(true);
    expect(isSendingHour(2, 21)).toBe(false);
  });
});

describe("isReminderDue", () => {
  // 2026-10-06 is a Tuesday.
  it("goes out the day before the meeting", () => {
    const meeting = at("2026-10-07T16:00");
    expect(isReminderDue(meeting, at("2026-10-05T10:00"), TZ)).toBe(false);
    expect(isReminderDue(meeting, at("2026-10-06T10:00"), TZ)).toBe(true);
    expect(isReminderDue(meeting, at("2026-10-06T22:00"), TZ)).toBe(false); // night
    expect(isReminderDue(meeting, at("2026-10-07T09:00"), TZ)).toBe(true); // missed the day before
    expect(isReminderDue(meeting, at("2026-10-07T17:00"), TZ)).toBe(false); // already past
  });

  it("goes out on Friday morning for a Sunday meeting", () => {
    const sunday = at("2026-10-11T08:30");
    expect(isReminderDue(sunday, at("2026-10-08T10:00"), TZ)).toBe(false); // Thursday
    expect(isReminderDue(sunday, at("2026-10-09T09:00"), TZ)).toBe(true); // Friday
    expect(isReminderDue(sunday, at("2026-10-10T10:00"), TZ)).toBe(false); // Shabbat
  });
});
