/**
 * Pure, deterministic helpers behind the crisis check-list and the history panel.
 * No AI and no diagnosis: they only count what the therapist has recorded,
 * so she can review the most likely leads first.
 */
import {
  BACKGROUND_CAUSES,
  CAUSE_GROUPS,
  CAUSE_KEYS,
  DEFAULT_CAUSES,
  PROFILE_TO_CAUSES,
  SITUATION_CAUSES,
  type CauseGroup,
} from "./episode-catalog";

type PastEpisode = {
  kind: string;
  situation: string | null;
  causes: string[];
  helped: string[];
  startedAt: Date;
};

type Profile = {
  hyperSensitivities: string[];
  hypoReactivities: string[];
  backgroundFactors: string[];
  seeksDeepPressure: boolean;
};

export type CauseSource =
  | { type: "history"; count: number }
  | { type: "interview" }
  | { type: "situation" }
  | { type: "general" };

export type RankedCause = { key: string; source: CauseSource };

/** Causes suggested by the child's intake interview (sensory profile). */
export function interviewCauses(profile: Profile): Set<string> {
  const causes = new Set<string>();
  for (const [field, mapping] of Object.entries(PROFILE_TO_CAUSES)) {
    for (const value of profile[field as "hyperSensitivities" | "hypoReactivities" | "backgroundFactors"]) {
      const cause = mapping[value];
      if (cause) causes.add(cause);
    }
  }
  if (profile.seeksDeepPressure) causes.add("seeksPressure");
  return causes;
}

function countBy(lists: string[][]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const list of lists) for (const v of new Set(list)) counts.set(v, (counts.get(v) ?? 0) + 1);
  return counts;
}

const MAIN_LIST_SIZE = 8;

/**
 * Orders the check-list for this child: causes that came back most often first
 * (for everyday difficulties: in the same situation), then what the intake
 * interview flagged, then situation-specific and general defaults.
 * Pain is always kept in the main list.
 */
export function rankCauses({
  history,
  profile,
  kind,
  situation,
}: {
  history: PastEpisode[];
  profile: Profile;
  kind: string;
  situation: string | null;
}): { main: RankedCause[]; more: { group: CauseGroup; keys: string[] }[] } {
  const all = countBy(history.map((e) => e.causes));
  const sameContext = countBy(
    history.filter((e) => (situation ? e.situation === situation : e.kind === kind)).map((e) => e.causes),
  );
  const interview = interviewCauses(profile);
  const situationDefaults = new Set<string>(situation ? (SITUATION_CAUSES[situation] ?? []) : []);
  const defaults = new Set<string>(DEFAULT_CAUSES);

  // Custom causes typed in past episodes are candidates too.
  const candidates = new Set<string>([...CAUSE_KEYS, ...all.keys()]);

  const scored = [...candidates].map((key) => {
    // With a situation (everyday difficulty), only the same situation's history is
    // "what came back"; other situations only nudge the order.
    const total = all.get(key) ?? 0;
    const count = situation ? (sameContext.get(key) ?? 0) : total;
    const score =
      count * 10 +
      (total - count) * 2 +
      (situation ? 0 : (sameContext.get(key) ?? 0) * 5) +
      (interview.has(key) ? 6 : 0) +
      (situationDefaults.has(key) ? 8 : 0) +
      (defaults.has(key) ? 1 : 0);
    const source: CauseSource =
      count > 0
        ? { type: "history", count }
        : interview.has(key)
          ? { type: "interview" }
          : situationDefaults.has(key)
            ? { type: "situation" }
            : { type: "general" };
    return { key, score, source };
  });

  const ranked = scored
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score || CAUSE_KEYS.indexOf(a.key as never) - CAUSE_KEYS.indexOf(b.key as never));

  let main = ranked.slice(0, MAIN_LIST_SIZE);
  if (!main.some((c) => c.key === "pain")) {
    const pain = ranked.find((c) => c.key === "pain") ?? { key: "pain", score: 0, source: { type: "general" } as const };
    main = [...main.slice(0, MAIN_LIST_SIZE - 1), pain];
  }

  const inMain = new Set(main.map((c) => c.key));
  const more = (Object.keys(CAUSE_GROUPS) as CauseGroup[])
    .map((group) => ({ group, keys: (CAUSE_GROUPS[group] as readonly string[]).filter((k) => !inMain.has(k)) }))
    .filter((g) => g.keys.length > 0);

  return { main: main.map(({ key, source }) => ({ key, source })), more };
}

/** Past calming strategies first by how often they helped, then the child's profile, then presets. */
export function rankHelped(history: PastEpisode[], profileStrategies: string[], presets: readonly string[]): string[] {
  const counts = countBy(history.map((e) => e.helped));
  const byCount = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
  return [...new Set([...byCount, ...profileStrategies, ...presets])];
}

export type TimeOfDay = "morning" | "midday" | "afternoon" | "evening";

export function timeOfDay(date: Date, timeZone: string): TimeOfDay {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  const t = hour + minute / 60;
  if (t < 11) return "morning";
  if (t < 14) return "midday";
  if (t < 18) return "afternoon";
  return "evening";
}

export type Pattern = { key: string; count: number; total: number };

export type Patterns = {
  total: number;
  trigger: Pattern | null;
  background: Pattern | null;
  timeOfDay: { bucket: TimeOfDay; count: number; total: number } | null;
  helped: Pattern | null;
};

const MIN_OCCURRENCES = 2;

function top(counts: Map<string, number>, total: number, filter: (key: string) => boolean = () => true): Pattern | null {
  const best = [...counts.entries()].filter(([k, n]) => filter(k) && n >= MIN_OCCURRENCES).sort((a, b) => b[1] - a[1])[0];
  return best ? { key: best[0], count: best[1], total } : null;
}

/**
 * Patterns across recorded episodes, e.g. "clothing in 6 of the last 11 crises",
 * "5 of 8 happen around lunch". Only reported once they occur at least twice
 * (time of day: at least 4 episodes and half of them in the same slot).
 */
export function computePatterns(history: PastEpisode[], timeZone: string): Patterns {
  const total = history.length;
  const causes = countBy(history.map((e) => e.causes));

  const slots = countBy(history.map((e) => [timeOfDay(e.startedAt, timeZone)]));
  const bestSlot = [...slots.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    total,
    trigger: top(causes, total, (k) => !BACKGROUND_CAUSES.includes(k)),
    background: top(causes, total, (k) => BACKGROUND_CAUSES.includes(k)),
    timeOfDay:
      bestSlot && total >= 4 && bestSlot[1] / total >= 0.5
        ? { bucket: bestSlot[0] as TimeOfDay, count: bestSlot[1], total }
        : null,
    helped: top(countBy(history.map((e) => e.helped)), total),
  };
}
