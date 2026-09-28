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
