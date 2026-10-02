import { describe, expect, it } from "vitest";
import { computePatterns, interviewCauses, latestPerChild, rankCauses, rankHelped, timeOfDay } from "./episode-insights";

const profile = { hyperSensitivities: [], hypoReactivities: [], backgroundFactors: [], seeksDeepPressure: false };
const at = (iso: string) => new Date(iso);
const episode = (causes: string[], extra: Partial<{ kind: string; situation: string | null; helped: string[]; startedAt: Date }> = {}) => ({
  kind: "crisis",
  situation: null,
  helped: [],
  startedAt: at("2026-09-10T10:00:00Z"),
  causes,
  ...extra,
});

describe("rankCauses", () => {
  it("gives a new child a short default list that always includes pain", () => {
    const { main } = rankCauses({ history: [], profile, kind: "crisis", situation: null });
    expect(main.map((c) => c.key)).toContain("pain");
    expect(main.every((c) => c.source.type === "general")).toBe(true);
    expect(main.length).toBeLessThanOrEqual(8);
  });

  it("puts interview answers before general defaults", () => {
    const { main } = rankCauses({ history: [], profile: { ...profile, hyperSensitivities: ["light"] }, kind: "crisis", situation: null });
    expect(main[0]).toEqual({ key: "light", source: { type: "interview" } });
  });

  it("puts causes that came back most often first, with their count", () => {
    const history = [episode(["clothing"]), episode(["clothing", "noise"]), episode(["noise"]), episode(["clothing"])];
    const { main } = rankCauses({ history, profile, kind: "crisis", situation: null });
    expect(main.slice(0, 2)).toEqual([
      { key: "clothing", source: { type: "history", count: 3 } },
      { key: "noise", source: { type: "history", count: 2 } },
    ]);
  });

  it("surfaces situation-specific causes for everyday difficulties", () => {
    const { main } = rankCauses({ history: [], profile, kind: "difficulty", situation: "closedDoor" });
    expect(main[0].key).toBe("closedDoor");
    expect(main[0].source.type).toBe("situation");
  });

  it("for a difficulty, only history from the same situation counts fully", () => {
    const doors = [episode(["closedDoor"], { kind: "difficulty", situation: "closedDoor" }), episode(["closedDoor"], { kind: "difficulty", situation: "closedDoor" })];
    const meals = [episode(["textures"], { kind: "difficulty", situation: "eating" })];
    const { main } = rankCauses({ history: [...doors, ...meals], profile, kind: "difficulty", situation: "eating" });
    expect(main[0]).toEqual({ key: "textures", source: { type: "history", count: 1 } });
    const door = main.find((c) => c.key === "closedDoor");
    expect(door?.source.type).not.toBe("history"); // not "came back 2 times" for eating
    expect(main.findIndex((c) => c.key === "closedDoor")).toBeGreaterThan(main.findIndex((c) => c.key === "oralChange"));
  });

  it("keeps custom causes from past episodes and moves the rest to 'more'", () => {
    const { main, more } = rankCauses({ history: [episode(["Sèche-mains"])], profile, kind: "crisis", situation: null });
    expect(main[0].key).toBe("Sèche-mains");
    const inMore = more.flatMap((g) => g.keys);
    expect(inMore).not.toContain("pain");
    expect(inMore).toContain("injury");
  });
});

describe("interviewCauses", () => {
  it("maps profile answers to causes", () => {
    expect([...interviewCauses({ ...profile, hypoReactivities: ["oral"], backgroundFactors: ["sleep"], seeksDeepPressure: true })].sort()).toEqual(
      ["oralChange", "seeksPressure", "sleep"],
    );
  });
});

describe("rankHelped", () => {
  it("orders by past success, then profile, then presets, without duplicates", () => {
    const history = [episode([], { helped: ["quietCorner"] }), episode([], { helped: ["quietCorner", "break"] })];
    expect(rankHelped(history, ["weightedCushion", "break"], ["removeCause", "break"])).toEqual([
      "quietCorner",
      "break",
      "weightedCushion",
      "removeCause",
    ]);
  });
});

