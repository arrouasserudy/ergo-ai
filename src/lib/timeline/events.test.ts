import { describe, expect, it } from "vitest";
import type { FormSchema } from "@/lib/forms/schema";
import { buildTimeline, groupByYear, isIsoDate, scoreSummary, type TimelineInput } from "./events";

const TZ = "Asia/Jerusalem";

const form: FormSchema = {
  version: 1,
  title: "Anamnèse",
  language: "fr",
  sections: [
    {
      id: "s1",
      fields: [
        { id: "f1", type: "date", label: "Date de naissance :", required: false, identifying: true },
        { id: "f2", type: "date", label: "Date du diagnostic :", required: false },
        { id: "f3", type: "text", label: "Diagnostic", required: false },
        { id: "f4", type: "date", label: "Début de l'orthophonie", required: false },
        { id: "f5", type: "date", label: "Dernier bilan", required: false },
        { id: "f6", type: "date", label: "Jamais rempli", required: false },
      ],
    },
  ],
};

const base = (over: Partial<TimelineInput> = {}): TimelineInput => ({
  child: { id: "c1", birthDate: "2019-02-03", followUpStart: "2024-09-16", createdAt: "2024-09-10 08:00:00" },
  episodes: [],
  reports: [],
  forms: [],
  assessments: [],
  timeZone: TZ,
  ...over,
});

describe("isIsoDate", () => {
  it("accepts real calendar dates only", () => {
    expect(isIsoDate("2024-02-29")).toBe(true);
    expect(isIsoDate("2023-02-29")).toBe(false);
    expect(isIsoDate("2026-13-01")).toBe(false);
    expect(isIsoDate("01/02/2026")).toBe(false);
    expect(isIsoDate(20260101)).toBe(false);
    expect(isIsoDate(null)).toBe(false);
  });
});

describe("buildTimeline", () => {
  it("starts with the birth and orders every source oldest first", () => {
    const events = buildTimeline(
      base({
        episodes: [
          { id: "e2", kind: "difficulty", status: "closed", situation: "eating", causes: ["textures"], startedAt: new Date("2026-03-02T09:00:00Z"), endedAt: new Date("2026-03-02T09:12:00Z") },
          { id: "e1", kind: "crisis", status: "closed", situation: null, causes: ["noise"], startedAt: new Date("2025-01-10T10:00:00Z"), endedAt: null },
        ],
        reports: [{ id: "r1", docType: "initial_assessment", sessionDate: "2024-10-01", status: "exported" }],
        assessments: [{ id: "a1", definitionId: "sensory-profile-2-child", testDate: "2024-10-15", status: "draft", scores: null }],
      }),
    );
    expect(events.map((e) => e.id)).toEqual(["birth", "followUp", "report:r1", "assessment:a1", "episode:e1", "episode:e2"]);
    expect(events[0]).toMatchObject({ kind: "birth", date: "2019-02-03", precision: "day" });
    const difficulty = events.find((e) => e.id === "episode:e2");
    expect(difficulty).toMatchObject({ kind: "difficulty", minutes: 12, open: false, href: "/children/c1/episodes/e2", precision: "datetime" });
  });

  it("uses the file's creation only without a follow-up start", () => {
    const withStart = buildTimeline(base());
    expect(withStart.some((e) => e.kind === "fileCreated")).toBe(false);
    const without = buildTimeline(base({ child: { id: "c1", birthDate: null, followUpStart: null, createdAt: "2024-09-10 22:30:00" } }));
    // 22:30 UTC is already the next day in Jerusalem.
    expect(without).toEqual([{ id: "fileCreated", kind: "fileCreated", date: "2024-09-11", day: "2024-09-11", precision: "day" }]);
  });

  it("turns every answered date question into an event, skipping empty, invalid and birth dates", () => {
    const events = buildTimeline(
      base({
        forms: [
          {
            id: "cf1",
            schema: form,
            answers: { f1: "2019-02-03", f2: "2022-05-10", f3: "TSA", f4: "2023-02-30", f5: "2025-06-01" },
            submittedAt: new Date("2025-07-01T07:00:00Z"),
            submittedBy: "parent",
            sentAt: new Date("2025-06-20T07:00:00Z"),
          },
        ],
      }),
    );
    const dates = events.filter((e) => e.kind === "formDate");
    expect(dates).toEqual([
      { id: "formDate:cf1:f2", kind: "formDate", date: "2022-05-10", day: "2022-05-10", precision: "day", href: "/children/c1/forms/cf1", label: "Date du diagnostic", formTitle: "Anamnèse" },
      { id: "formDate:cf1:f5", kind: "formDate", date: "2025-06-01", day: "2025-06-01", precision: "day", href: "/children/c1/forms/cf1", label: "Dernier bilan", formTitle: "Anamnèse" },
    ]);
    expect(events.map((e) => e.id)).toEqual(["birth", "formDate:cf1:f2", "followUp", "formDate:cf1:f5", "form:cf1:sent", "form:cf1:submitted"]);
    expect(events.at(-1)).toMatchObject({ kind: "form", action: "submitted", by: "parent", title: "Anamnèse" });
  });

  it("skips reports and tests with an unreadable date", () => {
    const events = buildTimeline(
      base({
        reports: [{ id: "r1", docType: "follow_up", sessionDate: "", status: "draft" }],
        assessments: [{ id: "a1", definitionId: "knox-preschool-play-scale", testDate: "2025-02-31", status: "draft", scores: null }],
      }),
    );
    expect(events.map((e) => e.id)).toEqual(["birth", "followUp"]);
  });

  it("puts dated-only events before timed ones on the same day, and keeps input order on ties", () => {
    const day = "2025-03-04";
    const events = buildTimeline(
      base({
        episodes: [
          { id: "late", kind: "crisis", status: "closed", situation: null, causes: [], startedAt: new Date(`${day}T12:00:00Z`), endedAt: null },
          { id: "early", kind: "crisis", status: "open", situation: null, causes: [], startedAt: new Date(`${day}T06:00:00Z`), endedAt: null },
        ],
        reports: [
          { id: "r1", docType: "follow_up", sessionDate: day, status: "draft" },
          { id: "r2", docType: "follow_up", sessionDate: day, status: "draft" },
        ],
        assessments: [{ id: "a1", definitionId: "x", testDate: day, status: "draft", scores: null }],
      }),
    );
    expect(events.filter((e) => e.day === day).map((e) => e.id)).toEqual(["assessment:a1", "report:r1", "report:r2", "episode:early", "episode:late"]);
    const again = buildTimeline(base({ reports: [{ id: "r2", docType: "follow_up", sessionDate: day, status: "draft" }, { id: "r1", docType: "follow_up", sessionDate: day, status: "draft" }] }));
    expect(again.filter((e) => e.kind === "report").map((e) => e.id)).toEqual(["report:r2", "report:r1"]);
  });

  it("groups by local day: a late-evening UTC crisis belongs to the next day in Jerusalem", () => {
    const [event] = buildTimeline(
      base({
        child: { id: "c1", birthDate: null, followUpStart: "2020-01-01", createdAt: "" },
        episodes: [{ id: "e", kind: "crisis", status: "closed", situation: null, causes: [], startedAt: new Date("2025-12-31T22:30:00Z"), endedAt: null }],
      }),
    ).filter((e) => e.kind === "crisis");
    expect(event.day).toBe("2026-01-01");
    expect(groupByYear([event]).map((g) => g.year)).toEqual(["2026"]);
  });
});

