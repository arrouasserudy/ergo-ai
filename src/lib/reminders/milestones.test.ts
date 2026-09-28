import { describe, expect, it } from "vitest";
import {
  childMilestones,
  deadlineInYear,
  DEFAULT_DEADLINES,
  milestoneStatus,
  resolveDeadlines,
  schoolYearOf,
  schoolYearRange,
  type ChildYearFacts,
} from "./milestones";

const facts = (over: Partial<ChildYearFacts> = {}): ChildYearFacts => ({ startedOn: "2025-01-10", reports: [], meetings: [], files: [], ...over });

describe("school year", () => {
  it("runs from September to August", () => {
    expect(schoolYearOf("2026-09-01")).toBe(2026);
    expect(schoolYearOf("2027-08-31")).toBe(2026);
    expect(schoolYearOf("2026-08-31")).toBe(2025);
    expect(schoolYearRange(2026)).toEqual({ start: "2026-09-01", end: "2027-08-31" });
  });

  it("places deadlines in the right calendar year", () => {
    expect(deadlineInYear(2026, "10-31")).toBe("2026-10-31");
    expect(deadlineInYear(2026, "02-15")).toBe("2027-02-15");
    expect(deadlineInYear(2026, "02-29")).toBe("2027-03-01");
    expect(deadlineInYear(2027, "02-29")).toBe("2028-02-29");
  });

  it("falls back to the default deadlines", () => {
    expect(resolveDeadlines({ parentGuidance: "01-20", yearEndReport: "13-40" })).toEqual({ ...DEFAULT_DEADLINES, parentGuidance: "01-20" });
  });
});

describe("milestoneStatus", () => {
  it("is due soon three weeks before the deadline, overdue after", () => {
    expect(milestoneStatus("initialAssessment", facts(), DEFAULT_DEADLINES, "2026-09-15")?.state).toBe("later");
    expect(milestoneStatus("initialAssessment", facts(), DEFAULT_DEADLINES, "2026-10-12")?.state).toBe("dueSoon");
    expect(milestoneStatus("initialAssessment", facts(), DEFAULT_DEADLINES, "2026-11-01")?.state).toBe("overdue");
  });

  it("is done with a validated report of this school year only", () => {
    const lastYear = facts({ reports: [{ docType: "initial_assessment", sessionDate: "2026-06-01", status: "exported" }] });
    expect(milestoneStatus("initialAssessment", lastYear, DEFAULT_DEADLINES, "2026-11-01")?.state).toBe("overdue");

    const draft = facts({ reports: [{ docType: "year_start_summary", sessionDate: "2026-10-01", status: "draft" }] });
    expect(milestoneStatus("initialAssessment", draft, DEFAULT_DEADLINES, "2026-11-01")).toMatchObject({ state: "overdue", draft: true });

    const validated = facts({ reports: [{ docType: "year_start_summary", sessionDate: "2026-10-01", status: "validated" }] });
    expect(milestoneStatus("initialAssessment", validated, DEFAULT_DEADLINES, "2026-11-01")?.state).toBe("done");
  });

  it("counts an assessment form uploaded for this year", () => {
    const uploaded = facts({ files: [{ kind: "assessment", date: "2026-09-20" }] });
    expect(milestoneStatus("initialAssessment", uploaded, DEFAULT_DEADLINES, "2026-11-01")?.state).toBe("done");
    const questionnaire = facts({ files: [{ kind: "questionnaire", date: "2026-09-20" }] });
    expect(milestoneStatus("initialAssessment", questionnaire, DEFAULT_DEADLINES, "2026-11-01")?.state).toBe("overdue");
  });

  it("counts a parent guidance meeting marked done, and shows a planned one", () => {
    const planned = facts({ meetings: [{ kind: "parent_guidance", status: "scheduled", date: "2027-02-20" }] });
    expect(milestoneStatus("parentGuidance", planned, DEFAULT_DEADLINES, "2027-02-10")).toMatchObject({ state: "dueSoon", plannedOn: "2027-02-20" });

    const done = facts({ meetings: [{ kind: "parent_guidance", status: "done", date: "2027-01-05" }] });
    expect(milestoneStatus("parentGuidance", done, DEFAULT_DEADLINES, "2027-02-10")?.state).toBe("done");

    const cancelled = facts({ meetings: [{ kind: "parent_guidance", status: "cancelled", date: "2027-01-05" }] });
    expect(milestoneStatus("parentGuidance", cancelled, DEFAULT_DEADLINES, "2027-02-20")).toMatchObject({ state: "overdue", plannedOn: null });
  });

  it("gives children who start late in the year time after their start", () => {
    const late = facts({ startedOn: "2027-01-10" });
    expect(milestoneStatus("initialAssessment", late, DEFAULT_DEADLINES, "2027-01-20")).toMatchObject({ state: "dueSoon", dueDate: "2027-02-09" });
    expect(milestoneStatus("parentGuidance", late, DEFAULT_DEADLINES, "2027-01-20")).toMatchObject({ state: "later", dueDate: "2027-04-10" });
  });

  it("skips the year-end report for a child who starts after its deadline", () => {
    const veryLate = facts({ startedOn: "2027-06-20" });
    expect(milestoneStatus("yearEndReport", veryLate, DEFAULT_DEADLINES, "2027-06-25")).toBeNull();
    expect(childMilestones(veryLate, DEFAULT_DEADLINES, "2027-06-25").map((s) => s.milestone)).toEqual(["initialAssessment", "parentGuidance"]);
  });
});
