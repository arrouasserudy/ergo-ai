import { describe, expect, it } from "vitest";
import { timelineSessions, type TimelineEvent } from "./timeline";

const at = (minute: number, name: string, kind: TimelineEvent["kind"] = "page", props: TimelineEvent["props"] = null): TimelineEvent => ({
  kind,
  name,
  props,
  createdAt: new Date(Date.UTC(2026, 9, 6, 8, minute)),
});

describe("timelineSessions", () => {
  it("splits on 30 minutes of inactivity, newest session first", () => {
    const sessions = timelineSessions([at(0, "/"), at(10, "/children"), at(41, "/calendar"), at(70, "/crises")]);
    expect(sessions.map((s) => s.steps.map((step) => step.name))).toEqual([["/calendar", "/crises"], ["/", "/children"]]);
    expect(sessions[1]).toMatchObject({ uses: 2, start: at(0, "").createdAt, end: at(10, "").createdAt });
  });

  it("merges consecutive identical steps, keeping the first and last time", () => {
    const [session] = timelineSessions([at(0, "/reports/[id]"), at(1, "report.generated", "event", { recipient: "parents" }), at(2, "report.generated", "event", { recipient: "parents" }), at(3, "/reports/[id]")]);
    expect(session.steps.map((s) => [s.name, s.count])).toEqual([
      ["/reports/[id]", 1],
      ["report.generated", 2],
      ["/reports/[id]", 1],
    ]);
    expect(session.steps[1].lastAt).toEqual(at(2, "").createdAt);
    expect(session.uses).toBe(4);
  });

  it("keeps steps with different props apart and accepts any input order", () => {
    const [session] = timelineSessions([at(2, "x.y", "event", { a: 2 }), at(1, "x.y", "event", { a: 1 })]);
    expect(session.steps.map((s) => s.props)).toEqual([{ a: 1 }, { a: 2 }]);
    expect(timelineSessions([])).toEqual([]);
  });
});
