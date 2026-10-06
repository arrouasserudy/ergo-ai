import { describe, expect, it } from "vitest";
import { EVENTS } from "./events";
import { APP_ROUTES } from "./routes";
import { parsePeriod, summarizeUsage, type UsageCount } from "./summary";

const count = (kind: UsageCount["kind"], name: string, uses: number): UsageCount => ({ kind, name, uses, therapists: 1, cabinets: 1, lastAt: new Date("2026-10-01") });

describe("summarizeUsage", () => {
  const summary = summarizeUsage([
    count("event", "report.generated", 10),
    count("event", "report.created", 5),
    count("event", "episode.started", 20),
    count("page", "/children", 8),
    count("page", "/reports", 2),
    count("event", "old.feature", 3),
  ]);

  it("gives every catalog event and page a row, unused ones with zero", () => {
    expect(summary.areas.flatMap((a) => a.rows)).toHaveLength(Object.keys(EVENTS).length);
    expect(summary.pages).toHaveLength(APP_ROUTES.length);
    expect(summary.unusedEvents).not.toContain("report.generated");
    expect(summary.unusedEvents).toContain("report.rewritten");
    expect(summary.unusedPages).toContain("/calendar");
    expect(summary.unusedPages).not.toContain("/children");
  });

  it("orders areas and rows by uses, with shares relative to the most used", () => {
    expect(summary.areas.slice(0, 2).map((a) => [a.area, a.uses])).toEqual([
      ["crises", 20],
      ["reports", 15],
    ]);
    const reports = summary.areas[1].rows;
    expect(reports.slice(0, 2).map((r) => [r.name, r.share])).toEqual([
      ["report.generated", 0.5],
      ["report.created", 0.25],
    ]);
    expect(summary.pages[0]).toMatchObject({ name: "/children", share: 1 });
  });

  it("keeps names that left the catalog apart", () => {
    expect(summary.retired.map((r) => r.name)).toEqual(["old.feature"]);
  });
});

describe("parsePeriod", () => {
  it("accepts the listed periods only, 30 days by default", () => {
    expect(parsePeriod("7")).toBe(7);
    expect(parsePeriod("365")).toBe(365);
    expect(parsePeriod("12")).toBe(30);
    expect(parsePeriod(undefined)).toBe(30);
  });
});