describe("computePatterns", () => {
  it("reports nothing until something happens twice", () => {
    const p = computePatterns([episode(["clothing"])], "Europe/Paris");
    expect(p).toMatchObject({ total: 1, trigger: null, background: null, timeOfDay: null, helped: null });
  });

  it("separates immediate triggers from background factors", () => {
    const history = [episode(["clothing", "sleep"]), episode(["clothing", "sleep"]), episode(["clothing"])];
    const p = computePatterns(history, "Europe/Paris");
    expect(p.trigger).toEqual({ key: "clothing", count: 3, total: 3 });
    expect(p.background).toEqual({ key: "sleep", count: 2, total: 3 });
  });

  it("finds a time-of-day pattern in the configured time zone", () => {
    // 11:30 UTC = 13:30 in Paris (summer): midday
    const lunch = (d: string) => episode([], { startedAt: at(`2026-09-${d}T11:30:00Z`) });
    const history = [lunch("01"), lunch("02"), lunch("03"), episode([], { startedAt: at("2026-09-04T07:00:00Z") })];
    expect(computePatterns(history, "Europe/Paris").timeOfDay).toEqual({ bucket: "midday", count: 3, total: 4 });
  });
});

describe("timeOfDay", () => {
  it("uses the given time zone", () => {
    const d = at("2026-09-10T16:30:00Z");
    expect(timeOfDay(d, "UTC")).toBe("afternoon");
    expect(timeOfDay(d, "Asia/Jerusalem")).toBe("evening"); // 19:30
  });
});

const TZ = "Asia/Jerusalem"; // UTC+3 in October (summer time)
const now = new Date("2026-10-02T09:00:00Z"); // 12:00 local, 2 October
const item = (id: string, childId: string, startedAt: string, status = "closed") => ({
  episode: { id, status, startedAt: new Date(startedAt) },
  child: { id: childId },
});
const ids = (items: { episode: { id: string } }[]) => items.map((i) => i.episode.id);

describe("latestPerChild", () => {
  it("keeps only each child's last episode, most recent first", () => {
    const items = [
      item("a1", "a", "2026-09-20T10:00:00Z"),
      item("a2", "a", "2026-09-28T10:00:00Z"),
      item("b1", "b", "2026-10-01T10:00:00Z"),
      item("c1", "c", "2026-09-10T10:00:00Z"),
    ];
    expect(ids(latestPerChild(items, { now, timeZone: TZ }))).toEqual(["b1", "a2", "c1"]);
  });

  it("includes the day 30 days ago in local time and excludes the day before", () => {
    const items = [
      // 2 September 00:30 local (still 1 September in UTC): inside the window.
      item("in", "a", "2026-09-01T21:30:00Z"),
      // 1 September 23:30 local: outside.
      item("out", "b", "2026-09-01T20:30:00Z"),
    ];
    expect(ids(latestPerChild(items, { now, timeZone: TZ }))).toEqual(["in"]);
  });

  it("drops a child whose last episode is too old, even if older ones exist", () => {
    const items = [item("old", "a", "2026-08-01T10:00:00Z"), item("older", "a", "2026-07-01T10:00:00Z")];
    expect(latestPerChild(items, { now, timeZone: TZ })).toEqual([]);
  });

  it("excludes open episodes and falls back to the child's last finished one", () => {
    const items = [item("open", "a", "2026-10-02T08:00:00Z", "open"), item("done", "a", "2026-09-25T08:00:00Z"), item("open-b", "b", "2026-10-02T07:00:00Z", "open")];
    expect(ids(latestPerChild(items, { now, timeZone: TZ }))).toEqual(["done"]);
  });

  it("breaks ties on start time by id, whatever the input order", () => {
    const same = "2026-09-30T10:00:00Z";
    const forward = [item("x1", "a", same), item("x2", "a", same), item("y1", "b", same)];
    const expected = ["y1", "x2"];
    expect(ids(latestPerChild(forward, { now, timeZone: TZ }))).toEqual(expected);
    expect(ids(latestPerChild([...forward].reverse(), { now, timeZone: TZ }))).toEqual(expected);
  });
});
