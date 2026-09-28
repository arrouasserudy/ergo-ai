/**
 * The practice's local time zone. The server runs in UTC, so anything that depends
 * on the local hour (display, "after lunch" patterns) goes through this.
 * Formatting lives in the i18n helpers (i18n/index.ts), which are locale-aware.
 */
export const APP_TIME_ZONE = process.env.APP_TIME_ZONE ?? "Asia/Jerusalem";

/** Whole minutes between two dates (at least 1 once started). */
export function minutesBetween(start: Date, end: Date): number {
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 60_000));
}

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
    hour: Number(get("hour")),
    second: Number(get("second")),
    /** 0 = Sunday … 6 = Saturday. */
    weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday")),
  };
}

/** The local calendar date (YYYY-MM-DD) of an instant, in the practice's time zone. */
export function localDate(date: Date, timeZone = APP_TIME_ZONE): string {
  return zonedParts(date, timeZone).date;
}

/** Local date, hour and weekday (0 = Sunday) of an instant. */
export function localClock(date: Date, timeZone = APP_TIME_ZONE) {
  const { date: day, hour, weekday } = zonedParts(date, timeZone);
  return { date: day, hour, weekday };
}

/** Value for an `<input type="datetime-local">` ("YYYY-MM-DDTHH:mm"), in local time. */
export function toLocalInput(date: Date, timeZone = APP_TIME_ZONE): string {
  const { date: day, time } = zonedParts(date, timeZone);
  return `${day}T${time}`;
}

/**
 * The instant of a local wall-clock time ("YYYY-MM-DDTHH:mm", as typed in a
 * datetime-local input) in the practice's time zone. Null when malformed.
 */
export function fromLocalInput(value: string, timeZone = APP_TIME_ZONE): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  if (Number.isNaN(wall) || new Date(wall).getUTCDate() !== d) return null;
  // Offset of the zone at that moment; a second pass settles DST transitions.
  const offsetAt = (t: number) => {
    const p = zonedParts(new Date(t), timeZone);
    const asUtc = Date.parse(`${p.date}T${p.time}:${String(p.second).padStart(2, "0")}Z`);
    return asUtc - Math.floor(t / 1000) * 1000;
  };
  let t = wall - offsetAt(wall);
  t = wall - offsetAt(t);
  return new Date(t);
}

/** Adds whole days to an ISO date (YYYY-MM-DD). */
export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Weekday of an ISO date: 0 = Sunday … 6 = Saturday. */
export function weekdayOf(iso: string): number {
  return new Date(`${iso}T00:00:00Z`).getUTCDay();
}
