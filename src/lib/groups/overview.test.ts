import { describe, expect, it } from "vitest";
import { attentionRank, summarizeChildren, totalsByGroup, totalsOf } from "./overview";

const now = new Date("2026-10-06T12:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);
const kids = [
  { id: "a", groupId: "g1" },
  { id: "b", groupId: "g1" },
  { id: "c", groupId: null },
  { id: "d", groupId: "deleted" },
];

describe("summarizeChildren", () => {
  const summaries = summarizeChildren(kids, {
    now,
    episodes: [
      { childId: "a", kind: "crisis", startedAt: daysAgo(2) },
      { childId: "a", kind: "crisis", startedAt: daysAgo(10) },
      { childId: "a", kind: "crisis", startedAt: daysAgo(45) },
      { childId: "a", kind: "crisis", startedAt: daysAgo(90) },
      { childId: "a", kind: "difficulty", startedAt: daysAgo(3) },
      { childId: "a", kind: "difficulty", startedAt: daysAgo(40) },
      { childId: "b", kind: "crisis", startedAt: daysAgo(-1) },
      { childId: "zz", kind: "crisis", startedAt: daysAgo(1) },
    ],
    forms: [
      { child: { id: "a" }, level: "overdue" },
      { child: { id: "a" }, level: "soon" },
      { child: { id: "b" }, level: "soon" },
    ],
    drafts: [{ childId: "b" }, { childId: "b" }],
    events: [
      { id: "e1", childId: "b", kind: "intake", date: "2026-10-08", time: null },
      { id: "e2", childId: "b", kind: "other", date: "2026-10-20", time: null },
    ],
  });

  it("counts crises in the window and the one before, difficulties in the window only", () => {
    expect(summaries.get("a")).toMatchObject({ crises: 2, previousCrises: 1, difficulties: 1, lastCrisisAt: daysAgo(2) });
  });

  it("ignores future episodes and unknown children", () => {
    expect(summaries.get("b")!.crises).toBe(0);
    expect(summaries.has("zz")).toBe(false);
  });

  it("counts forms by level, drafts, and keeps the first upcoming event", () => {
    expect(summaries.get("a")).toMatchObject({ formsOverdue: 1, formsSoon: 1, drafts: 0, nextEvent: null });
    expect(summaries.get("b")).toMatchObject({ formsOverdue: 0, formsSoon: 1, drafts: 2 });
    expect(summaries.get("b")!.nextEvent?.id).toBe("e1");
  });

  it("totals per group, unknown groups falling into 'no group'", () => {
    const totals = totalsByGroup(kids, summaries, ["g1", "g2"]);
    expect(totals.get("g1")).toMatchObject({ children: 2, crises: 2, childrenWithCrises: 1, formsOverdue: 1, formsSoon: 2, drafts: 2 });
    expect(totals.get("g2")).toMatchObject({ children: 0, crises: 0 });
    expect(totals.get(null)!.children).toBe(2);
  });

  it("ranks overdue forms over crises over the rest", () => {
    expect(attentionRank(summaries.get("a")!)).toBe(7);
    expect(attentionRank(summaries.get("b")!)).toBe(1);
    expect(attentionRank(summaries.get("c")!)).toBe(0);
    expect(totalsOf([]).children).toBe(0);
  });
});
