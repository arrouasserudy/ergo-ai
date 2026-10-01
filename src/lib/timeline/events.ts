import { getDefinition } from "@/lib/assessments/registry";
import type { AssessmentStatus } from "@/db/schema";
import type { ScoreGroup } from "@/lib/assessments/types";
import { allFields, type Answers, type FormSchema } from "@/lib/forms/schema";

/**
 * A child's timeline (pure, tested): birth, follow-up start, crises and difficulties,
 * reports, forms (and every date answered in them), OT tests — oldest first.
 * Events carry keys and user content only; labels are translated at display.
 */

export const TIMELINE_KINDS = ["birth", "followUp", "fileCreated", "crisis", "difficulty", "report", "form", "formDate", "assessment"] as const;
export type TimelineKind = (typeof TIMELINE_KINDS)[number];

/** Filter chips: the child's milestones are grouped, every other kind has its own chip. */
export const TIMELINE_FILTERS = ["milestone", "crisis", "difficulty", "report", "form", "formDate", "assessment"] as const;
export type TimelineFilter = (typeof TIMELINE_FILTERS)[number];

export function filterOf(kind: TimelineKind): TimelineFilter {
  return kind === "birth" || kind === "followUp" || kind === "fileCreated" ? "milestone" : kind;
}

/** One computed score of a completed test, from its stored snapshot (never computed here). */
export type TimelineScore = { label: string; value: number | null; max?: number; unit: "points" | "months"; band: string | null };

type Base = {
  /** Unique within the timeline (`<kind>:<row id>[:<field id>]`). */
  id: string;
  /** ISO date (YYYY-MM-DD) or ISO timestamp, depending on `precision`. */
  date: string;
  /** The local calendar day (YYYY-MM-DD) in the practice's time zone: grouping, age, ordering. */
  day: string;
  precision: "day" | "datetime";
  href?: string;
};

export type TimelineEvent = Base &
  (
    | { kind: "birth" | "followUp" | "fileCreated" }
    | { kind: "crisis" | "difficulty"; situation: string | null; causes: string[]; minutes: number | null; open: boolean }
    | { kind: "report"; docType: string; status: string }
    | { kind: "form"; action: "sent" | "submitted"; title: string; by: "therapist" | "parent" | null }
    /** `identifying`: the question identifies the child or family (shown here, never sent to the AI). */
    | { kind: "formDate"; label: string; formTitle: string; identifying?: true }
    | { kind: "assessment"; name: string; status: AssessmentStatus; scores: TimelineScore[] }
  );

export type TimelineInput = {
  child: { id: string; birthDate: string | null; followUpStart: string | null; createdAt: string };
  episodes: { id: string; kind: "crisis" | "difficulty"; status: "open" | "closed"; situation: string | null; causes: string[]; startedAt: Date; endedAt: Date | null }[];
  reports: { id: string; docType: string; sessionDate: string; status: string }[];
  forms: {
    id: string;
    schema: FormSchema;
    answers: Answers;
    submittedAt: Date | null;
    submittedBy: "therapist" | "parent" | null;
    /** When the parents' link was last created, if any. */
    sentAt: Date | null;
  }[];
  assessments: { id: string; definitionId: string; testDate: string; status: AssessmentStatus; scores: ScoreGroup[] | null }[];
  timeZone: string;
};

/** A real calendar date written YYYY-MM-DD (no 2026-02-30). */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** The calendar day of an instant in `timeZone`. */
export function localDay(date: Date, timeZone: string): string {
  return date.toLocaleDateString("en-CA", { timeZone });
}

