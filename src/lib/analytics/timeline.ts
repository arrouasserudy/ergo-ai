/**
 * Pure shaping of one therapist's usage into a followable path (admin page
 * /admin/usage/[therapistId]): sessions split on inactivity, repeated steps merged.
 */

export type TimelineEvent = { kind: "page" | "event"; name: string; props: Record<string, string | number | boolean> | null; createdAt: Date };
export type TimelineStep = TimelineEvent & { count: number; lastAt: Date };
export type TimelineSession = { start: Date; end: Date; uses: number; steps: TimelineStep[] };

/** A new session starts after this much inactivity. */
export const SESSION_GAP_MINUTES = 30;

const sameStep = (a: TimelineEvent, b: TimelineEvent) => a.kind === b.kind && a.name === b.name && JSON.stringify(a.props) === JSON.stringify(b.props);

/** Sessions newest first, steps in the order they happened. `events` may come in any order. */
export function timelineSessions(events: TimelineEvent[], gapMinutes = SESSION_GAP_MINUTES): TimelineSession[] {
  const sorted = [...events].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const sessions: TimelineSession[] = [];
  let current: TimelineSession | null = null;
  for (const event of sorted) {
    if (!current || event.createdAt.getTime() - current.end.getTime() > gapMinutes * 60_000) {
      current = { start: event.createdAt, end: event.createdAt, uses: 0, steps: [] };
      sessions.push(current);
    }
    current.end = event.createdAt;
    current.uses += 1;
    const last = current.steps.at(-1);
    if (last && sameStep(last, event)) {
      last.count += 1;
      last.lastAt = event.createdAt;
    } else {
      current.steps.push({ ...event, count: 1, lastAt: event.createdAt });
    }
  }
  return sessions.reverse();
}
