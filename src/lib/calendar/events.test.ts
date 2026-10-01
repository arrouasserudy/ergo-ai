import { describe, expect, it } from "vitest";
import { buildTimeline } from "@/lib/timeline/events";
import {
  birthdaysInRange,
  childCalendarEvents,
  deadlineEvents,
  filterCalendar,
  groupByDay,
  parseList,
  parseTypes,
  sortCalendar,
  typeOf,
  type CalendarEvent,
} from "./events";

const TZ = "Asia/Jerusalem";

describe("birthdaysInRange", () => {
  it("repeats the birthday every year in range, with the age", () => {
    expect(birthdaysInRange("2019-05-14", { from: "2024-01-01", to: "2026-12-31" })).toEqual([
      { day: "2024-05-14", age: 5 },
      { day: "2025-05-14", age: 6 },
      { day: "2026-05-14", age: 7 },
    ]);
    expect(birthdaysInRange("2019-05-14", { from: "2026-05-15", to: "2026-06-30" })).toEqual([]);
  });

  it("includes the birth itself (age 0), never days before it", () => {
    expect(birthdaysInRange("2026-09-28", { from: "2026-09-27", to: "2026-10-31" })).toEqual([{ day: "2026-09-28", age: 0 }]);
    expect(birthdaysInRange("2027-01-05", { from: "2026-12-28", to: "2027-01-31" })).toEqual([{ day: "2027-01-05", age: 0 }]);
    expect(birthdaysInRange("2027-01-05", { from: "2026-01-01", to: "2026-12-31" })).toEqual([]);
  });

  it("puts a 29 February birthday on the 28th in other years", () => {
    expect(birthdaysInRange("2020-02-29", { from: "2023-02-01", to: "2023-03-05" })).toEqual([{ day: "2023-02-28", age: 3 }]);
    expect(birthdaysInRange("2020-02-29", { from: "2024-02-26", to: "2024-03-03" })).toEqual([{ day: "2024-02-29", age: 4 }]);
  });

  it("handles a range spanning New Year and invalid dates", () => {
    expect(birthdaysInRange("2018-01-02", { from: "2025-12-29", to: "2026-02-01" })).toEqual([{ day: "2026-01-02", age: 8 }]);
    expect(birthdaysInRange(null, { from: "2026-01-01", to: "2026-12-31" })).toEqual([]);
    expect(birthdaysInRange("2019-02-30", { from: "2026-01-01", to: "2026-12-31" })).toEqual([]);
  });
});

describe("childCalendarEvents", () => {
  const child = { id: "c1", birthDate: "2019-10-03", followUpStart: "2024-10-07", createdAt: "2024-09-10 08:00:00" };
  const timeline = buildTimeline({
    child,
    episodes: [
      // 23:30 UTC on 30 September is already 1 October in Jerusalem.
      { id: "e1", kind: "crisis", status: "closed", situation: null, causes: [], startedAt: new Date("2026-09-30T23:30:00Z"), endedAt: null },
      { id: "e2", kind: "difficulty", status: "closed", situation: null, causes: [], startedAt: new Date("2026-08-02T10:00:00Z"), endedAt: null },
    ],
    reports: [{ id: "r1", docType: "progress", sessionDate: "2026-10-12", status: "draft" }],
    forms: [],
    assessments: [],
    timeZone: TZ,
  });
  const range = { from: "2026-09-28", to: "2026-11-01" };

  it("keeps the range, replaces the birth by the birthday and links everything", () => {
    const events = sortCalendar(childCalendarEvents(child, timeline, range));
    expect(events.map((e) => [e.id, e.kind, e.day])).toEqual([
      ["c1:episode:e1", "crisis", "2026-10-01"],
      ["c1:birthday:2026-10-03", "birthday", "2026-10-03"],
      ["c1:report:r1", "report", "2026-10-12"],
    ]);
    expect(events.every((e) => e.childId === "c1" && e.href)).toBe(true);
    expect(events.find((e) => e.kind === "birthday")).toMatchObject({ age: 7, href: "/children/c1/timeline" });
  });

  it("links milestones without a page to the child's timeline", () => {
    const events = childCalendarEvents(child, timeline, { from: "2024-10-01", to: "2024-10-31" });
    expect(events.find((e) => e.kind === "followUp")).toMatchObject({ id: "c1:followUp", href: "/children/c1/timeline" });
    expect(typeOf("followUp")).toBe("milestone");
    expect(typeOf("fileCreated")).toBe("milestone");
    expect(typeOf("crisis")).toBe("crisis");
  });
});