/** SQLite CURRENT_TIMESTAMP ("2026-09-30 08:12:00", UTC) as a Date; null when unreadable. */
function parseSqlTimestamp(value: string): Date | null {
  const date = new Date(`${value.replace(" ", "T")}${/[zZ]|[+-]\d{2}:?\d{2}$/.test(value) ? "" : "Z"}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Order of day-precision events within the same day. */
const DAY_RANK: Record<TimelineKind, number> = {
  birth: 0,
  followUp: 1,
  fileCreated: 1,
  formDate: 2,
  assessment: 3,
  report: 4,
  form: 5,
  crisis: 6,
  difficulty: 6,
};

/** The score group a test's timeline summary shows (`summaryGroup`, else the first), from the snapshot. */
export function scoreSummary(definitionId: string, scores: ScoreGroup[] | null): TimelineScore[] {
  if (!scores?.length) return [];
  const wanted = getDefinition(definitionId)?.summaryGroup;
  const group = scores.find((g) => g.id === wanted) ?? scores[0];
  return group.rows.map((row) => ({
    label: row.label,
    value: row.value,
    max: row.max,
    unit: row.unit,
    band: row.band !== undefined && row.band !== null ? (group.bands?.[row.band] ?? null) : null,
  }));
}

export function buildTimeline({ child, episodes, reports, forms, assessments, timeZone }: TimelineInput): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const atDay = (date: string) => ({ date, day: date, precision: "day" as const });
  const atTime = (date: Date) => ({ date: date.toISOString(), day: localDay(date, timeZone), precision: "datetime" as const });

  if (isIsoDate(child.birthDate)) events.push({ id: "birth", kind: "birth", ...atDay(child.birthDate) });
  if (isIsoDate(child.followUpStart)) {
    events.push({ id: "followUp", kind: "followUp", ...atDay(child.followUpStart) });
  } else {
    // Without a follow-up start, the file's creation is the best "start" we have.
    const created = parseSqlTimestamp(child.createdAt);
    if (created) events.push({ id: "fileCreated", kind: "fileCreated", ...atDay(localDay(created, timeZone)) });
  }

  for (const ep of episodes) {
    const minutes = ep.endedAt ? Math.max(1, Math.round((ep.endedAt.getTime() - ep.startedAt.getTime()) / 60_000)) : null;
    events.push({
      id: `episode:${ep.id}`,
      kind: ep.kind,
      ...atTime(ep.startedAt),
      href: `/children/${child.id}/episodes/${ep.id}`,
      situation: ep.situation,
      causes: ep.causes,
      minutes,
      open: ep.status === "open",
    });
  }

  for (const report of reports) {
    if (!isIsoDate(report.sessionDate)) continue;
    events.push({ id: `report:${report.id}`, kind: "report", ...atDay(report.sessionDate), href: `/reports/${report.id}`, docType: report.docType, status: report.status });
  }

  for (const form of forms) {
    const href = `/children/${child.id}/forms/${form.id}`;
    const title = form.schema.title;
    if (form.sentAt) events.push({ id: `form:${form.id}:sent`, kind: "form", ...atTime(form.sentAt), href, action: "sent", title, by: null });
    if (form.submittedAt) {
      events.push({ id: `form:${form.id}:submitted`, kind: "form", ...atTime(form.submittedAt), href, action: "submitted", title, by: form.submittedBy });
    }
    // Every answered date question is an event of its own ("Date of diagnosis"…). The birth
    // date asked again in a form is already the first event.
    for (const field of allFields(form.schema)) {
      const answer = form.answers[field.id];
      if (field.type !== "date" || !isIsoDate(answer) || answer === child.birthDate) continue;
      events.push({
        id: `formDate:${form.id}:${field.id}`,
        kind: "formDate",
        ...atDay(answer),
        href,
        label: field.label.replace(/\s*[:：]\s*$/, ""),
        formTitle: title,
        ...(field.identifying ? { identifying: true as const } : {}),
      });
    }
  }

  for (const a of assessments) {
    if (!isIsoDate(a.testDate)) continue;
    events.push({
      id: `assessment:${a.id}`,
      kind: "assessment",
      ...atDay(a.testDate),
      href: `/children/${child.id}/assessments/${a.id}`,
      name: getDefinition(a.definitionId)?.shortName ?? a.definitionId,
      status: a.status,
      // Only a completed test's stored snapshot: drafts are not summarized.
      scores: a.status === "completed" ? scoreSummary(a.definitionId, a.scores) : [],
    });
  }

  return sortTimeline(events);
}

/** Oldest first: by local day; on the same day, dated-only events (birth first) before timed ones, by time. Stable. */
export function sortTimeline(events: TimelineEvent[]): TimelineEvent[] {
  return events
    .map((event, index) => ({ event, index }))
    .sort((a, b) => {
      const x = a.event;
      const y = b.event;
      if (x.day !== y.day) return x.day < y.day ? -1 : 1;
      if (x.precision !== y.precision) return x.precision === "day" ? -1 : 1;
      if (x.precision === "day") {
        const byRank = DAY_RANK[x.kind] - DAY_RANK[y.kind];
        if (byRank !== 0) return byRank;
      } else if (x.date !== y.date) {
        return x.date < y.date ? -1 : 1;
      }
      return a.index - b.index;
    })
    .map(({ event }) => event);
}

/** Events grouped by calendar year, in the given order. */
export function groupByYear(events: TimelineEvent[]): { year: string; events: TimelineEvent[] }[] {
  const groups: { year: string; events: TimelineEvent[] }[] = [];
  for (const event of events) {
    const year = event.day.slice(0, 4);
    const last = groups.at(-1);
    if (last?.year === year) last.events.push(event);
    else groups.push({ year, events: [event] });
  }
  return groups;
}
