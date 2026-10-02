import { describe, expect, it } from "vitest";
import {
  birthdayEvents,
  birthdaysInRange,
  childEventEntries,
  deadlineEvents,
  filterCalendar,
  groupByDay,
  parseList,
  parseTypes,
  sortCalendar,
  type CalendarEvent,
} from "./events";

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

describe("birthdayEvents", () => {
  it("links each birthday to the child", () => {
    expect(birthdayEvents({ id: "c1", birthDate: "2019-10-03" }, { from: "2026-09-28", to: "2026-11-01" })).toEqual([
      { id: "c1:birthday:2026-10-03", kind: "birthday", childId: "c1", day: "2026-10-03", time: null, href: "/children/c1", age: 7 },
    ]);
  });
});

describe("childEventEntries", () => {
  const base = { details: null, report: null, done: false, urgency: "none" as const, time: null };
  const events = [
    { ...base, id: "e1", childId: "c1", kind: "intake" as const, date: "2026-10-05", time: "09:30" },
    { ...base, id: "e2", childId: "c1", kind: "report_due" as const, date: "2026-10-12", report: { id: "r1", docType: "follow_up", sessionDate: "2026-09-30" }, urgency: "soon" as const },
    { ...base, id: "e3", childId: "c2", kind: "other" as const, date: "2026-12-01", details: "Réunion d'équipe" },
  ];

  it("keeps the range; a report due date leads to the report, others to the child's event", () => {
    const entries = childEventEntries(events, { from: "2026-09-28", to: "2026-11-01" });
    expect(entries.map((e) => [e.id, e.kind, e.day, e.time, e.href])).toEqual([
      ["c1:event:e1", "intake", "2026-10-05", "09:30", "/children/c1?event=e1"],
      ["c1:event:e2", "report_due", "2026-10-12", null, "/reports/r1"],
    ]);
    expect(entries[1]).toMatchObject({ eventId: "e2", urgency: "soon", report: { docType: "follow_up", sessionDate: "2026-09-30" } });
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
    ({ time: null, href: "/x", ...over }) as CalendarEvent;
  const events = [
    ev({ id: "a", kind: "intake", day: "2026-10-05", childId: "c1", time: "14:00" }),
    ev({ id: "b", kind: "parent_guidance", day: "2026-10-05", childId: "c2", time: "08:00" }),
    ev({ id: "c", kind: "report_due", day: "2026-10-05", childId: "c2" }),
    ev({ id: "d", kind: "birthday", day: "2026-10-05", childId: "c1" }),
    ev({ id: "e", kind: "deadline", day: "2026-10-01", childId: "c3" }),
  ];

  it("orders by day, then birthdays, to-dos, untimed events, timed events by time", () => {
    expect(sortCalendar(events).map((e) => e.id)).toEqual(["e", "d", "c", "b", "a"]);
  });

  it("filters by children and types; empty lists mean all", () => {
    expect(filterCalendar(events, { children: [], types: [] })).toHaveLength(5);
    expect(filterCalendar(events, { children: ["c2"], types: [] }).map((e) => e.id)).toEqual(["b", "c"]);
    expect(filterCalendar(events, { children: [], types: ["intake", "deadline"] }).map((e) => e.id)).toEqual(["a", "e"]);
    expect(filterCalendar(events, { children: ["c1", "c3"], types: ["parent_guidance"] }).map((e) => e.id)).toEqual([]);
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
    expect(parseTypes("intake,crisis,birthday")).toEqual(["intake", "birthday"]);
  });
});