describe("scoreSummary", () => {
  const scores = [
    { id: "factors", title: "F", rows: [{ id: "x", label: "X", value: 1, unit: "months" as const, missing: 0 }] },
    {
      id: "quadrants",
      title: "Q",
      bands: ["Less", "Same", "More"],
      rows: [
        { id: "SK", label: "Seeking", value: 50, max: 95, unit: "points" as const, missing: 0, band: 2 },
        { id: "AV", label: "Avoiding", value: 20, max: 100, unit: "points" as const, missing: 3, band: null },
      ],
    },
  ];

  it("summarizes the definition's summary group with band names", () => {
    expect(scoreSummary("sensory-profile-2-child", scores)).toEqual([
      { label: "Seeking", value: 50, max: 95, unit: "points", band: "More" },
      { label: "Avoiding", value: 20, max: 100, unit: "points", band: null },
    ]);
  });

  it("falls back to the first group, and to nothing without a snapshot", () => {
    expect(scoreSummary("unknown", scores).map((s) => s.label)).toEqual(["X"]);
    expect(scoreSummary("sensory-profile-2-child", null)).toEqual([]);
  });

  it("only summarizes completed tests in the timeline", () => {
    const events = buildTimeline(
      base({
        assessments: [
          { id: "a1", definitionId: "sensory-profile-2-child", testDate: "2025-01-01", status: "completed", scores },
          { id: "a2", definitionId: "sensory-profile-2-child", testDate: "2025-02-01", status: "draft", scores },
        ],
      }),
    );
    const tests = events.filter((e) => e.kind === "assessment");
    expect(tests.map((e) => (e.kind === "assessment" ? e.scores.length : -1))).toEqual([2, 0]);
    expect(tests[0]).toMatchObject({ name: "Sensory Profile 2", href: "/children/c1/assessments/a1" });
  });
});
