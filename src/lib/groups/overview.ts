/**
 * Per-child figures of a group overview (`/groups`, `/groups/[id]`): crises and
 * difficulties over the last 30 days (and the 30 before, for comparison), forms due,
 * draft reports and the next planned event. Pure counting, no interpretation.
 */

export const WINDOW_DAYS = 30;
const DAY_MS = 86_400_000;

export type SummaryChild = { id: string; groupId: string | null };
export type SummaryEpisode = { childId: string; kind: "crisis" | "difficulty"; startedAt: Date };
export type SummaryForm = { child: { id: string }; level: "soon" | "overdue" };
export type SummaryEvent = { id: string; childId: string; kind: string; date: string; time: string | null; details?: string | null };

export type ChildSummary = {
  crises: number;
  previousCrises: number;
  difficulties: number;
  lastCrisisAt: Date | null;
  formsOverdue: number;
  formsSoon: number;
  drafts: number;
  nextEvent: SummaryEvent | null;
};

export type GroupTotals = {
  children: number;
  crises: number;
  previousCrises: number;
  difficulties: number;
  /** Children with at least one crisis in the window. */
  childrenWithCrises: number;
  formsOverdue: number;
  formsSoon: number;
  drafts: number;
};

const empty = (): ChildSummary => ({
  crises: 0,
  previousCrises: 0,
  difficulties: 0,
  lastCrisisAt: null,
  formsOverdue: 0,
  formsSoon: 0,
  drafts: 0,
  nextEvent: null,
});

/**
 * One summary per child. `events` must already be the upcoming ones (see `upcomingEvents`),
 * soonest first: the first one of each child is kept.
 */
export function summarizeChildren(
  kids: SummaryChild[],
  { episodes, forms, drafts, events, now }: { episodes: SummaryEpisode[]; forms: SummaryForm[]; drafts: { childId: string }[]; events: SummaryEvent[]; now: Date },
): Map<string, ChildSummary> {
  const result = new Map(kids.map((c) => [c.id, empty()]));
  const windowStart = now.getTime() - WINDOW_DAYS * DAY_MS;
  const previousStart = windowStart - WINDOW_DAYS * DAY_MS;

  for (const e of episodes) {
    const row = result.get(e.childId);
    const t = e.startedAt.getTime();
    if (!row || t > now.getTime() || t < previousStart) continue;
    if (t < windowStart) {
      if (e.kind === "crisis") row.previousCrises++;
      continue;
    }
    if (e.kind === "difficulty") {
      row.difficulties++;
      continue;
    }
    row.crises++;
    if (!row.lastCrisisAt || t > row.lastCrisisAt.getTime()) row.lastCrisisAt = e.startedAt;
  }
  for (const f of forms) {
    const row = result.get(f.child.id);
    if (!row) continue;
    if (f.level === "overdue") row.formsOverdue++;
    else row.formsSoon++;
  }
  for (const d of drafts) {
    const row = result.get(d.childId);
    if (row) row.drafts++;
  }
  for (const e of events) {
    const row = result.get(e.childId);
    if (row && !row.nextEvent) row.nextEvent = e;
  }
  return result;
}

export function totalsOf(summaries: ChildSummary[]): GroupTotals {
  const totals: GroupTotals = { children: summaries.length, crises: 0, previousCrises: 0, difficulties: 0, childrenWithCrises: 0, formsOverdue: 0, formsSoon: 0, drafts: 0 };
  for (const s of summaries) {
    totals.crises += s.crises;
    totals.previousCrises += s.previousCrises;
    totals.difficulties += s.difficulties;
    totals.formsOverdue += s.formsOverdue;
    totals.formsSoon += s.formsSoon;
    totals.drafts += s.drafts;
    if (s.crises > 0) totals.childrenWithCrises++;
  }
  return totals;
}

/** Totals per group id (`null`: children without a group). Every group in `groupIds` gets an entry, empty or not. */
export function totalsByGroup(kids: SummaryChild[], summaries: Map<string, ChildSummary>, groupIds: string[]): Map<string | null, GroupTotals> {
  const buckets = new Map<string | null, ChildSummary[]>([...groupIds.map((id): [string, ChildSummary[]] => [id, []]), [null, []]]);
  for (const c of kids) {
    const key = c.groupId !== null && buckets.has(c.groupId) ? c.groupId : null;
    buckets.get(key)!.push(summaries.get(c.id) ?? empty());
  }
  return new Map([...buckets].map(([id, list]) => [id, totalsOf(list)]));
}

/** The children needing attention first: overdue forms, then crises in the window, then name order is kept by the caller. */
export function attentionRank(s: ChildSummary): number {
  return (s.formsOverdue > 0 ? 4 : 0) + (s.crises > 0 ? 2 : 0) + (s.formsSoon > 0 || s.drafts > 0 ? 1 : 0);
}
