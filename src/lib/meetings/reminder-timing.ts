import { addDays, localClock, localDate, weekdayOf } from "@/lib/time";

/**
 * When the parents' SMS reminder goes out. Many families use kosher phones: no
 * messages on Shabbat, none at night. The reminder is sent on the last day the
 * rules allow before the meeting's day (the day before, or Friday morning for a
 * Sunday meeting), during the sending hours.
 */
export const SEND_FROM_HOUR = 9;
/** Last hour (inclusive) on weekdays. */
export const SEND_UNTIL_HOUR = 19;
/** Last hour (inclusive) on Friday, well before Shabbat. */
export const FRIDAY_UNTIL_HOUR = 12;

const SATURDAY = 6;
const FRIDAY = 5;

/** True when a reminder may be sent at this local weekday and hour. */
export function isSendingHour(weekday: number, hour: number): boolean {
  if (weekday === SATURDAY) return false;
  const until = weekday === FRIDAY ? FRIDAY_UNTIL_HOUR : SEND_UNTIL_HOUR;
  return hour >= SEND_FROM_HOUR && hour <= until;
}

/** True when the reminder for a meeting at `meetingAt` should be sent now. */
export function isReminderDue(meetingAt: Date, now: Date, timeZone?: string): boolean {
  if (meetingAt.getTime() <= now.getTime()) return false;
  const clock = localClock(now, timeZone);
  if (!isSendingHour(clock.weekday, clock.hour)) return false;

  const meetingDay = localDate(meetingAt, timeZone);
  // Wait while a later day before the meeting's day still allows sending.
  for (let day = addDays(clock.date, 1); day < meetingDay; day = addDays(day, 1)) {
    if (weekdayOf(day) !== SATURDAY) return false;
  }
  return true;
}
