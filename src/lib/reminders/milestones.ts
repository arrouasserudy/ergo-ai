import { MILESTONES, type Deadlines, type Milestone, type ReportDocType } from "@/db/schema";
import { addDays } from "@/lib/time";

/**
 * School-year milestones: the initial assessment at the start of the year, parent
 * guidance by mid-year, the end-of-year report. Pure date logic, no database: the
 * caller gathers each child's reports, meetings and forms of the year.
 */

/** Israeli school year: September 1st → August 31st. */
export const SCHOOL_YEAR_START_MONTH = 9;

export const DEFAULT_DEADLINES: Deadlines = {
  initialAssessment: "10-31",
  parentGuidance: "02-15",
  yearEndReport: "06-10",
};

/** A milestone is shown as "due soon" this many days before its deadline. */
export const LEAD_DAYS = 21;

/**
 * A child whose follow-up starts late in the year gets this many days after the
 * start instead of the cabinet's deadline (none for the year-end report).
 */
const GRACE_DAYS: Record<Milestone, number | null> = {
  initialAssessment: 30,
  parentGuidance: 90,
  yearEndReport: null,
};

/** Reports that complete each milestone (once validated or exported). */
const MILESTONE_DOC_TYPES: Record<Milestone, ReportDocType[]> = {
  initialAssessment: ["initial_assessment", "year_start_summary"],
  parentGuidance: ["parent_guidance"],
  yearEndReport: ["year_end_summary"],
};

export const MILESTONE_DOC_TYPE: Record<Milestone, ReportDocType> = {
  initialAssessment: "initial_assessment",
  parentGuidance: "parent_guidance",
  yearEndReport: "year_end_summary",
};

const MMDD = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export function isMonthDay(value: unknown): value is string {
  return typeof value === "string" && MMDD.test(value);
}

/** The cabinet's deadlines, completed with the defaults. */
export function resolveDeadlines(custom: Partial<Deadlines> | null | undefined): Deadlines {
  const out = { ...DEFAULT_DEADLINES };
  for (const key of MILESTONES) {
    const value = custom?.[key];
    if (isMonthDay(value)) out[key] = value;
  }
  return out;
}

/** First calendar year of the school year containing `today` (2026 for 2026-2027). */
export function schoolYearOf(today: string): number {
  const [y, m] = today.split("-").map(Number);
  return m >= SCHOOL_YEAR_START_MONTH ? y : y - 1;
}

export function schoolYearRange(year: number) {
  const start = `${year}-${String(SCHOOL_YEAR_START_MONTH).padStart(2, "0")}-01`;
  return { start, end: addDays(`${year + 1}-${start.slice(5)}`, -1) };
}

/** "MM-DD" placed in the school year: September to December in the first year, the rest in the second. */
export function deadlineInYear(year: number, monthDay: string): string {
  const month = Number(monthDay.slice(0, 2));
  const y = month >= SCHOOL_YEAR_START_MONTH ? year : year + 1;
  // February 29th in a non-leap year becomes March 1st.
  const d = new Date(`${y}-${monthDay}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? addDays(`${y}-${monthDay.slice(0, 3)}28`, 1) : d.toISOString().slice(0, 10);
}

export type ChildYearFacts = {
  /** Start of the follow-up (or the record's creation date), ISO date. */
  startedOn: string;
  reports: { docType: ReportDocType; sessionDate: string; status: "draft" | "validated" | "exported" }[];
  meetings: { kind: "intake" | "parent_guidance" | "other"; status: "scheduled" | "done" | "cancelled"; date: string }[];
  files: { kind: "assessment" | "questionnaire" | "consent" | "other"; date: string | null }[];
};

export type MilestoneState = "done" | "overdue" | "dueSoon" | "later";

export type MilestoneStatus = {
  milestone: Milestone;
  state: MilestoneState;
  dueDate: string;
  /** Not done yet but under way: a draft report, or a meeting planned on this date. */
  draft: boolean;
  plannedOn: string | null;
};

/** Where one child stands on one milestone of the school year containing `today`. Null when it doesn't apply. */
export function milestoneStatus(milestone: Milestone, facts: ChildYearFacts, deadlines: Deadlines, today: string): MilestoneStatus | null {
  const year = schoolYearOf(today);
  const { start, end } = schoolYearRange(year);
  const inYear = (d: string | null) => d !== null && d >= start && d <= end;

  let dueDate = deadlineInYear(year, deadlines[milestone]);
  const grace = GRACE_DAYS[milestone];
  if (facts.startedOn > dueDate && grace === null) return null; // e.g. started after the year-end report deadline
  if (grace !== null && inYear(facts.startedOn) && addDays(facts.startedOn, grace) > dueDate) {
    dueDate = addDays(facts.startedOn, grace);
    if (dueDate > end) dueDate = end;
  }

  const reports = facts.reports.filter((r) => MILESTONE_DOC_TYPES[milestone].includes(r.docType) && inYear(r.sessionDate));
  let done = reports.some((r) => r.status !== "draft");
  const draft = !done && reports.length > 0;
  let plannedOn: string | null = null;

  if (milestone === "initialAssessment") {
    done ||= facts.files.some((f) => f.kind === "assessment" && inYear(f.date));
  }
  if (milestone === "parentGuidance") {
    const guidance = facts.meetings.filter((m) => m.kind === "parent_guidance" && inYear(m.date));
    done ||= guidance.some((m) => m.status === "done");
    plannedOn =
      guidance
        .filter((m) => m.status === "scheduled" && m.date >= today)
        .map((m) => m.date)
        .sort()[0] ?? null;
  }

  const state: MilestoneState = done ? "done" : today > dueDate ? "overdue" : today >= addDays(dueDate, -LEAD_DAYS) ? "dueSoon" : "later";
  return { milestone, state, dueDate, draft, plannedOn: done ? null : plannedOn };
}

export function childMilestones(facts: ChildYearFacts, deadlines: Deadlines, today: string): MilestoneStatus[] {
  return MILESTONES.map((m) => milestoneStatus(m, facts, deadlines, today)).filter((s): s is MilestoneStatus => s !== null);
}

/** Overdue and due-soon milestones need the therapist's attention. */
export const needsAction = (s: MilestoneStatus) => s.state === "overdue" || s.state === "dueSoon";
