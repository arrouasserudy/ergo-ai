// Crises and difficulties per month for the Progress tab. Pure counting, in the practice's time zone.

export type MonthCount = { month: string; crisis: number; difficulty: number };

/** "YYYY-MM" shifted by `n` months. */
export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const index = y * 12 + (m - 1) + n;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/** Every month from `from` to `to` included ("YYYY-MM"); empty when `from` is after `to`. */
export function monthsRange(from: string, to: string): string[] {
  const months: string[] = [];
  for (let m = from; m <= to; m = addMonths(m, 1)) months.push(m);
  return months;
}

/** The local month ("YYYY-MM") of an instant. */
export function localMonth(date: Date, timeZone: string): string {
  return date.toLocaleDateString("en-CA", { timeZone }).slice(0, 7);
}

/** Episodes counted per local month over the range, months without any kept at 0. */
export function monthlyCounts(
  episodes: readonly { kind: string; startedAt: Date }[],
  { from, to, timeZone }: { from: string; to: string; timeZone: string },
): MonthCount[] {
  const counts = new Map(monthsRange(from, to).map((month) => [month, { month, crisis: 0, difficulty: 0 }]));
  for (const episode of episodes) {
    const bucket = counts.get(localMonth(episode.startedAt, timeZone));
    if (!bucket) continue;
    if (episode.kind === "crisis") bucket.crisis++;
    else if (episode.kind === "difficulty") bucket.difficulty++;
  }
  return [...counts.values()];
}

const SPAN = 3;

/**
 * Episodes per month over the 3 months up to the first test's month, and over the last
 * 3 months; null when the series is too short for the two windows not to overlap.
 */
export function averages(counts: readonly MonthCount[], firstTestMonth: string): { around: number; recent: number } | null {
  const end = counts.findIndex((c) => c.month === firstTestMonth);
  if (end < 0 || counts.length - SPAN <= end) return null;
  const mean = (list: readonly MonthCount[]) => list.reduce((s, c) => s + c.crisis + c.difficulty, 0) / list.length;
  return { around: mean(counts.slice(Math.max(0, end - SPAN + 1), end + 1)), recent: mean(counts.slice(-SPAN)) };
}
