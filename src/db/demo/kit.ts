/**
 * Shared building blocks of the demo cabinets (src/db/demo/{fr,he,en}.ts): dates relative
 * to today, a deterministic random source, form answers written by label, OT test answer
 * sets scored by the definitions themselves, and the spec types each cabinet fills in.
 * Pure: the database insertion lives in seed.ts.
 */
import { createHash } from "node:crypto";
import { knoxPreschoolPlayScale } from "../../lib/assessments/definitions/knox-preschool-play-scale";
import { QUADRANT_ITEMS, sensoryProfile2Child } from "../../lib/assessments/definitions/sensory-profile-2-child";
import { sanitizeAnswers as sanitizeTestAnswers } from "../../lib/assessments/answers";
import type { AssessmentAnswers, AssessmentDefinition, LevelItem } from "../../lib/assessments/types";
import { sanitizeAnswers } from "../../lib/forms/answers";
import { OTHER, type Answers, type FormSchema, type LlmForm } from "../../lib/forms/schema";
import { APP_TIME_ZONE, localToday } from "../../lib/time";
import type { Locale } from "../../i18n";
import type { ChildEventKind, GroupColor, NewChild, ReportDocType, ReportRecipient, ReportSection, ReportTest } from "../schema";

/** A stable UUID for a demo row ("child:noam", "noam:episode:3"…), the same on every run and in production. */
export function demoId(accountId: string, key: string): string {
  const h = createHash("sha256").update(`${accountId}:${key}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${((parseInt(h[16], 16) & 0x3) | 0x8).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

// ---------------------------------------------------------------------------
// Dates, relative to today in the practice's time zone.

export const TODAY = localToday();
export const NOW = new Date();
export const DAY_MS = 86_400_000;

export const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
export function addMonths(iso: string, n: number, dayOfMonth?: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(dayOfMonth ?? d, last));
  return target.toISOString().slice(0, 10);
}
/** The day `n` days from today (negative: in the past). */
export const day = (n: number) => addDays(TODAY, n);

/** Israeli week (Sunday to Thursday) or European week (Monday to Friday). */
export type Weekend = "fri-sat" | "sat-sun";

/** Moves a weekend day back to the last working day of the week (Thursday in Israel, Friday in the UK). */
export function workdayOf(iso: string, weekend: Weekend): string {
  const weekday = new Date(`${iso}T00:00:00Z`).getUTCDay();
  if (weekend === "fri-sat") return weekday === 5 ? addDays(iso, -1) : weekday === 6 ? addDays(iso, -2) : iso;
  return weekday === 6 ? addDays(iso, -1) : weekday === 0 ? addDays(iso, -2) : iso;
}

/** Date helpers for a cabinet's week: `workday(iso)` and `wd(n)`, the working day `n` days from today. */
export function schoolWeek(weekend: Weekend) {
  const workday = (iso: string) => workdayOf(iso, weekend);
  return { workday, wd: (n: number) => workday(day(n)) };
}

/** Minutes the practice's clock is ahead of UTC at an instant. */
function tzOffset(instant: Date): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: APP_TIME_ZONE, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      .formatToParts(instant)
      .map((p) => [p.type, p.value]),
  );
  const local = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
  return Math.round((local - Math.floor(instant.getTime() / 60_000) * 60_000) / 60_000);
}
/** A local wall-clock time ("12:10") on a day, as an instant; never later than now. */
export function at(iso: string, hhmm: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  const [hh, mm] = hhmm.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let instant = guess - tzOffset(new Date(guess)) * 60_000;
  instant = guess - tzOffset(new Date(instant)) * 60_000;
  return new Date(Math.min(instant, NOW.getTime() - 60_000));
}
export const sqlTimestamp = (d: Date) => d.toISOString().slice(0, 19).replace("T", " ");
export const plus = (d: Date, minutes: number) => new Date(Math.min(d.getTime() + minutes * 60_000, NOW.getTime() - 30_000));

// ---------------------------------------------------------------------------
// Small deterministic random source (stable answers from run to run).

export function rng(seed: string) {
  let s = parseInt(createHash("sha256").update(seed).digest("hex").slice(0, 8), 16);
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Forms: answers written by section title and field label, turned into ids and checked.

type Choice = string[] | { pick: string[]; other: string };
type FieldValue = string | number | boolean | Choice | Record<string, string>;
export type FieldValues = Record<string, Record<string, FieldValue>>;

export function fillForm(schema: FormSchema, values: FieldValues): Answers {
  const raw: Record<string, unknown> = {};
  for (const [title, fields] of Object.entries(values)) {
    const sec = schema.sections.find((s) => s.title === title);
    if (!sec) throw new Error(`Demo: no section "${title}" in "${schema.title}"`);
    for (const [label, value] of Object.entries(fields)) {
      const field = sec.fields.find((f) => f.label === label);
      if (!field) throw new Error(`Demo: no field "${label}" in "${schema.title}" › "${title}"`);
      const optionId = (options: { id: string; label: string }[], wanted: string) => {
        const found = options.find((o) => o.label === wanted);
        if (!found) throw new Error(`Demo: no option "${wanted}" for "${label}"`);
        return found.id;
      };
      if (field.type === "single_choice" || field.type === "multi_choice") {
        const choice = value as Choice;
        const pick = Array.isArray(choice) ? choice : choice.pick;
        const other = Array.isArray(choice) ? undefined : choice.other;
        const selected = pick.map((p) => optionId(field.options, p));
        raw[field.id] = other ? { selected: [...selected, OTHER], other } : { selected };
      } else if (field.type === "matrix") {
        raw[field.id] = Object.fromEntries(Object.entries(value as Record<string, string>).map(([r, c]) => [optionId(field.rows, r), optionId(field.columns, c)]));
      } else {
        raw[field.id] = value;
      }
    }
  }
  const answers = sanitizeAnswers(schema, raw);
  for (const id of Object.keys(raw)) if (!(id in answers)) throw new Error(`Demo: answer ${id} rejected in "${schema.title}"`);
  return answers;
}

// ---------------------------------------------------------------------------
// OT tests: complete, realistic answer sets, scored by the definitions themselves.

type Quadrant = "SK" | "AV" | "SN" | "RG";
const QUADRANT_OF = new Map<string, Quadrant>(
  (Object.entries(QUADRANT_ITEMS) as [Quadrant, string[]][]).flatMap(([q, ids]) => ids.map((id) => [id, q] as const)),
);
const SP2_ITEMS = sensoryProfile2Child.sections.flatMap((s) => s.items.map((i) => i.id));

/**
 * Sensory Profile 2 answers around a level per quadrant (1 = almost never … 5 = almost
 * always), with some item-level noise and explicit values for the items that tell the story.
 */
export function sp2Answers(
  seed: string,
  level: Record<Quadrant | "none", number>,
  items: Record<number, number> = {},
  comments: Record<string, string> = {},
  onlyFirst?: number,
): AssessmentAnswers {
  const random = rng(seed);
  const values: Record<string, number> = {};
  for (const id of SP2_ITEMS.slice(0, onlyFirst ?? SP2_ITEMS.length)) {
    const n = Number(id.slice(1));
    // Rounded up or down at random so the mean stays at `base`, plus a little noise.
    const base = level[QUADRANT_OF.get(id) ?? "none"];
    const rounded = Math.floor(base) + (random() < base - Math.floor(base) ? 1 : 0);
    const r = random();
    const noisy = rounded + (r < 0.08 ? -1 : r > 0.92 ? 1 : 0);
    values[id] = items[n] ?? Math.min(5, Math.max(1, noisy));
  }
  return sanitizeTestAnswers(sensoryProfile2Child, { values, ticks: {}, comments });
}

/** Knox: each factor rated at a level (months), with the behaviors of that level ticked and one from the level below. */
export function knoxAnswers(levels: Record<string, number>): AssessmentAnswers {
  const values: Record<string, number> = {};
  const ticks: Record<string, string[]> = {};
  for (const item of knoxPreschoolPlayScale.sections.flatMap((s) => s.items) as LevelItem[]) {
    const value = levels[item.id];
    if (value === undefined) throw new Error(`Demo: Knox factor ${item.id} has no level`);
    const index = item.levels.findIndex((l) => l.value === value);
    if (index < 0) throw new Error(`Demo: Knox factor ${item.id} has no level ${value}`);
    const below = item.levels.slice(0, index).reverse().find((l) => l.descriptors.length > 0);
    values[item.id] = value;
    ticks[item.id] = [...item.levels[index].descriptors.map((d) => d.id), ...(below ? [below.descriptors[0].id] : [])];
  }
  return sanitizeTestAnswers(knoxPreschoolPlayScale, { values, ticks, comments: {} });
}

export const EMPTY_TEST: AssessmentAnswers = { values: {}, ticks: {}, comments: {} };

// ---------------------------------------------------------------------------
// Specs of what each child has.

export type EpisodeSpec = {
  /** Days ago and local time; `school` moves weekend days back to the last working day. */
  at: [number, string];
  school?: boolean;
  minutes: number;
  kind: "crisis" | "difficulty";
  situation?: string;
  antecedent: string;
  behavior: string;
  causes: string[];
  helped: string[];
  notes?: string;
};

export type VariantSpec = {
  recipient: ReportRecipient;
  state: "draft" | "validated" | "exported";
  /** What the model wrote ({{child}} = the child's full name, as the app stores it). */
  generated: ReportSection[];
  /** The therapist's edited text, when she changed the draft ({{first}} = first name). */
  edited?: ReportSection[];
};

export type ReportSpec = {
  key: string;
  docType: ReportDocType;
  date: string;
  notes: string;
  tests?: ReportTest[];
  forms?: string[];
  assessments?: string[];
  recipients?: ReportRecipient[];
  variants: VariantSpec[];
  /** Days between the session and the validation (default 1); a late one gives the home page's streak a start. */
  validatedAfterDays?: number;
};

export type FormSpec = {
  key: string;
  /** A template key: a built-in form ("evaluation", "eating_observation") or one of the cabinet's own. */
  template: string;
  /** Day the form was added to the file. */
  created: string;
  /** Day the parents' link was created (status "sent", or "submitted" by a parent). */
  sent?: string;
  submitted?: { at: Date; by: "therapist" | "parent" };
  answers?: FieldValues;
  /** Forms with a yearly deadline: which school year ("current" or "previous"). */
  cycle?: "current" | "previous";
};

export type TestSpec = {
  key: string;
  definition: AssessmentDefinition;
  testDate: string;
  answers: AssessmentAnswers;
  status: "draft" | "sent" | "completed";
  by?: "therapist" | "parent";
  /** Completed the given number of days after the test date. */
  completedAfterDays?: number;
};

/** An event added on the child's file (meeting or to-do). */
export type EventSpec = {
  kind: ChildEventKind;
  date: string;
  /** Local time ("HH:MM"), never on a report due date. */
  time?: string;
  /** A report key of the child (`report_due`). */
  report?: string;
  details?: string;
};

export type ChildSpec = {
  key: string;
  child: Omit<NewChild, "accountId" | "id" | "createdBy">;
  episodes: EpisodeSpec[];
  forms: FormSpec[];
  tests: TestSpec[];
  reports: ReportSpec[];
  events: EventSpec[];
};

/** A questionnaire of the cabinet's own, as converted from the therapist's file. */
export type CabinetTemplate = {
  key: string;
  source: LlmForm;
  file: string;
  kind: "pdf" | "docx";
  createdDaysAgo: number;
  autoAssign: boolean;
  /** Yearly deadline, as a number of days from today (negative: already passed this school year). */
  deadlineInDays?: number;
  tokens: [number, number];
};

/** One demo cabinet: who logs in, the practice, its questionnaires and its four children. */
export type DemoCabinet = {
  key: Locale;
  /** Fixed ids and login (src/db/demo-ids.ts). */
  ids: { accountId: string; therapistId: string; email: string; passwordEnv: string };
  /** Language of the reports, the UI and the free text. */
  language: Locale;
  /** Working week of sessions and school days. */
  weekend: Weekend;
  therapistName: string;
  account: { name: string; letterhead: string; schoolYearStart: string };
  /** The forms shipped with the app (in Hebrew): used, or archived when the cabinet works in another language. */
  builtinForms: "use" | "archive";
  templates: CabinetTemplate[];
  /** Classrooms / places of work, with the keys of their children (a child is in one group at most). */
  groups: { key: string; name: string; place: string | null; color: GroupColor; children: string[] }[];
  children: () => ChildSpec[];
};

export const s = (heading: string, body: string): ReportSection => ({ heading, body });