describe("deadlineEvents", () => {
  const forms = [
    { id: "f1", childId: "c1", title: "Bilan annuel", dueDate: "2026-10-01", submitted: false },
    { id: "f2", childId: "c2", title: "Bilan annuel", dueDate: "2026-10-01", submitted: true },
    { id: "f3", childId: "c2", title: "Questionnaire", dueDate: "2026-10-10", submitted: false },
    { id: "f4", childId: "c3", title: "Questionnaire", dueDate: "2026-11-20", submitted: false },
    { id: "f5", childId: "c3", title: "Sans échéance", dueDate: null, submitted: false },
  ];

  it("lists unsubmitted due dates in range with their urgency", () => {
    const events = deadlineEvents(forms, { from: "2026-09-28", to: "2026-11-01" }, "2026-10-02", 14);
    expect(events.map((e) => e.kind === "deadline" && [e.id, e.day, e.urgency, e.href])).toEqual([
      ["c1:deadline:f1", "2026-10-01", "overdue", "/children/c1/forms/f1"],
      ["c2:deadline:f3", "2026-10-10", "soon", "/children/c2/forms/f3"],
    ]);
  });

  it("shows future deadlines beyond the warning window as plain", () => {
    const [event] = deadlineEvents(forms, { from: "2026-11-01", to: "2026-11-30" }, "2026-10-02", 14);
    expect(event).toMatchObject({ kind: "deadline", day: "2026-11-20", urgency: "none" });
  });
});

describe("sortCalendar / filterCalendar / groupByDay", () => {
  const ev = (over: Partial<CalendarEvent> & Pick<CalendarEvent, "id" | "kind" | "day" | "childId">): CalendarEvent =>
    ({ date: over.day, precision: "day", href: "/x", ...over }) as CalendarEvent;
  const events = [
    ev({ id: "a", kind: "crisis", day: "2026-10-05", childId: "c1", precision: "datetime", date: "2026-10-05T12:00:00.000Z" }),
    ev({ id: "b", kind: "crisis", day: "2026-10-05", childId: "c2", precision: "datetime", date: "2026-10-05T08:00:00.000Z" }),
    ev({ id: "c", kind: "report", day: "2026-10-05", childId: "c2" }),
    ev({ id: "d", kind: "birthday", day: "2026-10-05", childId: "c1" }),
    ev({ id: "e", kind: "deadline", day: "2026-10-01", childId: "c3" }),
  ];

  it("orders by day, then birthdays and deadlines, dated events, timed events by time", () => {
    expect(sortCalendar(events).map((e) => e.id)).toEqual(["e", "d", "c", "b", "a"]);
  });

  it("filters by children and types; empty lists mean all", () => {
    expect(filterCalendar(events, { children: [], types: [] })).toHaveLength(5);
    expect(filterCalendar(events, { children: ["c2"], types: [] }).map((e) => e.id)).toEqual(["b", "c"]);
    expect(filterCalendar(events, { children: [], types: ["crisis", "deadline"] }).map((e) => e.id)).toEqual(["a", "b", "e"]);
    expect(filterCalendar(events, { children: ["c1", "c3"], types: ["crisis"] }).map((e) => e.id)).toEqual(["a"]);
  });

  it("groups by day", () => {
    const days = groupByDay(sortCalendar(events));
    expect([...days.keys()]).toEqual(["2026-10-01", "2026-10-05"]);
    expect(days.get("2026-10-05")).toHaveLength(4);
  });

  it("parses URL lists and drops unknown types", () => {
    expect(parseList("a, b,,a")).toEqual(["a", "b"]);
    expect(parseList(["a", "c"])).toEqual(["a", "c"]);
    expect(parseList(undefined)).toEqual([]);
    expect(parseTypes("crisis,nope,birthday")).toEqual(["crisis", "birthday"]);
  });
});
