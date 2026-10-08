import type { Child, Episode, ReportSection } from "@/db/schema";
import { ageInMonths } from "@/i18n";
import { scoreValueText } from "@/lib/assessments/prompt";
import { computePatterns, timeOfDay } from "@/lib/episode-insights";
import { replaceChildName } from "@/lib/reports/text";
import type { TimelineEvent } from "@/lib/timeline/events";
import { minutesBetween } from "@/lib/time";

/** Size caps (characters) of the child context: the whole text, and each added section. */
export const CONTEXT_CAPS = {
  total: 5000,
  backgroundField: 300,
  background: 1200,
  tests: 3,
  reportSection: 400,
  report: 1500,
  dates: 8,
} as const;

/** One report of the child with its versions (the child's real name is in the stored text). */
export type ContextReport = {
  sessionDate: string;
  docType: string;
  status: string;
  variants: { recipient: string; generated: ReportSection[]; sections: ReportSection[]; validatedAt: Date | null; exportedAt: Date | null }[];
};

/** Data loaded beside the child's file (see `contextFor`); each section appears only when there is data. */
export type ChildContextExtras = {
  /** The child's timeline (`childTimeline`): completed OT tests (score snapshot only) and dates answered in forms. */
  timeline?: TimelineEvent[];
  /** The child's recent reports, any order. */
  reports?: ContextReport[];
};

const ageText = (months: number) => (months < 24 ? `${months} months` : `${Math.floor(months / 12)} years`);

/** Whitespace collapsed, cut at a word boundary with an ellipsis when longer than `max`. */
export function truncate(text: string, max: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.\-–—]+$/u, "")}…`;
}

/** Keeps lines while they fit in `max` characters (newlines counted); the line that overflows is shortened if enough room is left. */
function capLines(lines: string[], max: number): string[] {
  const kept: string[] = [];
  let used = 0;
  for (const line of lines) {
    const room = max - used - (kept.length ? 1 : 0);
    if (line.length <= room) {
      used += line.length + (kept.length ? 1 : 0);
      kept.push(line);
      continue;
    }
    if (room >= 60) kept.push(truncate(line, room));
    break;
  }
  // A heading alone says nothing.
  return kept.length > 1 ? kept : [];
}

const BACKGROUND_FIELDS = [
  ["medicalHistory", "Medical history"],
  ["birthHistory", "Birth history"],
  ["surgicalHistory", "Surgical history"],
  ["geneticDiagnoses", "Genetic diagnoses"],
  ["familyHistory", "Family history"],
  ["familyComposition", "Family composition"],
  ["otherInfo", "Other information"],
] as const;

function backgroundSection(child: Child): string[] {
  const lines: string[] = [];
  for (const [key, label] of BACKGROUND_FIELDS) {
    const raw = child[key]?.trim();
    let value = raw ? truncate(redactChildName(raw, child.name), CONTEXT_CAPS.backgroundField) : "";
    if (key === "familyComposition" && child.siblingsCount !== null && child.siblingsCount !== undefined) {
      value = value ? `${value} (siblings: ${child.siblingsCount})` : `siblings: ${child.siblingsCount}`;
    }
    if (value) lines.push(`- ${label}: ${value}`);
  }
  return lines.length ? capLines(["Background:", ...lines], CONTEXT_CAPS.background) : [];
}

/** Age at a calendar day, or "before birth"; null without a birth date. */
function ageAt(birthDate: string | null, day: string): string | null {
  if (!birthDate) return null;
  if (day < birthDate) return "before birth";
  return `age ${ageText(ageInMonths(birthDate, new Date(`${day}T12:00:00`)))}`;
}

/** Completed tests, latest first: the summary scores of the stored snapshot (never answers or comments). */
function testsSection(child: Child, timeline: TimelineEvent[]): string[] {
  const tests = timeline
    .filter((e): e is Extract<TimelineEvent, { kind: "assessment" }> => e.kind === "assessment" && e.status === "completed" && e.scores.length > 0)
    .reverse()
    .slice(0, CONTEXT_CAPS.tests);
  if (!tests.length) return [];
  return [
    "OT test results (scores computed by the app, latest first):",
    ...tests.map((t) => {
      const age = ageAt(child.birthDate, t.day);
      const scores = t.scores.map((s) => `${s.label}: ${scoreValueText(s)}${s.band ? ` (${s.band})` : ""}`).join("; ");
      return `- ${t.name}, ${t.day.slice(0, 7)}${age ? ` (${age})` : ""}: ${scores}`;
    }),
  ];
}

/** Dates answered in the child's forms, most recent first (the child's birth date is not a form date in the timeline). */
function datesSection(child: Child, timeline: TimelineEvent[]): string[] {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const e of [...timeline].reverse()) {
    // Identifying questions (a parent's birth date…) are never sent to the AI, as with reports.
    if (e.kind !== "formDate" || e.identifying) continue;
    const label = truncate(redactChildName(e.label, child.name), 80);
    const key = `${label.toLowerCase()}|${e.day}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const age = ageAt(child.birthDate, e.day);
    lines.push(`- ${label}: ${e.day.slice(0, 7)}${age ? ` (${age})` : ""}`);
    if (lines.length === CONTEXT_CAPS.dates) break;
  }
  return lines.length ? ["Key dates (from the forms):", ...lines] : [];
}

