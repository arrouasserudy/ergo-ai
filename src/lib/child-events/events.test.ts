import { describe, expect, it } from "vitest";
import { compareEvents, DETAILS_MAX, eventState, parseEventInput, upcomingEvents } from "./events";

describe("parseEventInput", () => {
  it("accepts a meeting with or without a time", () => {
    expect(parseEventInput({ kind: "intake", date: "2026-10-12", time: "09:30", details: "  Avec les deux parents " }, [])).toEqual({
      ok: true,
      data: { kind: "intake", date: "2026-10-12", time: "09:30", reportId: null, details: "Avec les deux parents" },
    });
    expect(parseEventInput({ kind: "parent_guidance", date: "2026-10-12", time: "" }, [])).toMatchObject({ ok: true, data: { time: null, details: null } });
  });

  it("requires a kind and a real date, and a valid time", () => {
    expect(parseEventInput({ kind: "party", date: "" }, [])).toEqual({ ok: false, errors: { kind: "required", date: "required" } });
    expect(parseEventInput({ kind: "intake", date: "2026-02-30", time: "25:00" }, [])).toEqual({ ok: false, errors: { date: "invalidDate", time: "invalidTime" } });
  });

  it("requires one of the child's reports for a report due date and drops the time", () => {
    expect(parseEventInput({ kind: "report_due", date: "2026-10-20", reportId: "r9" }, ["r1"])).toEqual({ ok: false, errors: { reportId: "required" } });
    expect(parseEventInput({ kind: "report_due", date: "2026-10-20", time: "10:00", reportId: "r1" }, ["r1"])).toMatchObject({ ok: true, data: { time: null, reportId: "r1" } });
  });

  it("ignores a report on other kinds and requires details for other", () => {
    expect(parseEventInput({ kind: "intake", date: "2026-10-20", reportId: "r1" }, ["r1"])).toMatchObject({ ok: true, data: { reportId: null } });
    expect(parseEventInput({ kind: "other", date: "2026-10-20", details: "  " }, [])).toEqual({ ok: false, errors: { details: "required" } });
    expect(parseEventInput({ kind: "other", date: "2026-10-20", details: "x".repeat(DETAILS_MAX + 1) }, [])).toEqual({ ok: false, errors: { details: `tooLong:${DETAILS_MAX}` } });
  });
});

describe("eventState", () => {
  const due = { kind: "report_due" as const, date: "2026-10-05" };
  it("is done once the report is no longer a draft, urgent otherwise", () => {
    expect(eventState(due, "draft", "2026-10-02", 14)).toEqual({ done: false, urgency: "soon" });
    expect(eventState(due, "draft", "2026-10-06", 14)).toEqual({ done: false, urgency: "overdue" });
    expect(eventState(due, "validated", "2026-10-06", 14)).toEqual({ done: true, urgency: "none" });
    expect(eventState({ ...due, date: "2026-12-01" }, "draft", "2026-10-02", 14)).toEqual({ done: false, urgency: "none" });
  });
  it("gives meetings no urgency", () => {
    expect(eventState({ kind: "intake", date: "2026-09-01" }, null, "2026-10-02", 14)).toEqual({ done: false, urgency: "none" });
  });
});

describe("upcomingEvents", () => {
  const ev = (id: string, kind: "intake" | "report_due" | "other", date: string, time: string | null = null, done = false) => ({ id, kind, date, time, done });
  it("keeps today and later, plus pending past report due dates, soonest first", () => {
    const list = [
      ev("a", "intake", "2026-10-09", "14:00"),
      ev("b", "intake", "2026-10-09", "09:00"),
      ev("c", "other", "2026-10-09"),
      ev("d", "intake", "2026-09-30"),
      ev("e", "report_due", "2026-09-28"),
      ev("f", "report_due", "2026-09-29", null, true),
      ev("g", "other", "2026-10-02"),
    ];
    expect(upcomingEvents(list, "2026-10-02").map((e) => e.id)).toEqual(["e", "g", "c", "b", "a"]);
  });
  it("orders by date then time", () => {
    expect(compareEvents(ev("x", "other", "2026-10-01", "10:00"), ev("y", "other", "2026-10-01", null))).toBeGreaterThan(0);
  });
});