const RECIPIENT_RANK: Record<string, number> = { clinical: 0, parents: 1 };
const hasText = (sections: ReportSection[]) => sections.some((s) => s.body.trim());
const reportRank = (status: string) => (status === "draft" ? 1 : 0);

/** The latest report with text, validated or exported ones first; its best version (exported, validated, clinical note, parents), shortened. */
function reportSection(child: Child, reports: ContextReport[]): string[] {
  const candidates = reports
    .map((report) => {
      const variant = [...report.variants]
        .filter((v) => hasText(v.sections) || hasText(v.generated))
        .sort((a, b) => Number(!a.exportedAt) - Number(!b.exportedAt) || Number(!a.validatedAt) - Number(!b.validatedAt) || RECIPIENT_RANK[a.recipient] - RECIPIENT_RANK[b.recipient])[0];
      return variant ? { report, variant } : null;
    })
    .filter((c) => c !== null)
    .sort((a, b) => reportRank(a.report.status) - reportRank(b.report.status) || (a.report.sessionDate < b.report.sessionDate ? 1 : a.report.sessionDate > b.report.sessionDate ? -1 : 0));
  const pick = candidates[0];
  if (!pick) return [];
  const { report, variant } = pick;
  const sections = hasText(variant.sections) ? variant.sections : variant.generated;
  const clean = (text: string) => redactChildName(text.replace(/\*\*/g, ""), child.name);
  const lines = sections
    .filter((s) => s.body.trim())
    .map((s) => `- ${truncate(clean(s.heading), 80)}: ${truncate(clean(s.body), CONTEXT_CAPS.reportSection)}`);
  const kind = report.docType.replace(/_/g, " ");
  return capLines([`Latest report (${report.sessionDate}, ${kind} for ${variant.recipient}, ${report.status}; shortened):`, ...lines], CONTEXT_CAPS.report);
}

/**
 * Fits the added sections under the total cap: the lowest-priority one is shortened
 * (its last lines dropped), or removed, first: report, then background, dates, tests.
 * The profile lines are kept; the text is cut as a last resort if they alone are too long.
 */
export function fitContext(profile: string[], sections: Record<"background" | "tests" | "report" | "dates", string[]>): string {
  const order = ["background", "tests", "report", "dates"] as const;
  const kept = { ...sections };
  const render = () => [profile.join("\n"), ...order.filter((k) => kept[k].length).map((k) => kept[k].join("\n"))].join("\n\n");
  for (const key of ["report", "background", "dates", "tests"] as const) {
    while (render().length > CONTEXT_CAPS.total && kept[key].length) {
      // Keep at least the heading and one line; below that, drop the section.
      kept[key] = kept[key].length > 2 ? kept[key].slice(0, -1) : [];
    }
  }
  const text = render();
  return text.length > CONTEXT_CAPS.total ? `${text.slice(0, CONTEXT_CAPS.total - 1)}…` : text;
}

/**
 * Pseudonymized summary of a child for the expert chat, shown verbatim to the therapist
 * before it is sent. The profile (age, referral, school level, sensory profile, triggers,
 * calming strategies, interests) and a counts-only summary of the last crises (no free-text
 * crisis notes); then, when there is data: background history, completed OT test scores
 * (stored snapshot, never answers or comments), a shortened latest report and dates answered
 * in forms. Never the name or birth date: the child's name and initials are redacted from
 * every free text; other names typed by the therapist are sent as written. Capped at
 * CONTEXT_CAPS.total characters (see fitContext).
 */
export function childContextText(child: Child, episodes: Episode[], timeZone: string, extras: ChildContextExtras = {}): string {
  const lines: string[] = ["Context about the child we are discussing (pseudonymized):"];
  if (child.birthDate) lines.push(`- Age: ${ageText(ageInMonths(child.birthDate))}`);
  lines.push(`- Reason for referral: ${child.referralReason}`);
  if (child.schoolLevel) lines.push(`- School level: ${child.schoolLevel}`);
  const list = (label: string, values: string[]) => values.length && lines.push(`- ${label}: ${values.join(", ")}`);
  list("Sensory hypersensitivities", child.hyperSensitivities);
  list("Sensory hyporeactivity", child.hypoReactivities);
  if (child.seeksDeepPressure) lines.push("- Seeks deep pressure / proprioceptive input");
  list("Usual background factors", child.backgroundFactors);
  if (child.knownTriggers) lines.push(`- Known triggers (from the parent interview): ${child.knownTriggers}`);
  if (child.warningSigns) lines.push(`- Warning signs: ${child.warningSigns}`);
  list("What usually calms them", child.calmingStrategies);
  list("Interests", child.interests);

  const crises = episodes.filter((e) => e.kind === "crisis" && e.status === "closed").slice(0, 10);
  if (crises.length) {
    const p = computePatterns(crises, timeZone);
    const parts = [
      p.trigger && `most frequent trigger "${p.trigger.key}" (${p.trigger.count}/${p.total})`,
      p.background && `background factor "${p.background.key}" (${p.background.count}/${p.total})`,
      p.timeOfDay && `mostly ${p.timeOfDay.bucket} (${p.timeOfDay.count}/${p.total})`,
      p.helped && `what helped most "${p.helped.key}" (${p.helped.count}/${p.total})`,
    ].filter(Boolean);
    lines.push(`- Last ${crises.length} recorded crises${parts.length ? `: ${parts.join("; ")}` : ""}`);
  }
  const timeline = extras.timeline ?? [];
  return fitContext(lines, {
    background: backgroundSection(child),
    tests: testsSection(child, timeline),
    report: reportSection(child, extras.reports ?? []),
    dates: datesSection(child, timeline),
  });
}

/** Swaps the child's name (full name or any word of it) for "the child" in free text. */
export function redactChildName(text: string, childName: string): string {
  return replaceChildName(text, childName, "the child");
}

function episodeFacts(episode: Episode, childName: string, timeZone: string, now: Date): string[] {
  const clean = (text: string) => redactChildName(text.trim(), childName);
  const facts: string[] = [];
  if (episode.situation) facts.push(`situation: ${clean(episode.situation)}`);
  facts.push(`time of day: ${timeOfDay(episode.startedAt, timeZone)}`);
  const end = episode.endedAt ?? (episode.status === "open" ? now : null);
  if (end) facts.push(`${episode.status === "open" ? "going on for" : "lasted"} ${minutesBetween(episode.startedAt, end)} min`);
  if (episode.causes.length) facts.push(`${episode.status === "open" ? "possible causes checked so far" : "causes"}: ${episode.causes.map(clean).join(", ")}`);
  if (episode.helped.length) facts.push(`${episode.status === "open" ? "tried so far" : "what helped"}: ${episode.helped.map(clean).join(", ")}`);
  if (episode.antecedent?.trim()) facts.push(`just before: "${clean(episode.antecedent)}"`);
  if (episode.behavior?.trim()) facts.push(`what the child did: "${clean(episode.behavior)}"`);
  if (episode.notes?.trim()) facts.push(`notes: "${clean(episode.notes)}"`);
  return facts;
}

/**
 * Context for asking help during an episode in progress: the child summary, the
 * current episode, and the child's past crises one by one, with the therapist's
 * free-text notes (the child's name swapped for "the child"; other names they
 * typed are sent as written).
 */
export function crisisContextText(
  child: Child,
  current: Episode,
  episodes: Episode[],
  timeZone: string,
  now = new Date(),
  extras: ChildContextExtras = {},
): string {
  const past = episodes.filter((e) => e.id !== current.id && e.kind === "crisis" && e.status === "closed").slice(0, 15);
  const days = (d: Date) => Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  const lines = [
    childContextText(child, episodes, timeZone, extras),
    "",
    `A ${current.kind === "crisis" ? "crisis" : "difficulty"} is happening right now: ${episodeFacts(current, child.name, timeZone, now).join("; ")}.`,
  ];
  if (past.length) {
    lines.push("", `Past crises (most recent first):`);
    for (const e of past) {
      const ago = days(e.startedAt);
      lines.push(`- ${ago === 0 ? "today" : `${ago} day${ago > 1 ? "s" : ""} ago`}: ${episodeFacts(e, child.name, timeZone, now).join("; ")}`);
    }
  } else {
    lines.push("", "No past crisis recorded for this child.");
  }
  return lines.join("\n");
}
